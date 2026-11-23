import SwiftUI

/// Small SwiftUI building blocks styled like the web UI (`web/css/components.css`).
/// Used by the native Applications and Statistics screens.

struct ScreenHeader<Trailing: View>: View {
    let p: Palette
    let eyebrow: String
    let title: String
    @ViewBuilder var trailing: () -> Trailing

    var body: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 4) {
                Text(eyebrow)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color(p.ink3))
                Text(title)
                    .font(.system(size: 30, weight: .bold))
                    .tracking(-0.8)
                    .foregroundColor(Color(p.ink))
            }
            Spacer(minLength: 12)
            trailing()
        }
        .frame(minHeight: 56, alignment: .bottom)
        .padding(.top, 8)
        .padding(.bottom, 26)
    }
}

extension ScreenHeader where Trailing == EmptyView {
    init(p: Palette, eyebrow: String, title: String) {
        self.init(p: p, eyebrow: eyebrow, title: title) { EmptyView() }
    }
}

struct MarginCard<Content: View>: View {
    let p: Palette
    var padding: CGFloat = 16
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(p.surface))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color(p.hairline), lineWidth: 1))
    }
}

struct GroupLabel: View {
    let p: Palette
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(Color(p.ink3))
            .padding(.horizontal, 4)
            .padding(.bottom, 8)
    }
}

struct Footnote: View {
    let p: Palette
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 13))
            .foregroundColor(Color(p.ink3))
            .lineSpacing(2)
            .padding(.horizontal, 4)
            .padding(.top, 8)
            .fixedSize(horizontal: false, vertical: true)
    }
}

struct SectionHead: View {
    let p: Palette
    let title: String
    var note: String? = nil

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.system(size: 19, weight: .semibold))
                .foregroundColor(Color(p.ink))
            Spacer()
            if let note {
                Text(note).font(.system(size: 13)).foregroundColor(Color(p.ink3))
            }
        }
        .padding(.top, 28)
        .padding(.bottom, 12)
    }
}

struct HeroStat: View {
    let p: Palette
    let label: String
    let value: String
    let sub: String

    var body: some View {
        VStack(spacing: 6) {
            Text(label)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color(p.ink3))
            Text(value)
                .font(.system(size: 44, weight: .bold))
                .monospacedDigit()
                .tracking(-1.2)
                .foregroundColor(Color(p.ink))
            Text(sub)
                .font(.system(size: 14))
                .foregroundColor(Color(p.ink2))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 18)
    }
}

struct StatTile: View {
    let p: Palette
    let label: String
    let value: String
    var sub: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.system(size: 12, weight: .medium)).foregroundColor(Color(p.ink3))
            Text(value).font(.system(size: 20, weight: .semibold)).monospacedDigit().foregroundColor(Color(p.ink))
            if let sub {
                Text(sub).font(.system(size: 12)).foregroundColor(Color(p.ink3)).lineLimit(1)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(p.surface))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Color(p.hairline), lineWidth: 1))
    }
}

struct ProgressLine: View {
    let p: Palette
    let fraction: Double
    var tint: UIColor? = nil

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color(p.surface2))
                Capsule()
                    .fill(Color(tint ?? p.accent))
                    .frame(width: max(4, geo.size.width * min(1, max(0, fraction))))
            }
        }
        .frame(height: 4)
    }
}

/// Vertical bars with optional labels, a highlighted bar and a dashed limit line.
struct BarChart: View {
    let p: Palette
    let values: [Double]
    let labels: [String]
    var highlight: Int? = nil
    var limit: Double? = nil
    var height: CGFloat = 150

    var body: some View {
        let top = max(values.max() ?? 0, limit ?? 0, 1) * 1.1
        VStack(spacing: 8) {
            GeometryReader { geo in
                ZStack(alignment: .bottomLeading) {
                    HStack(alignment: .bottom, spacing: values.count > 12 ? 3 : 10) {
                        ForEach(values.indices, id: \.self) { i in
                            RoundedRectangle(cornerRadius: values.count > 12 ? 2 : 5, style: .continuous)
                                .fill(Color(barColor(i)))
                                .frame(height: max(2, geo.size.height * values[i] / top))
                                .frame(maxWidth: .infinity)
                        }
                    }
                    if let limit {
                        Path { path in
                            let y = geo.size.height * (1 - limit / top)
                            path.move(to: CGPoint(x: 0, y: y))
                            path.addLine(to: CGPoint(x: geo.size.width, y: y))
                        }
                        .stroke(Color(p.warn), style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                    }
                }
            }
            .frame(height: height)
            HStack(spacing: values.count > 12 ? 3 : 10) {
                ForEach(labels.indices, id: \.self) { i in
                    Text(labels[i])
                        .font(.system(size: 11, weight: i == highlight ? .semibold : .regular))
                        .foregroundColor(Color(i == highlight ? p.ink : p.ink3))
                        .lineLimit(1)
                        .fixedSize()
                        .frame(maxWidth: .infinity)
                }
            }
        }
    }

    private func barColor(_ i: Int) -> UIColor {
        if let limit, values[i] > limit { return p.warn }
        return i == highlight ? p.accent : p.chartBar
    }
}
