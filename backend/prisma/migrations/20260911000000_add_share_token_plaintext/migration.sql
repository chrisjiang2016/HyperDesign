-- AlterTable
-- 分享链接原始 token 明文存储（有意为之的产品决策，换取「随时可复制」能力）
-- 安全取舍：数据库或备份一旦泄露，所有分享链接将直接暴露。已在代码注释与提交信息中记录。
-- 存量链接的 token 为空白字符串，需在前端通过「重新生成并复制」获取新 token（旧分享 URL 将立即失效）。
ALTER TABLE `ShareLink` ADD COLUMN `token` VARCHAR(191) NOT NULL DEFAULT '';
