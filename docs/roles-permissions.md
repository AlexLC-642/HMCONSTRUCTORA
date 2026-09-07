# Roles y permisos

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

## Matriz preliminar

| Rol | Permisos principales |
| --- | --- |
| superadministrador | Todos los permisos |
| administrador | Gestion operativa, proyectos, usuarios no superadmin, documentos y portal |
| gerente_proyecto | Proyectos asignados, presupuesto, cronograma, avances, reportes y portal |
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
