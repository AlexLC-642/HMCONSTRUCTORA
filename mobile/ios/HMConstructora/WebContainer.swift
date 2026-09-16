import SwiftUI
import UIKit
import WebKit

enum WebNavigationCommand {
    case back
    case forward
}

struct WebContainer: UIViewRepresentable {
    let session: MobileSession
    let onNeedsAuthentication: () -> Void
    @Binding var canGoBack: Bool
    @Binding var canGoForward: Bool
    @Binding var navigationCommand: WebNavigationCommand?

    func makeCoordinator() -> Coordinator {
        Coordinator(
            onNeedsAuthentication: onNeedsAuthentication,
            canGoBack: $canGoBack,
            canGoForward: $canGoForward
        )
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground
        installCookiesAndLoad(webView, coordinator: context.coordinator)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.onNeedsAuthentication = onNeedsAuthentication

        // A command is a one-shot instruction from the on-screen pill, not
        // durable view state - clear it right after acting so re-rendering
        // this view (e.g. from an unrelated @State change) never replays it.
        switch navigationCommand {
        case .back where webView.canGoBack:
            webView.goBack()
        case .forward where webView.canGoForward:
            webView.goForward()
        default:
            break
        }
        if navigationCommand != nil {
            DispatchQueue.main.async { navigationCommand = nil }
        }
    }

    private func installCookiesAndLoad(_ webView: WKWebView, coordinator: Coordinator) {
        let cookieStore = webView.configuration.websiteDataStore.httpCookieStore
        let group = DispatchGroup()
        for cookie in session.cookies {
            group.enter()
            cookieStore.setCookie(cookie) { group.leave() }
        }
        group.notify(queue: .main) {
            guard !coordinator.hasLoaded else { return }
            coordinator.hasLoaded = true
            var request = URLRequest(url: session.redirectURL)
            request.cachePolicy = .reloadIgnoringLocalCacheData
            webView.load(request)
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        var onNeedsAuthentication: () -> Void
        var hasLoaded = false
        @Binding var canGoBack: Bool
        @Binding var canGoForward: Bool

        init(
            onNeedsAuthentication: @escaping () -> Void,
            canGoBack: Binding<Bool>,
            canGoForward: Binding<Bool>
        ) {
            self.onNeedsAuthentication = onNeedsAuthentication
            self._canGoBack = canGoBack
            self._canGoForward = canGoForward
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            canGoBack = webView.canGoBack
            canGoForward = webView.canGoForward
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            if url.host?.caseInsensitiveCompare(AppConfig.baseURL.host ?? "") != .orderedSame {
                decisionHandler(.cancel)
                UIApplication.shared.open(url)
                return
            }

            if url.path.hasPrefix("/login") {
                decisionHandler(.cancel)
                webView.stopLoading()
                DispatchQueue.main.async {
                    self.canGoBack = false
                    self.canGoForward = false
                    self.onNeedsAuthentication()
                }
                return
            }
            decisionHandler(.allow)
        }
    }
}
