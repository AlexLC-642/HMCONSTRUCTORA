# Mapa de modulos

## Seguridad

### `auth`
Autenticacion, sesiones, login, logout, contrasenas y protecciones de acceso.

### `users`
Gestion de usuarios internos, estado, datos basicos y asignaciones.

### `roles`
Roles, permisos y matriz de autorizacion.

### `audit`
Bitacora de acciones sensibles.

## Gestion de proyectos

### `projects`
CRUD de proyectos, estados, responsables, integrantes internos y cliente informativo.

### `client-portal`
Gestion de enlaces privados, permisos de visibilidad, PIN, expiracion y registro de accesos.

## Planificacion

### `budgets`
Presupuestos, versiones, secciones, renglones, ordenes de cambio, aprobaciones y PDF.

### `schedules`
Cronograma, actividades, dependencias, responsables, avance y Gantt.

## Ejecucion de obra

### `progress`
Avances diarios, bitacora, actividades ejecutadas, personal, materiales, evidencia, aprobaciones y versiones.

### `workforce`
Trabajadores, cuadrillas, puestos, tarifas y asignaciones.

### `media`
Fotos, videos, metadatos, visibilidad y orden de aparicion.

## Operacion

### `inventory`
Materiales, unidades, bodegas, existencias, movimientos, ajustes y kardex.

### `requisitions`
Solicitudes, aprobaciones, compras, recepcion y entrega.

### `finance`
Gastos, abonos, ajustes, saldos, estados de cuenta y restricciones de informacion sensible.

## Documentos y reportes

### `documents`
Repositorio documental por proyecto, categorias, versiones, permisos y storage.

### `contracts`
Contratos, subcontratos, fechas criticas, versiones y archivos asociados.

### `plans`
Planos, versiones, metadatos y permisos.

### `reports`
Modelos de reporte, plantillas HTML/PDF, filtros, permisos y generacion.

## Plataforma

### `notifications`
Avisos internos, preferencias, indicadores y leidos/no leidos.

### `sync`
Operaciones offline, cola de sincronizacion, idempotencia, conflictos y errores.
