# Requisitos consolidados

## Producto

Aplicacion web interna para una constructora. El sistema administrara proyectos, presupuestos, cronogramas, avances diarios, inventario, requerimientos, finanzas, documentos, reportes y un portal privado de solo lectura para clientes.

El cliente final no tendra cuenta dentro del sistema. El acceso externo sera mediante enlaces privados generados por personal interno autorizado.

## Plataforma

- Aplicacion full-stack con Next.js, App Router y TypeScript estricto.
- React sera la interfaz de usuario.
- Backend dentro de Next.js mediante Route Handlers, Server Actions y servicios de dominio.
- Monolito modular.
- MySQL con Prisma ORM.
- Tailwind CSS y componentes accesibles.
- PWA instalable con funcionamiento offline parcial.
- IndexedDB para borradores locales y cola de sincronizacion.
- Archivos binarios en almacenamiento compatible con S3, no en MySQL.

## Reglas generales

- No usar microservicios en la primera version.
- No crear rol de cliente.
- No guardar fotos, videos, planos o documentos binarios en MySQL.
- No publicar borradores.
- No descontar inventario antes de aprobacion configurada.
- No confiar en controles visuales para seguridad.
- No usar plantillas PDF distintas a la vista previa HTML.
- No construir todos los modulos en una sola iteracion.

## Modulos funcionales

1. Autenticacion, usuarios, roles y permisos.
2. Proyectos.
3. Dashboard.
4. Presupuesto editable similar a Excel.
5. Cronograma y diagrama de Gantt.
6. Avance diario y bitacora de obra.
7. Informes en tiempo real y PDF.
8. PWA y trabajo sin conexion.
9. Inventario y bodegas.
10. Requerimientos y compras.
11. Finanzas y estado de cuenta.
12. Documentos, contratos, planos, fotos y videos.
13. Portal privado para cliente.
14. Notificaciones.
15. Informes.

## Requisitos no funcionales

- Responsive y usable en escritorio, tableta y telefono.
- Accesible y claro para usuarios no tecnicos.
- Permisos aplicados siempre en servidor.
- Auditoria de acciones sensibles.
- Validacion de entrada en cliente y servidor.
- Manejo consistente de errores.
- Pruebas unitarias, integracion, end-to-end y seguridad.
- Documentacion actualizada por etapa.
