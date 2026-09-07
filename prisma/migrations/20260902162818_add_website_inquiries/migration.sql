-- CreateTable
CREATE TABLE `WebsiteInquiry` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('NEW', 'IN_PROGRESS', 'CLOSED', 'SPAM') NOT NULL DEFAULT 'NEW',
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `handledById` VARCHAR(191) NULL,
    `handledAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WebsiteInquiry_status_idx`(`status`),
    INDEX `WebsiteInquiry_createdAt_idx`(`createdAt`),
    INDEX `WebsiteInquiry_ipAddress_createdAt_idx`(`ipAddress`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WebsiteInquiry` ADD CONSTRAINT `WebsiteInquiry_handledById_fkey` FOREIGN KEY (`handledById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
