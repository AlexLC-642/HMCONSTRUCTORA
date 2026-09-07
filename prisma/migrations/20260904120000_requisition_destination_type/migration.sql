-- Make the final destination explicit. The receiving warehouse remains the
-- physical entry point; PROJECT means the stock will later leave for a job,
-- while WAREHOUSE means it remains as warehouse inventory.
ALTER TABLE `Requisition`
  ADD COLUMN `destinationType` ENUM('PROJECT', 'WAREHOUSE') NOT NULL DEFAULT 'PROJECT';

-- Preserve the meaning of legacy rows that were created without a project.
UPDATE `Requisition`
SET `destinationType` = 'WAREHOUSE'
WHERE `projectId` IS NULL;
