import Foundation

/// Emergency access: a few minutes with every block lifted, a limited number of times a day.
enum Emergency {
    /// Grants emergency access if any is left today. Used by the block screen's button.
    @discardableResult
    static func grant(now: Date = Date()) -> Bool {
        var state = SharedStore.state
        guard state.emergency.enabled, state.emergencyLeft(now: now) > 0 else { return false }
        let today = TimeUtil.dayKey(resetTime: state.resetTime, now: now)
        state.emergencyUsed = (state.emergencyDay == today ? state.emergencyUsed : 0) + 1
        state.emergencyDay = today
        let end = now.addingTimeInterval(TimeInterval(state.emergency.minutes * 60))
        state.emergencyUntil = end.timeIntervalSince1970 * 1000
        SharedStore.state = state
        begin(until: end)
        return true
    }

    /// Lifts the blocks now and puts them back at `end`.
    static func begin(until end: Date) {
        Shields.apply()
        Scheduler.scheduleEmergencyEnd(at: end)
    }
}
