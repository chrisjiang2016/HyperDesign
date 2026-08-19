/*
  Warnings:

  - You are about to drop the column `extractedPath` on the `PrototypeFile` table. All the data in the column will be lost.
  - You are about to drop the column `originalZipPath` on the `PrototypeFile` table. All the data in the column will be lost.
  - Added the required column `storageKey` to the `PrototypeFile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `PrototypeFile` DROP COLUMN `extractedPath`,
    DROP COLUMN `originalZipPath`,
    ADD COLUMN `storageKey` VARCHAR(191) NOT NULL;
