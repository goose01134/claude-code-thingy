import FamilyControls
import ManagedSettings
import SwiftUI

/// The Applications tab on iPhone. Mirrors `web/js/screens/apps.js`, but the apps come from
/// Apple's app picker and their names and icons are drawn by Screen Time.
struct AppsScreen: View {
    @ObservedObject var model: AppModel
    @State private var editing: AppRule?

    var body: some View {
        let p = model.palette
        let s = model.state
        let sel = model.selection
        let count = sel.applicationTokens.count + sel.categoryTokens.count + sel.webDomainTokens.count

        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ScreenHeader(
                    p: p,
                    eyebrow: "\(count) \(count == 1 ? "app counts" : "apps count") toward your allowance",
                    title: "Applications"
                ) {
                    Button { model.pickApps() } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(Color(p.ink))
                            .frame(width: 40, height: 40)
                            .background(Circle().fill(Color(p.surface)))
                            .overlay(Circle().stroke(Color(p.hairline), lineWidth: 1))
                    }
                    .accessibilityLabel("Choose apps")
                }

                HStack(alignment: .top) {
                    metric(p, "Daily allowance", TimeUtil.fmt(s.allowance))
                    metric(p, "Used today", TimeUtil.fmt(model.usage.total))
                    metric(p, "Apps counted", "\(count)")
                }
                .padding(.bottom, 30)

                if !model.authorized {
                    notice(
                        p,
                        title: "Allow Screen Time access",
                        body: "Margin uses Apple’s Screen Time to measure and limit apps. Nothing leaves your phone.",
                        button: "Allow access"
                    ) { model.openPermission("usage") }
                } else if sel.isEmptySelection {
                    notice(
                        p,
                        title: "No apps are counted yet",
                        body: "Choose the apps that take up your time. Apple keeps the list private: Margin can limit these apps but never sees which ones they are.",
                        button: "Choose apps"
                    ) { model.pickApps() }
                } else {
                    GroupLabel(p: p, text: "Counted")
                    MarginCard(p: p, padding: 0) {
                        VStack(spacing: 0) {
                            ForEach(Array(model.rules.enumerated()), id: \.element.id) { i, rule in
                                if i > 0 { divider(p) }
                                Button { editing = rule } label: { appRow(p, rule: rule, allowance: s.allowance) }
                                    .buttonStyle(.plain)
                            }
                            ForEach(Array(sel.categoryTokens.enumerated()), id: \.offset) { i, token in
                                if i > 0 || !model.rules.isEmpty { divider(p) }
                                tokenRow(p, label: Label(token), sub: "Whole category · shares your allowance")
                            }
                            ForEach(Array(sel.webDomainTokens.enumerated()), id: \.offset) { i, token in
                                if i > 0 || !model.rules.isEmpty || !sel.categoryTokens.isEmpty { divider(p) }
                                tokenRow(p, label: Label(token), sub: "Website · shares your allowance")
                            }
                        }
                    }
                    Footnote(
                        p: p,
                        text: "Counted apps share your \(TimeUtil.fmt(s.allowance)) daily allowance. Tap one to give it a tighter limit of its own."
                    )
                    Button { model.pickApps() } label: {
                        Text("Change apps")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(Color(p.ink))
                            .frame(maxWidth: .infinity, minHeight: 50)
                            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color(p.surface2)))
                    }
                    .padding(.top, 20)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 24)
        }
        .background(Color(p.bg).ignoresSafeArea(.container, edges: .top))
        .sheet(item: $editing) { rule in
            AppLimitSheet(model: model, rule: rule)
                .environment(\.colorScheme, model.dark ? .dark : .light)
        }
    }

    private func metric(_ p: Palette, _ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.system(size: 12, weight: .medium)).foregroundColor(Color(p.ink3)).lineLimit(1)
            Text(value).font(.system(size: 18, weight: .semibold)).monospacedDigit().foregroundColor(Color(p.ink))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func divider(_ p: Palette) -> some View {
        Rectangle().fill(Color(p.hairline)).frame(height: 1).padding(.leading, 16)
    }

    private func appRow(_ p: Palette, rule: AppRule, allowance: Int) -> some View {
        let reached = model.state.tracked.isEmpty ? false : SharedStore.flags.appsReached.contains(rule.id)
        let sub: String
        if let limit = rule.limit, limit < allowance {
            sub = "Own limit: \(TimeUtil.fmt(limit)) a day" + (rule.strict ? "" : " · reminder only")
        } else {
            sub = "Shares your daily allowance"
        }
        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Label(rule.token)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(Color(p.ink))
                        .lineLimit(1)
                    if reached {
                        Text("Limit reached")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(p.warn))
                            .padding(.horizontal, 7).padding(.vertical, 3)
                            .background(Capsule().fill(Color(p.warnSoft)))
                    }
                }
                Text(sub).font(.system(size: 13)).foregroundColor(Color(p.ink3))
            }
            Spacer(minLength: 8)
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Color(p.ink3).opacity(0.7))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .contentShape(Rectangle())
    }

    private func tokenRow<L: View>(_ p: Palette, label: L, sub: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            label
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(Color(p.ink))
                .lineLimit(1)
            Text(sub).font(.system(size: 13)).foregroundColor(Color(p.ink3))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private func notice(_ p: Palette, title: String, body: String, button: String, action: @escaping () -> Void) -> some View {
        MarginCard(p: p, padding: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Text(title).font(.system(size: 17, weight: .semibold)).foregroundColor(Color(p.ink))
                Text(body).font(.system(size: 15)).foregroundColor(Color(p.ink2)).lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
                Button(action: action) {
                    Text(button)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(Color(p.accentInk))
                        .frame(maxWidth: .infinity, minHeight: 50)
                        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color(p.accent)))
                }
                .padding(.top, 10)
            }
        }
    }
}

/// An app's own limit, like the detail sheet in `apps.js`.
struct AppLimitSheet: View {
    @ObservedObject var model: AppModel
    @State var rule: AppRule
    @Environment(\.dismiss) private var dismiss

    private let step = 5

    var body: some View {
        let p = model.palette
        let allowance = model.state.allowance
        let limit = min(rule.limit ?? allowance, allowance)
        let custom = rule.limit.map { $0 < allowance } ?? false

        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Label(rule.token)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(Color(p.ink))
                    .lineLimit(1)
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color(p.ink2))
                        .frame(width: 30, height: 30)
                        .background(Circle().fill(Color(p.surface2)))
                }
                .accessibilityLabel("Close")
            }
            .padding(.bottom, 22)

            GroupLabel(p: p, text: "Daily limit")
            MarginCard(p: p, padding: 0) {
                VStack(spacing: 0) {
                    HStack {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Limit").font(.system(size: 16, weight: .medium)).foregroundColor(Color(p.ink))
                            Text(custom ? "A tighter limit of its own" : "Same as your daily allowance")
                                .font(.system(size: 13)).foregroundColor(Color(p.ink3))
                        }
                        Spacer()
                        stepButton(p, "minus", disabled: limit <= step) {
                            rule.limit = max(step, limit - step)
                        }
                        Text(TimeUtil.fmt(limit))
                            .font(.system(size: 16, weight: .semibold))
                            .monospacedDigit()
                            .foregroundColor(Color(p.ink))
                            .frame(minWidth: 62)
                        stepButton(p, "plus", disabled: !custom) {
                            let next = limit + step
                            rule.limit = next >= allowance ? nil : next
                        }
                    }
                    .padding(16)
                    Rectangle().fill(Color(p.hairline)).frame(height: 1).padding(.leading, 16)
                    Toggle(isOn: $rule.strict) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Lock when limit is reached").font(.system(size: 16, weight: .medium)).foregroundColor(Color(p.ink))
                            Text("Otherwise you’ll just get a reminder").font(.system(size: 13)).foregroundColor(Color(p.ink3))
                        }
                    }
                    .tint(Color(p.accent))
                    .padding(16)
                }
            }
            Footnote(p: p, text: "Screen Time counts this app’s time from your reset time each day.")

            Spacer()

            Button {
                model.update(rule)
                dismiss()
            } label: {
                Text("Done")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(p.accentInk))
                    .frame(maxWidth: .infinity, minHeight: 50)
                    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color(p.accent)))
            }
        }
        .padding(20)
        .background(Color(p.bg).ignoresSafeArea())
        .presentationDetents([.medium, .large])
    }

    private func stepButton(_ p: Palette, _ symbol: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Color(disabled ? p.ink3 : p.ink))
                .frame(width: 34, height: 34)
                .background(Circle().fill(Color(p.surface2)))
        }
        .disabled(disabled)
    }
}
