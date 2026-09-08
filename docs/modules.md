# Mapa de modulos

Modulos reales en `src/modules/` (no un plan — ver `docs/README.md` si buscas la version de planificacion original de Etapa 0). Cada uno sigue la convencion `domain/` (tipos, validacion Zod, calculos) + `application/` (casos de uso, Server Actions, Route Handlers) + `ui/` (componentes/vistas), y solo tiene las carpetas que realmente usa.

## Seguridad y acceso

### `auth`
Login, sesion JWT (`jose`, HS256, 8h), hashing de contrasenas (`bcryptjs`, 12 rounds), passkeys/WebAuthn (`@simplewebauthn`), rate limiting de intentos de login en memoria. Los permisos se resuelven en cada request desde la base de datos (no viajan en el JWT), asi que un cambio de rol o desactivacion de cuenta aplica de inmediato.

### `roles`
Catalogo de permisos y roles del sistema. `src/modules/roles/domain/permissions.ts` es la fuente de verdad de que permisos y roles existen (ver `docs/roles-permissions.md` para la matriz completa).

### `users`
Gestion de usuarios internos: alta, edicion, estado (activo/inactivo), reseteo de contrasena, asignacion de roles.

### `audit`
Bitacora de acciones sensibles (`AuditLog`): login, cambios de rol/estado, aprobaciones, publicaciones, movimientos financieros e inventario relevantes.

## Gestion de proyectos

### `projects`
CRUD de proyectos, estados, responsable, integrantes internos (`ProjectMember` — hoy no se usa para autorizacion, solo para limpieza al borrar un proyecto, ver `docs/security-audit.md` M4) y cliente informativo (`Client`).

### `client-portal`
Enlaces de portal por token (`PortalShare`): generacion con token de 256 bits hasheado antes de guardarse, revocacion, expiracion, acotado siempre por proyecto.

## Planificacion

### `budgets`
Presupuestos, versiones (inicial/vigente/historica), secciones y renglones (`BudgetLineItem`).

### `schedules`
Cronograma: actividades, dependencias entre actividades, asignaciones de responsables.

## Ejecucion de obra

### `progress`
Informes diarios de avance: actividades ejecutadas, mano de obra (`DailyReportLabor`), materiales usados (`DailyReportMaterial`), evidencia multimedia (`DailyReportMedia`), y el flujo de sincronizacion offline (`SyncOperation`, con clave de idempotencia acotada por usuario).

## Operacion

### `inventory`
Materiales (`InventoryMaterial`), bodegas (`Warehouse`), existencias por bodega (`Stock`) y movimientos (`StockMovement`: entradas, salidas, transferencias, ajustes).

### `requisitions`
Solicitudes de material/compra (`Requisition`) y sus renglones (`RequisitionItem`), enlazables a un renglon de presupuesto o actividad de cronograma.

### `finances`
Tres conceptos distintos, no fusionarlos: gastos del proyecto (`FinancialExpense`), pagos a proveedor (`SupplierPayment`, ligados a un gasto) y pagos/abonos de cliente (`ClientPayment`, ligados a una seccion o renglon de presupuesto).

## Documentos y reportes

### `documents`
Repositorio documental por proyecto: categorias (`DocumentCategory`), documentos (`ProjectDocument`) y sus versiones (`DocumentVersion`). Almacenamiento en `public/uploads/...`; la UI interna descarga/previsualiza via un Route Handler autenticado (`/api/documents/versions/[versionId]/file`), no via la URL publica directa (ver `docs/security-audit.md` H1 para el alcance exacto de esa proteccion).

### `reports`
Solo `ui/` — no tiene modelos propios; las plantillas de reporte combinan datos de `progress`, `budgets` y `finances`.

## Plataforma

### `notifications`
Avisos internos.

### `website`
CMS del sitio publico. `WebsiteSettings` es una fila unica (singleton) con los textos/datos de contacto editables; `WebsiteService` son las tarjetas de servicios; `WebsiteProjectPhoto` es la galeria de `/proyectos` (puede reusar una foto de evidencia interna `DailyReportMedia` por referencia, nunca copiando el archivo, y publicarla es una accion explicita — una evidencia interna nunca se vuelve publica automaticamente); `WebsiteInquiry` guarda las solicitudes del formulario de contacto publico.

## Modulos planeados en Etapa 0 que no se crearon como modulos separados

`docs/modules.md`/`docs/project-structure.md` originales (ver version historica referenciada desde `docs/README.md`) planeaban `workforce`, `media`, `contracts`, `plans` y `sync` como modulos independientes. En la implementacion real quedaron absorbidos:

- `workforce` (trabajadores/cuadrillas) -> campos de `DailyReportLabor` dentro de `progress`, no una entidad maestra separada.
- `media` (fotos/videos) -> `DailyReportMedia` dentro de `progress`, mas `WebsiteProjectPhoto` dentro de `website` para lo publico.
- `contracts` y `plans` -> no se construyeron como modelos separados; un contrato o plano hoy se maneja como un `ProjectDocument` mas, categorizado.
- `sync` (cola de sincronizacion offline) -> vive dentro de `progress` como el modelo `SyncOperation` y la ruta `api/projects/[id]/progress/offline-sync`, no como modulo propio.

Antes de crear cualquiera de estos como modulo nuevo, confirma primero si el concepto que necesitas ya existe dentro de otro modulo.
