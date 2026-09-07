ALTER TABLE `PortalShare` ADD COLUMN `token` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `PortalShare_token_key` ON `PortalShare`(`token`);
