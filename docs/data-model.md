# Modelo de datos preliminar

Este modelo es preliminar y debe revisarse antes de generar migraciones completas. Las entidades usaran UUID, `createdAt`, `updatedAt`, indices por relaciones principales y campos de auditoria cuando aplique.

## Seguridad

- `User`: usuario interno.
- `Role`: rol asignable.
- `Permission`: permiso granular.
- `UserRole`: relacion usuario-rol.
- `RolePermission`: relacion rol-permiso.
- `AuditLog`: acciones sensibles, usuario, entidad, accion, fecha, metadata e IP cuando aplique.

## Proyectos

- `Client`: registro informativo del cliente.
- `Project`: codigo, nombre, descripcion, ubicacion, fechas, responsable, estado, moneda, presupuesto base, avance y observaciones.
- `ProjectMember`: usuarios internos asignados al proyecto.

## Presupuesto

- `Budget`: presupuesto asociado a proyecto.
- `BudgetVersion`: version inicial, vigente o historica.
- `BudgetSection`: secciones del presupuesto.
- `BudgetItem`: renglones, cantidades, unidades, dias, personas, precios, subtotales y observaciones.
- `BudgetChangeOrder`: ordenes de cambio, trabajos adicionales y modificaciones aprobadas.

## Cronograma

- `Schedule`: cronograma por proyecto.
- `Activity`: actividad con fechas planificadas/reales, responsable, estado, avance, costos y trabajadores.
- `ActivityDependency`: dependencias entre actividades.
- `ActivityAssignment`: asignaciones de usuarios, cuadrillas o responsables.

## Avance diario

- `DailyReport`: informe diario, estado, proyecto, fecha, encargado, jornada y observaciones.
- `DailyReportActivity`: actividad ejecutada, cantidades, acumulados y porcentaje.
- `DailyReportLabor`: personal individual o cuadrilla.
- `DailyReportMaterial`: materiales utilizados, desperdicio y devolucion.
- `DailyReportMedia`: evidencia multimedia.
- `DailyReportVersion`: versiones aprobadas o corregidas.
- `Approval`: aprobaciones por flujo y entidad.

## Personal

- `Worker`: trabajador individual.
- `Crew`: cuadrilla.

## Inventario

- `UnitOfMeasure`: unidades.
- `Material`: catalogo de materiales.
- `Warehouse`: bodegas.
- `Stock`: existencia por material y bodega.
- `StockMovement`: entradas, salidas, transferencias, ajustes, devoluciones y consumos.

## Requerimientos y compras

- `Requisition`: solicitud.
- `RequisitionItem`: articulos solicitados.
- `RequisitionApproval`: aprobaciones.
- `Supplier`: proveedor.
- `Purchase`: compra asociada.

## Finanzas

- `Expense`: gastos.
- `ClientDeposit`: abonos del cliente.
- `FinancialAdjustment`: ajustes aprobados.

## Documentos y multimedia

- `Document`: archivo logico y metadatos.
- `DocumentVersion`: versiones de archivo.
- `DocumentCategory`: categorias.
- `Contract`: contratos.
- `Plan`: planos.
- `MediaAsset`: fotos y videos.

## Portal privado

- `ShareLink`: enlace hash, estado, expiracion, PIN opcional y proyecto.
- `ShareLinkPermission`: informacion visible.
- `ShareLinkAccessLog`: accesos, fecha, IP y resultado.

## Notificaciones y sincronizacion

- `Notification`: aviso interno.
- `NotificationPreference`: preferencias por usuario.
- `SyncOperation`: operacion offline, clave de idempotencia, payload, estado y errores.

## Relaciones criticas

- Todo dato operativo principal debe relacionarse con `Project`.
- Los movimientos de inventario pueden relacionarse con proyecto, actividad, requerimiento, compra, informe diario y usuario.
- Los gastos pueden relacionarse con proyecto, fase, renglon, actividad y comprobante.
- Los reportes aprobados deben versionarse, no editarse directamente.
