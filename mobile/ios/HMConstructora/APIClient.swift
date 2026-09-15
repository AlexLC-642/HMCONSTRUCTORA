import Foundation
import UIKit

struct MobileSession {
    let redirectURL: URL
    let cookies: [HTTPCookie]
}

enum APIError: LocalizedError {
    case invalidResponse
    case server(status: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "No se recibió una respuesta válida del servidor."
        case let .server(_, message):
            return message
        }
    }

    var statusCode: Int? {
        guard case let .server(status, _) = self else { return nil }
        return status
    }
}

final class APIClient {
    private let session: URLSession

    init() {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpShouldSetCookies = false
        configuration.httpCookieStorage = nil
        configuration.timeoutIntervalForRequest = 20
        configuration.timeoutIntervalForResource = 30
        session = URLSession(configuration: configuration)
    }

    func enroll(
        email: String,
        password: String,
        installationID: String
    ) async throws -> String {
        let payload = EnrollRequest(
            email: email,
            password: password,
            installationId: installationID,
            deviceName: UIDevice.current.name,
            platform: "ios"
        )
        let data = try JSONEncoder().encode(payload)
        let (responseData, _) = try await post(path: "/api/mobile/auth/enroll", body: data)
        return try JSONDecoder().decode(EnrollResponse.self, from: responseData).deviceToken
    }

    func createSession(deviceToken: String) async throws -> MobileSession {
        let (data, response) = try await post(
            path: "/api/mobile/auth/session",
            body: Data("{}".utf8),
            bearerToken: deviceToken
        )
        let decoded = try JSONDecoder().decode(SessionResponse.self, from: data)
        let redirectURL = URL(string: decoded.redirectTo, relativeTo: AppConfig.baseURL)?.absoluteURL
            ?? AppConfig.baseURL.appendingPathComponent("dashboard")
        let headers = response.allHeaderFields.reduce(into: [String: String]()) { result, item in
            guard let key = item.key as? String else { return }
            result[key] = String(describing: item.value)
        }
        let cookies = HTTPCookie.cookies(withResponseHeaderFields: headers, for: AppConfig.baseURL)
        return MobileSession(redirectURL: redirectURL, cookies: cookies)
    }

    func revoke(deviceToken: String) async {
        _ = try? await post(
            path: "/api/mobile/auth/revoke",
            body: Data("{}".utf8),
            bearerToken: deviceToken
        )
    }

    private func post(
        path: String,
        body: Data,
        bearerToken: String? = nil
    ) async throws -> (Data, HTTPURLResponse) {
        guard let url = URL(string: path, relativeTo: AppConfig.baseURL)?.absoluteURL else {
            throw APIError.invalidResponse
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("HMConstructora-iOS/\(AppConfig.version)", forHTTPHeaderField: "User-Agent")
        if let bearerToken {
            request.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
        }

        let (data, urlResponse) = try await session.data(for: request)
        guard let response = urlResponse as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200..<300).contains(response.statusCode) else {
            let error = try? JSONDecoder().decode(ErrorResponse.self, from: data)
            throw APIError.server(
                status: response.statusCode,
                message: error?.error ?? "No se pudo completar la solicitud."
            )
        }
        return (data, response)
    }
}

private struct EnrollRequest: Encodable {
    let email: String
    let password: String
    let installationId: String
    let deviceName: String
    let platform: String
}

private struct EnrollResponse: Decodable {
    let deviceToken: String
}

private struct SessionResponse: Decodable {
    let authenticated: Bool
    let redirectTo: String
}

private struct ErrorResponse: Decodable {
    let error: String
}
