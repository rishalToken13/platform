-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Merchant" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "merchant_address" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "token" TEXT NOT NULL DEFAULT 'USDT',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_address_key" ON "Merchant"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_name_key" ON "Merchant"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_merchant_id_key" ON "Merchant"("merchant_id");

-- CreateIndex
CREATE INDEX "Order_merchant_id_idx" ON "Order"("merchant_id");

-- CreateIndex
CREATE INDEX "Order_merchant_address_idx" ON "Order"("merchant_address");

-- CreateIndex
CREATE UNIQUE INDEX "Order_merchant_id_order_id_key" ON "Order"("merchant_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "Order_merchant_id_invoice_id_key" ON "Order"("merchant_id", "invoice_id");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
