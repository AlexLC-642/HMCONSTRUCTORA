import Foundation
import LocalAuthentication
import Security

enum VaultError: LocalizedError {
    case accessControlUnavailable
    case keychain(OSStatus)
    case invalidData

    var errorDescription: String? {
        switch self {
        case .accessControlUnavailable:
            return "iOS no pudo proteger la credencial biométrica."
        case .keychain:
            return "El acceso biométrico debe configurarse nuevamente."
        case .invalidData:
            return "La credencial guardada no es válida."
        }
    }
}

final class BiometricVault {
    private let service = "com.hmconstructora.mobile.device"
    private let account = "native-biometric-session"
    private let linkedKey = "hm.ios.biometric-linked"
    private let installationKey = "hm.ios.installation-id"

    var hasCredential: Bool {
        UserDefaults.standard.bool(forKey: linkedKey)
    }

    var installationID: String {
        if let existing = UserDefaults.standard.string(forKey: installationKey) {
            return existing
        }
        let generated = UUID().uuidString.lowercased()
        UserDefaults.standard.set(generated, forKey: installationKey)
        return generated
    }

    func store(token: String, context: LAContext) throws {
        delete()
        var accessError: Unmanaged<CFError>?
        guard let access = SecAccessControlCreateWithFlags(
            nil,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            .biometryCurrentSet,
            &accessError
        ) else {
            throw VaultError.accessControlUnavailable
        }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: Data(token.utf8),
            kSecAttrAccessControl as String: access,
            kSecUseAuthenticationContext as String: context,
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else { throw VaultError.keychain(status) }
        UserDefaults.standard.set(true, forKey: linkedKey)
    }

    func readToken(context: LAContext) throws -> String {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecUseAuthenticationContext as String: context,
        ]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess else { throw VaultError.keychain(status) }
        guard
            let data = result as? Data,
            let token = String(data: data, encoding: .utf8),
            !token.isEmpty
        else {
            throw VaultError.invalidData
        }
        return token
    }

    func delete() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
        UserDefaults.standard.set(false, forKey: linkedKey)
    }
}
