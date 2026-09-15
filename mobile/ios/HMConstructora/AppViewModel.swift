import LocalAuthentication
import SwiftUI

@MainActor
final class AppViewModel: ObservableObject {
    enum Screen {
        case enrollment
        case biometric
        case web(MobileSession)
    }

    @Published var username = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published private(set) var screen: Screen

    private let apiClient: APIClient
    private let vault: BiometricVault
    private var backgroundedAt: Date?

    init(apiClient: APIClient = APIClient(), vault: BiometricVault = BiometricVault()) {
        self.apiClient = apiClient
        self.vault = vault
        screen = vault.hasCredential ? .biometric : .enrollment
    }

    var biometryName: String {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return "biometría"
        }
        switch context.biometryType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        default: return "biometría"
        }
    }

    var biometricSymbol: String {
        biometryName == "Face ID" ? "faceid" : "touchid"
    }

    func enroll() {
        guard !isLoading else { return }
        errorMessage = nil
        let email = username.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !email.isEmpty else {
            errorMessage = "Ingresa tu usuario corporativo."
            return
        }
        guard password.count >= 8 else {
            errorMessage = "Ingresa tu contraseña completa."
            return
        }

        let enteredPassword = password
        isLoading = true
        Task {
            do {
                let token = try await apiClient.enroll(
                    email: email,
                    password: enteredPassword,
                    installationID: vault.installationID
                )
                password = ""
                let context = try await authenticatedContext(
                    reason: "Confirma tu identidad para proteger el acceso a HM Constructora."
                )
                try vault.store(token: token, context: context)
                let session = try await apiClient.createSession(deviceToken: token)
                screen = .web(session)
            } catch {
                handle(error)
            }
            isLoading = false
        }
    }

    func authenticate() {
        guard !isLoading else { return }
        errorMessage = nil
        isLoading = true
        Task {
            do {
                let context = try await authenticatedContext(
                    reason: "Accede de forma segura a HM Constructora."
                )
                let token = try vault.readToken(context: context)
                let session = try await apiClient.createSession(deviceToken: token)
                screen = .web(session)
            } catch {
                handle(error)
            }
            isLoading = false
        }
    }

    func changeAccount() {
        vault.delete()
        password = ""
        errorMessage = nil
        screen = .enrollment
    }

    func handleWebLoginRedirect() {
        errorMessage = nil
        screen = vault.hasCredential ? .biometric : .enrollment
    }

    func handleScenePhase(_ phase: ScenePhase) {
        switch phase {
        case .background:
            backgroundedAt = Date()
        case .active:
            guard
                case .web = screen,
                let backgroundedAt,
                Date().timeIntervalSince(backgroundedAt) >= 30
            else { return }
            self.backgroundedAt = nil
            screen = vault.hasCredential ? .biometric : .enrollment
        default:
            break
        }
    }

    private func authenticatedContext(reason: String) async throws -> LAContext {
        let context = LAContext()
        context.localizedCancelTitle = "Cancelar"
        context.localizedFallbackTitle = ""
        var policyError: NSError?
        guard context.canEvaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            error: &policyError
        ) else {
            throw policyError ?? NSError(
                domain: LAError.errorDomain,
                code: LAError.Code.biometryNotAvailable.rawValue
            )
        }
        try await context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: reason
        )
        return context
    }

    private func handle(_ error: Error) {
        if let apiError = error as? APIError, apiError.statusCode == 401 {
            vault.delete()
            screen = .enrollment
            errorMessage = "La cuenta o la contraseña no son válidas, o el dispositivo debe vincularse nuevamente."
            return
        }
        let nsError = error as NSError
        if nsError.domain == LAError.errorDomain,
           let code = LAError.Code(rawValue: nsError.code) {
            switch code {
            case .userCancel, .systemCancel, .appCancel:
                errorMessage = nil
            case .biometryNotEnrolled:
                errorMessage = "Configura Face ID o Touch ID en los Ajustes del iPhone y vuelve a intentarlo."
            case .biometryLockout:
                errorMessage = "La biometría está bloqueada temporalmente. Desbloquea el iPhone e inténtalo de nuevo."
            case .biometryNotAvailable:
                errorMessage = "Este iPhone no tiene Face ID o Touch ID disponible."
            default:
                errorMessage = "No fue posible confirmar tu identidad. Inténtalo de nuevo."
            }
            return
        }
        if error is VaultError {
            vault.delete()
            screen = .enrollment
            errorMessage = "La biometría cambió o la vinculación venció. Vincula este iPhone nuevamente."
            return
        }
        if let urlError = error as? URLError {
            errorMessage = urlError.code == .notConnectedToInternet
                ? "Sin conexión a internet. Revisa tu red e inténtalo de nuevo."
                : "No se pudo conectar con HM Constructora. Inténtalo de nuevo."
            return
        }
        errorMessage = error.localizedDescription
    }
}
