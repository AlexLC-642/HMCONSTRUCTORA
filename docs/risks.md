# Riesgos principales

## PDFs de referencia faltantes

Los documentos reales no estan en `docs/references/`. Esto bloquea la reproduccion fiel de plantillas PDF de presupuesto, cronograma y estado de cuenta.

Mitigacion: crear carpeta de referencias y avanzar solo con estructura generica hasta recibir los PDFs.

## Alcance amplio

El sistema cubre muchos modulos con reglas sensibles.

Mitigacion: mantener etapas pequenas, criterios de aceptacion y aprobacion antes de fases grandes.

## Offline e idempotencia

La sincronizacion puede duplicar informes, consumos de inventario o movimientos financieros si no se disena bien.

Mitigacion: claves de idempotencia, UUID cliente, tabla `SyncOperation` y transacciones.

## Seguridad por proyecto

Existe riesgo de acceso a datos de otro proyecto si los filtros se aplican solo en UI.

Mitigacion: autorizacion y filtros por proyecto en servidor.

## Reportes divergentes

Vista previa y PDF pueden diferir si se implementan plantillas separadas.

Mitigacion: usar un solo modelo de reporte y una plantilla HTML/CSS comun.

## Inventario y finanzas

Son dominios sensibles donde errores de transaccion afectan datos reales.

Mitigacion: transacciones, pruebas de integracion, auditoria y permisos granulares.
