import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

extension DeviceActivityName {
    /// The Margin day, from one reset time to the next. Carries the allowance thresholds.
    static let daily = Self("daily")
    /// 9:00 PM, for the daily summary notification.
    static let summary = Self("summary")
    /// Sunday 9:00 AM, for the weekly report notification.
    static let weekly = Self("weekly")
    /// Starts when emergency access ends, to put the blocks back.
    static let emergency = Self("emergency")

    static let focusPrefix = "focus."
    static func focus(_ id: String) -> Self { Self(focusPrefix + id) }
}

/// Tells Screen Time when to wake Margin's monitor extension.
enum Scheduler {
    private static let center = DeviceActivityCenter()

    /// A fingerprint of everything the schedules depend on, so unchanged settings don't restart them.
    static func signature() -> String {
        let s = SharedStore.state
        let n = s.notifications
        let focus = s.focus.filter(\.enabled).map { "\($0.id):\($0.start)-\($0.end):\($0.days.sorted())" }
        let rules = SharedStore.rules.map { "\($0.id):\($0.limit ?? 0):\($0.strict)" }.sorted()
        let authorized = AuthorizationCenter.shared.authorizationStatus == .approved
        return [
            "\(authorized)", "\(s.allowance)", s.resetTime, SharedStore.selection.trackedIDs.joined(separator: ","),
            rules.joined(separator: ","), focus.joined(separator: ","),
            "\(n.warnings):\(n.warnAt):\(n.dailySummary):\(n.weeklyReport)",
        ].joined(separator: "|")
    }

    /// Re-creates every schedule from the current settings, keeping a pending emergency end.
    static func restartAll() {
        let state = SharedStore.state
        let selection = SharedStore.selection
        center.stopMonitoring(center.activities.filter { $0 != .emergency })
        guard AuthorizationCenter.shared.authorizationStatus == .approved else { return }

        if !selection.isEmptySelection {
            try? center.startMonitoring(.daily, during: dailySchedule(state), events: dailyEvents(state, selection))
            for f in state.focus where f.enabled && !f.days.isEmpty && f.start != f.end {
                let schedule = DeviceActivitySchedule(intervalStart: components(f.start), intervalEnd: components(f.end), repeats: true)
                try? center.startMonitoring(.focus(f.id), during: schedule)
            }
        }
        if state.notifications.dailySummary {
            let schedule = DeviceActivitySchedule(
                intervalStart: DateComponents(hour: 21, minute: 0),
                intervalEnd: DateComponents(hour: 21, minute: 20),
                repeats: true
            )
            try? center.startMonitoring(.summary, during: schedule)
        }
        if state.notifications.weeklyReport {
            let schedule = DeviceActivitySchedule(
                intervalStart: DateComponents(hour: 9, minute: 0, weekday: 1),
                intervalEnd: DateComponents(hour: 9, minute: 20, weekday: 1),
                repeats: true
            )
            try? center.startMonitoring(.weekly, during: schedule)
        }
    }

    /// Wakes the monitor at `end` so it can put the blocks back after emergency access.
    static func scheduleEmergencyEnd(at end: Date) {
        center.stopMonitoring([.emergency])
        let cal = Calendar.current
        let parts: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
        let schedule = DeviceActivitySchedule(
            intervalStart: cal.dateComponents(parts, from: end),
            intervalEnd: cal.dateComponents(parts, from: end.addingTimeInterval(16 * 60)),
            repeats: false
        )
        try? center.startMonitoring(.emergency, during: schedule)
    }

    static func stopEmergency() {
        center.stopMonitoring([.emergency])
    }

    // MARK: Building blocks

    private static func components(_ hm: String) -> DateComponents {
        let t = TimeUtil.parseHM(hm)
        return DateComponents(hour: t.h, minute: t.m)
    }

    /// From the reset time to one minute before the next one, every day.
    private static func dailySchedule(_ state: MarginState) -> DeviceActivitySchedule {
        let start = TimeUtil.minutes(state.resetTime)
        let end = (start + 24 * 60 - 1) % (24 * 60)
        return DeviceActivitySchedule(
            intervalStart: DateComponents(hour: start / 60, minute: start % 60),
            intervalEnd: DateComponents(hour: end / 60, minute: end % 60),
            repeats: true
        )
    }

    /// Thresholds Screen Time reports back on:
    /// `t.<minutes>` total time in counted apps, `w` the warning before time runs out, and
    /// `a.<id>` an app's own limit.
    private static func dailyEvents(_ state: MarginState, _ selection: FamilyActivitySelection)
        -> [DeviceActivityEvent.Name: DeviceActivityEvent] {
        var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
        let allowance = max(5, state.allowance)
        let step = allowance <= 60 ? 5 : allowance <= 180 ? 10 : 15

        var marks = Set(stride(from: step, through: allowance + 60, by: step))
        marks.insert(allowance)
        for m in marks {
            events[DeviceActivityEvent.Name("t.\(m)")] = event(
                apps: selection.applicationTokens, categories: selection.categoryTokens,
                domains: selection.webDomainTokens, minutes: m
            )
        }

        let n = state.notifications
        if n.warnings, n.warnAt > 0, n.warnAt < allowance {
            events[DeviceActivityEvent.Name("w")] = event(
                apps: selection.applicationTokens, categories: selection.categoryTokens,
                domains: selection.webDomainTokens, minutes: allowance - n.warnAt
            )
        }

        for rule in SharedStore.rules {
            guard let limit = rule.limit, limit < allowance, selection.applicationTokens.contains(rule.token) else { continue }
            events[DeviceActivityEvent.Name("a.\(rule.id)")] = event(apps: [rule.token], categories: [], domains: [], minutes: limit)
        }
        return events
    }

    private static func event(
        apps: Set<ApplicationToken>, categories: Set<ActivityCategoryToken>, domains: Set<WebDomainToken>, minutes: Int
    ) -> DeviceActivityEvent {
        let threshold = DateComponents(hour: minutes / 60, minute: minutes % 60)
        if #available(iOS 17.4, *) {
            // Count time already spent today, so restarting the schedules doesn't hand out extra time.
            return DeviceActivityEvent(
                applications: apps, categories: categories, webDomains: domains,
                threshold: threshold, includesPastActivity: true
            )
        }
        return DeviceActivityEvent(applications: apps, categories: categories, webDomains: domains, threshold: threshold)
    }
}
