SET @outside_budget_exists = (
  SELECT COUNT(*) FROM `information_schema`.`COLUMNS`
  WHERE `TABLE_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'RequisitionItem'
    AND `COLUMN_NAME` = 'outsideBudget'
);
SET @outside_budget_sql = IF(
  @outside_budget_exists = 0,
  'ALTER TABLE `RequisitionItem` ADD COLUMN `outsideBudget` BOOLEAN NOT NULL DEFAULT false',
  'SELECT 1'
);
PREPARE outside_budget_statement FROM @outside_budget_sql;
EXECUTE outside_budget_statement;
DEALLOCATE PREPARE outside_budget_statement;

SET @outside_budget_reason_exists = (
  SELECT COUNT(*) FROM `information_schema`.`COLUMNS`
  WHERE `TABLE_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'RequisitionItem'
    AND `COLUMN_NAME` = 'outsideBudgetReason'
);
SET @outside_budget_reason_sql = IF(
  @outside_budget_reason_exists = 0,
  'ALTER TABLE `RequisitionItem` ADD COLUMN `outsideBudgetReason` TEXT NULL',
  'SELECT 1'
);
PREPARE outside_budget_reason_statement FROM @outside_budget_reason_sql;
EXECUTE outside_budget_reason_statement;
DEALLOCATE PREPARE outside_budget_reason_statement;

-- Los consumos de informes antiguos ya descontaron la bodega por segunda vez.
-- Restituye ese saldo; desde esta migracion el consumo se controla contra lo
-- entregado a obra y no vuelve a modificar la existencia de bodega.
UPDATE `Stock` AS stock_row
INNER JOIN (
  SELECT
    movement.`materialId`,
    movement.`warehouseId`,
    SUM(movement.`quantity`) AS quantity_to_restore
  FROM `StockMovement` AS movement
  WHERE movement.`dailyReportMaterialId` IS NOT NULL
    AND movement.`type` = 'OUT'
  GROUP BY movement.`materialId`, movement.`warehouseId`
) AS consumed
  ON consumed.`materialId` = stock_row.`materialId`
 AND consumed.`warehouseId` = stock_row.`warehouseId`
SET stock_row.`quantity` = stock_row.`quantity` + consumed.`quantity_to_restore`;

DELETE FROM `StockMovement`
WHERE `dailyReportMaterialId` IS NOT NULL
  AND `type` = 'OUT';
