#!/bin/bash
set -e

# 项目在服务器上的实际根目录（git 仓库 + infra/docker-compose.yml 所在处）
# 注意：不是 /opt/hyperdesign —— 那里只放持久化数据（data/）
PROJECT_ROOT="/root/HyperDesign"

echo "=== HyperDesign 分享链接「随时可复制」部署脚本 ==="
echo "开始时间: $(date)"

cd "$PROJECT_ROOT" || { echo "❌ 无法进入 $PROJECT_ROOT"; exit 1; }

# 1. 拉取最新代码（含后端 rotate 接口与 token 明文迁移 + 前端复制/重新生成 UI）
echo "步骤 1/4: 从 GitHub 拉取最新代码（前端 + 后端）..."
git fetch origin
git checkout origin/main -- frontend/ backend/

# 2. 重新构建 api 与 web 镜像
#    backend/Dockerfile 的 CMD 会在容器启动时自动执行 `prisma migrate deploy`，
#    因此新增的 ShareLink.token 迁移会在 api 启动时被自动应用，无需手动 migrate。
echo "步骤 2/4: 重新构建 api 与 web 镜像..."
cd "$PROJECT_ROOT/infra"
docker compose build api web

# 3. 重启 api 与 web 容器（api 启动即自动完成数据库迁移）
echo "步骤 3/4: 重启 api 与 web 容器..."
docker compose up -d api web
echo "等待 api 完成迁移与启动..."
sleep 20
docker compose ps

# 4. 验证部署
echo "步骤 4/4: 验证部署..."
echo "测试 API 健康..."
curl -s http://localhost:8080/api/health | head -20 || echo "警告：API 访问失败"
echo ""
echo "测试前端页面..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8080/ || echo "警告：前端访问失败"
echo ""
echo "=== 部署完成 ==="
echo "请在浏览器访问 http://47.114.41.30:8080 登录后，打开任一原型的「分享」弹窗验证："
echo "  ✓ 已创建的链接现在可直接点「复制」"
echo "  ✓ 若某条链接 token 为空（历史存量链接），点「重新生成」即可获得新的可复制链接（旧 URL 将失效）"
