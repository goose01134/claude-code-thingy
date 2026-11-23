import SwiftUI
import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        #if DEBUG
        DebugSeed.applyIfRequested()
        #endif
        return true
    }

    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default", sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let model = AppModel.shared
        let host = HostingController(rootView: RootView(model: model))
        model.host = host
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = host
        window.backgroundColor = Palette.light.bg
        window.makeKeyAndVisible()
        self.window = window
        model.start()
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        AppModel.shared.didBecomeActive()
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        AppModel.shared.didEnterBackground()
    }
}

/// Hosts the SwiftUI root and sets the status bar to match Margin's own light or dark theme.
final class HostingController: UIHostingController<RootView> {
    var darkTheme = false {
        didSet { setNeedsStatusBarAppearanceUpdate() }
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        darkTheme ? .lightContent : .darkContent
    }
}
