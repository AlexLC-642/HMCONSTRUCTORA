-- AlterTable
ALTER TABLE `User` ADD COLUMN `phone` VARCHAR(8) NULL;

-- CreateTable
CREATE TABLE `UserPasskey` (
    `id` VARCHAR(512) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `webAuthnUserId` VARCHAR(128) NOT NULL,
    `publicKey` LONGBLOB NOT NULL,
    `counter` BIGINT NOT NULL DEFAULT 0,
    `deviceType` VARCHAR(32) NOT NULL,
    `backedUp` BOOLEAN NOT NULL DEFAULT false,
    `transports` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NULL,

    INDEX `UserPasskey_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserPasskey` ADD CONSTRAINT `UserPasskey_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
