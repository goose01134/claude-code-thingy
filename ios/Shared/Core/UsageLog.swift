import Foundation

/// Minutes spent in counted apps, as reported by Screen Time.
///
/// Apple never tells Margin exact usage outside its report view. Instead the monitor extension
/// registers thresholds (5, 10, 15… minutes) and Screen Time calls back as each one is crossed,
/// so these totals move in steps of a few minutes.
struct UsageLog: Codable {
    struct DayTotal: Codable {
        var key: String
        var total: Int
    }

    var dayKey = ""
    var total = 0
    var hourly = [Int](repeating: 0, count: 24)
    /// Completed days, oldest first.
    var history: [DayTotal] = []

    /// Starts a new day if `key` is not the current one. Returns the day that just finished.
    @discardableResult
    mutating func roll(to key: String) -> DayTotal? {
        guard dayKey != key else { return nil }
        var finished: DayTotal?
        if !dayKey.isEmpty {
            let done = DayTotal(key: dayKey, total: total)
            history.removeAll { $0.key == dayKey }
            history.append(done)
            if history.count > 70 { history.removeFirst(history.count - 70) }
            finished = done
        }
        dayKey = key
        total = 0
        hourly = [Int](repeating: 0, count: 24)
        return finished
    }

    /// Screen Time reported that today's total has reached `minutes`.
    mutating func record(minutes: Int, at date: Date = Date()) {
        guard minutes > total else { return }
        let hour = Calendar.current.component(.hour, from: date)
        hourly[hour] += minutes - total
        total = minutes
    }

    func total(forKey key: String) -> Int {
        if key == dayKey { return total }
        return history.last(where: { $0.key == key })?.total ?? 0
    }

    var firstKey: String? { history.first?.key ?? (dayKey.isEmpty ? nil : dayKey) }

    /// Consecutive finished days, most recent first, that stayed within `allowance`.
    func streak(allowance: Int) -> Int {
        var count = 0
        for day in history.reversed() {
            guard day.total <= allowance else { break }
            count += 1
        }
        return count
    }

    /// The shape `refreshUsage()` in `store.js` expects, plus the iPhone-only `total` and `dayTotals`.
    func payload(resetTime: String, now: Date = Date()) -> [String: Any] {
        let todayKey = TimeUtil.dayKey(resetTime: resetTime, now: now)
        let isToday = dayKey == todayKey
        let dayTotals = (1...6).reversed().map { total(forKey: TimeUtil.dayKey(daysBack: $0, resetTime: resetTime, now: now)) }

        // Average per day for the five weeks before the last six days, oldest first.
        // Weeks from before Margin had any data are 0, which the web UI drops.
        var weeks: [Int] = []
        for k in (1...5).reversed() {
            let keys = (7 * k..<7 * k + 7).map { TimeUtil.dayKey(daysBack: $0, resetTime: resetTime, now: now) }
            if let first = firstKey, let newest = keys.first, newest >= first {
                weeks.append(Int((Double(keys.reduce(0) { $0 + total(forKey: $1) }) / 7).rounded()))
            } else {
                weeks.append(0)
            }
        }

        return [
            "today": [String: Any](),
            "days": [[String: Any]](repeating: [:], count: 6),
            "hourly": isToday ? hourly : [Int](repeating: 0, count: 24),
            "weeks": weeks,
            "total": isToday ? total : 0,
            "dayTotals": dayTotals,
        ]
    }
}
