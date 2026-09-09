# Auditoría de base de datos

Generado: 2026-09-02. Actualizado: 2026-09-09 (agrega el módulo de compras/proveedores llegado después de la primera versión de esta auditoría, y una revisión completa de normalización 1FN/2FN/3FN pedida explícitamente — ver la sección homónima al final). Alcance: `prisma/schema.prisma` (20 migraciones, `migrate status` = up to date), servicios/queries que usan cada modelo, y los flujos críticos de concurrencia/idempotencia.

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
| FinancialExpense | Compra/gasto (obligación con el proveedor) | project, supplier?, purchaseOrder?, requisitionItem? (1:1 único), supportingDocument? (1:1 único), supplierPayments[] | `fileName` **era** una columna huérfana (sin lectura ni escritura) desde que `supportingDocumentId→ProjectDocument/DocumentVersion` la reemplazó | 3FN — corregido | `projectId`, `supplierId`, `purchaseOrderId`, `expenseDate`, `status`, `budgetSectionNo` | **Aplicado 2026-09-09**: columna eliminada (migración `20260909041106_drop_orphaned_columns`), tabla vacía en producción — cero riesgo de pérdida de datos |
| Supplier | Catálogo maestro de proveedores | purchaseOrders[], financialExpenses[] | Antes de este módulo, `FinancialExpense.vendor` (texto libre) era el único registro de proveedor — ver nota de transición abajo | ok | `code` único, `taxId` único, `businessName`, `status` | — |
| PurchaseOrder / PurchaseOrderItem | Orden de compra a un proveedor (opcionalmente originada de una requisición) | supplier, requisition?, project?, warehouse?, items[], financialExpenses[] | `PurchaseOrderItem` ≠ `RequisitionItem` (una es lo pedido, otra lo comprado; unidas por FK opcional, no fusionadas) — correcto | ok | `supplierId`, `requisitionId`, `projectId`, `status`, `issueDate` | — |
| SupplierPayment | Pago real al proveedor contra una compra (egreso parcial/total) | financialExpense | Distinto de `ClientPayment` (ingreso) — correcto, no fusionar | ok | `financialExpenseId,paymentNumber` único, `paymentDate`, `status` | — |
| ClientPayment | Abono del cliente (ingreso) | project, budgetSection?, budgetLineItem? | `budgetSectionId` es una **denormalización intencional** de `budgetLineItem→section` (se rellena en la migración `20260902003000` y al crear el pago) para poder agrupar abonos por renglón sin join en cada lectura del tablero de cobertura. `receiptFile` **era** una columna huérfana: nunca se escribía desde `createClientPayment`, la app no tiene flujo de adjuntar comprobante a un abono | denormalización de `budgetSectionId` justificada; `receiptFile` corregido | `projectId,paymentNumber` único, `budgetSectionId`, `budgetLineItemId` | **Aplicado 2026-09-09**: `receiptFile` eliminado (misma migración), tabla vacía en producción |
| DocumentCategory / ProjectDocument / DocumentVersion | Documentos versionados del proyecto (incluye comprobantes de gasto) | category, versions[], `financialExpenseReceipt` (1:1 inverso) | `ProjectDocument` ≠ `DailyReportMedia` (documento formal vs. evidencia fotográfica de obra) — correcto, no fusionar | ok | `documentId,versionNumber` único, `checksum`, `portalVisible` | — |

## Duplicados/solapamientos evaluados y descartados

Todos los pares que `CLAUDE.md` pide vigilar están correctamente separados en el schema actual:

- gasto (`FinancialExpense`) ≠ pago a proveedor (`SupplierPayment`) — dos tablas, relación 1:n real.
- pago de cliente (`ClientPayment`) ≠ pago a proveedor (`SupplierPayment`) — ingreso vs. egreso, sin overlap de columnas.
- partida presupuestaria (`BudgetLineItem`) ≠ recurso de inventario (`InventoryMaterial`) — unidas solo por FK opcional en `RequisitionItem`.
- actividad de cronograma (`ScheduleActivity`) ≠ material — misma separación.
- documento (`ProjectDocument`) ≠ evidencia (`DailyReportMedia`) — no comparten tabla.
- snapshot histórico (`DailyReportActivity`, `BudgetVersion`) ≠ dato maestro — snapshots preservados intencionalmente.
- orden de compra (`PurchaseOrder`/`PurchaseOrderItem`) ≠ requisición (`Requisition`/`RequisitionItem`) — la requisición es lo que se **pidió**, la orden de compra es lo que se **compró**; unidas por `PurchaseOrder.requisitionId` opcional (una compra puede no venir de una requisición — ver `PurchaseOrderStatus`/flujo de compra directa), nunca fusionadas.
- proveedor (`Supplier`) ≠ cliente (`Client`) — dos entidades separadas aunque ambas sean "terceros"; comparten forma pero no significado ni ciclo de vida (uno cobra, el otro paga).

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

1. La verificación de factura duplicada (`vendor + documentNumber`) en `createExpense`/`attachExpenseDocument` no tiene respaldo de índice único (a diferencia de la protección de compra duplicada desde requerimiento, que sí lo tiene). El riesgo práctico es bajo — es una sola persona registrando gastos, no una cola de alta concurrencia — pero si se vuelve un requisito duro, la vía sería un índice único parcial condicionado a `status='VALID'` (MySQL no soporta índices únicos parciales nativos; la alternativa es un `@@unique([projectId, vendor, documentNumber])` sin condicionar por status, aceptando que una factura anulada bloquee el número para siempre, o mover la unicidad a nivel de aplicación con un lock optimista). Se deja documentado para decidir con el usuario, no es parte del alcance de esta auditoría.
2. Ver la sección "Normalización (1FN/2FN/3FN)" abajo para las denormalizaciones intencionales identificadas y por qué se dejaron como están.

**Aplicadas en sesiones previas (contexto):** protección de compra duplicada vía `requisitionItemId` único, separación de `responsibleName`/`expectedReturnDate` al schema de movimiento correcto, wiring de `materialId`/`warehouseId` en consumo de inventario desde informes diarios.

**Aplicadas 2026-09-09:** `FinancialExpense.fileName` y `ClientPayment.receiptFile` eliminadas — ambas eran columnas huérfanas (cero lecturas/escrituras en el código) y ambas tablas estaban vacías en la base real (0 filas), así que el `DROP COLUMN` no arriesgó ningún dato histórico. Migración `20260909041106_drop_orphaned_columns`.

## Normalización (1FN/2FN/3FN)

Revisión completa, tabla por tabla, de las 42 entidades del esquema actual.

**1FN (valores atómicos, sin grupos repetitivos):** cumple en todo el esquema. Los únicos campos `Json` son `AuditLog.metadata` y `SyncOperation.payload`/`result` — metadata flexible por diseño (bitácora genérica y sobre de sincronización offline), no datos de negocio que deban consultarse de forma relacional. No hay columnas con listas separadas por comas ni arreglos empacados en un string.

**2FN (sin dependencia parcial de una llave compuesta):** las únicas llaves primarias compuestas son `UserRole(userId,roleId)`, `RolePermission(roleId,permissionId)` y `ProjectMember(projectId,userId)`. Ninguna tiene atributos no-llave que dependan de solo una parte de la llave — `ProjectMember.roleLabel` (el único atributo no-llave del grupo) describe el rol de esa persona *en ese proyecto específico*, es decir depende de la llave completa, no de una mitad. El resto de tablas usa una llave primaria simple (UUID), donde 2FN se cumple trivialmente. Sin hallazgos.

**3FN (sin dependencia transitiva — todo atributo depende de la llave, la llave completa y nada más que la llave):** aquí es donde vale la pena mirar con cuidado. Se encontraron dos categorías:

### Corregido: columnas huérfanas sin ninguna dependencia real

- `FinancialExpense.fileName` y `ClientPayment.receiptFile` — ver "Recomendaciones" arriba. Eliminadas.

### Evaluado y dejado como está — denormalización intencional, no defecto

Estos patrones se repiten varias veces en el esquema y a primera vista parecen violar 3FN (un valor que "debería" obtenerse solo vía FK aparece también como texto). En cada caso se verificó la razón de negocio antes de decidir no tocarlo, siguiendo la regla de CLAUDE.md de no eliminar snapshots históricos válidos ni crear/fusionar entidades sin evidencia real de un problema:

1. **`budgetSectionCode`/`budgetSectionName` como texto** en `ScheduleActivity`, `DailyReportActivity` y `FinancialExpense.budgetSectionNo` — no son FK a `BudgetSection` porque el presupuesto tiene **versiones** (`BudgetVersion`) y una sección puede reestructurarse en una versión nueva. Si estos campos fueran FK directas a una fila de `BudgetSection`, un informe diario ya aprobado o un gasto ya registrado cambiarían de significado silenciosamente cuando alguien reordene el presupuesto — exactamente el escenario que CLAUDE.md prohíbe ("snapshot histórico ≠ dato maestro"). El texto congela lo que la sección **se llamaba en el momento**, que es la semántica correcta para un snapshot histórico.
2. **`DailyReportMaterial.materialName`/`warehouse` (texto) junto a `materialId`/`warehouseId` (FK opcionales)** — el FK se llena cuando el material existe en el catálogo; el texto libre permite capturar la entrada de un supervisor de obra que menciona un material que aún no está catalogado. Forzar el FK como obligatorio bloquearía el registro de avance diario por un dato administrativo pendiente — un cambio de regla de negocio, no de esquema, que no se aplicó sin pedirlo.
3. **`FinancialExpense.vendor` (texto) junto a `supplierId` (FK opcional)** — `vendor` es anterior al módulo de proveedores (`Supplier`/`PurchaseOrder`, agregado en migraciones de esta semana). Hoy conviven porque no todo gasto viene de una orden de compra formal a un proveedor registrado. Recomendación (no aplicada): que la UI prefiera `supplierId` para gastos nuevos que sí tengan proveedor, dejando `vendor` como respaldo para gastos sin proveedor formal — es una decisión de flujo de captura, no algo que el esquema deba forzar.
4. **`requestedBy` (`Requisition`), `siteManager` (`DailyReport`), `responsibleName` (`StockMovement`)** — texto libre, no FK a `User`, de forma consistente en las tres tablas. No es un descuido: el personal de obra (encargados, cuadrillas) no siempre tiene cuenta en el sistema, así que forzar estos campos a ser usuarios reales excluiría del registro a quien físicamente hizo el trabajo. `ScheduleActivity.labor` y `DailyReportLabor.workerLabel` siguen el mismo patrón por la misma razón — coincide con la decisión ya documentada en `CLAUDE.md`/`docs/modules.md` de no crear un módulo `workforce`/`Worker` sin evidencia de que resuelva un problema real.
5. **`unit` como `String` repetido en `InventoryMaterial`, `BudgetLineItem`, `RequisitionItem`, `DailyReportActivity`, `DailyReportMaterial`, `PurchaseOrderItem`** — el candidato más "de libro" a convertirse en catálogo (`UnitOfMeasure`). No se creó esa tabla porque, revisando los datos reales, estas tablas están vacías o casi vacías hoy (el catálogo de materiales apenas se está armando) — no hay ninguna inconsistencia real que demostrar todavía (variantes como "m2" vs "m²" vs "metros2"), y `CLAUDE.md` pide exactamente eso antes de crear una entidad nueva: demostrar un problema real, no anticiparlo. Queda como recomendación a vigilar cuando el catálogo tenga volumen real — si aparecen variantes inconsistentes del mismo valor, ahí sí se justifica el catálogo.
6. **`DocumentVersion`, `DailyReportMedia`, `WebsiteProjectPhoto` almacenan metadatos de archivo por separado** (no hay una tabla `MediaAsset` genérica) — evaluado explícitamente porque `CLAUDE.md` nombra `MediaAsset` como ejemplo a justificar antes de crear. Las tres tienen **ciclos de vida y permisos distintos** (documento privado con control de acceso vía la auditoría de seguridad reciente, evidencia interna de obra, foto pública de marketing) — ese es exactamente el criterio que `CLAUDE.md` da para que SÍ se justifique una tabla separada. Fusionarlas sería el error, no mantenerlas separadas.

**Conclusión:** con las dos columnas huérfanas corregidas, el esquema no tiene violaciones de 3FN sin justificar. Las denormalizaciones que quedan son decisiones de diseño deliberadas (snapshots históricos, transición de datos informales a catalogados, o campos que capturan personas fuera del sistema) — normalizarlas "a la fuerza" rompería reglas de negocio reales o requeriría inventar datos que hoy no existen, ambas cosas que este proyecto pide evitar explícitamente.

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

## Baseline de pruebas (2026-09-09)

```
npx prisma validate        → ok
npx prisma migrate dev     → aplicó 20260909041106_drop_orphaned_columns, "Your database is now in sync with your schema."
npx prisma migrate status  → "Database schema is up to date!" (20 migraciones)
npx prisma generate        → ok
npm run typecheck          → ok
npm run test                → 99/99 tests, 20/20 suites
```

No se corrió `npm run build` en esta pasada porque el servidor de desarrollo del usuario podía estar corriendo en paralelo sobre la misma carpeta `.next` (riesgo de corromperla, ya documentado en sesiones anteriores) — `typecheck` + `test` + `migrate status` ya confirman que el cambio de esquema no rompió nada en código ni en la base real.
