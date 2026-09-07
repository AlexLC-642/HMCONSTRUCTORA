# Etapa 9 - Portal privado del cliente

## Alcance implementado

- Enlace privado por proyecto sin crear usuario cliente.
- Modelo `PortalShare` con token hash, proyecto, creador, fechas y revocacion.
- Generacion/regeneracion del enlace desde el detalle del proyecto.
- Revocacion del enlace activo.
- El token plano se muestra solo al generarlo y no se guarda en base de datos.
- Ruta publica `/portal/[token]` con vista de solo lectura.
- Portal limitado a informacion aprobada o publicada:
  - datos generales del proyecto;
  - presupuesto aprobado;
  - avance del proyecto;
  - actividades del cronograma;
  - informes diarios publicados;
  - documentos aprobados marcados como visibles en portal.

## Seguridad aplicada

- El cliente no inicia sesion.
- No existe rol de cliente.
- El token se almacena como SHA-256.
- Los enlaces revocados o vencidos no muestran informacion.
- La vista publica no usa el `AppShell` interno ni expone rutas administrativas.

## Pendiente de endurecimiento

- Expiracion configurable desde la interfaz.
- Registro de accesos al portal por IP y agente.
- Limitar intentos sobre tokens invalidos.
- Selector fino de secciones visibles por proyecto.
- Branding especifico por proyecto si la empresa lo requiere.
