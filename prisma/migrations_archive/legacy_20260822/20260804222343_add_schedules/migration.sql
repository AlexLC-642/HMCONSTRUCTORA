-- CreateTable
CREATE TABLE `Schedule` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL DEFAULT 'Cronograma',
    `sourceReference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Schedule_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduleActivity` (
    `id` VARCHAR(191) NOT NULL,
    `scheduleId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `labor` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `plannedStart` DATETIME(3) NOT NULL,
    `plannedEnd` DATETIME(3) NOT NULL,
    `actualStart` DATETIME(3) NULL,
    `actualEnd` DATETIME(3) NULL,
    `progress` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `position` INTEGER NOT NULL,
    `notes` TEXT NULL,

    INDEX `ScheduleActivity_scheduleId_idx`(`scheduleId`),
    INDEX `ScheduleActivity_status_idx`(`status`),
    INDEX `ScheduleActivity_plannedStart_idx`(`plannedStart`),
    INDEX `ScheduleActivity_plannedEnd_idx`(`plannedEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduleActivityDependency` (
    `id` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NOT NULL,
    `dependsOnActivityId` VARCHAR(191) NOT NULL,
    `type` ENUM('FINISH_TO_START', 'START_TO_START') NOT NULL DEFAULT 'FINISH_TO_START',

    INDEX `ScheduleActivityDependency_dependsOnActivityId_idx`(`dependsOnActivityId`),
    UNIQUE INDEX `ScheduleActivityDependency_activityId_dependsOnActivityId_key`(`activityId`, `dependsOnActivityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduleAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `label` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ScheduleAssignment_activityId_idx`(`activityId`),
    INDEX `ScheduleAssignment_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Schedule` ADD CONSTRAINT `Schedule_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduleActivity` ADD CONSTRAINT `ScheduleActivity_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `Schedule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduleActivityDependency` ADD CONSTRAINT `ScheduleActivityDependency_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `ScheduleActivity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduleActivityDependency` ADD CONSTRAINT `ScheduleActivityDependency_dependsOnActivityId_fkey` FOREIGN KEY (`dependsOnActivityId`) REFERENCES `ScheduleActivity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduleAssignment` ADD CONSTRAINT `ScheduleAssignment_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `ScheduleActivity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduleAssignment` ADD CONSTRAINT `ScheduleAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
