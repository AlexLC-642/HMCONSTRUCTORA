# Plan de pruebas

## Unitarias

- Calculos de presupuesto.
- Porcentajes de avance.
- Acumulados de actividades.
- Saldos financieros.
- Validacion de estados.
- Permisos.
- Idempotencia.
- Formateo monetario y fechas.

## Integracion

- Aprobar informe diario.
- Descontar inventario al aprobar.
- Registrar gasto.
- Registrar abono.
- Crear versiones de presupuesto e informe.
- Publicar contenido al portal.
- Revocar enlaces privados.
- Sincronizar operaciones offline.

## End-to-end

- Iniciar sesion.
- Crear proyecto.
- Crear presupuesto.
- Registrar avance.
- Adjuntar evidencia.
- Aprobar informe.
- Generar PDF.
- Publicar al portal.
- Abrir portal privado.
- Verificar que no aparezca informacion no autorizada.
- Crear requerimiento.
- Mover inventario.
- Registrar gasto y abono.

## Seguridad

- Usuario sin permiso.
- Acceso a proyecto ajeno.
- Token vencido.
- PIN incorrecto.
- Carga de archivo invalido.
- Repeticion de operacion offline.
- Manipulacion de identificadores.

## PDF

- Comparacion visual de reportes.
- Saltos de pagina.
- Encabezados repetidos.
- Moneda GTQ.
- Tablas sin cortes ilegibles.

## PWA

- Instalacion.
- Carga offline del shell.
- Creacion de borrador sin conexion.
- Reintento de sincronizacion.
- Sincronizacion unica ante reintentos.
