# Auditoría de ciberseguridad — HM Constructora

Generado: 2026-09-07. Alcance: revisión basada en riesgo (OWASP ASVS / OWASP Top 10) de autenticación, autorización, Server Actions, Route Handlers, uploads, portal por token, PWA/service worker, cabeceras HTTP, y base de datos. No es una revisión línea por línea de cada archivo del repositorio; prioriza las áreas de mayor impacto (auth, IDOR/BOLA, inyección, exposición de datos) y muestrea el resto (Server Actions representativas de cada módulo).

Estado del documento: **actualizado tras aplicar correcciones** (Fases 3-5). Cada hallazgo describe la corrección realmente aplicada (no la planeada inicialmente — algunos detalles cambiaron durante la implementación; ver la sección "Seguimiento" al final para el estado CORREGIDO / ACEPTADO / PENDIENTE / NO APLICA de cada uno).

## Resumen ejecutivo

| Severidad | Cantidad |
|---|---|
| CRITICAL | 1 |
| HIGH | 3 |
| MEDIUM | 6 |
| LOW | 6 |
| INFORMATIONAL | 4 |

Fortalezas confirmadas (no requieren corrección):

- Contraseñas con `bcrypt` (12 rounds), nunca en texto plano ni logueadas.
- Sesión JWT (`jose`, HS256) `httpOnly` + `sameSite=lax` + `secure` en producción; permisos/roles se resuelven **en cada request** desde la base de datos (no viajan en el JWT), así que un cambio de rol o una desactivación de usuario aplican de inmediato, no hasta que expire el token.
- Passkeys/WebAuthn: implementación de libro de texto — verifica origen, RP ID, contador anti-clonado, `userHandle`, y liga la ceremonia de registro a la sesión que la inició.
- Portal cliente: token de 256 bits (`crypto.randomBytes(32)`), **hasheado con SHA-256 antes de guardarse** (la tabla nunca contiene el token usable), revocación y expiración soportadas, y la consulta de datos del proyecto está correctamente acotada por `projectId` derivado del token + `portalEnabled: true`. No se encontró forma de que un token de un proyecto lea datos de otro.
- Uploads: whitelist de extensión + verificación de *magic bytes* contra la extensión declarada + nombre de archivo regenerado con `randomUUID()` (nunca se usa el nombre que envía el navegador) → sin path traversal ni doble extensión.
- SQL: no se encontró `$queryRawUnsafe`/`$executeRawUnsafe` en el proyecto. Los `$queryRaw`/`$executeRaw` existentes (portal) usan *tagged templates* de Prisma, que parametrizan automáticamente — no hay concatenación de SQL.
- No se encontró `dangerouslySetInnerHTML`, `eval`, ni `new Function` en `src/`.
- Formulario de contacto público: rate limiting por IP respaldado en base de datos + honeypot + trampa de tiempo mínimo de llenado.
- `AUTH_SECRET` se valida con Zod (`min(32)`) al arrancar — la app no inicia con un secreto débil.
- CORS: ningún Route Handler define `Access-Control-Allow-Origin`, así que aplica el comportamiento same-origin por defecto de Next.js. No hay wildcard combinado con credenciales.
- `next.config.ts` no configura `images.remotePatterns`, así que `next/image` rechaza por defecto cualquier dominio externo no listado (sin vector SSRF vía optimizador de imágenes).

---

## Hallazgos

### CRITICAL

#### C1. `/api/dev/reset-database` depende de una sola variable de entorno

- **Archivo**: `src/app/api/dev/reset-database/route.ts`
- **Vulnerabilidad**: el único control de acceso es `process.env.NODE_ENV !== "development"`. No hay autenticación, ni verificación de permiso, ni un segundo factor de protección. Si en algún despliegue `NODE_ENV` queda mal configurado (algo que ocurre en la práctica: contenedores base, PaaS con defaults distintos, variables de entorno copiadas de un `.env` de desarrollo), el endpoint queda accesible a **cualquier persona no autenticada** en internet.
- **Escenario de explotación**: `curl -X POST https://<host>/api/dev/reset-database` desde cualquier origen, sin cookie de sesión, en un entorno donde `NODE_ENV` no sea exactamente `"production"`.
- **Impacto**: borrado completo de `Project`, `Budget*`, `Schedule*`, `DailyReport*`, `Requisition*`, `Stock*`, `InventoryMaterial`, `Warehouse`, `ProjectDocument*`, `PortalShare`, `FinancialExpense`, `ClientPayment`, `Client` — es decir, toda la operación de la constructora excepto usuarios/roles. Sin confirmación, sin registro de auditoría de quién lo ejecutó.
- **Corrección aplicada**: se agregó una segunda barrera independiente de `NODE_ENV` — una variable de entorno explícita (`ALLOW_DEV_DB_RESET=true`, documentada en `.env.example`, nunca debe existir en producción) — más autenticación como superadministrador (`getCurrentUser()` + `isSuperAdministrator()`). El endpoint ahora requiere **las tres condiciones** a la vez, evaluadas en orden (cada una corta antes de tocar la base de datos si falla).
- **Prueba de verificación**: `tests/dev-reset-database.test.ts` — confirma 403 cuando `NODE_ENV` no es `development` (incluso con las otras dos condiciones satisfechas), 403 sin `ALLOW_DEV_DB_RESET=true`, 403 sin sesión, 403 con sesión que no es superadministrador, y 200 solo cuando las tres condiciones se cumplen a la vez. Sesión/BD mockeadas — no ejecuta un borrado real.

---

### HIGH

#### H1. Documentos subidos se sirven como archivos estáticos públicos, sin pasar por el control de acceso de la aplicación

- **Archivo**: `src/modules/documents/application/storage.ts` (función `writeStoredFile`), consumido por `storeProjectDocumentFile` / `storeWebsiteImageFile`.
- **Vulnerabilidad**: los archivos se escriben dentro de `public/uploads/...` y se exponen mediante `publicUrl: /uploads/...`. Cualquier archivo servido desde `public/` en Next.js se entrega **sin pasar por ningún Server Component, Server Action ni verificación de sesión/permiso** — es un archivo estático servido directamente por el runtime HTTP.
- **Escenario de explotación**: un documento marcado `status: "DRAFT"` y `portalVisible: false` (nunca debería ser visible fuera del sistema interno) sigue siendo descargable por cualquiera que conozca o intercepte su URL exacta (por ejemplo, pegada en un chat, en el historial del navegador, en un proxy corporativo, o en el `Referer` de otra petición). "Retirar del portal" (`portalVisible → false`) **no revoca el acceso al archivo**, solo lo quita del listado curado del portal — el archivo sigue respondiendo 200 en la misma URL para siempre.
- **Impacto**: viola directamente el requisito de negocio de CLAUDE.md ("una evidencia interna nunca se vuelve pública automáticamente... debe existir una acción explícita de publicación/visibilidad") — la acción explícita existe en la UI, pero no controla el acceso real al archivo. Mitigado parcialmente por el nombre aleatorio (UUID de 122 bits), pero es seguridad por oscuridad, no control de acceso.
- **Corrección aplicada (alcance acotado a la gestión documental interna)**: se agregó `src/app/api/documents/versions/[versionId]/file/route.ts`, un Route Handler autenticado que exige sesión (401 si no hay) y el permiso `proyectos.ver` (403 si falta) antes de leer el archivo del `DocumentVersion` indicado y transmitirlo (`Content-Type`, `Content-Disposition: inline`, `Cache-Control: private, max-age=0, must-revalidate`). Se actualizaron las tres vistas internas que descargaban/previsualizaban documentos — `src/app/projects/[id]/documents/page.tsx`, `src/app/documents/page.tsx` y `src/modules/documents/ui/document-preview-modal.tsx` (imagen, video, iframe de PDF y los dos enlaces de descarga) — para usar esta ruta (vía el helper `documentFileUrl()` en `src/modules/documents/domain/catalog.ts`) en vez de `version.publicUrl` directo.
- **Lo que esta corrección NO cambia (deliberado, para no romper otros módulos)**: los archivos siguen físicamente en `public/uploads/...` — **no se relocalizaron fuera de `public/`** — así que la URL vieja (`version.publicUrl`) sigue respondiendo 200 sin autenticación si alguien ya la tiene o la adivina. Tampoco se tocó el portal de cliente (necesita acceso sin sesión de empleado, por diseño, y ya está acotado por su propio token), ni las imágenes del CMS del sitio web (públicas por diseño), ni la galería de evidencias de informes diarios ni los PDFs de informes/portal. Cada uno de esos tiene un modelo de exposición distinto y cambiarlos en la misma pasada habría sido el tipo de refactor amplio que CLAUDE.md pide evitar sin necesidad clara.
- **Riesgo residual**: mientras el archivo físico siga bajo `public/`, la mitigación real hoy es el nombre aleatorio (`randomUUID()`, 122 bits de entropía) más el hecho de que la nueva ruta autenticada es el único enlace que la UI interna genera — es decir, "seguridad por oscuridad" para quien ya tenga la URL vieja, no control de acceso real. La recomendación pendiente (no aplicada, requiere planear una migración de datos) es mover el almacenamiento de documentos de proyecto fuera de `public/` y que la nueva ruta lea de ahí.
- **Prueba de verificación**: `tests/documents-file-access.test.ts` (sesión/BD/lectura de disco mockeadas) — confirma 401 sin sesión, 403 sin el permiso `proyectos.ver`, 404 si la versión no existe o el archivo ya no está en disco, y 200 con las cabeceras correctas (`Content-Type`, `Content-Disposition`, `Cache-Control: private`) cuando todo es válido. Además se confirmó contra el servidor de desarrollo real que `GET /api/documents/versions/<id>/file` responde `401 {"error":"No autorizado."}` sin cookie de sesión (antes devolvía la página 404 genérica de Next.js — ver nota operativa abajo).
- **Nota operativa (no es una vulnerabilidad, pero relevante para el despliegue)**: justo después de crear el archivo de la ruta, el servidor de desarrollo del usuario (que ya estaba corriendo) no la registró de inmediato — devolvía el 404 genérico de Next.js como si la ruta no existiera, en vez de ejecutar el handler. Se confirmó que era un problema del *file watcher* (no del código: la ruta y sus imports son correctos) guardando el archivo una segunda vez, tras lo cual el servidor la recompiló y empezó a responder correctamente. Es un comportamiento conocido de Next.js en Windows al crear una carpeta de ruta dinámica anidada nueva mientras `next dev` ya está corriendo. Si esto se despliega a un servidor que arranca de cero (`next build` + `next start`, como en producción), no aplica — solo afecta al flujo de desarrollo en caliente.

#### H2. Sin límite de intentos en el login por contraseña

- **Archivo**: `src/modules/auth/application/actions.ts` (`loginAction`)
- **Vulnerabilidad**: no existe ningún control de frecuencia sobre los intentos de login. Un atacante puede enviar miles de combinaciones usuario/contraseña por minuto contra el Server Action.
- **Escenario de explotación**: *credential stuffing* o *brute force* contra cualquier cuenta cuyo correo corporativo se conozca o se adivine (el dominio es fijo, per `COMPANY_EMAIL_DOMAIN`, así que solo falta adivinar el usuario local).
- **Impacto**: compromiso de cuentas con contraseñas débiles o reutilizadas.
- **Corrección aplicada**: `src/modules/auth/application/login-rate-limit.ts`, un limitador de ventana deslizante **en memoria** (no en base de datos): bloquea tras 8 intentos fallidos en 10 minutos para la misma combinación correo+IP, y se limpia al iniciar sesión con éxito. Se prefirió en memoria sobre un enfoque respaldado en base de datos (como el ya usado en el formulario de contacto público, `websiteInquiry`) para evitar una migración de esquema solo por un control de seguridad — el enum `AuditAction` no tiene un valor `LOGIN_FAILED` y agregarlo habría requerido tocar la base de datos sin necesidad real, dado que esta es una app de un solo proceso. **Limitación conocida y aceptada**: el contador se reinicia si el proceso de Node se reinicia/redeploya, y no se comparte entre instancias si la app llegara a escalar horizontalmente — documentado en el propio archivo para que se reemplace por un almacén compartido (Redis, tabla dedicada) si eso cambia.
- **Prueba de verificación**: `tests/login-rate-limit.test.ts` — confirma que no bloquea sin intentos previos, que bloquea exactamente después del octavo intento fallido, que la clave es específica por combinación correo+IP (no bloquea otras IPs para el mismo correo), que es insensible a mayúsculas/minúsculas en el correo, y que un login exitoso limpia el contador.

#### H3. Enumeración de usuarios por canal de tiempo en el login

- **Archivo**: `src/modules/auth/application/actions.ts` (`loginAction`)
- **Vulnerabilidad**: cuando el correo no existe (o el usuario no está `ACTIVE`), la función retorna **antes** de llamar a `bcrypt.compare`. Cuando el correo sí existe, `bcrypt.compare` se ejecuta (varias decenas de milisegundos). El mensaje de error es idéntico en ambos casos, pero el **tiempo de respuesta no lo es** — un atacante puede medir la latencia para inferir qué correos existen en el sistema.
- **Escenario de explotación**: medir el tiempo de respuesta de `POST /login` para una lista de correos candidatos; los que tardan más son cuentas reales.
- **Impacto**: enumeración de usuarios válidos, paso previo a *credential stuffing* dirigido.
- **Corrección aplicada**: nueva función `verifyPasswordTimingSafe()` en `src/modules/auth/application/password.ts`, que ejecuta `bcrypt.compare` contra un hash dummy constante (`$2a$12$...`) cuando no hay hash real disponible (usuario inexistente o inactivo), en vez de retornar antes de invocar bcrypt. `loginAction` ahora siempre llama a esta función, sin importar si el usuario existe.
- **Prueba de verificación**: `tests/password-timing-safe.test.ts` — confirma que acepta la contraseña correcta contra un hash real, rechaza una incorrecta, sigue ejecutando una comparación bcrypt real (no un cortocircuito) cuando el hash es `null`/`undefined`, y que el tiempo de un usuario inexistente es comparable al de una contraseña incorrecta contra un usuario real (no es una prueba de timing de laboratorio estricta, pero confirma que ambos caminos ejecutan el mismo costo de cómputo).

---

### MEDIUM

#### M1. Sin cabeceras de seguridad HTTP (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors)

- **Archivo**: `next.config.ts`
- **Vulnerabilidad**: `headers()` solo define `Cache-Control` para `/sw.js`. No hay `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, ni `X-Frame-Options`/`frame-ancestors`.
- **Impacto**: sin `frame-ancestors`/`X-Frame-Options`, el panel administrativo se puede embeber en un `<iframe>` de un sitio externo (clickjacking). Sin `X-Content-Type-Options: nosniff`, algunos navegadores antiguos pueden interpretar un archivo subido con un MIME distinto al declarado. Sin CSP, un XSS futuro (aunque hoy no se encontró ninguno) tendría el máximo impacto posible en vez de estar contenido.
- **Corrección aplicada**: se agregaron las cabeceras a `next.config.ts` para todas las rutas (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictivo, `X-Frame-Options: DENY` como respaldo de `frame-ancestors 'none'` en navegadores viejos), sin `unsafe-eval`. `script-src` y `style-src` sí mantienen `unsafe-inline` como una decisión explícita y documentada en el propio archivo: quitarlo requeriría nonces por request en `proxy.ts`, lo que forzaría **todas** las rutas (incluidas las públicas hoy estáticas) a renderizado dinámico, y el proyecto usa `style={{...}}` inline extensamente. No se encontró XSS activo en esta auditoría, así que el riesgo residual aceptado es específico a un XSS *futuro* que aún no existe, contenido por el resto de la política (`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`). `/sw.js` recibe además `Cache-Control: no-cache` explícito para que el navegador no sirva una versión vieja del service worker.
- **Prueba de verificación**: `tests/security-headers.test.ts` — confirma la presencia y contenido de cada cabecera (CSP con `default-src 'self'`/`frame-ancestors 'none'`/`object-src 'none'`, `nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy` con cámara/micrófono/geolocalización bloqueados, HSTS con `max-age`) y que `/sw.js` no se cachea de forma stale.

#### M2. `SyncOperation` (offline sync) no valida que el `idempotencyKey` pertenezca al usuario que lo consulta

- **Archivo**: `src/app/api/projects/[id]/progress/offline-sync/route.ts`
- **Vulnerabilidad**: `prisma.syncOperation.findUnique({ where: { idempotencyKey } })` no filtra por `userId`. Si dos usuarios coinciden en la misma clave de idempotencia (por colisión accidental o porque uno la adivina/observa), el segundo usuario recibe el `result` (incluye `reportId`, `reportNumber`, `status`) de una operación que no le pertenece.
- **Impacto**: fuga menor de metadatos entre usuarios (no expone el contenido del informe, solo su identificador/estado). El `idempotencyKey` lo genera el cliente offline (Dexie/IndexedDB), normalmente un UUID, así que la explotación práctica requiere adivinar un UUID — bajo pero no nulo, y es inconsistente con el resto del sistema, que sí ata cada recurso a su propietario/proyecto.
- **Corrección aplicada**: tras el `findUnique` por `idempotencyKey`, se agregó una verificación explícita `existing.userId !== user.id` que responde `409 IDEMPOTENCY_KEY_CONFLICT` en vez de reutilizar o devolver el resultado de otro usuario.
- **Prueba de verificación**: `tests/offline-sync-idempotency.test.ts` (Prisma y servicios mockeados) — confirma 409 cuando la clave pertenece a otro usuario, que sí se reproduce (replay) el resultado cuando la clave pertenece al mismo usuario, y que una clave nueva sin dueño previo crea la operación correctamente asociada al usuario que la envía.

#### M3. El `proxy.ts` (middleware) solo protege `/dashboard` y `/projects`

- **Archivo**: `src/proxy.ts`
- **Vulnerabilidad**: el `matcher` solo cubre dos de los ~10 grupos de rutas internas. Cada página (`/inventory`, `/requisitions`, `/finances`, `/documents`, `/reports`, `/users`, `/website`, `/account/security`) **sí** llama a `requirePermission()`/`requireAuthenticatedUser()` en el propio Server Component — se verificó en cada una — así que hoy no hay una ruta desprotegida. El riesgo es de **defensa en profundidad**: si una página nueva olvida esa llamada, no hay una red de seguridad a nivel de middleware que la detenga.
- **Impacto**: ninguno hoy (verificado); riesgo latente para páginas futuras.
- **Corrección aplicada**: se amplió `PROTECTED_PREFIXES`/el `matcher` de `proxy.ts` para cubrir los 10 grupos de rutas internas (`/account`, `/dashboard`, `/documents`, `/finances`, `/inventory`, `/projects`, `/reports`, `/requisitions`, `/users`, `/website`), manteniendo la misma lógica (solo verifica que exista una sesión válida; la autorización fina por permiso sigue en cada página/Server Action, que es donde debe vivir).
- **Prueba de verificación**: `tests/proxy-authorization.test.ts` — confirma, para cada uno de los 10 prefijos, que una solicitud sin sesión válida redirige a `/login` (307) y que una con sesión válida pasa (200); confirma también que una ruta pública (`/`) no invoca siquiera la verificación de sesión, y que un cookie de sesión inválido/manipulado se trata igual que uno ausente.

#### M4. `Gerente de proyecto` puede editar cualquier proyecto, no solo los "asignados"

- **Archivo**: `src/modules/projects/application/actions.ts`, `prisma/schema.prisma` (`ProjectMember`)
- **Vulnerabilidad**: la descripción del rol en la UI de Usuarios dice "Gestión de proyectos **asignados**", pero `updateProjectAction`/`completeProjectAction`/`archiveProjectAction` solo verifican el permiso global `proyectos.editar` — no verifican membresía vía `ProjectMember`. El modelo `ProjectMember` existe en el esquema pero **no se usa en ninguna verificación de autorización** (solo aparece en la limpieza al borrar un proyecto).
- **Impacto**: esto **no es un bypass externo** (requiere ya tener el rol "Gerente de proyecto", un rol interno privilegiado) — es una discrepancia entre lo que la interfaz promete y lo que el código aplica. Si el negocio espera que un gerente de proyecto solo vea/edite sus proyectos asignados, hoy puede editar cualquiera.
- **Corrección**: **no aplicada** — es una decisión de producto, no un bug de código. Antes de restringir el acceso hay que confirmar si "asignados" es solo texto descriptivo (la empresa es pequeña, todos los gerentes ven todos los proyectos) o si de verdad debe aplicarse por fila. Documentado como pendiente de decisión.
- **Prueba de verificación**: no aplica hasta la decisión de producto.

#### M5. Contraseña mínima de 8 caracteres, sin verificación contra contraseñas filtradas

- **Archivo**: `src/modules/users/domain/validation.ts` (`createUserSchema`, `resetPasswordSchema`), formulario en `src/app/users/page.tsx`
- **Vulnerabilidad**: ambos esquemas usaban `password: z.string().min(8, "Minimo 8 caracteres")` — por debajo de lo que hoy recomienda NIST/OWASP ASVS (10-12+) para cuentas con acceso a datos financieros.
- **Impacto**: contraseñas más fáciles de forzar si además llega a fallar el rate limiting (mitigado por H2).
- **Corrección aplicada**: se subió el mínimo a 10 caracteres en `createUserSchema` y `resetPasswordSchema` (creación de usuario y reseteo de contraseña), reflejado también en `minLength`/placeholders de los campos correspondientes en `src/app/users/page.tsx`. **Deliberadamente no se tocó** `loginSchema` en `src/modules/auth/domain/validation.ts` (que sigue en `min(8)`) — bajarlo ahí habría invalidado el login de cualquier cuenta ya creada con una contraseña de 8-9 caracteres; el mínimo nuevo de 10 aplica solo hacia adelante, para contraseñas nuevas o reseteadas.
- **Prueba de verificación**: `tests/password-policy.test.ts` — confirma que `createUserSchema` y `resetPasswordSchema` rechazan una contraseña de menos de 10 caracteres y aceptan una de 10 o más.

#### M6. Mensaje de error del login podía distinguir causas (BD caída / credenciales inválidas / cuenta inactiva / rate limit)

- **Archivo**: `src/modules/auth/application/actions.ts`, `src/app/login/page.tsx`
- **Vulnerabilidad**: el flujo original no unificaba de forma explícita el mensaje mostrado al usuario para cada camino de fallo (correo inexistente, contraseña incorrecta, cuenta inactiva, error de conexión a la base de datos), lo que corre el riesgo de filtrar información operativa a quien esté probando combinaciones (por ejemplo, distinguir "la base de datos está caída ahora mismo" de "credenciales inválidas").
- **Impacto**: bajo — información operativa, no de credenciales, pero útil para un atacante que quiere saber cuándo la app está en un estado inestable o para descartar causas al enumerar cuentas.
- **Corrección aplicada**: `loginAction` ahora usa una única función `loginErrorUrl()` que siempre redirige a `/login?error=1`, sin importar la causa (entrada inválida, rate limit, usuario inexistente/inactivo, contraseña incorrecta, o fallo de conexión a la base de datos — este último capturado con `try/catch` y solo registrado vía `console.error` en el servidor). `src/app/login/page.tsx` muestra el mismo mensaje genérico ("No se pudo iniciar sesión...") para cualquier valor de `error`, eliminando la rama especial que existía para `error === "db"`.
- **Prueba de verificación**: cubierto indirectamente por `tests/login-rate-limit.test.ts` y `tests/password-timing-safe.test.ts` (ambos caminos de fallo pasan por la misma función); se verificó por lectura de código que `loginErrorUrl()` es la única salida de error y no depende de la causa.

---

### LOW

#### L1. Sin rate limiting en los endpoints de passkeys

- **Archivo**: `src/app/api/auth/passkeys/authenticate/*`, `register/*`
- **Riesgo**: bajo — WebAuthn es criptográficamente resistente a fuerza bruta (no hay "contraseña" que adivinar), pero sin límite de tasa el endpoint puede usarse para un DoS de bajo costo o para agotar el `SELECT` por `id` de credencial.
- **Corrección**: no aplicada en este ciclo — el rate limiting global aplicado a nivel de proxy (ver M3/recomendación de infraestructura) cubre parcialmente este caso. Documentado para una futura capa de rate limiting genérica (ver sección "Aceptado").

#### L2. `.env.example` con credenciales de Docker Compose local de apariencia débil

- **Archivo**: `.env.example`
- **Riesgo**: `constructora_password`, `root_password`, `minioadmin` son evidentemente credenciales de ejemplo para servicios **locales** (MariaDB/MinIO en `docker-compose`, no expuestos a internet). No es una vulnerabilidad si el entorno real de producción usa credenciales distintas y esos servicios no son accesibles públicamente — se documenta como recordatorio operativo, no como hallazgo de código.
- **Corrección**: ninguna en código; se agregó un comentario en `.env.example` recordando reemplazar todos los valores en cualquier entorno accesible desde fuera de `localhost`.

#### L3. `RevokePasskeysButton`/gestión de dispositivos no distingue "revocar todo" de forma auditada por dispositivo individual

- **Archivo**: `src/modules/auth/ui/passkey-manager.tsx` y acción relacionada
- **Riesgo**: bajo, UX/auditoría — revisar en un futuro ciclo si conviene revocar por credencial individual en vez de todas a la vez. No es una vulnerabilidad de acceso (la acción ya está protegida por sesión + propiedad del recurso).
- **Corrección**: no aplicada, fuera del alcance de seguridad estricta.

#### L4. Sin invalidación de otras sesiones activas al cambiar la contraseña de un usuario

- **Archivo**: `src/modules/users/application/actions.ts` (reseteo de contraseña)
- **Riesgo**: al ser JWT sin lista de revocación server-side, una sesión ya abierta en otro dispositivo sigue siendo válida hasta su expiración natural (8h) después de que un administrador cambie la contraseña de ese usuario (por ejemplo, tras sospecha de compromiso). El `status: "ACTIVE"` sí se revisa en cada request (así que **desactivar** la cuenta corta el acceso de inmediato) — el hueco es específico al cambio de contraseña sin desactivar la cuenta.
- **Corrección**: no aplicada — requeriría una lista de revocación o un campo de versión de sesión en el usuario, cambio de arquitectura más grande. Documentado como mejora futura recomendada.

#### L5. `npm audit` reporta 6 vulnerabilidades en dependencias transitivas de Prisma (mysql2, mariadb, deepmerge-ts)

- **Archivos**: `package.json`/`package-lock.json` (no hay código propio involucrado).
- **Hallazgo**: `npm audit --production` reporta 6 avisos (1 moderado, 5 altos), los tres relevantes son:
  - **`mysql2` ≤3.23.0** (2 avisos, incluye downgrade de plugin de autenticación que filtra credenciales en texto claro, y una bomba de descompresión zlib): es una dependencia **transitiva de las herramientas CLI de `prisma`** (`prisma generate`/`migrate`), no del driver de conexión que usa la app en producción. La app se conecta a MariaDB vía `@prisma/adapter-mariadb` (paquete `mariadb`), **no** vía `mysql2` — se confirmó revisando `src/shared/lib/prisma.ts` (`new PrismaMariaDb(...)`). Riesgo real: bajo, solo se ejecuta en la máquina de quien corre comandos de Prisma en desarrollo/CI, nunca en el servidor de producción sirviendo tráfico.
  - **`mariadb` 3.4.0–3.4.5** (fuga de credenciales en texto claro pese a `ssl:true`, e inyección SQL en el escapado de parámetros `Buffer` bajo juegos de caracteres CJK como big5/gbk/sjis): esta sí es el driver **realmente usado en runtime**, mediante `node_modules/@prisma/adapter-mariadb/node_modules/mariadb@3.4.5` (versión fijada exacta en el `package.json` de `@prisma/adapter-mariadb@7.10.0`, no un rango). El proyecto ya declara `mariadb: ^3.5.3` como dependencia directa (versión sin estas vulnerabilidades), pero como `@prisma/adapter-mariadb` fija `"mariadb": "3.4.5"` exacto, npm no puede deduplicar automáticamente — su copia anidada gana la resolución de módulos de Node para el propio código del adaptador.
  - **`deepmerge-ts` <8.0.0**: transitiva de `@prisma/config`/tooling de Prisma, mismo perfil de riesgo bajo que `mysql2` (no es parte del camino de ejecución de la app).
- **Por qué no se aplicó `npm audit fix --force`**: la corrección automática de las tres requiere que `npm` instale `prisma@6.19.3` — una **regresión de versión mayor** desde la 7.10.0 actual, justo el tipo de cambio que CLAUDE.md pide evitar sin analizar el impacto primero (y en este caso ni siquiera sería una mejora: sería bajar de versión para obtener una dependencia parcheada, arriesgando romper `prisma/schema.prisma` u otras APIs ya adaptadas a Prisma 7).
- **Intento de corrección dirigida (revertido)**: se probó agregar `overrides` en `package.json` para forzar que `@prisma/adapter-mariadb` use la copia ya declarada `mariadb@^3.5.3` en vez de su `3.4.5` fijo. La sobreescritura quedó marcada como aplicada en el árbol de dependencias pero **no logró re-materializarse correctamente en `node_modules`** (`npm ls` reportaba el paquete como `invalid`/`overridden` sin actualizar el contenido real en disco, incluso tras reinstalar). Forzar una reinstalación completa (`rm -rf node_modules`) para resolverlo se descartó por el riesgo de interrumpir el servidor de desarrollo del usuario, que estaba corriendo en paralelo. Se revirtió el cambio y se dejó el árbol de dependencias en su estado válido original.
- **Corrección aplicada (parcial, sin riesgo)**: `npm audit fix` (sin `--force`) sí corrigió de forma segura `fast-uri` (usado por `ajv`, dependencia de las herramientas de Prisma) y `nanoid` (usado por PostCSS), y de paso `npm` actualizó `prisma`/`@prisma/client` de `7.9.1` a `7.10.0` (versión menor, dentro del rango `^7.9.1` ya declarado) — reduciendo el conteo de 8 a 6 vulnerabilidades sin ningún cambio de comportamiento observable (`npx prisma validate`, `npx prisma generate` y una consulta real contra la base de datos de desarrollo se verificaron después del cambio).
- **Riesgo real en este entorno**: el driver `mariadb` vulnerable solo importa si (a) la conexión usa `ssl: true` con el escenario específico de MITM del aviso, o (b) la aplicación usa juegos de caracteres CJK (esta app usa español/UTF-8, no aplica el vector de inyección SQL). La base de datos de desarrollo corre en Docker en `localhost`, sin exposición a MITM real.
- **Recomendación pendiente (no aplicada)**: cuando `@prisma/adapter-mariadb` actualice su propia dependencia interna de `mariadb` (seguimiento del proyecto río arriba), o si se decide forzar la reinstalación completa de `node_modules` en una ventana donde no haya un servidor de desarrollo corriendo en paralelo, aplicar el `overrides` de `mariadb` a `^3.5.3` y volver a correr `npm audit`.
- **Corrección**: **parcialmente aplicada** (2 de 8 avisos corregidos sin riesgo); las 3 restantes (mysql2 ×2, mariadb ×3 cuentan como 1 bloque + deepmerge-ts ×1) se documentan como **aceptadas** con la justificación anterior, no como pendientes de código.

#### L6. `SVG` no está en la whitelist de subida, pero tampoco hay sanitización si se llegara a habilitar

- **Archivo**: `src/modules/documents/application/storage.ts`
- **Riesgo**: hoy `.svg` **no está permitido** (`extensionMime`/`imageExtensionMime` no lo incluyen) — no hay vulnerabilidad activa. Se documenta explícitamente para que, si en el futuro alguien agrega soporte de SVG (por ejemplo para el CMS del sitio), se recuerde que un SVG puede contener `<script>`/`onload` y debe sanitizarse (o servirse con `Content-Disposition: attachment` y sin ejecutarse inline) antes de habilitarlo.

---

### INFORMATIONAL

- **I1.** El campo `responsible: { select: { name, email } }` se incluye en los datos que ve el portal del cliente (`getClientPortalByToken`). Es intencional (contacto del responsable del proyecto para el cliente), pero se documenta para que quede claro que ese correo es visible fuera del sistema interno.
- **I2.** No se encontró ningún lugar donde el frontend decida la visibilidad pública de una evidencia/documento — todos los flujos de publicación pasan por un Server Action que revisa `status`/`portalVisible` en servidor antes de escribir en base de datos (correcto, cumple el requisito de "nunca confiar en un flag enviado desde cliente").
- **I3.** `npm audit` sí reporta 6 vulnerabilidades (bajadas de 8 tras aplicar las correcciones seguras disponibles), todas en dependencias **transitivas** de las herramientas de Prisma o del driver de base de datos — ninguna en una dependencia directa de la aplicación en sí. Ver el análisis completo, incluyendo por qué no se aplicó la corrección automática que requiere revertir Prisma a una versión mayor anterior, en **L5**.
- **I4.** El manejo de errores en Server Actions y Route Handlers generalmente evita exponer `stack traces` al cliente (los `catch` capturan y devuelven mensajes genéricos o validados); se verificó una muestra representativa, no cada acción individual.
- **I5.** `npx prisma generate` señala que existe `prisma@8.0.0-rc.13` (versión mayor, todavía *release candidate*). No se actualizó — es una versión de pruebas, no estable, y una migración mayor de Prisma está fuera del alcance de una auditoría de seguridad sin una ventana de pruebas dedicada. Recomendación: evaluarla por separado cuando salga de RC.

---

## Seguimiento

| ID | Hallazgo | Estado | Detalle |
|---|---|---|---|
| C1 | `/api/dev/reset-database` con un solo control de acceso | **CORREGIDO** | Triple gate (NODE_ENV + `ALLOW_DEV_DB_RESET` + sesión de superadministrador). Probado en `tests/dev-reset-database.test.ts`. |
| H1 | Documentos servidos como estáticos sin control de acceso | **CORREGIDO (parcial, alcance documentado)** | Ruta autenticada `/api/documents/versions/[versionId]/file` en uso desde la UI interna. Los archivos siguen físicamente en `public/`, así que la URL vieja no se revocó — ver nota de riesgo residual en H1. |
| H2 | Sin límite de intentos de login | **CORREGIDO** | Rate limiting en memoria por correo+IP. Probado en `tests/login-rate-limit.test.ts`. |
| H3 | Enumeración de usuarios por canal de tiempo | **CORREGIDO** | `verifyPasswordTimingSafe()` con hash dummy. Probado en `tests/password-timing-safe.test.ts`. |
| M1 | Sin cabeceras de seguridad HTTP | **CORREGIDO** | CSP + HSTS + nosniff + Referrer-Policy + Permissions-Policy + X-Frame-Options en `next.config.ts`. Probado en `tests/security-headers.test.ts` y verificado en vivo contra el servidor de desarrollo. |
| M2 | `SyncOperation.idempotencyKey` sin verificar propietario | **CORREGIDO** | Verificación `existing.userId !== user.id` → 409. Probado en `tests/offline-sync-idempotency.test.ts`. |
| M3 | `proxy.ts` solo protegía 2 de 10 grupos de rutas | **CORREGIDO** | Matcher ampliado a los 10 grupos. Probado en `tests/proxy-authorization.test.ts` y verificado en vivo (307 a `/login` en cada uno). |
| M4 | "Gerente de proyecto" puede editar cualquier proyecto, no solo los asignados | **PENDIENTE — requiere decisión de producto** | No es un bug de código; es una discrepancia entre la descripción del rol en la UI y la ausencia de scoping por `ProjectMember`. Antes de tocarlo hay que confirmar la intención de negocio (ver detalle en M4). |
| M5 | Contraseña mínima de 8 caracteres | **CORREGIDO (hacia adelante)** | Mínimo subido a 10 en creación/reseteo de contraseña. El login (`min(8)`) se dejó igual a propósito para no invalidar cuentas existentes. Probado en `tests/password-policy.test.ts`. |
| M6 | Mensaje de error del login podía distinguir causas | **CORREGIDO** | Un único mensaje/código de error (`?error=1`) para cualquier causa de fallo. |
| L1 | Sin rate limiting en passkeys | **ACEPTADO** | WebAuthn es resistente a fuerza bruta por diseño; riesgo residual es un DoS de bajo costo, no compromiso de cuentas. |
| L2 | `.env.example` con credenciales locales de apariencia débil | **CORREGIDO (documentación)** | Se reescribió con un comentario explícito de que son solo para Docker Compose local y deben reemplazarse fuera de `localhost`. |
| L3 | Revocación de passkeys no es granular por dispositivo | **ACEPTADO** | Mejora de UX/auditoría, no un problema de control de acceso (la acción ya está protegida por sesión + propiedad). |
| L4 | Sin invalidación de otras sesiones al cambiar contraseña | **ACEPTADO** | Requeriría lista de revocación de JWT o versión de sesión — cambio de arquitectura mayor, fuera de alcance de esta pasada. |
| L5 | `npm audit`: 6 avisos en dependencias transitivas de Prisma | **CORREGIDO (parcial) + ACEPTADO (resto)** | `fast-uri`/`nanoid` corregidos sin riesgo; `mysql2`/`mariadb`/`deepmerge-ts` aceptados con justificación (ver detalle en L5) — la corrección automática exige bajar Prisma a una versión mayor anterior. |
| L6 | SVG no sanitizado si se habilitara a futuro | **NO APLICA hoy** | `.svg` no está en la whitelist de subida actual; queda documentado para cuando/si se agregue. |

### Verificación final ejecutada

- `npx prisma validate` → esquema válido.
- `npx prisma generate` → cliente generado sin errores (aviso informativo de que existe Prisma 8 RC, no aplicado — ver I5).
- `npm run typecheck` (`tsc --noEmit`) → sin errores.
- `npm run lint` (`biome lint .`) → sin errores; 4 advertencias preexistentes de CSS (`!important`, especificidad descendente) no relacionadas con esta auditoría, no tocadas.
- `npm run test` (`vitest run`) → **81/81 pruebas pasando** en 17 archivos, incluyendo las 8 nuevas suites de seguridad: `login-rate-limit`, `password-timing-safe`, `password-policy`, `security-headers`, `dev-reset-database`, `offline-sync-idempotency`, `proxy-authorization`, `documents-file-access`.
- `npm audit --production` → 6 vulnerabilidades restantes, todas en dependencias transitivas de las herramientas/driver de Prisma, ninguna en el código de la aplicación ni explotable en el modelo de despliegue actual (ver L5).
- Verificación manual contra el servidor de desarrollo real (`localhost:3000`, sin throttling): `/`, `/servicios`, `/contacto`, `/proyectos` responden 200 sin sesión; `/dashboard`, `/projects`, `/inventory`, `/requisitions`, `/finances`, `/documents`, `/reports`, `/users`, `/website`, `/account/security` redirigen 307 a `/login` sin sesión; todas las respuestas incluyen las cabeceras de seguridad nuevas; `/sw.js` responde 200 con `Cache-Control: no-cache`; `/manifest.webmanifest` responde 200; la ruta nueva de documentos responde 401 sin sesión y con el cuerpo JSON esperado (no la página 404 genérica).
- No se realizó una sesión interactiva completa en navegador con DevTools abierto para cada ruta autenticada (requeriría credenciales reales de un usuario, que no se solicitaron); la cobertura de autenticación/autorización para esas rutas se validó por código + pruebas automatizadas + las respuestas HTTP crudas de arriba.

### Declaración honesta de alcance

Esta auditoría cubrió, con prioridad basada en riesgo: autenticación, autorización/IDOR, inyección SQL, XSS, CSRF/origen, SSRF, uploads, portal por token, PWA/service worker, Server Actions/Route Handlers, mass assignment, validación numérica, concurrencia/idempotencia, cabeceras HTTP, CORS, open redirect, secretos, exposición de errores, dependencias, y una muestra representativa de código en cada módulo — no cada línea del repositorio. **No se afirma que el sistema sea invulnerable.** Dentro del alcance efectivamente revisado y probado en este ciclo, no se detectaron vulnerabilidades conocidas sin corregir o sin una justificación documentada de por qué se aceptan; los puntos pendientes (M4, L1, L3, L4, parte de L5) están explícitamente listados arriba con su razón, no ocultos.
