# Auditoría de base de datos

Generado: 2026-09-02. Alcance: `prisma/schema.prisma` (7 migraciones, `migrate status` = up to date), servicios/queries que usan cada modelo, y los flujos críticos de concurrencia/idempotencia.

## Modelos

| Modelo | Propósito | Relaciones principales | Duplicados/solapamientos | Normalización | Índices relevantes | Recomendación |
|---|---|---|---|---|---|---|
| User | Cuenta y credenciales | roles, auditLogs, *CreatedBy en casi todo | — | ok | `email` único | — |
| UserPasskey | WebAuthn | User | — | ok | `userId` | — |
| Role / Permission / UserRole / RolePermission | RBAC | m:n estándar | — | 3FN correcta | PK compuestas | — |
| AuditLog | Bitácora genérica | `entityType`+`entityId` polimórfico (sin FK) | No es un log por módulo; es el único genérico — correcto, no duplicar | polimórfico intencional | `entityType,entityId`, `createdAt` | — |
| Client | Cliente del proyecto | Project | — | ok | `name` | — |
| Project | Entidad maestra de obra | casi todo el sistema | — | ok | status/fechas | — |
| PortalShare | Token de acceso externo al proyecto | Project | — | ok | `revokedAt`, `expiresAt` | — |
| ProjectMember | Asignación usuario↔proyecto | m:n | — | ok | PK compuesta | — |
| Budget / BudgetVersion / BudgetSection / BudgetLineItem | Presupuesto versionado (snapshot por versión APPROVED) | jerarquía 1:n | `BudgetLineItem` ≠ `InventoryMaterial` (correcto, ver regla de negocio) | ok, versión es snapshot legítimo | `budgetId,versionNumber` único | — |
| Schedule / ScheduleActivity / ScheduleActivityDependency / ScheduleAssignment | Cronograma | jerarquía 1:n + grafo de dependencias | `ScheduleActivity` ≠ material/recurso (correcto) | ok | status, fechas planeadas | — |
| DailyReport / DailyReportActivity / DailyReportLabor / DailyReportMaterial / DailyReportMedia | Informe diario (evidencia operativa, snapshot por naturaleza) | 1:n desde DailyReport | `DailyReportActivity` guarda `activityCode/activityName/budgetSectionCode/budgetSectionName` denormalizados **a propósito** junto al FK opcional `scheduleActivityId` | snapshot histórico válido — NO eliminar (si la actividad cambia después, el informe ya enviado no debe reescribirse) | `dailyReportId`, `reportDate`, `status` | — |
| SyncOperation | Cola idempotente de sync offline | Project, User | — | ok | `idempotencyKey` único | — |
| InventoryMaterial | Catálogo maestro de recursos (material/herramienta/equipo) | Stock, StockMovement, RequisitionItem, DailyReportMaterial | — | ok | `code` único, `resourceType,active` | — |
| Warehouse | Bodega | Stock, StockMovement, Requisition | — | ok | `code` único | — |
| Stock | Existencia actual por material+bodega (dato derivado persistido) | material, warehouse | Es un **saldo cacheado** de `StockMovement`; se recalcula en cada movimiento dentro de la misma transacción — aceptable porque evita sumar el historial completo en cada lectura | derivado pero justificado (rendimiento de lectura) | `materialId,warehouseId` único | — |
| StockMovement | Historial inmutable de movimientos | material, warehouse, project, dailyReportMaterial | — | ok | `idempotencyKey` único, `type`, `createdAt` | — |
| Requisition / RequisitionItem | Solicitud de recurso (flujo solicitar→comprar→recibir→entregar) | project, warehouse, material?, budgetLineItem?, scheduleActivity?, financialExpense? | `budgetLineItemId`/`scheduleActivityId` dan **contexto**, nunca sustituyen a `materialId` (regla de negocio ya aplicada en el formulario) | ok | status, fechas, FKs opcionales indexados | — |
| FinancialExpense | Compra/gasto (obligación con el proveedor) | project, requisitionItem? (1:1 único), supportingDocument? (1:1 único), supplierPayments[] | `fileName` (columna) **no se usa en ningún servicio ni UI** — quedó huérfana desde que `supportingDocumentId→ProjectDocument/DocumentVersion` la reemplazó | columna muerta detectada (ver recomendaciones) | `projectId`, `expenseDate`, `status`, `budgetSectionNo` | Documentado, no aplicado |
| SupplierPayment | Pago real al proveedor contra una compra (egreso parcial/total) | financialExpense | Distinto de `ClientPayment` (ingreso) — correcto, no fusionar | ok | `financialExpenseId,paymentNumber` único, `paymentDate`, `status` | — |
| ClientPayment | Abono del cliente (ingreso) | project, budgetSection?, budgetLineItem? | `budgetSectionId` es una **denormalización intencional** de `budgetLineItem→section` (se rellena en la migración `20260902003000` y al crear el pago) para poder agrupar abonos por renglón sin join en cada lectura del tablero de cobertura | denormalización justificada por consulta real (`payments.filter(p => p.budgetSectionId === section.id)` en `finances/page.tsx`) | `projectId,paymentNumber` único, `budgetSectionId`, `budgetLineItemId` | — |
| DocumentCategory / ProjectDocument / DocumentVersion | Documentos versionados del proyecto (incluye comprobantes de gasto) | category, versions[], `financialExpenseReceipt` (1:1 inverso) | `ProjectDocument` ≠ `DailyReportMedia` (documento formal vs. evidencia fotográfica de obra) — correcto, no fusionar | ok | `documentId,versionNumber` único, `checksum`, `portalVisible` | — |

## Duplicados/solapamientos evaluados y descartados

Todos los pares que `CLAUDE.md` pide vigilar están correctamente separados en el schema actual:

- gasto (`FinancialExpense`) ≠ pago a proveedor (`SupplierPayment`) — dos tablas, relación 1:n real.
- pago de cliente (`ClientPayment`) ≠ pago a proveedor (`SupplierPayment`) — ingreso vs. egreso, sin overlap de columnas.
- partida presupuestaria (`BudgetLineItem`) ≠ recurso de inventario (`InventoryMaterial`) — unidas solo por FK opcional en `RequisitionItem`.
- actividad de cronograma (`ScheduleActivity`) ≠ material — misma separación.
- documento (`ProjectDocument`) ≠ evidencia (`DailyReportMedia`) — no comparten tabla.
- snapshot histórico (`DailyReportActivity`, `BudgetVersion`) ≠ dato maestro — snapshots preservados intencionalmente.

No se detectaron tablas creadas por conveniencia de nombre ni conceptos de negocio fusionados.

## Concurrencia e idempotencia (flujos críticos)

| Flujo | Mecanismo | Estado |
|---|---|---|
| Movimiento de stock (entrada/salida/traslado/ajuste) | `idempotencyKey` único en `StockMovement` + verificación previa dentro de la transacción | ok |
| Recepción/entrega de requerimiento | Reusa el mismo `idempotencyKey` por `requisitionId:itemId:received\|delivered` | ok |
| Compra generada desde requerimiento | `FinancialExpense.requisitionItemId` único (1 renglón → 1 compra) + verificación por relación + captura de `P2002` como respaldo ante condición de carrera | ok (reparado esta sesión anterior) |
| Pago a proveedor | Valida `monto ≤ pendiente` calculado dentro de la transacción antes de crear; numeración `PAGO-NN` protegida por `@@unique([financialExpenseId, paymentNumber])` | ok — probado manualmente (rechaza sobrepago) |
| Abono de cliente por renglón presupuestario | Igual patrón: valida contra pendiente del renglón dentro de la transacción | ok |
| Aprobación de informe diario | Guard de `status` dentro de la transacción antes de mutar; el consumo de inventario que dispara reusa el `idempotencyKey` de `StockMovement` | ok |
| Numeración (`REQ-`, `AB-`, `PAGO-`) | Patrón `COUNT` + formato, respaldado por `@@unique` en cada tabla — una colisión bajo concurrencia falla con error controlado, no duplica en silencio | aceptable; no es un contador transaccional real pero no puede corromper datos |
| Duplicado de factura/recibo (`vendor+documentNumber`) en `createExpense`/`attachExpenseDocument` | Verificación `findFirst` dentro de transacción, **sin índice único que lo respalde** | riesgo residual bajo (ver recomendaciones) |

## Índices

Todos los índices existentes responden a un patrón de consulta real y visible en el código (listados por proyecto, `status+fecha`, historial de movimientos, FKs opcionales usadas en `include`). No se encontraron índices sobre columnas de baja cardinalidad sin justificación, ni índices redundantes. No se agregaron índices nuevos en esta auditoría porque ninguna consulta revisada carece de uno.

## Recomendaciones

**No aplicadas (requieren decisión, no son bloqueantes):**

1. `FinancialExpense.fileName` es una columna huérfana (sin lectura ni escritura en el código actual). Antes de eliminarla habría que confirmar si existen filas con datos históricos en producción y, de haberlos, migrarlos a `supportingDocumentId` o simplemente documentarlos como legado antes del `DROP COLUMN`. No se tocó en esta sesión porque eliminar una columna es una migración destructiva y CLAUDE.md pide detenerse a explicar el riesgo antes de aplicarla.
2. La verificación de factura duplicada (`vendor + documentNumber`) en `createExpense`/`attachExpenseDocument` no tiene respaldo de índice único (a diferencia de la protección de compra duplicada desde requerimiento, que sí lo tiene). El riesgo práctico es bajo — es una sola persona registrando gastos, no una cola de alta concurrencia — pero si se vuelve un requisito duro, la vía sería un índice único parcial condicionado a `status='VALID'` (MySQL no soporta índices únicos parciales nativos; la alternativa es un `@@unique([projectId, vendor, documentNumber])` sin condicionar por status, aceptando que una factura anulada bloquee el número para siempre, o mover la unicidad a nivel de aplicación con un lock optimista). Se deja documentado para decidir con el usuario, no es parte del alcance de esta auditoría.

**Aplicadas en sesiones previas (contexto):** protección de compra duplicada vía `requisitionItemId` único, separación de `responsibleName`/`expectedReturnDate` al schema de movimiento correcto, wiring de `materialId`/`warehouseId` en consumo de inventario desde informes diarios.

## Baseline de pruebas (esta sesión)

```
npx prisma validate        → ok
npx prisma migrate status  → "Database schema is up to date!" (7 migraciones)
npm run typecheck          → ok
npm run lint                → ok, 0 hallazgos
npm run test                 → 19/19 tests, 9/9 suites (se corrigió tests/document-preview.test.ts:
                                faltaba cargar .env en vitest → vitest.config.ts ahora usa
                                setupFiles: ["dotenv/config"])
npm run build                → ok, 21 rutas generadas sin errores
```
