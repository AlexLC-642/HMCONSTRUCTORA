ALTER TABLE `DailyReportMedia` ADD COLUMN `dailyReportActivityId` VARCHAR(191) NULL;

UPDATE `DailyReportMedia` media
SET `dailyReportActivityId` = (
  SELECT activity.`id`
  FROM `DailyReportActivity` activity
  WHERE activity.`dailyReportId` = media.`dailyReportId`
    AND activity.`activityCode` = media.`activityCode`
    AND (
      SELECT COUNT(*)
      FROM `DailyReportActivity` count_activity
      WHERE count_activity.`dailyReportId` = media.`dailyReportId`
        AND count_activity.`activityCode` = media.`activityCode`
    ) = 1
  LIMIT 1
)
WHERE media.`activityCode` IS NOT NULL
  AND media.`dailyReportActivityId` IS NULL;

CREATE INDEX `DailyReportMedia_dailyReportActivityId_idx` ON `DailyReportMedia`(`dailyReportActivityId`);

ALTER TABLE `DailyReportMedia`
  ADD CONSTRAINT `DailyReportMedia_dailyReportActivityId_fkey`
  FOREIGN KEY (`dailyReportActivityId`) REFERENCES `DailyReportActivity`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
