import UIKit

/// Margin's colours, copied from `web/css/tokens.css` so native screens match the web ones.
struct Palette {
    let bg: UIColor
    let surface: UIColor
    let surface2: UIColor
    let ink: UIColor
    let ink2: UIColor
    let ink3: UIColor
    let hairline: UIColor
    let accent: UIColor
    let accentInk: UIColor
    let accentSoft: UIColor
    let warn: UIColor
    let warnSoft: UIColor
    let chartBar: UIColor

    static let light = Palette(
        bg: UIColor(hex: 0xF5F4F0),
        surface: UIColor(hex: 0xFFFFFF),
        surface2: UIColor(hex: 0xEDECE7),
        ink: UIColor(hex: 0x151514),
        ink2: UIColor(hex: 0x5D5C58),
        ink3: UIColor(hex: 0x98968F),
        hairline: UIColor(hex: 0x151514, alpha: 0.08),
        accent: UIColor(hex: 0x2E6A58),
        accentInk: UIColor(hex: 0xFFFFFF),
        accentSoft: UIColor(hex: 0xE1EBE6),
        warn: UIColor(hex: 0xB0573B),
        warnSoft: UIColor(hex: 0xF3E4DD),
        chartBar: UIColor(hex: 0xDAD8D1)
    )

    static let dark = Palette(
        bg: UIColor(hex: 0x0F0F0E),
        surface: UIColor(hex: 0x1A1A19),
        surface2: UIColor(hex: 0x242422),
        ink: UIColor(hex: 0xF3F2EE),
        ink2: UIColor(hex: 0xA9A7A0),
        ink3: UIColor(hex: 0x74726C),
        hairline: UIColor(hex: 0xFFFFFF, alpha: 0.08),
        accent: UIColor(hex: 0x7DB9A4),
        accentInk: UIColor(hex: 0x0F1A16),
        accentSoft: UIColor(hex: 0x1F2E28),
        warn: UIColor(hex: 0xE08A6C),
        warnSoft: UIColor(hex: 0x3A2620),
        chartBar: UIColor(hex: 0x34342F)
    )

    static func of(dark: Bool) -> Palette { dark ? .dark : .light }
}

extension UIColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: alpha
        )
    }
}
