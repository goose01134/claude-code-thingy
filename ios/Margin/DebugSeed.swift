#if DEBUG
import Foundation

/// Sample data for simulator screenshots, driven by launch arguments. Debug builds only.
///
/// - `-MarginReset YES`: start from a fresh install (shows the setup tutorial).
/// - `-MarginSeed YES`: a set-up Margin with a few days of usage.
/// - `-MarginFakeAuth YES`: behave as if Screen Time access were granted.
/// - `-MarginRoute apps|stats|settings`: open that tab.
enum DebugSeed {
    static func applyIfRequested() {
        let args = UserDefaults.standard
        if args.bool(forKey: "MarginReset") {
            for key in SharedStore.defaults.dictionaryRepresentation().keys {
                SharedStore.defaults.removeObject(forKey: key)
            }
        }
        guard args.bool(forKey: "MarginSeed") else { return }

        let state: [String: Any] = [
            "version": 2,
            "onboarded": true,
            "name": "Sam",
            "allowance": 90,
            "resetTime": "04:00",
            "theme": "system",
            "tracked": ["a1", "a2", "a3", "a4"],
            "limits": [String: Any](),
            "strict": [String: Any](),
            "emergencyUsed": 0,
            "emergencyDay": "",
            "emergencyUntil": 0,
        ]
        if let data = try? JSONSerialization.data(withJSONObject: state) {
            SharedStore.stateJSON = String(data: data, encoding: .utf8)
        }

        var usage = UsageLog()
        for back in (1...13).reversed() {
            usage.roll(to: TimeUtil.dayKey(daysBack: back, resetTime: "04:00"))
            usage.total = [74, 96, 88, 61, 79, 102, 83, 70, 58, 92, 66, 81, 63][13 - back]
        }
        usage.roll(to: TimeUtil.dayKey(resetTime: "04:00"))
        usage.hourly = [0, 0, 0, 0, 0, 0, 0, 3, 6, 2, 0, 4, 7, 3, 0, 2, 5, 4, 6, 5, 0, 0, 0, 0]
        usage.total = usage.hourly.reduce(0, +)
        SharedStore.usage = usage
    }
}
#endif
