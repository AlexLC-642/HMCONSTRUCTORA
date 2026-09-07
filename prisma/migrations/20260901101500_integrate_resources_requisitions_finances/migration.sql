-- Inventory resources: consumables, tools and equipment share the catalog,
-- while durable resources can be identified for individual control.
ALTER TABLE `InventoryMaterial`
  ADD COLUMN `resourceType` ENUM('MATERIAL', 'TOOL', 'EQUIPMENT') NOT NULL DEFAULT 'MATERIAL',
  ADD COLUMN `specification` VARCHAR(191) NULL,
  ADD COLUMN `brand` VARCHAR(191) NULL,
  ADD COLUMN `model` VARCHAR(191) NULL,
  ADD COLUMN `trackIndividually` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `InventoryMaterial_resourceType_active_idx`
  ON `InventoryMaterial`(`resourceType`, `active`);

-- Operational traceability for tools and equipment issued to a project.
ALTER TABLE `StockMovement`
  ADD COLUMN `responsibleName` VARCHAR(191) NULL,
  ADD COLUMN `expectedReturnDate` DATETIME(3) NULL;

-- A budget line and a schedule activity are context, never the inventory SKU.
ALTER TABLE `RequisitionItem`
  ADD COLUMN `budgetLineItemId` VARCHAR(191) NULL,
  ADD COLUMN `scheduleActivityId` VARCHAR(191) NULL;

CREATE INDEX `RequisitionItem_budgetLineItemId_idx`
  ON `RequisitionItem`(`budgetLineItemId`);
CREATE INDEX `RequisitionItem_scheduleActivityId_idx`
  ON `RequisitionItem`(`scheduleActivityId`);

ALTER TABLE `RequisitionItem`
  ADD CONSTRAINT `RequisitionItem_budgetLineItemId_fkey`
    FOREIGN KEY (`budgetLineItemId`) REFERENCES `BudgetLineItem`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `RequisitionItem_scheduleActivityId_fkey`
    FOREIGN KEY (`scheduleActivityId`) REFERENCES `ScheduleActivity`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- One requisition line can originate only one financial purchase.
ALTER TABLE `FinancialExpense`
  ADD COLUMN `requisitionItemId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `FinancialExpense_requisitionItemId_key`
  ON `FinancialExpense`(`requisitionItemId`);

ALTER TABLE `FinancialExpense`
  ADD CONSTRAINT `FinancialExpense_requisitionItemId_fkey`
    FOREIGN KEY (`requisitionItemId`) REFERENCES `RequisitionItem`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Supplier installments are outgoing payments and remain separate from
-- client deposits, which are incoming project cash.
CREATE TABLE `SupplierPayment` (
  `id` VARCHAR(191) NOT NULL,
  `financialExpenseId` VARCHAR(191) NOT NULL,
  `paymentNumber` VARCHAR(191) NOT NULL,
  `paymentDate` DATETIME(3) NOT NULL,
  `amount` DECIMAL(14, 2) NOT NULL,
  `method` VARCHAR(191) NULL,
  `reference` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `status` ENUM('REGISTERED', 'VOID') NOT NULL DEFAULT 'REGISTERED',
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `SupplierPayment_financialExpenseId_paymentNumber_key`(`financialExpenseId`, `paymentNumber`),
  INDEX `SupplierPayment_paymentDate_idx`(`paymentDate`),
  INDEX `SupplierPayment_status_idx`(`status`),
  INDEX `SupplierPayment_createdById_idx`(`createdById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SupplierPayment`
  ADD CONSTRAINT `SupplierPayment_financialExpenseId_fkey`
    FOREIGN KEY (`financialExpenseId`) REFERENCES `FinancialExpense`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `SupplierPayment_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
