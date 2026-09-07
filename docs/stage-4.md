# Etapa 4 - Cronograma

## Alcance implementado

- Modelos de cronograma por proyecto.
- Actividades con mano de obra, estado, avance, fechas planificadas y fechas reales.
- Actividades relacionadas con renglones de presupuesto mediante codigo y nombre de renglon.
- Dependencias entre actividades tipo fin-a-inicio.
- Asignaciones simples por etiqueta o responsable.
- Creacion de cronograma base con las 19 actividades del PDF de referencia.
- Tabla editable en `/projects/[id]/schedule`.
- Vista Gantt en pantalla basada en el rango planificado.
- Vista imprimible en `/projects/[id]/schedule/print` como base para PDF.
- Auditoria de creacion y edicion.

## Referencia usada

- `docs/references/CRONOGRAMA TENTATIVO ACTIVIDADES SHUSHU.pdf`

## Estructura detectada

- Encabezado por semanas de octubre.
- Columnas iniciales: No., descripcion y mano de obra.
- Actividades numeradas del 1 al 19.
- Mano de obra con valor `CONTRATAR` en la referencia.
- Nota de fechas tentativas sujetas a cambios por planificacion, contratos, clima, materiales o personal.

## Validaciones esperadas

- Fechas planificadas con inicio menor o igual que fin.
- Avance entre 0 y 100.
- Dependencias por codigo de actividad.
- Recalculo del rango general del cronograma al guardar.

## Relacion operativa correcta

- Presupuesto define renglones y costos previstos.
- Cronograma usa esos renglones como referencia para planificar actividades.
- Avance diario debe actualizar progreso real por actividad.
- Finanzas y estado de cuenta deben comparar presupuesto, gasto real, abonos y saldo.

Si cambia un renglón presupuestario, el cronograma debe revisarse para mantener la actividad asociada al renglon correcto. Si cambia el avance real, debe actualizar el porcentaje de la actividad y alimentar reportes posteriores.