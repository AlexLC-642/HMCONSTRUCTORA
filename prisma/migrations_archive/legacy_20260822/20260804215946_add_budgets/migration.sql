-- CreateTable
CREATE TABLE `Budget` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL DEFAULT 'Presupuesto',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Budget_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetVersion` (
    `id` VARCHAR(191) NOT NULL,
    `budgetId` VARCHAR(191) NOT NULL,
    `versionNumber` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'APPROVED', 'SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
    `sourceReference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `lineSubtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `siteManagerCost` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `contingencyPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 5,
    `contingencyAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `administrationPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 15,
    `administrationAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `grandTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `approvedAt` DATETIME(3) NULL,
    `approvedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BudgetVersion_budgetId_status_idx`(`budgetId`, `status`),
    INDEX `BudgetVersion_approvedById_idx`(`approvedById`),
    UNIQUE INDEX `BudgetVersion_budgetId_versionNumber_key`(`budgetId`, `versionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetSection` (
    `id` VARCHAR(191) NOT NULL,
    `budgetVersionId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL,
    `materialSubtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `laborSubtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `otherSubtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,

    INDEX `BudgetSection_budgetVersionId_idx`(`budgetVersionId`),
    INDEX `BudgetSection_position_idx`(`position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BudgetLineItem` (
    `id` VARCHAR(191) NOT NULL,
    `budgetSectionId` VARCHAR(191) NOT NULL,
    `type` ENUM('MATERIAL', 'LABOR', 'OTHER') NOT NULL,
    `position` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NULL,
    `days` DECIMAL(14, 2) NULL,
    `unitPrice` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,

    INDEX `BudgetLineItem_budgetSectionId_idx`(`budgetSectionId`),
    INDEX `BudgetLineItem_type_position_idx`(`type`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Budget` ADD CONSTRAINT `Budget_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetVersion` ADD CONSTRAINT `BudgetVersion_budgetId_fkey` FOREIGN KEY (`budgetId`) REFERENCES `Budget`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetVersion` ADD CONSTRAINT `BudgetVersion_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetSection` ADD CONSTRAINT `BudgetSection_budgetVersionId_fkey` FOREIGN KEY (`budgetVersionId`) REFERENCES `BudgetVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BudgetLineItem` ADD CONSTRAINT `BudgetLineItem_budgetSectionId_fkey` FOREIGN KEY (`budgetSectionId`) REFERENCES `BudgetSection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
