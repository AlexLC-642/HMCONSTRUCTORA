# Roles y permisos

Fuente de verdad en codigo: `src/modules/roles/domain/permissions.ts` (roles, permisos y matriz de presets por rol). Este documento resume ese archivo en prosa; si difieren, el codigo manda.

## Roles iniciales

- `superadministrador`
- `administrador`
- `gerente_proyecto`
- `supervisor_obra`
- `contabilidad`
- `compras`
- `bodega`
- `contratista_interno`
- `usuario_consulta`

No existe rol de cliente.

## Permisos iniciales

- `proyectos.ver`
- `proyectos.crear`
- `proyectos.editar`
- `presupuesto.ver`
- `presupuesto.editar`
- `presupuesto.aprobar`
- `cronograma.ver`
- `cronograma.editar`
- `avance.crear`
- `avance.revisar`
- `avance.aprobar`
- `avance.publicar`
- `inventario.mover`
- `requerimiento.aprobar`
- `finanzas.ver`
- `finanzas.registrar`
- `documentos.compartir`
- `portal.gestionar`
- `usuarios.gestionar`
- `usuarios.administradores` — gestionar cuentas con rol de superadministrador (mas restrictivo que `usuarios.gestionar`).
- `sitio.editar` — editar contenido del CMS del sitio publico (modulo `website`).

## Matriz preliminar

| Rol | Permisos principales |
| --- | --- |
| superadministrador | Todos los permisos |
| administrador | Gestion operativa, proyectos, usuarios no superadmin, documentos y portal |
| gerente_proyecto | Presupuesto, cronograma, avances, reportes y portal — la descripcion de rol dice "proyectos asignados" pero hoy el permiso `proyectos.editar` no esta acotado por `ProjectMember`, asi que en la practica puede editar cualquier proyecto, no solo los asignados (ver `docs/security-audit.md` M4, pendiente de decision de producto) |
| supervisor_obra | Avances, evidencia, materiales usados y consulta de proyecto asignado |
| contabilidad | Finanzas, abonos, gastos, estados de cuenta y reportes financieros |
| compras | Requerimientos, proveedores, compras y documentos relacionados |
| bodega | Inventario, bodegas, entradas, salidas y kardex |
| contratista_interno | Consulta y carga limitada en actividades asignadas |
| usuario_consulta | Solo lectura segun proyecto y permisos asignados |

## Reglas

- La autorizacion se verifica siempre en servidor.
- La interfaz puede ocultar acciones, pero no es una medida de seguridad suficiente.
- Acciones financieras, aprobaciones, publicaciones, enlaces compartidos y movimientos de inventario generan auditoria.
- Toda consulta sensible debe filtrar por proyecto y permiso.
