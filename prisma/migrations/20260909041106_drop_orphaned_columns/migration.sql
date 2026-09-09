/*
  Warnings:

  - You are about to drop the column `receiptFile` on the `ClientPayment` table. All the data in the column will be lost.
  - You are about to drop the column `fileName` on the `FinancialExpense` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ClientPayment` DROP COLUMN `receiptFile`;

-- AlterTable
ALTER TABLE `FinancialExpense` DROP COLUMN `fileName`;
