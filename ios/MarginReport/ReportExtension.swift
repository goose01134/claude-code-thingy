import DeviceActivity
import ManagedSettings
import SwiftUI

/// Draws the Statistics screen. Apple only shares real usage numbers inside this extension, which
/// can't send them anywhere, not even back to the Margin app.
@main
struct MarginReport: DeviceActivityReportExtension {
    var body: some DeviceActivityReportScene {
        TodayReport { TodayView(summary: $0) }
        WeekReport { WeekView(summary: $0) }
    }
}

struct TodayReport: DeviceActivityReportScene {
    let context: DeviceActivityReport.Context = .today
    let content: (UsageSummary) -> TodayView

    func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> UsageSummary {
        await UsageSummary.build(from: data, hourly: true)
    }
}

struct WeekReport: DeviceActivityReportScene {
    let context: DeviceActivityReport.Context = .week
    let content: (UsageSummary) -> WeekView

    func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> UsageSummary {
        await UsageSummary.build(from: data, hourly: false)
    }
}

struct AppUsage: Identifiable {
    let id: String
    let token: ApplicationToken?
    let name: String
    var seconds: TimeInterval
    var pickups: Int
}

/// Usage grouped into 24 hours (today) or 7 days (this week), plus the most used apps.
struct UsageSummary {
    var hourly: Bool
    var total: TimeInterval = 0
    var buckets: [TimeInterval]
    var pickups = 0
    var apps: [AppUsage] = []

    init(hourly: Bool) {
        self.hourly = hourly
        buckets = [TimeInterval](repeating: 0, count: hourly ? 24 : 7)
    }

    static func build(from data: DeviceActivityResults<DeviceActivityData>, hourly: Bool) async -> UsageSummary {
        var summary = UsageSummary(hourly: hourly)
        var byApp: [String: AppUsage] = [:]
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())

        for await item in data {
            for await segment in item.activitySegments {
                let start = segment.dateInterval.start
                let index: Int
                if hourly {
                    index = cal.component(.hour, from: start)
                } else {
                    let back = cal.dateComponents([.day], from: cal.startOfDay(for: start), to: today).day ?? 0
                    index = 6 - back
                }
                if summary.buckets.indices.contains(index) {
                    summary.buckets[index] += segment.totalActivityDuration
                }
                summary.total += segment.totalActivityDuration

                for await category in segment.categories {
                    for await app in category.applications {
                        let token = app.application.token
                        let key = token.map { TokenID.of($0) } ?? app.application.bundleIdentifier ?? "app"
                        var entry = byApp[key] ?? AppUsage(
                            id: key, token: token,
                            name: app.application.localizedDisplayName ?? "App",
                            seconds: 0, pickups: 0
                        )
                        entry.seconds += app.totalActivityDuration
                        entry.pickups += app.numberOfPickups
                        byApp[key] = entry
                        summary.pickups += app.numberOfPickups
                    }
                }
            }
        }
        summary.apps = byApp.values.filter { $0.seconds >= 30 }.sorted { $0.seconds > $1.seconds }
        return summary
    }
}

extension TimeInterval {
    var minutes: Int { Int((self / 60).rounded()) }
}
