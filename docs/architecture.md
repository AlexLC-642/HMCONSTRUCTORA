# Arquitectura

Nota: este documento se escribio como propuesta antes de construir el sistema; las decisiones descritas abajo se implementaron tal cual salvo donde se indica lo contrario. Para el mapa de modulos reales ver `docs/modules.md`; para el modelo de datos real ver `docs/data-model.md`.

## Decision principal

El sistema sera un monolito modular full-stack construido con Next.js, React y TypeScript.

Next.js concentrara:

- Interfaz web con App Router.
- Route Handlers para APIs internas.
- Server Actions donde aporten simplicidad y seguridad.
- Servicios de dominio para reglas de negocio.
- Renderizado de vistas internas, portal privado y vistas de reportes.

## Capas

La organizacion interna seguira limites por modulo de negocio:

- `domain`: entidades conceptuales, reglas puras, tipos y calculos.
- `application`: casos de uso, validaciones de flujo, transacciones e idempotencia.
- `infrastructure`: Prisma, storage, servicios externos y adaptadores.
- `ui`: componentes, formularios y vistas especificas del modulo.

No se crearan capas vacias. Cada modulo tendra solo las carpetas necesarias.

## Backend

La logica de negocio no debe vivir en componentes React. Se ubicara en servicios y casos de uso.

Operaciones clave:

- Crear y aprobar presupuestos.
- Registrar y aprobar avances.
- Consumir inventario.
- Registrar gastos y abonos.
- Calcular estado de cuenta.
- Generar reportes.
- Crear y revocar enlaces compartidos.
- Sincronizar operaciones offline.

## Base de datos

- MySQL como base relacional.
- Prisma ORM.
- UUIDs para identificadores.
- `Decimal` para dinero y cantidades.
- Indices por proyecto, fecha, estado y relaciones principales.
- Transacciones para inventario, finanzas, aprobaciones y sincronizacion.

## Seguridad

- Autorizacion siempre en servidor.
- Permisos granulares.
- Auditoria de acciones sensibles.
- Hash de tokens de enlaces compartidos.
- Validacion MIME real para cargas.
- Rate limiting en autenticacion y portal.

Implementado (detalle en `docs/security-audit.md`):

- Sesion: JWT (`jose`, HS256, 8h) en cookie `httpOnly` + `sameSite=lax` + `secure` en produccion. Los permisos se resuelven en cada request desde la base de datos, no viajan en el JWT.
- Contrasenas: `bcryptjs` (12 rounds), verificacion a tiempo constante (siempre corre bcrypt, incluso si el usuario no existe, para no filtrar por tiempo de respuesta que cuentas son validas).
- Segundo factor sin contrasena: passkeys/WebAuthn (`@simplewebauthn/server`), con verificacion de origen, RP ID y contador anti-clonado.
- Cabeceras HTTP: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` (`next.config.ts`).
- Archivos de documentos: no se usan "URLs firmadas" — se sirven via un Route Handler autenticado que valida sesion + permiso antes de leer el archivo de disco (ver H1 en la auditoria de seguridad para el alcance exacto, incluyendo lo que todavia no cubre).
- `src/proxy.ts` actua como red de seguridad de sesion (defensa en profundidad) sobre las rutas internas; la autorizacion fina por permiso especifico vive en cada pagina/Server Action.

## Reportes PDF

La vista previa HTML, version imprimible, PDF final y portal deben usar el mismo modelo de datos y la misma plantilla base.

Flujo:

```text
datos validados
-> modelo de reporte
-> plantilla HTML/CSS
-> vista previa
-> render PDF
-> almacenamiento
-> version
-> publicacion opcional
```

## Offline/PWA

La PWA soportara:

- Manifest.
- Service worker.
- Shell cacheado.
- Pagina offline.
- IndexedDB con Dexie.
- Borradores locales.
- Cola de sincronizacion.
- UUIDs generados en cliente.
- Claves de idempotencia.
- Reintentos y registro de errores.

No se prometera funcionamiento offline para datos que no hayan sido sincronizados previamente.

## Sitio publico y CMS (agregado despues de la propuesta original)

Ademas del sistema interno, el proyecto sirve el sitio publico de HM Constructora (`src/app/(public)/`: `/`, `/servicios`, `/proyectos`, `/contacto`) con contenido editable desde un modulo interno (`website`, ruta `/website`), sin depender de cambios de codigo:

- `WebsiteSettings` (fila unica) guarda los textos y datos de contacto.
- `WebsiteService` y `WebsiteProjectPhoto` son el contenido de servicios y la galeria.
- El formulario de contacto guarda cada solicitud en `WebsiteInquiry` para seguimiento interno, con rate limiting (IP + honeypot + trampa de tiempo).
- Una foto de evidencia interna (`DailyReportMedia`) puede reutilizarse en la galeria publica solo mediante una accion explicita de publicacion (`WebsiteProjectPhoto` con referencia) — nunca se vuelve publica automaticamente.

Las rutas publicas y las internas usan layouts distintos (no comparten el AppShell administrativo).
