import Foundation

/// Date helpers that mirror `util.js`, so native code and the web UI agree on what "today" is.
enum TimeUtil {
    static func parseHM(_ hm: String) -> (h: Int, m: Int) {
        let parts = hm.split(separator: ":")
        let h = parts.count > 0 ? Int(parts[0]) ?? 0 : 0
        let m = parts.count > 1 ? Int(parts[1]) ?? 0 : 0
        return (h, m)
    }

    static func minutes(_ hm: String) -> Int {
        let t = parseHM(hm)
        return t.h * 60 + t.m
    }

    /// The start of the Margin day containing `now`. Days begin at the reset time.
    static func dayStart(resetTime: String, now: Date = Date()) -> Date {
        let cal = Calendar.current
        let t = parseHM(resetTime)
        var start = cal.date(bySettingHour: t.h, minute: t.m, second: 0, of: now) ?? now
        if start > now { start = cal.date(byAdding: .day, value: -1, to: start) ?? start }
        return start
    }

    /// "2026-11-18" for the Margin day containing `now`. Mirrors `dayKey()` in `util.js`.
    static func dayKey(resetTime: String, now: Date = Date()) -> String {
        key(for: dayStart(resetTime: resetTime, now: now))
    }

    /// The key of the day `daysBack` days before the day containing `now`.
    static func dayKey(daysBack: Int, resetTime: String, now: Date = Date()) -> String {
        let start = dayStart(resetTime: resetTime, now: now)
        let day = Calendar.current.date(byAdding: .day, value: -daysBack, to: start) ?? start
        return key(for: day)
    }

    static func key(for date: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    /// 0 = Sunday … 6 = Saturday, like `Date.getDay()` in JavaScript.
    static func weekday(_ date: Date) -> Int {
        Calendar.current.component(.weekday, from: date) - 1
    }

    /// 73 -> "1h 13m", 47 -> "47m", 120 -> "2h"
    static func fmt(_ minutes: Int) -> String {
        let m = max(0, minutes)
        let h = m / 60, r = m % 60
        if h == 0 { return "\(r)m" }
        if r == 0 { return "\(h)h" }
        return "\(h)h \(r)m"
    }

    /// 73 -> "1 hour 13 minutes"
    static func fmtLong(_ minutes: Int) -> String {
        let m = max(0, minutes)
        let h = m / 60, r = m % 60
        var parts: [String] = []
        if h > 0 { parts.append("\(h) \(h == 1 ? "hour" : "hours")") }
        if r > 0 || h == 0 { parts.append("\(r) \(r == 1 ? "minute" : "minutes")") }
        return parts.joined(separator: " ")
    }

    /// "04:00" -> "4:00 AM"
    static func clockLabel(_ hm: String) -> String {
        let t = parseHM(hm)
        let h12 = t.h % 12 == 0 ? 12 : t.h % 12
        return String(format: "%d:%02d %@", h12, t.m, t.h < 12 ? "AM" : "PM")
    }
}
