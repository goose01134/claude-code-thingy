import DeviceActivity
import Foundation

/// Screen Time wakes this extension at the reset time, at each usage threshold, and when focus
/// schedules start or end. It keeps the usage log up to date and decides what to block.
final class MonitorExtension: DeviceActivityMonitor {
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        // Callbacks can arrive a moment early, so look a minute ahead when deciding which day it is.
        let now = Date().addingTimeInterval(60)
        let state = SharedStore.state

        switch activity {
        case .daily:
            startDay(state: state, now: now)
        case .summary:
            sendSummary(state: state)
        case .weekly:
            sendWeekly(state: state)
        case .emergency:
            Scheduler.stopEmergency()
        default:
            if let id = focusID(activity), let f = state.focus.first(where: { $0.id == id }),
               f.enabled, f.days.contains(TimeUtil.weekday(now)) {
                var flags = Shields.refreshedFlags(state: state, now: now)
                if !flags.focusActive.contains(id) { flags.focusActive.append(id) }
                SharedStore.flags = flags
            }
        }
        Shields.apply()
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        if let id = focusID(activity) {
            var flags = SharedStore.flags
            flags.focusActive.removeAll { $0 == id }
            SharedStore.flags = flags
        }
        Shields.apply()
    }

    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        let now = Date()
        let state = SharedStore.state
        let name = event.rawValue
        var usage = SharedStore.usage
        usage.roll(to: TimeUtil.dayKey(resetTime: state.resetTime, now: now))
        var flags = Shields.refreshedFlags(state: state, now: now)

        if name.hasPrefix("t."), let minutes = Int(name.dropFirst(2)) {
            usage.record(minutes: minutes, at: now)
            if minutes >= state.allowance { flags.dailyReached = true }
        } else if name == "w" {
            if flags.warnedDay != flags.dayKey, !flags.dailyReached {
                flags.warnedDay = flags.dayKey
                let left = state.notifications.warnAt
                Notifier.post(
                    id: "warning",
                    title: "\(TimeUtil.fmt(left)) left today",
                    body: "Your allowance is nearly spent. A good moment to wrap up."
                )
            }
        } else if name.hasPrefix("a.") {
            let id = String(name.dropFirst(2))
            if let rule = SharedStore.rules.first(where: { $0.id == id }) {
                if rule.strict {
                    if !flags.appsReached.contains(id) { flags.appsReached.append(id) }
                } else {
                    Notifier.post(
                        id: "limit-\(id)",
                        title: "Limit reached",
                        body: "You’ve used the \(TimeUtil.fmtLong(rule.limit ?? state.allowance)) you set for one of your apps today."
                    )
                }
            }
        }

        SharedStore.usage = usage
        SharedStore.flags = flags
        Shields.apply(now: now)
    }

    // MARK: Helpers

    private func focusID(_ activity: DeviceActivityName) -> String? {
        let raw = activity.rawValue
        guard raw.hasPrefix(DeviceActivityName.focusPrefix) else { return nil }
        return String(raw.dropFirst(DeviceActivityName.focusPrefix.count))
    }

    /// The reset time: archive yesterday, clear the blocks, and celebrate a streak if asked to.
    private func startDay(state: MarginState, now: Date) {
        var usage = SharedStore.usage
        let finished = usage.roll(to: TimeUtil.dayKey(resetTime: state.resetTime, now: now))
        SharedStore.usage = usage
        Shields.refreshedFlags(state: state, now: now)

        guard let finished, state.notifications.streaks, !state.tracked.isEmpty,
              finished.total <= state.allowance else { return }
        let streak = usage.streak(allowance: state.allowance)
        Notifier.post(
            id: "streak",
            title: streak > 1 ? "\(streak) days in a row" : "Within your allowance",
            body: streak > 1
                ? "You’ve stayed within your allowance \(streak) days running. Nicely done."
                : "Yesterday you stayed within your allowance. Nicely done."
        )
    }

    private func sendSummary(state: MarginState) {
        guard state.notifications.dailySummary, !state.tracked.isEmpty else { return }
        let usage = SharedStore.usage
        let used = usage.dayKey == TimeUtil.dayKey(resetTime: state.resetTime) ? usage.total : 0
        let body = used <= state.allowance
            ? "\(TimeUtil.fmt(used)) in counted apps today, \(TimeUtil.fmt(state.allowance - used)) under your allowance."
            : "\(TimeUtil.fmt(used)) in counted apps today."
        Notifier.post(id: "summary", title: "Today in Margin", body: body)
    }

    private func sendWeekly(state: MarginState) {
        guard state.notifications.weeklyReport, !state.tracked.isEmpty else { return }
        let usage = SharedStore.usage
        let days = (1...7).map { usage.total(forKey: TimeUtil.dayKey(daysBack: $0, resetTime: state.resetTime)) }
        let average = Int((Double(days.reduce(0, +)) / 7).rounded())
        let within = days.filter { $0 <= state.allowance }.count
        Notifier.post(
            id: "weekly",
            title: "Your week in Margin",
            body: "About \(TimeUtil.fmt(average)) a day in counted apps. Within your allowance on \(within) of 7 days."
        )
    }
}
