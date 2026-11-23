import Foundation

/// Margin's settings, as saved by the web UI (`store.js`).
///
/// The web UI owns the format, so this wraps the raw JSON object and only reads or changes the
/// keys native code needs. Unknown keys pass through untouched. Defaults mirror `defaults()` in
/// `store.js`.
struct MarginState {
    var raw: [String: Any]

    init(json: String?) {
        if let json,
           let data = json.data(using: .utf8),
           let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            raw = object
        } else {
            raw = [:]
        }
        if raw["version"] == nil { raw["version"] = 2 }
    }

    var json: String {
        guard let data = try? JSONSerialization.data(withJSONObject: raw),
              let text = String(data: data, encoding: .utf8) else { return "{\"version\":2}" }
        return text
    }

    // MARK: Basics

    var onboarded: Bool { raw["onboarded"] as? Bool ?? false }
    var name: String { raw["name"] as? String ?? "" }
    var allowance: Int { Self.int(raw["allowance"]) ?? 120 }
    var resetTime: String { raw["resetTime"] as? String ?? "04:00" }

    /// Synthetic IDs for the apps picked in Apple's app picker. Owned by native code on iPhone.
    var tracked: [String] {
        get { raw["tracked"] as? [String] ?? [] }
        set { raw["tracked"] = newValue }
    }

    // MARK: Emergency access

    struct Emergency {
        var enabled: Bool
        var minutes: Int
        var perDay: Int
    }

    var emergency: Emergency {
        let e = raw["emergency"] as? [String: Any] ?? [:]
        return Emergency(
            enabled: e["enabled"] as? Bool ?? true,
            minutes: max(1, Self.int(e["minutes"]) ?? 5),
            perDay: max(0, Self.int(e["perDay"]) ?? 1)
        )
    }

    var emergencyUsed: Int {
        get { Self.int(raw["emergencyUsed"]) ?? 0 }
        set { raw["emergencyUsed"] = newValue }
    }

    var emergencyDay: String {
        get { raw["emergencyDay"] as? String ?? "" }
        set { raw["emergencyDay"] = newValue }
    }

    /// Milliseconds since 1970, like `Date.now()` in JavaScript.
    var emergencyUntil: Double {
        get { (raw["emergencyUntil"] as? NSNumber)?.doubleValue ?? 0 }
        set { raw["emergencyUntil"] = newValue }
    }

    func emergencyActive(now: Date = Date()) -> Bool {
        emergencyUntil > now.timeIntervalSince1970 * 1000
    }

    func emergencyLeft(now: Date = Date()) -> Int {
        let today = TimeUtil.dayKey(resetTime: resetTime, now: now)
        let used = emergencyDay == today ? emergencyUsed : 0
        return max(0, emergency.perDay - used)
    }

    // MARK: Notifications

    struct Notifications {
        var warnings: Bool
        var warnAt: Int
        var dailySummary: Bool
        var weeklyReport: Bool
        var streaks: Bool
    }

    var notifications: Notifications {
        let n = raw["notifications"] as? [String: Any] ?? [:]
        return Notifications(
            warnings: n["warnings"] as? Bool ?? true,
            warnAt: Self.int(n["warnAt"]) ?? 15,
            dailySummary: n["dailySummary"] as? Bool ?? true,
            weeklyReport: n["weeklyReport"] as? Bool ?? true,
            streaks: n["streaks"] as? Bool ?? false
        )
    }

    // MARK: Focus schedules

    struct Focus {
        var id: String
        var name: String
        /// 0 = Sunday … 6 = Saturday, like `Date.getDay()`.
        var days: [Int]
        var start: String
        var end: String
        var enabled: Bool
    }

    var focus: [Focus] {
        let list = raw["focus"] as? [[String: Any]] ?? []
        return list.compactMap { f in
            guard let id = f["id"] as? String else { return nil }
            return Focus(
                id: id,
                name: f["name"] as? String ?? "Focus",
                days: (f["days"] as? [Any] ?? []).compactMap(Self.int),
                start: f["start"] as? String ?? "09:00",
                end: f["end"] as? String ?? "12:00",
                enabled: f["enabled"] as? Bool ?? false
            )
        }
    }

    // MARK: Helpers

    static func int(_ value: Any?) -> Int? {
        if let n = value as? NSNumber { return n.intValue }
        if let s = value as? String { return Int(s) }
        return nil
    }
}
