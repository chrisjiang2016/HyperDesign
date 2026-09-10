#!/bin/bash
set -e

# 项目在服务器上的实际根目录（git 仓库 + infra/docker-compose.yml 所在处）
# 注意：不是 /opt/hyperdesign —— 那里只放持久化数据（data/），没有 compose 文件
PROJECT_ROOT="/root/HyperDesign"

echo "=== HyperDesign 前端更新部署脚本 ==="
echo "开始时间: $(date)"

# 1. 从 GitHub 拉取最新代码
echo "步骤 1/4: 从 GitHub 拉取最新代码..."
cd "$PROJECT_ROOT"
git fetch origin
git checkout origin/main -- frontend/

# 2. 重新构建 web 镜像
# frontend/Dockerfile 的 build 阶段会在镜像内自动执行 npm ci && npm run build，
# 因此宿主机不需要单独 npm install / npm run build。
echo "步骤 2/4: 重新构建 web 镜像..."
cd "$PROJECT_ROOT/infra"
docker compose build web

# 3. 重启 web 容器
echo "步骤 3/4: 重启 web 容器..."
docker compose up -d web
sleep 5
docker compose ps

# 4. 验证部署
echo "步骤 4/4: 验证部署..."
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
