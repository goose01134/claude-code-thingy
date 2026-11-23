import CryptoKit
import FamilyControls
import Foundation
import ManagedSettings

/// A per-app limit for one app picked in Apple's app picker.
struct AppRule: Codable, Identifiable {
    var token: ApplicationToken
    /// Minutes per day. `nil` means the app simply shares the daily allowance.
    var limit: Int?
    /// `false` sends a reminder at the limit instead of blocking the app.
    var strict: Bool = true

    var id: String { TokenID.of(token) }
}

/// Stable short IDs for Screen Time tokens. Apple's tokens are opaque, so Margin names them by a hash.
enum TokenID {
    static func of<T: Encodable>(_ token: T) -> String {
        guard let data = try? JSONEncoder().encode(token) else { return "unknown" }
        return SHA256.hash(data: data).prefix(6).map { String(format: "%02x", $0) }.joined()
    }
}

/// Why apps are blocked right now. Written by the monitor extension, read when drawing the block screen.
struct ShieldFlags: Codable {
    var dayKey = ""
    var dailyReached = false
    var appsReached: [String] = []
    var focusActive: [String] = []
    var warnedDay = ""
}

/// Everything the app and its Screen Time extensions share, kept in the App Group container.
enum SharedStore {
    static let groupID: String = Bundle.main.object(forInfoDictionaryKey: "MarginAppGroup") as? String
        ?? "group.app.margin.wellbeing"

    static let defaults: UserDefaults = UserDefaults(suiteName: groupID) ?? .standard

    private enum Key {
        static let state = "state.v2"
        static let selection = "selection"
        static let rules = "appRules"
        static let usage = "usage"
        static let flags = "shieldFlags"
        static let themeDark = "themeDark"
        static let emergencyArmedAt = "emergencyArmedAt"
    }

    /// The web UI's settings JSON.
    static var stateJSON: String? {
        get { defaults.string(forKey: Key.state) }
        set { defaults.set(newValue, forKey: Key.state) }
    }

    static var state: MarginState {
        get { MarginState(json: stateJSON) }
        set { stateJSON = newValue.json }
    }

    static var selection: FamilyActivitySelection {
        get { read(FamilyActivitySelection.self, Key.selection) ?? FamilyActivitySelection() }
        set { write(newValue, Key.selection) }
    }

    static var rules: [AppRule] {
        get { read([AppRule].self, Key.rules) ?? [] }
        set { write(newValue, Key.rules) }
    }

    static var usage: UsageLog {
        get { read(UsageLog.self, Key.usage) ?? UsageLog() }
        set { write(newValue, Key.usage) }
    }

    static var flags: ShieldFlags {
        get { read(ShieldFlags.self, Key.flags) ?? ShieldFlags() }
        set { write(newValue, Key.flags) }
    }

    /// Whether Margin is showing its dark theme, so the block screen and reports can match.
    static var themeDark: Bool {
        get { defaults.bool(forKey: Key.themeDark) }
        set { defaults.set(newValue, forKey: Key.themeDark) }
    }

    /// When the block screen's emergency button was first tapped (seconds since 1970).
    static var emergencyArmedAt: Double {
        get { defaults.double(forKey: Key.emergencyArmedAt) }
        set { defaults.set(newValue, forKey: Key.emergencyArmedAt) }
    }

    private static func read<T: Decodable>(_ type: T.Type, _ key: String) -> T? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    private static func write<T: Encodable>(_ value: T, _ key: String) {
        if let data = try? JSONEncoder().encode(value) { defaults.set(data, forKey: key) }
    }
}

extension FamilyActivitySelection {
    var isEmptySelection: Bool {
        applicationTokens.isEmpty && categoryTokens.isEmpty && webDomainTokens.isEmpty
    }

    /// The IDs the web UI counts as "tracked apps": one per picked app, category or website.
    var trackedIDs: [String] {
        applicationTokens.map { "a" + TokenID.of($0) }.sorted()
            + categoryTokens.map { "c" + TokenID.of($0) }.sorted()
            + webDomainTokens.map { "w" + TokenID.of($0) }.sorted()
    }
}

/// Why a given app is blocked, for the block screen's wording.
enum BlockReason {
    case focus(name: String)
    case daily
    case appLimit(minutes: Int)
    case unknown

    static func current(for token: ApplicationToken?, now: Date = Date()) -> BlockReason {
        let state = SharedStore.state
        let flags = SharedStore.flags
        if let id = flags.focusActive.first, let f = state.focus.first(where: { $0.id == id }) {
            return .focus(name: f.name)
        }
        if flags.dailyReached { return .daily }
        if let token {
            let id = TokenID.of(token)
            if flags.appsReached.contains(id), let rule = SharedStore.rules.first(where: { $0.id == id }) {
                return .appLimit(minutes: rule.limit ?? state.allowance)
            }
        }
        return .unknown
    }
}
