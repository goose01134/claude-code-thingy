import FamilyControls
import Foundation
import ManagedSettings

/// Turns Margin's rules into Apple's block screens ("shields").
enum Shields {
    private static let store = ManagedSettingsStore()

    /// Works out what should be blocked right now and applies it. Safe to call any time.
    static func apply(now: Date = Date()) {
        let state = SharedStore.state
        let flags = refreshedFlags(state: state, now: now)
        let selection = SharedStore.selection

        var apps = Set<ApplicationToken>()
        var categories = Set<ActivityCategoryToken>()
        var domains = Set<WebDomainToken>()

        if !state.emergencyActive(now: now) {
            if flags.dailyReached || !flags.focusActive.isEmpty {
                apps = selection.applicationTokens
                categories = selection.categoryTokens
                domains = selection.webDomainTokens
            }
            for rule in SharedStore.rules where rule.strict && flags.appsReached.contains(rule.id) {
                apps.insert(rule.token)
            }
        }

        store.shield.applications = apps.isEmpty ? nil : apps
        store.shield.applicationCategories = categories.isEmpty ? nil : .specific(categories)
        store.shield.webDomains = domains.isEmpty ? nil : domains
        store.shield.webDomainCategories = categories.isEmpty ? nil : .specific(categories)
    }

    /// Removes every block, e.g. when the user picks no apps at all.
    static func clear() {
        store.clearAllSettings()
    }

    /// The flags for today, starting a fresh day if the reset time has passed.
    @discardableResult
    static func refreshedFlags(state: MarginState, now: Date = Date()) -> ShieldFlags {
        var flags = SharedStore.flags
        let key = TimeUtil.dayKey(resetTime: state.resetTime, now: now)
        if flags.dayKey != key {
            flags.dayKey = key
            flags.dailyReached = false
            flags.appsReached = []
            SharedStore.flags = flags
        }
        return flags
    }

    /// Re-derives the allowance flags from today's usage, after settings changed in the app.
    static func syncWithUsage(now: Date = Date()) {
        let state = SharedStore.state
        var flags = refreshedFlags(state: state, now: now)
        var usage = SharedStore.usage
        usage.roll(to: TimeUtil.dayKey(resetTime: state.resetTime, now: now))
        SharedStore.usage = usage
        flags.dailyReached = !state.tracked.isEmpty && usage.total >= state.allowance

        // Per-app limits that changed are re-checked by Screen Time once monitoring restarts.
        let limited = Set(SharedStore.rules.filter { $0.limit != nil }.map(\.id))
        flags.appsReached = flags.appsReached.filter { limited.contains($0) }

        // Focus schedules that are on right now.
        flags.focusActive = state.focus.filter { isActive($0, now: now) }.map(\.id)
        SharedStore.flags = flags
    }

    /// Whether a focus schedule covers `now`. Mirrors `activeFocus()` in `store.js`.
    static func isActive(_ f: MarginState.Focus, now: Date) -> Bool {
        guard f.enabled else { return false }
        let mins = Calendar.current.component(.hour, from: now) * 60 + Calendar.current.component(.minute, from: now)
        let today = TimeUtil.weekday(now)
        let yesterday = (today + 6) % 7
        let s = TimeUtil.minutes(f.start), e = TimeUtil.minutes(f.end)
        if s < e { return f.days.contains(today) && mins >= s && mins < e }
        if s > e { return (f.days.contains(today) && mins >= s) || (f.days.contains(yesterday) && mins < e) }
        return false
    }
}
