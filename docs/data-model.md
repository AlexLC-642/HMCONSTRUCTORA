# Modelo de datos

Refleja `prisma/schema.prisma` real (40 modelos). Todas las entidades usan `id` UUID (salvo excepciones señaladas), `createdAt`/`updatedAt` donde aplica, `Decimal` para dinero/cantidades e indices sobre relaciones y campos de consulta frecuente (proyecto, fecha, estado). Para el detalle de indices y decisiones de normalizacion ver `docs/database-audit.md`.

## Seguridad y acceso

- `User`: usuario interno (email, nombre, telefono, `passwordHash`, estado activo/inactivo).
- `UserPasskey`: credencial WebAuthn de un usuario (clave publica, contador anti-clonado, tipo de dispositivo).
- `Role` / `Permission`: catalogos de rol y permiso.
- `UserRole` / `RolePermission`: tablas de relacion muchos-a-muchos.
- `AuditLog`: accion sensible (login, cambio de estado/rol, aprobacion, publicacion, etc.), usuario, entidad afectada, metadata e IP cuando aplica.

## Proyectos

- `Client`: registro informativo del cliente (no es un usuario del sistema).
- `Project`: codigo, nombre, ubicacion, fechas, responsable, estado, moneda.
- `ProjectMember`: usuarios internos asignados a un proyecto (hoy solo se usa para limpieza al borrar un proyecto, no para autorizacion — ver `docs/security-audit.md` M4).
- `PortalShare`: enlace de portal por token para el cliente, acotado a un proyecto (token hasheado antes de guardarse, con expiracion/revocacion).

## Presupuesto

- `Budget`: presupuesto de un proyecto.
- `BudgetVersion`: version inicial, vigente o historica de un presupuesto.
- `BudgetSection`: secciones del presupuesto.
- `BudgetLineItem`: renglones (cantidades, unidades, precios, subtotales).

## Cronograma

- `Schedule`: cronograma de un proyecto.
- `ScheduleActivity`: actividad con fechas planificadas/reales, responsable, estado, avance.
- `ScheduleActivityDependency`: dependencias entre actividades.
- `ScheduleAssignment`: asignacion de un usuario a una actividad.

## Avance diario

- `DailyReport`: informe diario (proyecto, fecha, encargado, estado, jornada).
- `DailyReportActivity`: actividad ejecutada ese dia, cantidad acumulada y nuevo porcentaje de avance.
- `DailyReportLabor`: mano de obra registrada en el informe (personal o cuadrilla, sin modelo maestro `Worker`/`Crew` separado).
- `DailyReportMaterial`: material utilizado/desperdiciado/devuelto ese dia; puede generar un `StockMovement` de consumo.
- `DailyReportMedia`: evidencia fotografica/video del informe — puede reusarse (por referencia) como foto publica desde `WebsiteProjectPhoto`.
- `SyncOperation`: operacion de sincronizacion offline (clave de idempotencia unica, `userId` propietario, payload, estado, resultado o error) — usada por el flujo de avance diario offline via `api/projects/[id]/progress/offline-sync`.

## Inventario

- `InventoryMaterial`: catalogo de materiales/recursos (código, unidad, costo unitario, stock minimo).
- `Warehouse`: bodegas.
- `Stock`: existencia de un material en una bodega (unico por par material+bodega).
- `StockMovement`: entrada, salida, transferencia o ajuste; puede relacionarse con proyecto, informe diario o usuario que lo registro.

## Requerimientos y compras

- `Requisition`: solicitud de material/compra (numero unico, proyecto, bodega destino, estado, prioridad).
- `RequisitionItem`: renglon solicitado; puede enlazar a un material de inventario, un renglon de presupuesto y/o una actividad de cronograma.
- `Supplier`: catalogo maestro de proveedores (codigo, NIT, estado). Distinto de `Client` aunque ambos sean "terceros" — uno cobra, el otro paga.
- `PurchaseOrder`: orden de compra a un proveedor, opcionalmente originada de una `Requisition` (`requisitionId` es opcional — tambien admite compra directa sin requisicion previa).
- `PurchaseOrderItem`: renglon de la orden de compra, con `receivedQuantity` para control de recepcion parcial/total; distinto de `RequisitionItem` (uno es lo pedido, otro lo comprado).

## Finanzas

Tres conceptos distintos, no fusionar:

- `FinancialExpense`: gasto de un proyecto (puede originarse de un `RequisitionItem` o de una `PurchaseOrder`, y tener un `ProjectDocument` como comprobante de soporte). El campo `vendor` (texto libre) es anterior al modulo de proveedores y convive con `supplierId` (FK opcional) para gastos sin proveedor formal registrado.
- `SupplierPayment`: pago hecho **a un proveedor** por un gasto especifico (`FinancialExpense`).
- `ClientPayment`: pago/abono recibido **del cliente** del proyecto, opcionalmente enlazado a una seccion o renglon de presupuesto.

## Documentos

- `DocumentCategory`: categoria de documento (contratos, planos, comprobantes, permisos, evidencias, presupuestos generados, estados de cuenta, informes, requerimientos, otros).
- `ProjectDocument`: documento logico de un proyecto (categoria, estado, si es visible en el portal).
- `DocumentVersion`: version de archivo de un documento (nombre original, mime, tamaño, `storageKey` en disco, checksum). Servido a la UI interna via Route Handler autenticado, no via URL publica directa.

## Sitio web publico (CMS)

- `WebsiteInquiry`: solicitud del formulario de contacto publico (con IP/user agent para rate limiting y estado de seguimiento interno).
- `WebsiteSettings`: fila unica (`id: "singleton"`) con los textos y datos de contacto editables del sitio (hero, nosotros, mision/vision, telefonos, redes, SEO). Editar esto no requiere tocar codigo.
- `WebsiteService`: tarjeta de servicio mostrada en `/` y `/servicios` (no es lo mismo que un renglon de requisicion/presupuesto llamado "servicio").
- `WebsiteProjectPhoto`: foto de la galeria de `/proyectos`; puede apuntar por referencia a un `DailyReportMedia` existente (nunca copia el archivo) — publicarla aqui es la accion explicita que la hace publica.

## Relaciones y reglas criticas

- Todo dato operativo principal cuelga de `Project` (directa o indirectamente).
- Un `StockMovement` puede relacionarse con proyecto, informe diario (via `dailyReportMaterialId`) y usuario, pero no depende obligatoriamente de ninguno (movimientos de bodega a bodega sin proyecto son validos).
- `FinancialExpense` es distinto de `SupplierPayment` (pago a proveedor) y de `ClientPayment` (pago de cliente) — no son la misma tabla ni deben tratarse como sinonimos.
- `ProjectMember` existe en el esquema pero no participa hoy en ninguna verificacion de autorizacion (ver `docs/security-audit.md` M4) — no asumir que filtra nada automaticamente.
- Una evidencia (`DailyReportMedia`) nunca es publica solo por existir: se vuelve publica unicamente cuando se crea/activa una fila de `WebsiteProjectPhoto` que la referencia.
