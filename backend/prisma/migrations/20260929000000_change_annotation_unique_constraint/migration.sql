CREATE TEMPORARY TABLE `_annotation_page_numbers` AS
SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `fileId`, `pageId` ORDER BY `createdAt`, `id`) AS `newNumber`
FROM `Annotation`;

-- Keep the file foreign key indexed while replacing the old unique constraint.
CREATE INDEX `Annotation_fileId_migration_idx` ON `Annotation`(`fileId`);
ALTER TABLE `Annotation` DROP INDEX `Annotation_fileId_number_key`;

UPDATE `Annotation` a
JOIN `_annotation_page_numbers` n ON a.`id` = n.`id`
SET a.`number` = n.`newNumber`;

CREATE UNIQUE INDEX `Annotation_fileId_pageId_number_key` ON `Annotation`(`fileId`, `pageId`, `number`);
ALTER TABLE `Annotation` DROP INDEX `Annotation_fileId_migration_idx`;
DROP TEMPORARY TABLE `_annotation_page_numbers`;
