/*
  Warnings:

  - A unique constraint covering the columns `[txid]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "txid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_txid_key" ON "Order"("txid");
