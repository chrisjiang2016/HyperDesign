-- 创建 system 超级管理员账号
-- 密码: Henry0105
-- 密码哈希使用 argon2 加密

-- 注意：实际的密码哈希需要通过 argon2.hash('Henry0105') 生成
-- 这里提供一个占位符，部署时需要运行脚本生成真实哈希

-- 临时脚本：生成密码哈希
-- node -e "const argon2 = require('argon2'); argon2.hash('Henry0105').then(hash => console.log(hash));"

INSERT INTO `User` (
  `id`,
  `username`,
  `passwordHash`,
  `role`,
  `status`,
  `createdAt`,
  `updatedAt`
) VALUES (
  'system_superadmin_0000',
  'system',
  '$argon2id$v=19$m=65536,t=3,p=4$PLACEHOLDER',  -- 需要替换为真实哈希
  'SUPER_ADMIN',
  'ACTIVE',
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE
  `passwordHash` = VALUES(`passwordHash`),
  `role` = VALUES(`role`),
  `status` = VALUES(`status`);
