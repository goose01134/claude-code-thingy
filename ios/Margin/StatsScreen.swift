import DeviceActivity
import SwiftUI

/// The Statistics tab on iPhone. The charts and app list are drawn by the report extension
/// (`MarginReport`), the only place Apple shares real usage numbers.
struct StatsScreen: View {
    @ObservedObject var model: AppModel
    @State private var today = false

    var body: some View {
        let p = model.palette

        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                ScreenHeader(p: p, eyebrow: "Your habits", title: "Statistics")
                Picker("Range", selection: $today) {
                    Text("Day").tag(true)
                    Text("Week").tag(false)
                }
                .pickerStyle(.segmented)
                .padding(.bottom, 8)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)

            if !model.authorized {
                message(p, "Allow Screen Time access to see where your time goes.", button: "Allow access") {
                    model.openPermission("usage")
                }
            } else if model.selection.isEmptySelection {
                message(p, "Counted apps will appear here once you choose them.", button: "Choose apps") {
                    model.pickApps()
                }
            } else {
                DeviceActivityReport(today ? .today : .week, filter: model.filter(today: today))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Color(p.bg).ignoresSafeArea(.container, edges: .top))
    }

    private func message(_ p: Palette, _ text: String, button: String, action: @escaping () -> Void) -> some View {
        VStack(spacing: 14) {
            Text(text)
                .font(.system(size: 15))
                .foregroundColor(Color(p.ink2))
                .multilineTextAlignment(.center)
            Button(action: action) {
                Text(button)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Color(p.accentInk))
                    .padding(.horizontal, 22)
                    .frame(minHeight: 44)
                    .background(Capsule().fill(Color(p.accent)))
            }
        }
        .padding(.horizontal, 32)
        .padding(.top, 60)
        .frame(maxWidth: .infinity)
    }
}
