#!/bin/bash
set -e

echo "=== HyperDesign 系统优化部署脚本 ==="
echo "1. 创建 system 超级管理员账号"
echo "2. 更新前后端代码"
echo ""
echo "开始时间: $(date)"
echo ""

# 检查是否在正确的目录
if [ ! -f "backend/package.json" ]; then
  echo "❌ 错误：请在 HyperDesign 项目根目录运行此脚本"
  exit 1
fi

# 1. 创建 system 超级管理员账号
echo "步骤 1/4: 创建 system 超级管理员账号..."
cd backend
if [ ! -f "scripts/create-system-admin.js" ]; then
  echo "❌ 错误：未找到 create-system-admin.js 脚本"
  exit 1
fi

node scripts/create-system-admin.js
if [ $? -ne 0 ]; then
  echo "❌ system 账号创建失败"
  exit 1
fi
echo "✅ system 账号创建成功"
echo ""

# 2. 重新构建前端
echo "步骤 2/4: 重新构建前端..."
cd ../frontend
npm run build
if [ $? -ne 0 ]; then
  echo "❌ 前端构建失败"
  exit 1
fi
echo "✅ 前端构建成功"
echo ""

# 3. 重新构建 Docker 镜像
echo "步骤 3/4: 重新构建 Docker 镜像..."
cd ../infra
docker compose stop web api
docker compose build web api
if [ $? -ne 0 ]; then
  echo "❌ Docker 镜像构建失败"
  exit 1
fi
echo "✅ Docker 镜像构建成功"
echo ""

# 4. 启动容器
echo "步骤 4/4: 启动更新后的容器..."
docker compose up -d web api
sleep 5
docker compose ps
echo ""

# 验证部署
echo "=== 验证部署 ==="
echo "测试 API 健康检查..."
curl -s http://localhost:8080/api/health | head -20 || echo "警告：API 访问失败"
echo ""
echo "测试前端页面..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8080/ || echo "警告：前端访问失败"
echo ""

echo "=== 部署完成 ==="
echo "完成时间: $(date)"
echo ""
echo "🎉 系统优化已成功部署！"
echo ""
echo "✅ 新功能："
echo "  1. 创建了 system 超级管理员账号"
echo "     - 用户名: system"
echo "     - 密码: Henry0105"
echo "     - 权限: 最高权限，可删除团队成员"
echo "  2. system 账号在前端不显示"
echo "  3. system 账号可以删除团队成员"
echo ""
echo "⚠️ 安全提示："
echo "  - 请妥善保管 system 账号密码"
echo "  - 建议首次登录后修改密码"
echo "  - 不要与他人分享 system 账号"
echo ""
echo "请访问 http://$(hostname -I | awk '{print $1}'):8080/login 测试登录"
