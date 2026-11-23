import FamilyControls
import SwiftUI

/// The Statistics screen's content, styled like `web/js/screens/stats.js`.

private var palette: Palette { Palette.of(dark: SharedStore.themeDark) }

struct TodayView: View {
    let summary: UsageSummary

    var body: some View {
        let p = palette
        let hours = summary.buckets.map { $0 / 60 }
        let peak = hours.indices.max(by: { hours[$0] < hours[$1] }) ?? 0
        let used = summary.total.minutes
        let sub = used > 0
            ? "Most active around \(TimeUtil.clockLabel(String(format: "%02d:00", peak))) · \(summary.pickups) \(summary.pickups == 1 ? "open" : "opens")"
            : "No time in counted apps yet today"

        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HeroStat(p: p, label: "Today so far", value: TimeUtil.fmt(used), sub: sub)
                MarginCard(p: p) {
                    BarChart(
                        p: p, values: hours,
                        labels: (0..<24).map { [0: "12 AM", 6: "6 AM", 12: "12 PM", 18: "6 PM"][$0] ?? "" },
                        highlight: Calendar.current.component(.hour, from: Date())
                    )
                }
                SectionHead(p: p, title: "Most used", note: "Today")
                AppList(p: p, apps: summary.apps, total: summary.total)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .background(Color(p.bg))
    }
}

struct WeekView: View {
    let summary: UsageSummary

    var body: some View {
        let p = palette
        let allowance = SharedStore.state.allowance
        let days = summary.buckets.map { $0 / 60 }
        let full = Array(days.prefix(6))
        let average = Int((full.reduce(0, +) / 6).rounded())
        let within = full.filter { $0 <= Double(allowance) }.count
        let best = full.min() ?? 0
        let labels: [String] = (0..<7).map { i in
            if i == 6 { return "Today" }
            let date = Calendar.current.date(byAdding: .day, value: i - 6, to: Date()) ?? Date()
            return date.formatted(.dateTime.weekday(.abbreviated))
        }
        let bestIndex = full.firstIndex(of: best) ?? 0
        let sub = average <= allowance
            ? "\(TimeUtil.fmt(allowance - average)) under your \(TimeUtil.fmt(allowance)) allowance"
            : "\(TimeUtil.fmt(average - allowance)) over your \(TimeUtil.fmt(allowance)) allowance"

        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HeroStat(p: p, label: "Daily average", value: TimeUtil.fmt(average), sub: sub)
                MarginCard(p: p) {
                    BarChart(p: p, values: days, labels: labels, highlight: 6, limit: Double(allowance))
                }
                HStack(spacing: 10) {
                    StatTile(p: p, label: "Best day", value: TimeUtil.fmt(Int(best.rounded())), sub: labels[bestIndex])
                    StatTile(p: p, label: "On target", value: "\(within) of 6", sub: "days this week")
                    StatTile(p: p, label: "Opens", value: "\(summary.pickups)", sub: "last 7 days")
                }
                .padding(.top, 12)
                SectionHead(p: p, title: "Most used", note: "Last 7 days")
                AppList(p: p, apps: summary.apps, total: summary.total)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .background(Color(p.bg))
    }
}

struct AppList: View {
    let p: Palette
    let apps: [AppUsage]
    let total: TimeInterval

    var body: some View {
        if apps.isEmpty {
            MarginCard(p: p) {
                Text("Counted apps will appear here.")
                    .font(.system(size: 15))
                    .foregroundColor(Color(p.ink3))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            }
        } else {
            let top = max(apps.first?.seconds ?? 1, 1)
            MarginCard(p: p, padding: 0) {
                VStack(spacing: 0) {
                    ForEach(Array(apps.prefix(15).enumerated()), id: \.element.id) { i, app in
                        if i > 0 { Divider().overlay(Color(p.hairline)).padding(.leading, 46) }
                        HStack(spacing: 12) {
                            Text("\(i + 1)")
                                .font(.system(size: 13, weight: .semibold))
                                .monospacedDigit()
                                .foregroundColor(Color(p.ink3))
                                .frame(width: 18)
                            VStack(alignment: .leading, spacing: 6) {
                                appName(app)
                                ProgressLine(p: p, fraction: app.seconds / top, tint: i == 0 ? p.accent : p.ink3)
                                Text("\(app.pickups) \(app.pickups == 1 ? "open" : "opens") · \(Int((app.seconds / max(total, 1) * 100).rounded()))% of total")
                                    .font(.system(size: 13))
                                    .foregroundColor(Color(p.ink3))
                            }
                            Text(TimeUtil.fmt(app.seconds.minutes))
                                .font(.system(size: 15, weight: .semibold))
                                .monospacedDigit()
                                .foregroundColor(Color(p.ink))
                                .frame(minWidth: 46, alignment: .trailing)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func appName(_ app: AppUsage) -> some View {
        if let token = app.token {
            Label(token)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(Color(p.ink))
                .lineLimit(1)
        } else {
            Text(app.name)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(Color(p.ink))
                .lineLimit(1)
        }
    }
}
