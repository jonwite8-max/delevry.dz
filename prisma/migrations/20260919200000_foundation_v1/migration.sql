CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'USER');
CREATE TYPE "ShipmentStatus" AS ENUM ('NEW', 'PROCESSING', 'RECEIVED', 'IN_TRANSIT', 'ARRIVED', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED', 'RETURNED', 'ISSUE');
CREATE TYPE "FinancialStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'REVERSED', 'SETTLED');
CREATE TYPE "CustomerType" AS ENUM ('TEMPORARY', 'REGISTERED');
CREATE TYPE "CustomerLifecycle" AS ENUM ('NEW', 'ACTIVE', 'REPEAT', 'INACTIVE');
CREATE TYPE "MerchantVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'CANCEL', 'REVERSE', 'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE', 'VERIFY', 'MERGE', 'ARCHIVE');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "role" "UserRole" NOT NULL DEFAULT 'STAFF',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastLoginAt" TIMESTAMP(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "businessName" TEXT,
  "phone" TEXT NOT NULL,
  "additionalPhone" TEXT,
  "wilaya" TEXT,
  "commune" TEXT,
  "niche" TEXT,
  "address" TEXT,
  "type" "CustomerType" NOT NULL DEFAULT 'TEMPORARY',
  "lifecycle" "CustomerLifecycle" NOT NULL DEFAULT 'NEW',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX "Customer_businessName_idx" ON "Customer"("businessName");

CREATE TABLE "Merchant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "businessName" TEXT,
  "phone" TEXT NOT NULL,
  "additionalPhone" TEXT,
  "wilaya" TEXT NOT NULL,
  "commune" TEXT NOT NULL,
  "category" TEXT,
  "niche" TEXT NOT NULL,
  "address" TEXT,
  "description" TEXT,
  "verificationStatus" "MerchantVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Merchant_phone_idx" ON "Merchant"("phone");
CREATE INDEX "Merchant_niche_wilaya_commune_idx" ON "Merchant"("niche","wilaya","commune");

CREATE TABLE "Shipment" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "customerId" TEXT,
  "senderName" TEXT NOT NULL,
  "senderPhone" TEXT,
  "recipientName" TEXT NOT NULL,
  "recipientPhone" TEXT,
  "originWilaya" TEXT NOT NULL,
  "originCommune" TEXT,
  "destinationWilaya" TEXT NOT NULL,
  "destinationCommune" TEXT,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "weight" DECIMAL,
  "volume" DECIMAL,
  "deliveryFee" DECIMAL(12,2) NOT NULL,
  "financialStatus" "FinancialStatus" NOT NULL DEFAULT 'UNPAID',
  "status" "ShipmentStatus" NOT NULL DEFAULT 'NEW',
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Shipment_reference_key" ON "Shipment"("reference");
CREATE UNIQUE INDEX "Shipment_serialNumber_key" ON "Shipment"("serialNumber");
CREATE INDEX "Shipment_status_createdAt_idx" ON "Shipment"("status","createdAt");
CREATE INDEX "Shipment_destinationWilaya_status_idx" ON "Shipment"("destinationWilaya","status");

CREATE TABLE "ShipmentStatusHistory" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "fromStatus" "ShipmentStatus",
  "toStatus" "ShipmentStatus" NOT NULL,
  "reason" TEXT,
  "changedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipmentStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShipmentStatusHistory_shipmentId_createdAt_idx" ON "ShipmentStatusHistory"("shipmentId","createdAt");

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "shipmentId" TEXT,
  "customerId" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "method" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'VALID',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

CREATE TABLE "Debt" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "shipmentId" TEXT,
  "originalAmount" DECIMAL(12,2) NOT NULL,
  "settledAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Debt_shipmentId_key" ON "Debt"("shipmentId");
CREATE INDEX "Debt_customerId_status_idx" ON "Debt"("customerId","status");

CREATE TABLE "CashAccount" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'DZD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashLedgerEntry" (
  "id" TEXT NOT NULL,
  "cashAccountId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "direction" TEXT NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashLedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CashLedgerEntry_cashAccountId_createdAt_idx" ON "CashLedgerEntry"("cashAccountId","createdAt");

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "beneficiary" TEXT,
  "description" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Expense_reference_key" ON "Expense"("reference");

CREATE TABLE "Partner" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "percentage" DECIMAL(5,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerSettlement" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "distributableProfit" DECIMAL(12,2) NOT NULL,
  "percentage" DECIMAL(5,2) NOT NULL,
  "calculatedShare" DECIMAL(12,2) NOT NULL,
  "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "remainingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT "PartnerSettlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" "AuditAction" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "beforeData" JSONB,
  "afterData" JSONB,
  "reason" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType","entityId","createdAt");

ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShipmentStatusHistory" ADD CONSTRAINT "ShipmentStatusHistory_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashLedgerEntry" ADD CONSTRAINT "CashLedgerEntry_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerSettlement" ADD CONSTRAINT "PartnerSettlement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
