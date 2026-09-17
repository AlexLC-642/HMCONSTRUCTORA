ALTER TABLE `StockMovement`
    ADD COLUMN `wasteReason` ENUM('CUTTING_SURPLUS', 'BREAKAGE', 'DAMAGE', 'EXPIRATION', 'LOSS', 'THEFT', 'OTHER') NULL,
    ADD COLUMN `wasteReviewStatus` ENUM('NOT_REQUIRED', 'PENDING', 'REVIEWED', 'NEEDS_ACTION') NULL,
    ADD COLUMN `wasteReviewTriggers` JSON NULL,
    ADD COLUMN `wasteReviewNotes` TEXT NULL,
    ADD COLUMN `wasteReviewedById` VARCHAR(191) NULL,
    ADD COLUMN `wasteReviewedAt` DATETIME(3) NULL;

UPDATE `StockMovement`
SET `wasteReason` = 'OTHER', `wasteReviewStatus` = 'NOT_REQUIRED'
WHERE `type` = 'WASTE';

CREATE INDEX `StockMovement_wasteReviewStatus_idx` ON `StockMovement`(`wasteReviewStatus`);
CREATE INDEX `StockMovement_wasteReviewedById_idx` ON `StockMovement`(`wasteReviewedById`);

ALTER TABLE `StockMovement`
    ADD CONSTRAINT `StockMovement_wasteReviewedById_fkey`
    FOREIGN KEY (`wasteReviewedById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `Permission` (`id`, `key`, `name`, `description`, `createdAt`, `updatedAt`)
SELECT UUID(), 'inventario.desperdicio.revisar', 'Revisar desperdicios',
       'Permite revisar desperdicios de inventario que requieren seguimiento.',
       CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (
    SELECT 1 FROM `Permission` WHERE `key` = 'inventario.desperdicio.revisar'
);

INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`)
SELECT role_row.`id`, permission_row.`id`
FROM `Role` AS role_row
JOIN `Permission` AS permission_row
  ON permission_row.`key` = 'inventario.desperdicio.revisar'
WHERE role_row.`key` IN ('superadministrador', 'administrador', 'gerente_proyecto', 'supervisor_obra');
