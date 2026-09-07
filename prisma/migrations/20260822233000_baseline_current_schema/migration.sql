-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Permission_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRole` (
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,

    INDEX `UserRole_roleId_idx`(`roleId`),
    PRIMARY KEY (`userId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,

    INDEX `RolePermission_permissionId_idx`(`permissionId`),
    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` ENUM('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'PUBLISH', 'SHARE', 'REVOKE') NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `taxId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Client_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `internalId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `clientId` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NULL,
    `expectedEndDate` DATETIME(3) NULL,
    `actualEndDate` DATETIME(3) NULL,
    `responsibleId` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'GTQ',
    `baseBudget` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `observations` TEXT NULL,
    `portalEnabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `updatedById` VARCHAR(191) NULL,

    UNIQUE INDEX `Project_internalId_key`(`internalId`),
    UNIQUE INDEX `Project_code_key`(`code`),
    INDEX `Project_clientId_idx`(`clientId`),
    INDEX `Project_responsibleId_idx`(`responsibleId`),
    INDEX `Project_status_idx`(`status`),
    INDEX `Project_startDate_idx`(`startDate`),
    INDEX `Project_expectedEndDate_idx`(`expectedEndDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PortalShare` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PortalShare_token_key`(`token`),
    UNIQUE INDEX `PortalShare_tokenHash_key`(`tokenHash`),
    INDEX `PortalShare_projectId_idx`(`projectId`),
    INDEX `PortalShare_revokedAt_idx`(`revokedAt`),
    INDEX `PortalShare_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectMember` (
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleLabel` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectMember_userId_idx`(`userId`),
    PRIMARY KEY (`projectId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
    `budgetSectionCode` VARCHAR(191) NULL,
    `budgetSectionName` VARCHAR(191) NULL,
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

-- CreateTable
CREATE TABLE `DailyReport` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `reportNumber` VARCHAR(191) NOT NULL,
    `reportDate` DATETIME(3) NOT NULL,
    `siteManager` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `workShift` VARCHAR(191) NULL,
    `startTime` VARCHAR(191) NULL,
    `endTime` VARCHAR(191) NULL,
    `weather` VARCHAR(191) NULL,
    `generalObservations` TEXT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `updatedById` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,

    INDEX `DailyReport_projectId_idx`(`projectId`),
    INDEX `DailyReport_reportDate_idx`(`reportDate`),
    INDEX `DailyReport_status_idx`(`status`),
    UNIQUE INDEX `DailyReport_projectId_reportNumber_key`(`projectId`, `reportNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyReportActivity` (
    `id` VARCHAR(191) NOT NULL,
    `dailyReportId` VARCHAR(191) NOT NULL,
    `scheduleActivityId` VARCHAR(191) NULL,
    `activityCode` VARCHAR(191) NOT NULL,
    `activityName` VARCHAR(191) NOT NULL,
    `budgetSectionCode` VARCHAR(191) NULL,
    `budgetSectionName` VARCHAR(191) NULL,
    `workDescription` TEXT NOT NULL,
    `unit` VARCHAR(191) NULL,
    `contractedQuantity` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `previousQuantity` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `todayQuantity` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `accumulatedQuantity` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `previousProgress` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `newProgress` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `issues` TEXT NULL,
    `position` INTEGER NOT NULL,

    INDEX `DailyReportActivity_dailyReportId_idx`(`dailyReportId`),
    INDEX `DailyReportActivity_scheduleActivityId_idx`(`scheduleActivityId`),
    INDEX `DailyReportActivity_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyReportLabor` (
    `id` VARCHAR(191) NOT NULL,
    `dailyReportId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `workerLabel` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NULL,
    `people` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `hours` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `rate` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,

    INDEX `DailyReportLabor_dailyReportId_idx`(`dailyReportId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyReportMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `dailyReportId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `materialName` VARCHAR(191) NOT NULL,
    `warehouse` VARCHAR(191) NULL,
    `quantityUsed` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NULL,
    `wasteQuantity` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `returnedQuantity` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `activityCode` VARCHAR(191) NULL,
    `notes` TEXT NULL,

    INDEX `DailyReportMaterial_dailyReportId_idx`(`dailyReportId`),
    INDEX `DailyReportMaterial_activityCode_idx`(`activityCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SyncOperation` (
    `id` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `operationType` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'SYNCING', 'SYNCED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `result` JSON NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SyncOperation_idempotencyKey_key`(`idempotencyKey`),
    INDEX `SyncOperation_projectId_idx`(`projectId`),
    INDEX `SyncOperation_userId_idx`(`userId`),
    INDEX `SyncOperation_status_idx`(`status`),
    INDEX `SyncOperation_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyReportMedia` (
    `id` VARCHAR(191) NOT NULL,
    `dailyReportId` VARCHAR(191) NOT NULL,
    `dailyReportActivityId` VARCHAR(191) NULL,
    `activityCode` VARCHAR(191) NULL,
    `mediaType` ENUM('BEFORE', 'DURING', 'AFTER', 'OTHER') NOT NULL DEFAULT 'DURING',
    `title` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `publicUrl` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `uploadedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DailyReportMedia_dailyReportId_idx`(`dailyReportId`),
    INDEX `DailyReportMedia_dailyReportActivityId_idx`(`dailyReportActivityId`),
    INDEX `DailyReportMedia_activityCode_idx`(`activityCode`),
    INDEX `DailyReportMedia_mediaType_idx`(`mediaType`),
    INDEX `DailyReportMedia_uploadedById_idx`(`uploadedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `unitCost` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `minimumStock` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InventoryMaterial_code_key`(`code`),
    INDEX `InventoryMaterial_name_idx`(`name`),
    INDEX `InventoryMaterial_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Warehouse` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Warehouse_code_key`(`code`),
    INDEX `Warehouse_name_idx`(`name`),
    INDEX `Warehouse_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Stock` (
    `id` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Stock_warehouseId_idx`(`warehouseId`),
    UNIQUE INDEX `Stock_materialId_warehouseId_key`(`materialId`, `warehouseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NULL,
    `dailyReportMaterialId` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `type` ENUM('IN', 'OUT', 'RETURN', 'WASTE', 'ADJUSTMENT', 'TRANSFER') NOT NULL,
    `quantity` DECIMAL(14, 2) NOT NULL,
    `unitCost` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalCost` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `StockMovement_idempotencyKey_key`(`idempotencyKey`),
    INDEX `StockMovement_materialId_idx`(`materialId`),
    INDEX `StockMovement_warehouseId_idx`(`warehouseId`),
    INDEX `StockMovement_projectId_idx`(`projectId`),
    INDEX `StockMovement_dailyReportMaterialId_idx`(`dailyReportMaterialId`),
    INDEX `StockMovement_type_idx`(`type`),
    INDEX `StockMovement_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Requisition` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NULL,
    `warehouseId` VARCHAR(191) NULL,
    `number` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `type` ENUM('MATERIAL', 'TOOL', 'EQUIPMENT', 'LABOR', 'SERVICE', 'SUBCONTRACT') NOT NULL DEFAULT 'MATERIAL',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `status` ENUM('DRAFT', 'REQUESTED', 'REVIEWED', 'APPROVED', 'PURCHASED', 'RECEIVED', 'DELIVERED', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `requestedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `neededDate` DATETIME(3) NULL,
    `requestedBy` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Requisition_number_key`(`number`),
    INDEX `Requisition_projectId_idx`(`projectId`),
    INDEX `Requisition_warehouseId_idx`(`warehouseId`),
    INDEX `Requisition_status_idx`(`status`),
    INDEX `Requisition_requestedDate_idx`(`requestedDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequisitionItem` (
    `id` VARCHAR(191) NOT NULL,
    `requisitionId` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NULL,
    `estimatedCost` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,

    INDEX `RequisitionItem_requisitionId_idx`(`requisitionId`),
    INDEX `RequisitionItem_materialId_idx`(`materialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinancialExpense` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `expenseDate` DATETIME(3) NOT NULL,
    `description` TEXT NOT NULL,
    `vendor` VARCHAR(191) NULL,
    `quantity` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NULL,
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `type` VARCHAR(191) NULL,
    `phase` VARCHAR(191) NULL,
    `budgetSectionNo` VARCHAR(191) NULL,
    `activity` VARCHAR(191) NULL,
    `documentNumber` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'VALID', 'VOID') NOT NULL DEFAULT 'VALID',
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FinancialExpense_projectId_idx`(`projectId`),
    INDEX `FinancialExpense_expenseDate_idx`(`expenseDate`),
    INDEX `FinancialExpense_status_idx`(`status`),
    INDEX `FinancialExpense_budgetSectionNo_idx`(`budgetSectionNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientPayment` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `paymentNumber` VARCHAR(191) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `method` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `receiptFile` VARCHAR(191) NULL,
    `observations` TEXT NULL,
    `status` ENUM('REGISTERED', 'VOID') NOT NULL DEFAULT 'REGISTERED',
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClientPayment_projectId_idx`(`projectId`),
    INDEX `ClientPayment_paymentDate_idx`(`paymentDate`),
    INDEX `ClientPayment_status_idx`(`status`),
    UNIQUE INDEX `ClientPayment_projectId_paymentNumber_key`(`projectId`, `paymentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentCategory` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DocumentCategory_key_key`(`key`),
    INDEX `DocumentCategory_active_sortOrder_idx`(`active`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectDocument` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `tags` TEXT NULL,
    `status` ENUM('DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `portalVisible` BOOLEAN NOT NULL DEFAULT false,
    `authorId` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProjectDocument_projectId_idx`(`projectId`),
    INDEX `ProjectDocument_categoryId_idx`(`categoryId`),
    INDEX `ProjectDocument_status_idx`(`status`),
    INDEX `ProjectDocument_portalVisible_idx`(`portalVisible`),
    INDEX `ProjectDocument_authorId_idx`(`authorId`),
    INDEX `ProjectDocument_approvedById_idx`(`approvedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentVersion` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `versionNumber` INTEGER NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `publicUrl` VARCHAR(191) NOT NULL,
    `checksum` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `uploadedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DocumentVersion_documentId_idx`(`documentId`),
    INDEX `DocumentVersion_uploadedById_idx`(`uploadedById`),
    INDEX `DocumentVersion_checksum_idx`(`checksum`),
    UNIQUE INDEX `DocumentVersion_documentId_versionNumber_key`(`documentId`, `versionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_responsibleId_fkey` FOREIGN KEY (`responsibleId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortalShare` ADD CONSTRAINT `PortalShare_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortalShare` ADD CONSTRAINT `PortalShare_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectMember` ADD CONSTRAINT `ProjectMember_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectMember` ADD CONSTRAINT `ProjectMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `DailyReport` ADD CONSTRAINT `DailyReport_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReport` ADD CONSTRAINT `DailyReport_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReport` ADD CONSTRAINT `DailyReport_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReport` ADD CONSTRAINT `DailyReport_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReportActivity` ADD CONSTRAINT `DailyReportActivity_dailyReportId_fkey` FOREIGN KEY (`dailyReportId`) REFERENCES `DailyReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReportActivity` ADD CONSTRAINT `DailyReportActivity_scheduleActivityId_fkey` FOREIGN KEY (`scheduleActivityId`) REFERENCES `ScheduleActivity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReportLabor` ADD CONSTRAINT `DailyReportLabor_dailyReportId_fkey` FOREIGN KEY (`dailyReportId`) REFERENCES `DailyReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReportMaterial` ADD CONSTRAINT `DailyReportMaterial_dailyReportId_fkey` FOREIGN KEY (`dailyReportId`) REFERENCES `DailyReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SyncOperation` ADD CONSTRAINT `SyncOperation_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SyncOperation` ADD CONSTRAINT `SyncOperation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReportMedia` ADD CONSTRAINT `DailyReportMedia_dailyReportId_fkey` FOREIGN KEY (`dailyReportId`) REFERENCES `DailyReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReportMedia` ADD CONSTRAINT `DailyReportMedia_dailyReportActivityId_fkey` FOREIGN KEY (`dailyReportActivityId`) REFERENCES `DailyReportActivity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyReportMedia` ADD CONSTRAINT `DailyReportMedia_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Stock` ADD CONSTRAINT `Stock_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `InventoryMaterial`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Stock` ADD CONSTRAINT `Stock_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `InventoryMaterial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_dailyReportMaterialId_fkey` FOREIGN KEY (`dailyReportMaterialId`) REFERENCES `DailyReportMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Requisition` ADD CONSTRAINT `Requisition_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Requisition` ADD CONSTRAINT `Requisition_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Requisition` ADD CONSTRAINT `Requisition_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Requisition` ADD CONSTRAINT `Requisition_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequisitionItem` ADD CONSTRAINT `RequisitionItem_requisitionId_fkey` FOREIGN KEY (`requisitionId`) REFERENCES `Requisition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequisitionItem` ADD CONSTRAINT `RequisitionItem_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `InventoryMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialExpense` ADD CONSTRAINT `FinancialExpense_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialExpense` ADD CONSTRAINT `FinancialExpense_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientPayment` ADD CONSTRAINT `ClientPayment_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientPayment` ADD CONSTRAINT `ClientPayment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectDocument` ADD CONSTRAINT `ProjectDocument_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectDocument` ADD CONSTRAINT `ProjectDocument_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `DocumentCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectDocument` ADD CONSTRAINT `ProjectDocument_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectDocument` ADD CONSTRAINT `ProjectDocument_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentVersion` ADD CONSTRAINT `DocumentVersion_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `ProjectDocument`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentVersion` ADD CONSTRAINT `DocumentVersion_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
