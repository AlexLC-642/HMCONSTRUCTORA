# Arquitectura propuesta

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
- URLs firmadas para archivos.
- Validacion MIME real para cargas.
- Rate limiting en autenticacion y portal.

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
