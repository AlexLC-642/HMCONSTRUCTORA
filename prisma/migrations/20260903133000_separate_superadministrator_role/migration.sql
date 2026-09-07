INSERT INTO `Permission` (`id`, `key`, `name`, `description`, `createdAt`, `updatedAt`)
SELECT UUID(), 'usuarios.administradores', 'Gestionar administradores', 'Permite administrar cuentas con rol Administrador', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `Permission` WHERE `key` = 'usuarios.administradores'
);

INSERT INTO `RolePermission` (`roleId`, `permissionId`)
SELECT role_record.`id`, permission_record.`id`
FROM `Role` AS role_record
JOIN `Permission` AS permission_record ON permission_record.`key` = 'usuarios.administradores'
WHERE role_record.`key` = 'superadministrador'
ON DUPLICATE KEY UPDATE `roleId` = VALUES(`roleId`);

DELETE role_permission
FROM `RolePermission` AS role_permission
JOIN `Role` AS role_record ON role_record.`id` = role_permission.`roleId`
JOIN `Permission` AS permission_record ON permission_record.`id` = role_permission.`permissionId`
WHERE role_record.`key` = 'administrador'
  AND permission_record.`key` = 'usuarios.administradores';

DELETE administrator_assignment
FROM `UserRole` AS administrator_assignment
JOIN `Role` AS administrator_role
  ON administrator_role.`id` = administrator_assignment.`roleId`
JOIN `UserRole` AS superadministrator_assignment
  ON superadministrator_assignment.`userId` = administrator_assignment.`userId`
JOIN `Role` AS superadministrator_role
  ON superadministrator_role.`id` = superadministrator_assignment.`roleId`
WHERE administrator_role.`key` = 'administrador'
  AND superadministrator_role.`key` = 'superadministrador';
