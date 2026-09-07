# Etapa 5 - Avance diario, informes y PWA

## Alcance implementado

- Modelos `DailyReport` y `DailyReportActivity` por proyecto.
- Modelos `DailyReportLabor` y `DailyReportMaterial` para personal y materiales usados.
- Flujo inicial: borrador, enviado y aprobado.
- Pantalla de captura en `/projects/[id]/progress` optimizada por bloques para operacion en campo.
- Actividades ejecutadas vinculadas al cronograma cuando existe actividad base.
- Calculo en servidor de cantidad acumulada y porcentaje nuevo.
- Validacion para no bajar avance anterior ni superar 100%.
- Registro de personal con personas, horas, tarifa y monto calculado.
- Registro de materiales usados con bodega, unidad, desperdicio, devolucion y actividad relacionada.
- Vista imprimible en `/projects/[id]/progress/print` con acciones para regresar y guardar/imprimir PDF, incluyendo evidencia adjunta.
- Manifest PWA, service worker basico, pagina offline e indicador de conexion.
- Borrador local del informe diario en IndexedDB con opcion de recuperar o descartar.
- Cola de sincronizacion para informes diarios con endpoint idempotente y tabla `SyncOperation`.
- Al aprobar un informe, se actualiza el avance de la actividad del cronograma y el avance promedio del proyecto.
- Auditoria de creacion, edicion, envio y aprobacion.

## Pendiente de esta etapa

- Evidencia fotografica/video con almacenamiento externo.
- Vista previa enriquecida en tiempo real mientras se captura.
- Evidencia fotografica/video con almacenamiento externo.
- Idempotencia completa de sincronizacion offline.
- Adaptador S3/R2 para evidencia en produccion y cola offline de archivos grandes.

## Criterio actual verificable

- Crear o editar un borrador de informe diario desde las actividades del cronograma.
- Capturar actividades ejecutadas, personal y materiales usados.
- Enviar el informe para aprobacion.
- Aprobar el informe y reflejar el avance en el cronograma.
- Abrir la vista imprimible del informe y guardar/imprimir PDF desde el navegador.