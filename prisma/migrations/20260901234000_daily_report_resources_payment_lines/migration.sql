-- Daily reports consume exact catalog resources from a known warehouse.
ALTER TABLE `DailyReportMaterial`
  ADD COLUMN `materialId` VARCHAR(191) NULL,
  ADD COLUMN `warehouseId` VARCHAR(191) NULL;

CREATE INDEX `DailyReportMaterial_materialId_idx`
  ON `DailyReportMaterial`(`materialId`);
CREATE INDEX `DailyReportMaterial_warehouseId_idx`
  ON `DailyReportMaterial`(`warehouseId`);

ALTER TABLE `DailyReportMaterial`
  ADD CONSTRAINT `DailyReportMaterial_materialId_fkey`
    FOREIGN KEY (`materialId`) REFERENCES `InventoryMaterial`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `DailyReportMaterial_warehouseId_fkey`
    FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- A client installment may be earmarked for a specific approved budget line.
ALTER TABLE `ClientPayment`
  ADD COLUMN `concept` VARCHAR(191) NULL,
  ADD COLUMN `budgetLineItemId` VARCHAR(191) NULL;

CREATE INDEX `ClientPayment_budgetLineItemId_idx`
  ON `ClientPayment`(`budgetLineItemId`);

ALTER TABLE `ClientPayment`
  ADD CONSTRAINT `ClientPayment_budgetLineItemId_fkey`
    FOREIGN KEY (`budgetLineItemId`) REFERENCES `BudgetLineItem`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
