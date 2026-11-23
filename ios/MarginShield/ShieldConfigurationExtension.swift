import ManagedSettings
import ManagedSettingsUI
import UIKit

/// Margin's look for Apple's block screen. iOS draws the screen itself; Margin chooses the colours,
/// icon, wording and buttons. The wording follows the lock screen in `web/js/screens/lockout.js`.
final class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    private static let suggestions = [
        "Perhaps a short walk, a glass of water, or a few pages of a book.",
        "A good moment to call someone, stretch, or simply do nothing at all.",
        "The feed will still be there tomorrow. This evening won’t be.",
        "Try noticing five things around you that you haven’t looked at today.",
    ]

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        make(name: application.localizedDisplayName, token: application.token)
    }

    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        make(name: application.localizedDisplayName, token: application.token)
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        make(name: webDomain.domain, token: nil)
    }

    override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
        make(name: webDomain.domain, token: nil)
    }

    private func make(name: String?, token: ApplicationToken?) -> ShieldConfiguration {
        let state = SharedStore.state
        let p = Palette.of(dark: SharedStore.themeDark)
        let now = Date()

        var title = "Your time is up."
        var body = "Your social media allowance has been used for today."
        switch BlockReason.current(for: token, now: now) {
        case .focus(let focusName):
            title = "Focus time."
            body = "\(focusName) is on right now. Your apps will be here when it ends."
        case .appLimit(let minutes):
            let app = name ?? "this app"
            title = "Time’s up for \(app)."
            body = "You’ve used the \(TimeUtil.fmtLong(minutes)) you set for \(app) today. Your other apps are still available."
        case .daily, .unknown:
            break
        }

        let back = TimeUtil.clockLabel(state.resetTime)
        let suggestion = Self.suggestions[Calendar.current.component(.day, from: now) % Self.suggestions.count]
        var subtitle = "\(body)\n\nAvailable again at \(back).\n\n\(suggestion)"

        var secondary: ShieldConfiguration.Label?
        let left = state.emergencyLeft(now: now)
        if state.emergency.enabled && left > 0 {
            let minutes = state.emergency.minutes
            let armed = now.timeIntervalSince1970 - SharedStore.emergencyArmedAt < 60
            secondary = ShieldConfiguration.Label(
                text: armed ? "Tap again to open for \(minutes) min" : "Need it for something important?",
                color: p.accent
            )
            if armed {
                subtitle += "\n\n\(left) of \(state.emergency.perDay) emergency \(state.emergency.perDay == 1 ? "unlock" : "unlocks") left today."
            }
        } else if state.emergency.enabled {
            subtitle += "\n\nYou’ve used today’s emergency access."
        }

        return ShieldConfiguration(
            backgroundBlurStyle: nil,
            backgroundColor: p.bg,
            icon: UIImage(systemName: "moon.fill")?.withTintColor(p.accent, renderingMode: .alwaysOriginal),
            title: ShieldConfiguration.Label(text: title, color: p.ink),
            subtitle: ShieldConfiguration.Label(text: subtitle, color: p.ink2),
            primaryButtonLabel: ShieldConfiguration.Label(text: "Got it", color: p.accentInk),
            primaryButtonBackgroundColor: p.accent,
            secondaryButtonLabel: secondary
        )
    }
}
