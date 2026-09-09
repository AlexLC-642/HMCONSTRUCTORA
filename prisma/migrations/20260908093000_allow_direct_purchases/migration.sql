ALTER TABLE `PurchaseOrder`
  DROP FOREIGN KEY `PurchaseOrder_requisitionId_fkey`;

ALTER TABLE `PurchaseOrder`
  MODIFY `requisitionId` VARCHAR(191) NULL;

ALTER TABLE `PurchaseOrder`
  ADD CONSTRAINT `PurchaseOrder_requisitionId_fkey`
  FOREIGN KEY (`requisitionId`) REFERENCES `Requisition`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
