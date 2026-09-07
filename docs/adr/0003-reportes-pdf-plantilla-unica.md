# ADR 0003 - Reportes PDF con plantilla unica

## Estado

Propuesto.

## Contexto

El sistema debe mostrar vista previa HTML, version imprimible, PDF final y portal compartido. Mantener plantillas separadas aumenta el riesgo de inconsistencias.

## Decision

Usar un solo modelo de datos de reporte y una plantilla HTML/CSS base para:

- Vista previa en tiempo real.
- Version imprimible.
- Renderizado PDF.
- Portal compartido cuando aplique.

## Reglas

- Los datos se validan antes de crear el modelo de reporte.
- El PDF final se versiona.
- Un informe aprobado no se edita directamente.
- Las plantillas exactas de presupuesto, cronograma y estado de cuenta requieren los PDFs de referencia.

## Consecuencias

- Menor duplicacion.
- Mayor consistencia visual.
- Las pruebas visuales se vuelven parte obligatoria del flujo de reportes.
