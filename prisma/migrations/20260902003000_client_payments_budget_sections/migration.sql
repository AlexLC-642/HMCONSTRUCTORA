ALTER TABLE `ClientPayment`
    ADD COLUMN `budgetSectionId` VARCHAR(191) NULL;

UPDATE `ClientPayment` AS payment
INNER JOIN `BudgetLineItem` AS item ON item.`id` = payment.`budgetLineItemId`
SET payment.`budgetSectionId` = item.`budgetSectionId`
WHERE payment.`budgetLineItemId` IS NOT NULL;

CREATE INDEX `ClientPayment_budgetSectionId_idx`
    ON `ClientPayment`(`budgetSectionId`);

ALTER TABLE `ClientPayment`
    ADD CONSTRAINT `ClientPayment_budgetSectionId_fkey`
    FOREIGN KEY (`budgetSectionId`) REFERENCES `BudgetSection`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
