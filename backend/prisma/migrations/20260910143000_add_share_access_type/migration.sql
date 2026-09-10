-- AlterTable
-- 新增分享链接权限类型：VIEW_ONLY（仅查看）/ JOIN_TEAM（接受后加入所属团队为普通成员）
-- 带默认值，存量链接自动按「仅查看」处理，行为与改动前一致。
ALTER TABLE `ShareLink` ADD COLUMN `accessType` ENUM('VIEW_ONLY', 'JOIN_TEAM') NOT NULL DEFAULT 'VIEW_ONLY';
