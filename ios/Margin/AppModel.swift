import DeviceActivity
import FamilyControls
import SwiftUI
import UserNotifications

/// The native screens that sit on top of the web UI on iPhone.
enum NativeScreen: String {
    case apps, stats
}

/// The app's shared state: Screen Time access, the picked apps, and what the native screens show.
@MainActor
final class AppModel: ObservableObject {
    static let shared = AppModel()

    @Published var nativeScreen: NativeScreen?
    /// Height of the web tab bar, so native screens stop above it.
    @Published var tabInset: CGFloat = 0
    @Published var dark = false {
        didSet {
            host?.darkTheme = dark
            SharedStore.themeDark = dark
        }
    }
    @Published var authorized = false
    @Published var notificationsAllowed = false
    @Published var showPicker = false
    @Published private(set) var selection = FamilyActivitySelection()
    @Published private(set) var rules: [AppRule] = []
    @Published private(set) var state = MarginState(json: nil)
    @Published private(set) var usage = UsageLog()

    weak var host: HostingController?
    private(set) lazy var bridge = WebBridge(model: self)
    private var lastSignature = ""

    var palette: Palette { Palette.of(dark: dark) }

    #if DEBUG
    /// Lets simulator screenshots show the app as if Screen Time access were granted.
    private let fakeAuthorization = UserDefaults.standard.bool(forKey: "MarginFakeAuth")
    #endif

    // MARK: Lifecycle

    func start() {
        reload()
        _ = bridge
        restartSchedulesIfNeeded()
        Shields.apply()
    }

    func didBecomeActive() {
        reload()
        restartSchedulesIfNeeded()
        Shields.apply()
        refreshNotificationStatus { [weak self] in self?.bridge.pushUpdate() }
    }

    func didEnterBackground() {
        bridge.evaluate("M.app && M.app.onPause && M.app.onPause()")
    }

    /// Re-reads everything the extensions may have changed.
    func reload() {
        authorized = AuthorizationCenter.shared.authorizationStatus == .approved
        #if DEBUG
        if fakeAuthorization { authorized = true }
        #endif
        selection = SharedStore.selection
        rules = SharedStore.rules
        state = SharedStore.state
        var log = SharedStore.usage
        log.roll(to: TimeUtil.dayKey(resetTime: state.resetTime))
        usage = log
    }

    private func restartSchedulesIfNeeded(force: Bool = false) {
        let signature = Scheduler.signature()
        guard force || signature != lastSignature else { return }
        lastSignature = signature
        Shields.syncWithUsage()
        Scheduler.restartAll()
    }

    // MARK: Permissions

    var permissions: [String: Any] {
        [
            "usage": authorized,
            "overlay": authorized,
            "notifications": notificationsAllowed,
            "overlayNeeded": false,
            "notificationsNeeded": true,
            "batteryRelevant": false,
            "battery": true,
            "blocking": authorized,
        ]
    }

    func refreshNotificationStatus(then done: (() -> Void)? = nil) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let allowed = settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
            Task { @MainActor in
                self.notificationsAllowed = allowed
                done?()
            }
        }
    }

    /// The web UI asked for a permission: "usage" / "overlay" (Screen Time) or "notifications".
    func openPermission(_ which: String) {
        Task {
            if which == "notifications" {
                await requestNotifications()
            } else {
                await requestScreenTime()
            }
            bridge.pushUpdate()
        }
    }

    func requestScreenTime() async {
        if AuthorizationCenter.shared.authorizationStatus == .denied {
            openSettings()
            return
        }
        do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        } catch {
            // Declined, or Screen Time is restricted on this phone. The UI keeps offering the step.
        }
        reload()
        restartSchedulesIfNeeded(force: true)
        Shields.apply()
    }

    func requestNotifications() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        if settings.authorizationStatus == .denied {
            openSettings()
            return
        }
        let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        notificationsAllowed = granted
    }

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }

    // MARK: Apps

    /// Opens Apple's app picker, asking for Screen Time access first if needed.
    func pickApps() {
        Task {
            if !authorized { await requestScreenTime() }
            if authorized { showPicker = true }
            bridge.pushUpdate()
        }
    }

    var selectionBinding: Binding<FamilyActivitySelection> {
        Binding(get: { self.selection }, set: { self.selectionChanged($0) })
    }

    private func selectionChanged(_ new: FamilyActivitySelection) {
        selection = new
        SharedStore.selection = new

        // Keep each app's limit if it is still picked; new apps share the daily allowance.
        let existing = Dictionary(SharedStore.rules.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        let updated = new.applicationTokens
            .map { token in existing[TokenID.of(token)] ?? AppRule(token: token) }
            .sorted { $0.id < $1.id }
        SharedStore.rules = updated
        rules = updated

        var s = SharedStore.state
        s.tracked = new.trackedIDs
        SharedStore.state = s
        state = s

        if new.isEmptySelection { Shields.clear() }
        restartSchedulesIfNeeded()
        Shields.apply()
        bridge.pushUpdate()
    }

    func update(_ rule: AppRule) {
        var list = SharedStore.rules
        if let i = list.firstIndex(where: { $0.id == rule.id }) { list[i] = rule } else { list.append(rule) }
        SharedStore.rules = list
        rules = list
        restartSchedulesIfNeeded()
        Shields.apply()
    }

    // MARK: Messages from the web UI

    /// Saves the web UI's settings. The picked apps and emergency use can also change outside the
    /// web UI (in the app picker or on the block screen), so the newest of those are kept.
    /// Returns the merged JSON when it differs from what the web UI sent.
    func saveFromWeb(_ json: String) -> String? {
        var incoming = MarginState(json: json)
        let stored = SharedStore.state
        var changed = false

        if stored.raw["tracked"] != nil, incoming.tracked != stored.tracked {
            incoming.tracked = stored.tracked
            changed = true
        }
        if stored.emergencyUntil > incoming.emergencyUntil {
            incoming.emergencyUntil = stored.emergencyUntil
            incoming.emergencyUsed = stored.emergencyUsed
            incoming.emergencyDay = stored.emergencyDay
            changed = true
        }

        SharedStore.state = incoming
        state = incoming
        restartSchedulesIfNeeded()
        Shields.apply()
        return changed ? incoming.json : nil
    }

    /// Emergency access granted from the web lock screen preview.
    func emergencyFromWeb(_ json: String) {
        _ = saveFromWeb(json)
        let until = SharedStore.state.emergencyUntil / 1000
        if until > Date().timeIntervalSince1970 {
            Emergency.begin(until: Date(timeIntervalSince1970: until))
        }
    }

    func usagePayload() -> [String: Any] {
        reload()
        return usage.payload(resetTime: state.resetTime)
    }

    func showNative(_ name: String?, inset: CGFloat) {
        tabInset = inset
        let screen = name.flatMap(NativeScreen.init(rawValue:))
        if screen != nativeScreen {
            withAnimation(.easeOut(duration: 0.18)) { nativeScreen = screen }
        }
        if screen != nil { reload() }
    }

    // MARK: Statistics

    func filter(today: Bool) -> DeviceActivityFilter {
        let cal = Calendar.current
        let now = Date()
        let startOfToday = cal.startOfDay(for: now)
        if today {
            return DeviceActivityFilter(
                segment: .hourly(during: DateInterval(start: startOfToday, end: now)),
                users: .all, devices: .all,
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                webDomains: selection.webDomainTokens
            )
        }
        let weekStart = cal.date(byAdding: .day, value: -6, to: startOfToday) ?? startOfToday
        return DeviceActivityFilter(
            segment: .daily(during: DateInterval(start: weekStart, end: now)),
            users: .all, devices: .all,
            applications: selection.applicationTokens,
            categories: selection.categoryTokens,
            webDomains: selection.webDomainTokens
        )
    }
}
