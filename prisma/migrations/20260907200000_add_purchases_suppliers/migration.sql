CREATE TABLE `Supplier` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `businessName` VARCHAR(191) NOT NULL,
  `tradeName` VARCHAR(191) NULL,
  `taxId` VARCHAR(191) NULL,
  `contactName` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(8) NULL,
  `address` TEXT NULL,
  `paymentTermsDays` INTEGER NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Supplier_code_key`(`code`),
  UNIQUE INDEX `Supplier_taxId_key`(`taxId`),
  INDEX `Supplier_businessName_idx`(`businessName`),
  INDEX `Supplier_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PurchaseOrder` (
  `id` VARCHAR(191) NOT NULL,
  `number` VARCHAR(191) NOT NULL,
  `supplierId` VARCHAR(191) NOT NULL,
  `requisitionId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NULL,
  `warehouseId` VARCHAR(191) NULL,
  `status` ENUM('DRAFT', 'ISSUED', 'PARTIAL', 'RECEIVED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
  `issueDate` DATETIME(3) NOT NULL,
  `expectedDate` DATETIME(3) NULL,
  `issuedAt` DATETIME(3) NULL,
  `receivedAt` DATETIME(3) NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'GTQ',
  `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  `taxPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0,
  `taxAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `createdById` VARCHAR(191) NULL,
  `issuedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PurchaseOrder_number_key`(`number`),
  INDEX `PurchaseOrder_supplierId_idx`(`supplierId`),
  INDEX `PurchaseOrder_requisitionId_idx`(`requisitionId`),
  INDEX `PurchaseOrder_projectId_idx`(`projectId`),
  INDEX `PurchaseOrder_warehouseId_idx`(`warehouseId`),
  INDEX `PurchaseOrder_status_idx`(`status`),
  INDEX `PurchaseOrder_issueDate_idx`(`issueDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PurchaseOrderItem` (
  `id` VARCHAR(191) NOT NULL,
  `purchaseOrderId` VARCHAR(191) NOT NULL,
  `requisitionItemId` VARCHAR(191) NULL,
  `materialId` VARCHAR(191) NULL,
  `description` VARCHAR(191) NOT NULL,
  `quantity` DECIMAL(14, 2) NOT NULL,
  `unit` VARCHAR(191) NULL,
  `unitCost` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  `receivedQuantity` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  `notes` TEXT NULL,

  INDEX `PurchaseOrderItem_purchaseOrderId_idx`(`purchaseOrderId`),
  INDEX `PurchaseOrderItem_requisitionItemId_idx`(`requisitionItemId`),
  INDEX `PurchaseOrderItem_materialId_idx`(`materialId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FinancialExpense`
  ADD COLUMN `supplierId` VARCHAR(191) NULL,
  ADD COLUMN `purchaseOrderId` VARCHAR(191) NULL,
  ADD INDEX `FinancialExpense_supplierId_idx`(`supplierId`),
  ADD INDEX `FinancialExpense_purchaseOrderId_idx`(`purchaseOrderId`);

ALTER TABLE `Supplier`
  ADD CONSTRAINT `Supplier_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PurchaseOrder`
  ADD CONSTRAINT `PurchaseOrder_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `PurchaseOrder_requisitionId_fkey` FOREIGN KEY (`requisitionId`) REFERENCES `Requisition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `PurchaseOrder_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `PurchaseOrder_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `PurchaseOrder_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `PurchaseOrder_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PurchaseOrderItem`
  ADD CONSTRAINT `PurchaseOrderItem_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `PurchaseOrderItem_requisitionItemId_fkey` FOREIGN KEY (`requisitionItemId`) REFERENCES `RequisitionItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `PurchaseOrderItem_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `InventoryMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `FinancialExpense`
  ADD CONSTRAINT `FinancialExpense_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `FinancialExpense_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `Permission` (`id`, `key`, `name`, `description`, `createdAt`, `updatedAt`)
SELECT UUID(), 'compras.ver', 'Consultar compras', 'Permite consultar proveedores y órdenes de compra', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (SELECT 1 FROM `Permission` WHERE `key` = 'compras.ver');

INSERT INTO `Permission` (`id`, `key`, `name`, `description`, `createdAt`, `updatedAt`)
SELECT UUID(), 'compras.gestionar', 'Gestionar compras', 'Permite administrar proveedores y órdenes de compra', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (SELECT 1 FROM `Permission` WHERE `key` = 'compras.gestionar');

INSERT INTO `RolePermission` (`roleId`, `permissionId`)
SELECT role_record.id, permission_record.id
FROM `Role` role_record
JOIN `Permission` permission_record ON permission_record.`key` = 'compras.ver'
WHERE role_record.`key` IN ('superadministrador', 'administrador', 'gerente_proyecto', 'contabilidad', 'compras', 'bodega')
ON DUPLICATE KEY UPDATE `roleId` = VALUES(`roleId`);

INSERT INTO `RolePermission` (`roleId`, `permissionId`)
SELECT role_record.id, permission_record.id
FROM `Role` role_record
JOIN `Permission` permission_record ON permission_record.`key` = 'compras.gestionar'
WHERE role_record.`key` IN ('superadministrador', 'administrador', 'compras')
ON DUPLICATE KEY UPDATE `roleId` = VALUES(`roleId`);
