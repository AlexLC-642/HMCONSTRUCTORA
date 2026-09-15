import SwiftUI
import UIKit
import WebKit

struct WebContainer: UIViewRepresentable {
    let session: MobileSession
    let onNeedsAuthentication: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onNeedsAuthentication: onNeedsAuthentication)
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

        init(onNeedsAuthentication: @escaping () -> Void) {
            self.onNeedsAuthentication = onNeedsAuthentication
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
                DispatchQueue.main.async { self.onNeedsAuthentication() }
                return
            }
            decisionHandler(.allow)
        }
    }
}
