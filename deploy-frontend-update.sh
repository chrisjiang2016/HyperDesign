#!/bin/bash
set -e

echo "=== HyperDesign 前端更新部署脚本 ==="
echo "开始时间: $(date)"

# 1. 停止 web 容器
echo "步骤 1/6: 停止 web 容器..."
cd /opt/hyperdesign
docker compose stop web

# 2. 备份当前前端文件
echo "步骤 2/6: 备份当前前端..."
BACKUP_DIR="/opt/hyperdesign/backups/web-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
docker compose cp web:/app "$BACKUP_DIR/" || echo "备份失败（容器未运行），继续..."

# 3. 从 GitHub 拉取最新代码
echo "步骤 3/6: 从 GitHub 拉取最新代码..."
cd /root/HyperDesign
git fetch origin
git checkout origin/main -- frontend/

# 4. 重新构建前端
echo "步骤 4/6: 重新构建前端..."
cd frontend
npm install
npm run build

# 5. 复制到容器中（或重新构建镜像）
echo "步骤 5/6: 更新前端文件..."
cd /opt/hyperdesign
docker compose build web
docker compose up -d web

# 6. 验证部署
echo "步骤 6/6: 验证部署..."
sleep 5
docker compose ps
echo ""
echo "测试前端页面..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8080/ || echo "警告：前端访问失败"
echo ""
echo "测试 API 健康..."
curl -s http://localhost:8080/api/health | head -20 || echo "警告：API 访问失败"

echo ""
echo "=== 部署完成 ==="
echo "完成时间: $(date)"
echo ""
echo "请在浏览器中访问 http://47.114.41.30:8080/login 验证登录页面"
echo "应该看到："
echo "  ✓ 用户名和密码输入框为空"
echo "  ✓ 底部不显示开发账号信息"
