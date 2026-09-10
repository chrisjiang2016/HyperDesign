/**
 * 创建 system 超级管理员账号
 * 用法: node create-system-admin.js
 */

const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');

const SYSTEM_USERNAME = 'system';
const SYSTEM_PASSWORD = 'Henry0105';
const SYSTEM_USER_ID = 'system_superadmin_0000';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('正在生成密码哈希...');
    const passwordHash = await argon2.hash(SYSTEM_PASSWORD);
    console.log('密码哈希已生成');
    
    console.log('正在创建 system 超级管理员账号...');
    const user = await prisma.user.upsert({
      where: { username: SYSTEM_USERNAME },
      update: {
        passwordHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
      create: {
        id: SYSTEM_USER_ID,
        username: SYSTEM_USERNAME,
        passwordHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
    
    console.log('✅ system 超级管理员账号创建成功！');
    console.log('账号信息：');
    console.log('  用户名: system');
    console.log('  密码: Henry0105');
    console.log('  角色: SUPER_ADMIN');
    console.log('  用户ID:', user.id);
    console.log('\n⚠️ 请妥善保管账号密码，建议首次登录后修改密码');
    
  } catch (error) {
    console.error('❌ 创建失败:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
