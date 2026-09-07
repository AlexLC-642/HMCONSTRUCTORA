ALTER TABLE `FinancialExpense`
    ADD COLUMN `supportingDocumentId` VARCHAR(191) NULL,
    ADD COLUMN `documentType` VARCHAR(191) NULL;

-- Los identificadores REQ-* son referencias internas de requisición, no folios
-- emitidos por un proveedor. La relación ya existe mediante requisitionItemId.
UPDATE `FinancialExpense`
SET `documentNumber` = NULL
WHERE `requisitionItemId` IS NOT NULL
  AND `documentNumber` LIKE 'REQ-%';

CREATE UNIQUE INDEX `FinancialExpense_supportingDocumentId_key`
    ON `FinancialExpense`(`supportingDocumentId`);

ALTER TABLE `FinancialExpense`
    ADD CONSTRAINT `FinancialExpense_supportingDocumentId_fkey`
    FOREIGN KEY (`supportingDocumentId`) REFERENCES `ProjectDocument`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
