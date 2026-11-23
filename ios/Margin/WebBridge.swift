import SwiftUI
import WebKit

/// Hosts the web UI (`web/`) and plays the part of the Android shell's `window.MarginNative`.
///
/// Android's bridge answers synchronously; WebKit's can't. So the boot script keeps the values the
/// web UI reads synchronously (settings, permissions) in `window.__marginBoot`, and native code
/// refreshes them before telling the page to re-read them.
@MainActor
final class WebBridge: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    let webView: WKWebView
    private unowned let model: AppModel
    private var loaded = false

    init(model: AppModel) {
        self.model = model
        let config = WKWebViewConfiguration()
        config.userContentController = WKUserContentController()
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()

        config.userContentController.add(WeakMessageHandler(self), name: "margin")
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.scrollView.isScrollEnabled = false
        #if DEBUG
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        #endif
        load()
    }

    func load() {
        guard let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
            assertionFailure("web/index.html is missing from the app bundle")
            return
        }
        installBootScript()
        var parts = URLComponents(url: index, resolvingAgainstBaseURL: false)
        parts?.fragment = "native=1&platform=ios"
        webView.loadFileURL(parts?.url ?? index, allowingReadAccessTo: index.deletingLastPathComponent())
    }

    /// Fresh values for the page's synchronous reads, injected before any of its scripts run.
    private func installBootScript() {
        let controller = webView.configuration.userContentController
        controller.removeAllUserScripts()
        let boot: [String: Any] = [
            "info": ["platform": "ios", "version": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0",
                     "os": UIDevice.current.systemVersion],
            "perms": model.permissions,
        ]
        let source = """
        window.__marginBoot = \(Self.json(boot));
        window.__marginBoot.state = \(Self.literal(SharedStore.stateJSON));
        \(Self.shim)
        """
        controller.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    // MARK: Native -> web

    func evaluate(_ js: String) {
        guard loaded else { return }
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    /// Settings, permissions or apps changed natively: hand the page fresh values and let it re-read.
    func pushUpdate() {
        model.reload()
        evaluate("""
        window.__marginBoot.state = \(Self.literal(SharedStore.stateJSON));
        window.__marginBoot.perms = \(Self.json(model.permissions));
        M.app.onResume();
        """)
    }

    private func resolve(_ id: String, _ payload: Any) {
        evaluate("M.native.resolve(\(Self.literal(id)), \(Self.literal(Self.json(payload))));")
    }

    // MARK: Web -> native

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let method = body["m"] as? String else { return }
        let arg = body["a"]

        switch method {
        case "saveState":
            if let json = arg as? String, let merged = model.saveFromWeb(json) {
                evaluate("window.__marginBoot.state = \(Self.literal(merged)); M.store.reload();")
            }
        case "grantEmergency":
            if let json = arg as? String { model.emergencyFromWeb(json) }
        case "openPermission":
            model.openPermission(arg as? String ?? "usage")
        case "setDarkBars":
            model.dark = (arg as? Bool) ?? false
        case "requestUsage":
            if let id = arg as? String { resolve(id, model.usagePayload()) }
        case "requestApps":
            // Apple keeps app names private; the native Applications screen shows them instead.
            if let id = arg as? String { resolve(id, [Any]()) }
        case "showNative":
            let a = arg as? [String: Any] ?? [:]
            let inset = (a["inset"] as? NSNumber).map { CGFloat($0.doubleValue) } ?? 0
            model.showNative(a["screen"] as? String, inset: inset)
        case "pickApps":
            model.pickApps()
        default:
            break // lockAction, launchApp: Android only.
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loaded = true
        #if DEBUG
        if let route = UserDefaults.standard.string(forKey: "MarginRoute") {
            evaluate("M.app.navigate(\(Self.literal(route)));")
        }
        #endif
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        loaded = false
        load()
    }

    // MARK: Helpers

    static func json(_ value: Any) -> String {
        guard JSONSerialization.isValidJSONObject(value),
              let data = try? JSONSerialization.data(withJSONObject: value),
              let text = String(data: data, encoding: .utf8) else { return "null" }
        return text
    }

    /// A JavaScript string literal, or `null`.
    static func literal(_ text: String?) -> String {
        guard let text, let data = try? JSONEncoder().encode(text), let quoted = String(data: data, encoding: .utf8) else {
            return "null"
        }
        return quoted
    }

    /// `window.MarginNative` for iPhone. Same methods as the Android bridge, plus `showNative` and `pickApps`.
    private static let shim = """
    (function () {
      var B = window.__marginBoot;
      function post(m, a) { window.webkit.messageHandlers.margin.postMessage({ m: m, a: a === undefined ? null : a }); }
      window.MarginNative = {
        info: function () { return JSON.stringify(B.info); },
        getState: function () { return B.state; },
        saveState: function (s) { B.state = s; post('saveState', s); },
        permissions: function () { return JSON.stringify(B.perms); },
        openPermission: function (which) { post('openPermission', which); },
        appLabel: function () { return ''; },
        launchApp: function () {},
        lockAction: function (a) { post('lockAction', a); },
        setDarkBars: function (dark) { post('setDarkBars', !!dark); },
        requestUsage: function (id) { post('requestUsage', id); },
        requestApps: function (id) { post('requestApps', id); },
        showNative: function (screen, inset) { post('showNative', { screen: screen || null, inset: inset || 0 }); },
        pickApps: function () { post('pickApps'); },
        grantEmergency: function () {
          // The store's live settings, with defaults filled in, rather than what was last saved.
          if (!window.M || !M.util || !M.store) return null;
          var s = JSON.parse(JSON.stringify(M.store.get()));
          if (!s.emergency) return null;
          var today = M.util.dayKey(s.resetTime || '04:00');
          var used = s.emergencyDay === today ? (s.emergencyUsed || 0) : 0;
          if (!s.emergency.enabled || used >= s.emergency.perDay) return null;
          s.emergencyUsed = used + 1;
          s.emergencyDay = today;
          s.emergencyUntil = Date.now() + s.emergency.minutes * 60000;
          B.state = JSON.stringify(s);
          post('grantEmergency', B.state);
          return B.state;
        }
      };
      // The web UI is designed for one fixed scale, like the Android app.
      document.addEventListener('DOMContentLoaded', function () {
        var meta = document.querySelector('meta[name="viewport"]');
        if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
      });
    })();
    """
}

/// Breaks the retain cycle between WKUserContentController and its message handler.
private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?

    init(_ target: WKScriptMessageHandler) {
        self.target = target
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(controller, didReceive: message)
    }
}

/// Puts the web view into SwiftUI.
struct WebContainer: UIViewRepresentable {
    let bridge: WebBridge

    func makeUIView(context: Context) -> WKWebView { bridge.webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
