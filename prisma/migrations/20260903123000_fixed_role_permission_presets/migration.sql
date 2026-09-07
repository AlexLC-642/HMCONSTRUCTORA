-- Los roles del sistema son paquetes fijos. Los permisos de varios roles se
-- combinan al asignarlos a una misma persona.
DELETE rp
FROM `RolePermission` rp
INNER JOIN `Role` r ON r.id = rp.roleId
WHERE r.`key` IN (
  'superadministrador', 'administrador', 'gerente_proyecto',
  'supervisor_obra', 'contabilidad', 'compras', 'bodega',
  'contratista_interno', 'usuario_consulta'
);

INSERT INTO `RolePermission` (`roleId`, `permissionId`)
SELECT r.id, p.id
FROM `Role` r
CROSS JOIN `Permission` p
WHERE
  r.`key` IN ('superadministrador', 'administrador')
  OR (r.`key` = 'gerente_proyecto' AND p.`key` IN (
    'proyectos.ver', 'proyectos.crear', 'proyectos.editar',
    'presupuesto.ver', 'presupuesto.editar', 'presupuesto.aprobar',
    'cronograma.ver', 'cronograma.editar',
    'avance.crear', 'avance.revisar', 'avance.aprobar', 'avance.publicar',
    'inventario.mover', 'requerimiento.aprobar', 'finanzas.ver',
    'documentos.compartir', 'portal.gestionar'
  ))
  OR (r.`key` = 'supervisor_obra' AND p.`key` IN (
    'proyectos.ver', 'presupuesto.ver', 'cronograma.ver',
    'avance.crear', 'avance.revisar', 'inventario.mover'
  ))
  OR (r.`key` = 'contabilidad' AND p.`key` IN (
    'proyectos.ver', 'presupuesto.ver', 'finanzas.ver',
    'finanzas.registrar', 'documentos.compartir'
  ))
  OR (r.`key` = 'compras' AND p.`key` IN (
    'proyectos.ver', 'presupuesto.ver', 'inventario.mover',
    'requerimiento.aprobar', 'finanzas.ver', 'finanzas.registrar',
    'documentos.compartir'
  ))
  OR (r.`key` = 'bodega' AND p.`key` IN (
    'inventario.mover', 'requerimiento.aprobar'
  ))
  OR (r.`key` = 'contratista_interno' AND p.`key` IN (
    'proyectos.ver', 'cronograma.ver', 'avance.crear'
  ))
  OR (r.`key` = 'usuario_consulta' AND p.`key` IN (
    'proyectos.ver', 'presupuesto.ver', 'cronograma.ver', 'finanzas.ver'
  ));

UPDATE `Role`
SET
  `name` = 'Finanzas y contabilidad',
  `description` = 'Control de presupuesto, gastos, pagos y documentos financieros'
WHERE `key` = 'contabilidad';
