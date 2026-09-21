CREATE TABLE `User` (
  `id` VARCHAR(191) NOT NULL, `name` VARCHAR(191) NOT NULL, `email` VARCHAR(191) NOT NULL, `passwordHash` VARCHAR(191) NOT NULL,
  `status` ENUM('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE', `role` ENUM('SUPER_ADMIN','ADMIN','STAFF','USER') NOT NULL DEFAULT 'STAFF',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL, `lastLoginAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `User_email_key` (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Customer` (
  `id` VARCHAR(191) NOT NULL, `name` VARCHAR(191) NOT NULL, `businessName` VARCHAR(191) NULL, `phone` VARCHAR(191) NOT NULL,
  `additionalPhone` VARCHAR(191) NULL, `wilaya` VARCHAR(191) NULL, `commune` VARCHAR(191) NULL, `niche` VARCHAR(191) NULL,
  `address` VARCHAR(191) NULL, `type` ENUM('TEMPORARY','REGISTERED') NOT NULL DEFAULT 'TEMPORARY',
  `lifecycle` ENUM('NEW','ACTIVE','REPEAT','INACTIVE') NOT NULL DEFAULT 'NEW', `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), INDEX `Customer_phone_idx` (`phone`), INDEX `Customer_businessName_idx` (`businessName`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Merchant` (
  `id` VARCHAR(191) NOT NULL, `name` VARCHAR(191) NOT NULL, `businessName` VARCHAR(191) NULL, `phone` VARCHAR(191) NOT NULL,
  `additionalPhone` VARCHAR(191) NULL, `wilaya` VARCHAR(191) NOT NULL, `commune` VARCHAR(191) NOT NULL, `category` VARCHAR(191) NULL,
  `niche` VARCHAR(191) NOT NULL, `address` VARCHAR(191) NULL, `description` TEXT NULL,
  `verificationStatus` ENUM('UNVERIFIED','PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'UNVERIFIED',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), INDEX `Merchant_phone_idx` (`phone`), INDEX `Merchant_niche_wilaya_commune_idx` (`niche`,`wilaya`,`commune`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Shipment` (
  `id` VARCHAR(191) NOT NULL, `reference` VARCHAR(191) NOT NULL, `serialNumber` VARCHAR(191) NOT NULL, `customerId` VARCHAR(191) NULL,
  `senderName` VARCHAR(191) NOT NULL, `senderPhone` VARCHAR(191) NULL, `recipientName` VARCHAR(191) NOT NULL, `recipientPhone` VARCHAR(191) NULL,
  `originWilaya` VARCHAR(191) NOT NULL, `originCommune` VARCHAR(191) NULL, `destinationWilaya` VARCHAR(191) NOT NULL, `destinationCommune` VARCHAR(191) NULL,
  `description` TEXT NOT NULL, `quantity` INT NOT NULL DEFAULT 1, `weight` DECIMAL(65,30) NULL, `volume` DECIMAL(65,30) NULL,
  `deliveryFee` DECIMAL(12,2) NOT NULL, `financialStatus` ENUM('UNPAID','PARTIALLY_PAID','PAID','REFUNDED','REVERSED','SETTLED') NOT NULL DEFAULT 'UNPAID',
  `status` ENUM('NEW','PROCESSING','RECEIVED','IN_TRANSIT','ARRIVED','READY_FOR_PICKUP','DELIVERED','CANCELLED','RETURNED','ISSUE') NOT NULL DEFAULT 'NEW',
  `createdByUserId` VARCHAR(191) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `Shipment_reference_key` (`reference`), UNIQUE INDEX `Shipment_serialNumber_key` (`serialNumber`),
  INDEX `Shipment_status_createdAt_idx` (`status`,`createdAt`), INDEX `Shipment_destinationWilaya_status_idx` (`destinationWilaya`,`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ShipmentStatusHistory` (
  `id` VARCHAR(191) NOT NULL, `shipmentId` VARCHAR(191) NOT NULL,
  `fromStatus` ENUM('NEW','PROCESSING','RECEIVED','IN_TRANSIT','ARRIVED','READY_FOR_PICKUP','DELIVERED','CANCELLED','RETURNED','ISSUE') NULL,
  `toStatus` ENUM('NEW','PROCESSING','RECEIVED','IN_TRANSIT','ARRIVED','READY_FOR_PICKUP','DELIVERED','CANCELLED','RETURNED','ISSUE') NOT NULL,
  `reason` TEXT NULL, `changedByUserId` VARCHAR(191) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), INDEX `ShipmentStatusHistory_shipmentId_createdAt_idx` (`shipmentId`,`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Payment` (
  `id` VARCHAR(191) NOT NULL, `reference` VARCHAR(191) NOT NULL, `shipmentId` VARCHAR(191) NULL, `customerId` VARCHAR(191) NULL,
  `amount` DECIMAL(12,2) NOT NULL, `method` VARCHAR(191) NOT NULL, `type` VARCHAR(191) NOT NULL, `status` VARCHAR(191) NOT NULL DEFAULT 'VALID',
  `createdByUserId` VARCHAR(191) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), UNIQUE INDEX `Payment_reference_key` (`reference`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Debt` (
  `id` VARCHAR(191) NOT NULL, `customerId` VARCHAR(191) NOT NULL, `shipmentId` VARCHAR(191) NULL,
  `originalAmount` DECIMAL(12,2) NOT NULL, `settledAmount` DECIMAL(12,2) NOT NULL DEFAULT 0, `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `Debt_shipmentId_key` (`shipmentId`), INDEX `Debt_customerId_status_idx` (`customerId`,`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CashAccount` (
  `id` VARCHAR(191) NOT NULL, `name` VARCHAR(191) NOT NULL, `currency` VARCHAR(191) NOT NULL DEFAULT 'DZD',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CashLedgerEntry` (
  `id` VARCHAR(191) NOT NULL, `cashAccountId` VARCHAR(191) NOT NULL, `type` VARCHAR(191) NOT NULL, `amount` DECIMAL(12,2) NOT NULL,
  `direction` VARCHAR(191) NOT NULL, `referenceType` VARCHAR(191) NULL, `referenceId` VARCHAR(191) NULL, `reason` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`), INDEX `CashLedgerEntry_cashAccountId_createdAt_idx` (`cashAccountId`,`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Expense` (
  `id` VARCHAR(191) NOT NULL, `reference` VARCHAR(191) NOT NULL, `category` VARCHAR(191) NOT NULL, `amount` DECIMAL(12,2) NOT NULL,
  `paymentMethod` VARCHAR(191) NOT NULL, `beneficiary` VARCHAR(191) NULL, `description` TEXT NULL, `createdByUserId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`), UNIQUE INDEX `Expense_reference_key` (`reference`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Partner` (
  `id` VARCHAR(191) NOT NULL, `name` VARCHAR(191) NOT NULL, `phone` VARCHAR(191) NULL, `percentage` DECIMAL(5,2) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE', `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PartnerSettlement` (
  `id` VARCHAR(191) NOT NULL, `partnerId` VARCHAR(191) NOT NULL, `periodStart` DATETIME(3) NOT NULL, `periodEnd` DATETIME(3) NOT NULL,
  `distributableProfit` DECIMAL(12,2) NOT NULL, `percentage` DECIMAL(5,2) NOT NULL, `calculatedShare` DECIMAL(12,2) NOT NULL,
  `paidAmount` DECIMAL(12,2) NOT NULL DEFAULT 0, `remainingAmount` DECIMAL(12,2) NOT NULL DEFAULT 0, PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AuditLog` (
  `id` VARCHAR(191) NOT NULL, `actorUserId` VARCHAR(191) NULL,
  `action` ENUM('CREATE','UPDATE','CANCEL','REVERSE','LOGIN','LOGOUT','PERMISSION_CHANGE','VERIFY','MERGE','ARCHIVE') NOT NULL,
  `entityType` VARCHAR(191) NOT NULL, `entityId` VARCHAR(191) NOT NULL, `beforeData` JSON NULL, `afterData` JSON NULL,
  `reason` TEXT NULL, `ipAddress` VARCHAR(191) NULL, `userAgent` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
  INDEX `AuditLog_entityType_entityId_createdAt_idx` (`entityType`,`entityId`,`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ShipmentStatusHistory` ADD CONSTRAINT `ShipmentStatusHistory_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `Shipment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `Shipment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Debt` ADD CONSTRAINT `Debt_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Debt` ADD CONSTRAINT `Debt_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `Shipment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CashLedgerEntry` ADD CONSTRAINT `CashLedgerEntry_cashAccountId_fkey` FOREIGN KEY (`cashAccountId`) REFERENCES `CashAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PartnerSettlement` ADD CONSTRAINT `PartnerSettlement_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `Partner`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
