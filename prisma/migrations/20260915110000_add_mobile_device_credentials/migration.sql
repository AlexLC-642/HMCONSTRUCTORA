CREATE TABLE `MobileDeviceCredential` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `installationId` VARCHAR(64) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `deviceName` VARCHAR(120) NULL,
    `platform` VARCHAR(20) NOT NULL DEFAULT 'android',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `MobileDeviceCredential_installationId_key`(`installationId`),
    UNIQUE INDEX `MobileDeviceCredential_tokenHash_key`(`tokenHash`),
    INDEX `MobileDeviceCredential_userId_idx`(`userId`),
    INDEX `MobileDeviceCredential_expiresAt_idx`(`expiresAt`),
    INDEX `MobileDeviceCredential_revokedAt_idx`(`revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MobileDeviceCredential`
    ADD CONSTRAINT `MobileDeviceCredential_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
