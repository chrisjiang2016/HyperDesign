-- Persist Axure sitemap depth for sidebar indentation.
ALTER TABLE `PrototypePage` ADD COLUMN `depth` INTEGER NULL;

-- Prisma unknown-argument errors can exceed VARCHAR(191) and crash the failure path.
ALTER TABLE `PrototypeFile` MODIFY COLUMN `parseError` TEXT NULL;
