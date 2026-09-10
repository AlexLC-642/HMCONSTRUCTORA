-- CreateTable
CREATE TABLE `SystemErrorLog` (
    `id` VARCHAR(191) NOT NULL,
    `source` ENUM('SERVER', 'CLIENT') NOT NULL,
    `message` TEXT NOT NULL,
    `stack` TEXT NULL,
    `digest` VARCHAR(191) NULL,
    `url` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SystemErrorLog_createdAt_idx`(`createdAt`),
    INDEX `SystemErrorLog_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SystemErrorLog` ADD CONSTRAINT `SystemErrorLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
