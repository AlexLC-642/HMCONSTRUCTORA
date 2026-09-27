# Reconocimiento biométrico y PWA de HM Constructora

Este documento describe **la implementación existente en este repositorio**. No es
un sistema de reconocimiento facial propio ni una aplicación Android nativa.
El sistema usa WebAuthn/passkeys para que el navegador o el sistema operativo
valide la huella, el rostro, el PIN o el patrón del dispositivo.

## Resumen ejecutivo

La arquitectura actual tiene tres mecanismos relacionados, pero distintos:

1. **Passkeys/WebAuthn para el acceso web**  
   Es el mecanismo que permite entrar con la huella, el rostro, el PIN o el
   patrón del dispositivo. La aplicación nunca recibe la huella, la cara ni una
   fotografía.
2. **Credencial móvil por token Bearer**  
   Es un flujo separado para un cliente móvil. Vincula una instalación después
   de validar correo y contraseña, y después entrega un token de dispositivo.
   Este flujo no implementa biometría por sí mismo.
3. **PWA/offline**  
   La aplicación puede instalarse como PWA, registrar un service worker y
   guardar borradores de informes en IndexedDB mediante Dexie. Cuando vuelve la
   conexión, sincroniza el borrador con una clave de idempotencia.

## 1. Passkeys: cómo funciona la huella o el rostro

### Qué ocurre realmente

El sistema usa:

- `@simplewebauthn/browser` en el cliente.
- `@simplewebauthn/server` en las Route Handlers.
- WebAuthn con un autenticador de plataforma.
- Verificación obligatoria del usuario (`userVerification: "required"`).
- Cookies HTTP-only de corta duración para proteger cada ceremonia.
- Una sesión JWT después de verificar correctamente la credencial.

Cuando el usuario pulsa **“Entrar con este dispositivo”**, el flujo es:

```text
Cliente web
  |
  | POST /api/auth/passkeys/authenticate/options
  v
Servidor genera un challenge de un solo uso
  |
  v
Navegador / Android / sistema operativo
  |
  | Huella, rostro, PIN o patrón
  v
Autenticador del dispositivo firma el challenge
  |
  | POST /api/auth/passkeys/authenticate/verify
  v
Servidor verifica la firma y crea la sesión
```

La biometría solamente desbloquea la credencial local. El servidor comprueba
una firma criptográfica usando la clave pública registrada.

### Qué datos NO recibe el servidor

El backend no recibe ni guarda:

- La imagen de la huella.
- La imagen del rostro.
- La plantilla biométrica.
- Un “resultado biométrico” confiable enviado como booleano.
- Una fotografía tomada por la cámara para autenticar el dispositivo.

El servidor recibe la respuesta WebAuthn y valida su firma, challenge, origen,
RP ID, credencial y contador.

## 2. Registro de un dispositivo/passkey

El registro se inicia desde la cuenta autenticada:

```text
1. El usuario abre Seguridad de la cuenta.
2. El cliente consulta si WebAuthn y un autenticador de plataforma están disponibles.
3. POST /api/auth/passkeys/register/options
4. El servidor genera opciones WebAuthn.
5. El navegador solicita huella, rostro, PIN o patrón.
6. El autenticador crea una credencial de clave pública.
7. POST /api/auth/passkeys/register/verify
8. El servidor verifica la ceremonia.
9. Se guarda la credencial en UserPasskey.
```

La configuración del autenticador exige:

```text
authenticatorAttachment: "platform"
residentKey: "required"
userVerification: "required"
attestationType: "none"
```

Esto significa que se prefiere el autenticador integrado del equipo, se
requiere verificación del usuario y no se solicita attestation del fabricante.

## 3. Inicio de sesión con passkey

### Generación del challenge

`POST /api/auth/passkeys/authenticate/options`:

- Comprueba el origen esperado.
- Aplica rate limiting por IP.
- Genera opciones de autenticación con el `rpID`.
- Guarda el challenge en un JWT temporal dentro de una cookie HTTP-only.
- La cookie expira en cinco minutos.
- Responde con `Cache-Control: no-store`.

### Verificación

`POST /api/auth/passkeys/authenticate/verify`:

1. Comprueba el origen esperado.
2. Lee y verifica la cookie de la ceremonia.
3. Busca la credencial por `response.id`.
4. Comprueba que el usuario exista y esté `ACTIVE`.
5. Comprueba `userHandle` cuando viene incluido.
6. Ejecuta `verifyAuthenticationResponse`.
7. Exige `requireUserVerification: true`.
8. Actualiza el contador y `lastUsedAt`.
9. Crea la cookie de sesión.
10. Registra una auditoría con `method: "passkey"`.

Si falla la validación, no se crea sesión y se registra el intento para el
rate limit correspondiente.

## 4. Modelo de datos de passkeys

El modelo `UserPasskey` está en `prisma/schema.prisma` y contiene:

| Campo | Uso |
|---|---|
| `id` | Identificador de la credencial WebAuthn |
| `userId` | Usuario propietario |
| `webAuthnUserId` | Identificador WebAuthn del usuario |
| `publicKey` | Clave pública usada para verificar firmas |
| `counter` | Contador del autenticador para detectar anomalías/replay |
| `deviceType` | Tipo reportado por WebAuthn |
| `backedUp` | Si la credencial está respaldada |
| `transports` | Transportes reportados por el autenticador |
| `createdAt` | Fecha de registro |
| `lastUsedAt` | Último uso exitoso |

El campo sensible es la **clave pública**, no una plantilla biométrica. La
clave privada permanece en el autenticador del dispositivo/proveedor de
credenciales y no se envía al backend.

## 5. Reconocimiento facial propio: no existe en este sistema

Este repositorio no contiene un modelo de reconocimiento facial ni una ruta
que:

- Abra la cámara para crear una plantilla facial.
- Extraiga embeddings faciales.
- Compare dos rostros.
- Ejecute liveness/anti-spoofing.
- Guarde imágenes faciales para iniciar sesión.

Cuando la interfaz dice que el usuario puede usar “el rostro”, se refiere al
rostro que el sistema operativo ofrece como autenticador de plataforma para
WebAuthn. La aplicación no controla el sensor ni recibe el resultado
biométrico en bruto.

Para reutilizar esta arquitectura en otro proyecto, la opción equivalente es
implementar WebAuthn/passkeys y mantener la biometría dentro del sistema
operativo. No se debe reemplazar por un campo como:

```json
{ "biometricAuthenticated": true }
```

Ese valor podría falsificarse desde un cliente modificado. El backend debe
verificar una respuesta criptográfica WebAuthn.

## 6. Archivos relevantes de autenticación

| Archivo | Responsabilidad |
|---|---|
| `src/modules/auth/application/webauthn.ts` | RP name, RP ID, origen esperado, cookies y JWT de ceremonia |
| `src/modules/auth/ui/passkey-login.tsx` | Comprueba WebAuthn y ejecuta login desde el dispositivo |
| `src/modules/auth/ui/passkey-manager.tsx` | Registra y elimina passkeys desde la cuenta |
| `src/app/api/auth/passkeys/register/options/route.ts` | Genera opciones de registro |
| `src/app/api/auth/passkeys/register/verify/route.ts` | Verifica y persiste el registro |
| `src/app/api/auth/passkeys/authenticate/options/route.ts` | Genera challenge de login |
| `src/app/api/auth/passkeys/authenticate/verify/route.ts` | Verifica login y crea sesión |
| `src/app/api/auth/passkeys/[id]/route.ts` | Elimina una passkey |
| `prisma/schema.prisma` | Modelos `UserPasskey` y `MobileDeviceCredential` |

## 7. Flujo móvil existente: token, no biometría

Además de WebAuthn, el repositorio tiene un flujo para una aplicación móvil:

### Vinculación

`POST /api/mobile/auth/enroll` recibe:

```json
{
  "email": "usuario@dominio.com",
  "password": "********",
  "installationId": "uuid-de-la-instalacion",
  "deviceName": "Telefono de obra",
  "platform": "android"
}
```

El servidor:

1. Valida el cuerpo con Zod.
2. Normaliza el correo.
3. Comprueba rate limiting por correo e IP.
4. Busca un usuario `ACTIVE`.
5. Verifica la contraseña con comparación segura.
6. Genera un token aleatorio de 32 bytes.
7. Guarda únicamente el hash SHA-256 del token.
8. Vincula o actualiza la instalación.
9. Establece una expiración de 180 días.
10. Registra auditoría.
11. Devuelve el token una sola vez al cliente.

### Creación de sesión

`POST /api/mobile/auth/session` recibe el token como:

```http
Authorization: Bearer <deviceToken>
```

El servidor:

- Hashea el token recibido.
- Busca el hash en `MobileDeviceCredential`.
- Rechaza credenciales revocadas, expiradas o de usuarios inactivos.
- Actualiza `lastUsedAt`.
- Crea la cookie de sesión normal.
- Devuelve la ruta autenticada por defecto.

### Revocación

`POST /api/mobile/auth/revoke` marca la credencial como revocada y registra la
auditoría. El token original no se guarda en la base de datos.

### Modelo `MobileDeviceCredential`

Este modelo es diferente de `UserPasskey`:

- `installationId` identifica la instalación.
- `tokenHash` almacena el hash del token móvil.
- `platform` actualmente admite el valor usado por el cliente, por defecto
  `android`.
- `expiresAt` define la duración máxima.
- `revokedAt` permite invalidación.

Este mecanismo **no verifica huella ni rostro**. Si un cliente móvil quiere
desbloquear localmente ese token usando biometría, debe hacerlo con la API
nativa del sistema y nunca enviar la huella o el rostro al servidor. Para
unificar el acceso con la web, se recomienda evaluar passkeys/WebAuthn también
en el cliente móvil.

## 8. PWA existente

### Identidad de la PWA

El archivo `public/manifest.webmanifest` define:

- Nombre: `Control de obra HM`.
- Nombre corto: `Control HM`.
- Inicio: `/dashboard`.
- Scope: `/`.
- Display: `standalone`.
- Orientación: `any`.
- Color de tema: `#c8202f`.
- Iconos de 192 y 512 píxeles.

El layout raíz publica el manifest mediante metadata de Next.js y configura
`appleWebApp` para dispositivos Apple.

### Registro del service worker

`src/shared/offline/pwa-runtime.tsx`:

- Lee `navigator.onLine`.
- Escucha eventos `online` y `offline`.
- Usa `useOffline()` de Next.js para detectar solicitudes sin conexión.
- En producción registra `/sw.js` con `updateViaCache: "none"`.
- Solicita una actualización del registro después de registrarlo.
- En desarrollo desregistra workers antiguos para evitar que HMR/Turbopack
  sirva chunks obsoletos.
- Muestra el estado `En línea` o `Sin conexión`.

### Estrategias del service worker

`public/sw.js` usa dos caches:

```text
hm-constructora-offline-v7
hm-constructora-static-v7
```

Durante la instalación guarda:

- `/offline`
- `/manifest.webmanifest`
- `/brand/logo.png`

También inspecciona los scripts de `/offline` y los guarda individualmente en
la cache estática.

Durante la activación elimina caches antiguas con el prefijo
`hm-constructora-` que no sean las actuales.

Para las solicitudes:

| Solicitud | Estrategia |
|---|---|
| Navegación HTML | Red: si falla, devuelve `/offline` |
| Manifest, logo y página offline | Cache primero; si no existe, red |
| `/_next/static/` | Cache-first; guarda archivos con hash |
| Otras solicitudes GET | Red; ante error devuelve `Response.error()` |
| POST y otros métodos | No son interceptados por el service worker |

La PWA no pretende cachear respuestas autenticadas ni datos sensibles del
servidor. La página offline es una pantalla de recuperación, no una copia
completa del sistema.

## 9. Almacenamiento offline con Dexie

`src/shared/offline/db.ts` crea una base IndexedDB llamada:

```text
constructora_hm_offline
```

Tiene dos tablas locales:

### `dailyReportDrafts`

Guarda borradores de informes diarios:

- `id`
- `projectId`
- `formData`
- `createdAt`
- `updatedAt`

### `syncOperations`

Guarda operaciones que deben sincronizarse:

- `id`
- `idempotencyKey`
- `operationType`
- `payload`
- `status`
- `createdAt`
- `updatedAt`
- `lastError`

Estados locales:

```text
pending -> syncing -> synced
                     \
                      failed
```

## 10. Guardado y sincronización de informes

`src/shared/offline/daily-report-draft.tsx`:

1. Observa cambios en el formulario.
2. Espera 500 ms para evitar guardar en cada pulsación.
3. Serializa los valores de texto.
4. Guarda el borrador en IndexedDB.
5. Genera una `idempotencyKey`.
6. Si hay conexión, envía la operación inmediatamente.
7. Si no hay conexión, conserva el borrador local.
8. Al volver el evento `online`, reintenta las operaciones pendientes o fallidas.
9. Si el servidor confirma, elimina el borrador local.

La operación soportada actualmente es:

```text
dailyReport.saveDraft
```

## 11. Endpoint de sincronización

La ruta es:

```text
POST /api/projects/[id]/progress/offline-sync
```

El servidor exige:

- Sesión válida.
- Permiso `avance.crear`.
- Acceso del usuario al proyecto.
- `idempotencyKey`.
- `operationType` igual a `dailyReport.saveDraft`.
- `formData` como objeto de strings.

Antes de reutilizar un resultado sincronizado, comprueba que la operación
pertenezca al mismo usuario. Esto evita que alguien reutilice una clave de
idempotencia de otra sesión para leer un resultado ajeno.

El modelo Prisma `SyncOperation` guarda:

- La clave única de idempotencia.
- Proyecto y usuario.
- Payload.
- Estado.
- Resultado.
- Error de último intento.

## 12. Instalación de la PWA

`src/shared/offline/pwa-install-button.tsx`:

- Usa `beforeinstallprompt` cuando el navegador Chromium lo proporciona.
- Guarda temporalmente el evento diferido.
- Muestra un botón `Instalar app`.
- Ejecuta el prompt nativo del navegador.
- Escucha `appinstalled`.
- Detecta `display-mode: standalone`.
- Guarda un marcador local `hm-pwa-installed`.
- En iOS no intenta abrir un prompt inexistente: muestra instrucciones para
  Safari:
  `Compartir` -> `Agregar a inicio`.
- En navegadores no compatibles no muestra un botón que no funcione.

## 13. Cómo reutilizarlo en otro proyecto

### Para login con huella o rostro

Reutilizar la idea de:

```text
WebAuthn/passkeys
  + challenge de un solo uso
  + verificación de origen y RP ID
  + userVerification requerido
  + clave pública en servidor
  + clave privada dentro del dispositivo
```

No diseñar un endpoint que reciba imágenes biométricas para un login normal.

### Para una app Android nativa

Hay dos opciones:

1. Implementar passkeys/WebAuthn en el cliente móvil.
2. Usar la biometría local del dispositivo para desbloquear un secreto o
   token almacenado en Android Keystore.

En ambos casos, el backend debe validar una prueba criptográfica o un token
revocable; nunca confiar en un booleano enviado por el cliente.

### Para una PWA

Reutilizar:

- Manifest.
- Service worker.
- Página offline.
- IndexedDB/Dexie.
- Operaciones pendientes.
- Claves de idempotencia.
- Reintentos al volver `online`.

La PWA debe servirse por HTTPS para que WebAuthn, service workers y varias APIs
del navegador funcionen correctamente.

## 14. Limitaciones actuales

- No hay código Android nativo dentro de este repositorio.
- No hay reconocimiento facial propio por cámara.
- No se guardan datos biométricos.
- El flujo `MobileDeviceCredential` usa contraseña inicial y token Bearer; no es
  equivalente a una passkey.
- El offline está implementado específicamente para borradores de informes
  diarios, no para todos los módulos.
- El service worker no intercepta POST ni sincroniza automáticamente todas las
  operaciones del sistema.
- La autenticación biométrica depende de que el navegador/dispositivo tenga
  un autenticador de plataforma disponible.

## 15. Archivos y dependencias de referencia

Dependencias principales:

```json
"@simplewebauthn/browser": "^13.3.0",
"@simplewebauthn/server": "^13.3.3",
"dexie": "4.4.4",
"jose": "^6.1.0"
```

Archivos PWA principales:

```text
public/manifest.webmanifest
public/sw.js
src/shared/offline/pwa-runtime.tsx
src/shared/offline/pwa-install-button.tsx
src/shared/offline/offline-actions.tsx
src/shared/offline/daily-report-draft.tsx
src/shared/offline/db.ts
src/app/offline/page.tsx
src/app/api/projects/[id]/progress/offline-sync/route.ts
```
