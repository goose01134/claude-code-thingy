import Foundation
import ManagedSettings

/// Handles the block screen's buttons. "Got it" closes the blocked app. The emergency button
/// needs two taps, a small pause in place of the Android app's press-and-hold.
final class ShieldActionExtension: ShieldActionDelegate {
    override func handle(
        action: ShieldAction, for application: ApplicationToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        completionHandler(respond(to: action))
    }

    override func handle(
        action: ShieldAction, for webDomain: WebDomainToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        completionHandler(respond(to: action))
    }

    override func handle(
        action: ShieldAction, for category: ActivityCategoryToken,
        completionHandler: @escaping (ShieldActionResponse) -> Void
    ) {
        completionHandler(respond(to: action))
    }

    private func respond(to action: ShieldAction) -> ShieldActionResponse {
        switch action {
        case .primaryButtonPressed:
            return .close
        case .secondaryButtonPressed:
            let now = Date().timeIntervalSince1970
            if now - SharedStore.emergencyArmedAt < 60 {
                SharedStore.emergencyArmedAt = 0
                return Emergency.grant() ? .defer : .close
            }
            // First tap: ask for a second one. `.defer` redraws the block screen with the new wording.
            SharedStore.emergencyArmedAt = now
            return .defer
        @unknown default:
            return .close
        }
    }
}
