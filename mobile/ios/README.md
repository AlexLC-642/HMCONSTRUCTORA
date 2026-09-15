# HM Constructora para iPhone y iPad

Aplicación nativa en SwiftUI para iOS 16 o superior. El primer acceso vincula la cuenta corporativa; después utiliza Face ID o Touch ID sin llaves de acceso, Google Password Manager, NFC ni USB.

## Abrir y ejecutar

1. Abre `HMConstructora.xcodeproj` en Xcode 15 o superior.
2. En **Signing & Capabilities**, selecciona tu equipo de Apple Developer.
3. Conecta el iPhone y pulsa **Run**.

Para generar un archivo instalable o publicarlo en TestFlight/App Store se necesita una Mac con Xcode y seleccionar el equipo de firma de Apple. El código no usa dependencias externas ni React Native.

La URL del servidor está en `HMConstructora/AppConfig.swift` y apunta al despliegue de Railway.

## Seguridad

- La aplicación nunca recibe ni almacena el rostro o la huella.
- iOS realiza la validación con `LocalAuthentication`.
- La credencial queda protegida en Keychain con `biometryCurrentSet` y no se sincroniza con iCloud.
- Si cambian las huellas o la configuración de Face ID, la credencial se invalida y el equipo debe vincularse de nuevo.
- La contraseña se utiliza una sola vez por HTTPS y no se guarda.
