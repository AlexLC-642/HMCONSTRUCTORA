-- CreateTable
CREATE TABLE `WebsiteSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `heroEyebrow` VARCHAR(191) NULL,
    `heroHeading` TEXT NULL,
    `heroSubheading` TEXT NULL,
    `heroImageUrl` VARCHAR(191) NULL,
    `aboutHeading` TEXT NULL,
    `aboutText` TEXT NULL,
    `missionText` TEXT NULL,
    `visionText` TEXT NULL,
    `phonePrimary` VARCHAR(191) NULL,
    `phoneSecondary` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `hoursWeekdays` VARCHAR(191) NULL,
    `hoursSaturday` VARCHAR(191) NULL,
    `facebookUrl` VARCHAR(191) NULL,
    `instagramUrl` VARCHAR(191) NULL,
    `seoTitle` VARCHAR(191) NULL,
    `seoDescription` TEXT NULL,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebsiteService` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `icon` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WebsiteService_active_position_idx`(`active`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebsiteProjectPhoto` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `imageUrl` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NULL,
    `altText` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sourceDailyReportMediaId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WebsiteProjectPhoto_active_position_idx`(`active`, `position`),
    INDEX `WebsiteProjectPhoto_sourceDailyReportMediaId_idx`(`sourceDailyReportMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WebsiteProjectPhoto` ADD CONSTRAINT `WebsiteProjectPhoto_sourceDailyReportMediaId_fkey` FOREIGN KEY (`sourceDailyReportMediaId`) REFERENCES `DailyReportMedia`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
