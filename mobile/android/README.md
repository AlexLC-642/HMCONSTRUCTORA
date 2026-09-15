# HM Constructora para Android

Aplicación nativa para Android 11 o superior. El primer acceso vincula la cuenta corporativa con el teléfono; los siguientes accesos usan el diálogo biométrico nativo de Android, sin llaves de acceso, Google Password Manager, NFC ni USB.

## Seguridad

- La app no lee, recibe ni almacena la huella.
- Android valida una biometría fuerte mediante `BiometricPrompt`.
- La credencial aleatoria queda cifrada con una llave del Android Keystore que exige biometría en cada uso.
- Si cambian las huellas registradas, Android invalida la llave y obliga a vincular otra vez.
- La contraseña sólo se envía durante la vinculación por HTTPS y nunca se guarda en el teléfono.

## Compilar

Abre esta carpeta en Android Studio o ejecuta:

```powershell
.\gradlew.bat assembleDebug
```

La URL del servidor está en `app/src/main/java/com/hmconstructora/mobile/AppConfig.java` y apunta a `https://hmconstructora-production.up.railway.app`.

Antes de instalar el APK, el servidor debe tener desplegada la migración `20260915110000_add_mobile_device_credentials`.
