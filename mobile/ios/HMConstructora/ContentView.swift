import SwiftUI

struct ContentView: View {
    @ObservedObject var viewModel: AppViewModel

    var body: some View {
        Group {
            switch viewModel.screen {
            case .enrollment:
                AuthenticationShell {
                    EnrollmentView(viewModel: viewModel)
                }
            case .biometric:
                AuthenticationShell {
                    BiometricLoginView(viewModel: viewModel)
                }
            case let .web(session):
                WebContainer(session: session) {
                    viewModel.handleWebLoginRedirect()
                }
                .ignoresSafeArea(edges: .bottom)
            }
        }
        .tint(.hmRed)
    }
}

private struct AuthenticationShell<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [.hmBackground, .hmBackground, Color.hmRed.opacity(0.07)],
                startPoint: .top,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 28) {
                    BrandHeader()
                    content
                }
                .frame(maxWidth: 520)
                .padding(.horizontal, 20)
                .padding(.top, 24)
                .padding(.bottom, 36)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
        }
    }
}

private struct BrandHeader: View {
    var body: some View {
        HStack(spacing: 13) {
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.hmSurface)
                    .shadow(color: .black.opacity(0.08), radius: 12, y: 5)
                Image("BrandLogo")
                    .resizable()
                    .scaledToFit()
                    .padding(9)
                    .accessibilityHidden(true)
            }
            .frame(width: 58, height: 58)

            VStack(alignment: .leading, spacing: 3) {
                Text("HM Constructora")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(Color.hmText)
                Text("Control de obra")
                    .font(.subheadline)
                    .foregroundStyle(Color.hmSecondaryText)
            }
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct EnrollmentView: View {
    @ObservedObject var viewModel: AppViewModel
    @FocusState private var focusedField: Field?

    private enum Field { case username, password }

    var body: some View {
        AuthCard {
            BiometricHeading(
                symbol: viewModel.biometricSymbol,
                eyebrow: "ACCESO SEGURO",
                title: "Vincula este iPhone",
                detail: "Ingresa una vez con tu cuenta. Después entrarás únicamente con \(viewModel.biometryName)."
            )

            VStack(spacing: 17) {
                LabeledField(title: "Usuario corporativo", symbol: "person.fill") {
                    TextField("admin@hmconstructora.com", text: $viewModel.username)
                        .textContentType(.username)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .submitLabel(.next)
                        .focused($focusedField, equals: .username)
                        .onSubmit { focusedField = .password }
                }

                LabeledField(title: "Contraseña", symbol: "lock.fill") {
                    SecureField("Tu contraseña", text: $viewModel.password)
                        .textContentType(.password)
                        .submitLabel(.done)
                        .focused($focusedField, equals: .password)
                        .onSubmit { viewModel.enroll() }
                }
            }

            ErrorBanner(message: viewModel.errorMessage)

            PrimaryButton(
                title: "Vincular con \(viewModel.biometryName)",
                symbol: viewModel.biometricSymbol,
                isLoading: viewModel.isLoading,
                action: viewModel.enroll
            )

            Label(
                "Tu contraseña no se guarda. Apple valida tu rostro o huella dentro del dispositivo.",
                systemImage: "lock.shield.fill"
            )
            .font(.footnote)
            .foregroundStyle(Color.hmSecondaryText)
            .fixedSize(horizontal: false, vertical: true)
        }
    }
}

private struct BiometricLoginView: View {
    @ObservedObject var viewModel: AppViewModel

    var body: some View {
        AuthCard {
            BiometricHeading(
                symbol: viewModel.biometricSymbol,
                eyebrow: "DISPOSITIVO VINCULADO",
                title: "Bienvenido",
                detail: "Confirma tu identidad para entrar a HM Constructora."
            )

            ErrorBanner(message: viewModel.errorMessage)

            PrimaryButton(
                title: "Entrar con \(viewModel.biometryName)",
                symbol: viewModel.biometricSymbol,
                isLoading: viewModel.isLoading,
                action: viewModel.authenticate
            )

            Button("Cambiar cuenta", action: viewModel.changeAccount)
                .font(.body.weight(.semibold))
                .foregroundStyle(Color.hmSecondaryText)
                .frame(minHeight: 44)
                .disabled(viewModel.isLoading)
        }
    }
}

private struct AuthCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            content
        }
        .padding(24)
        .background(Color.hmSurface, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(Color.hmBorder, lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.08), radius: 24, y: 10)
    }
}

private struct BiometricHeading: View {
    let symbol: String
    let eyebrow: String
    let title: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Image(systemName: symbol)
                .font(.system(size: 32, weight: .medium))
                .foregroundStyle(.white)
                .frame(width: 64, height: 64)
                .background(Color.hmInk, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 6) {
                Text(eyebrow)
                    .font(.caption.weight(.bold))
                    .tracking(1.5)
                    .foregroundStyle(Color.hmRed)
                Text(title)
                    .font(.largeTitle.weight(.bold))
                    .foregroundStyle(Color.hmText)
                Text(detail)
                    .font(.body)
                    .foregroundStyle(Color.hmSecondaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct LabeledField<FieldContent: View>: View {
    let title: String
    let symbol: String
    let field: FieldContent

    init(title: String, symbol: String, @ViewBuilder field: () -> FieldContent) {
        self.title = title
        self.symbol = symbol
        self.field = field()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.hmText)
            HStack(spacing: 12) {
                Image(systemName: symbol)
                    .foregroundStyle(Color.hmSecondaryText)
                    .frame(width: 20)
                    .accessibilityHidden(true)
                field
                    .foregroundStyle(Color.hmText)
            }
            .padding(.horizontal, 15)
            .frame(minHeight: 54)
            .background(Color.hmField, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Color.hmBorder, lineWidth: 1)
            }
        }
    }
}

private struct PrimaryButton: View {
    let title: String
    let symbol: String
    let isLoading: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    Image(systemName: symbol)
                }
                Text(isLoading ? "Verificando…" : title)
                    .font(.body.weight(.bold))
            }
            .frame(maxWidth: .infinity, minHeight: 54)
            .foregroundStyle(.white)
            .background(Color.hmRed, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(isLoading)
        .opacity(isLoading ? 0.75 : 1)
    }
}

private struct ErrorBanner: View {
    let message: String?

    var body: some View {
        if let message, !message.isEmpty {
            Label(message, systemImage: "exclamationmark.circle.fill")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Color.hmErrorText)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.hmErrorBackground, in: RoundedRectangle(cornerRadius: 13))
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityLabel("Error: \(message)")
        }
    }
}

private extension Color {
    static let hmRed = Color(red: 0.78, green: 0.06, blue: 0.12)
    static let hmInk = Color(red: 0.07, green: 0.12, blue: 0.13)
    static let hmBackground = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.035, green: 0.05, blue: 0.055, alpha: 1)
            : UIColor(red: 0.95, green: 0.965, blue: 0.955, alpha: 1)
    })
    static let hmSurface = Color(uiColor: .secondarySystemBackground)
    static let hmField = Color(uiColor: .tertiarySystemBackground)
    static let hmText = Color(uiColor: .label)
    static let hmSecondaryText = Color(uiColor: .secondaryLabel)
    static let hmBorder = Color(uiColor: .separator).opacity(0.55)
    static let hmErrorText = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark ? UIColor.systemRed : UIColor(red: 0.62, green: 0.03, blue: 0.07, alpha: 1)
    })
    static let hmErrorBackground = Color.red.opacity(0.11)
}
