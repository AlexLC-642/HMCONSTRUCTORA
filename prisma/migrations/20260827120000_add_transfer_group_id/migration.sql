ALTER TABLE `StockMovement` ADD COLUMN `transferGroupId` VARCHAR(191) NULL;

CREATE INDEX `StockMovement_transferGroupId_idx` ON `StockMovement`(`transferGroupId`);
