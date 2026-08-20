# HyperDesign Docker 部署指南（MySQL 版本）

## 部署架构

```
┌─────────────────────────────────────────────────────┐
│                   宿主机 Linux 服务器                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │  MySQL   │    │   API    │    │   Web    │     │
│  │  8.0     │◄───│ (NestJS) │◄───│ (Nginx)  │     │
│  │          │    │          │    │          │     │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘     │
│       │               │               │           │
│       │               │               │           │
│  ┌────▼───────────────▼───────────────▼─────┐     │
│  │     宿主机持久化目录                      │     │
│  │  /opt/hyperdesign/data/                  │     │
│  │    ├── mysql/  (MySQL 数据)              │     │
│  │    └── storage/ (上传文件和解压资源)      │     │
│  └──────────────────────────────────────────┘     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 数据持久化说明

### MySQL 数据库
- **容器内路径**: `/var/lib/mysql`
- **宿主机 Volume**: `hyperdesign-mysql` (Docker 命名卷)
- **存储内容**: 所有业务数据表、索引、元数据

### 文件存储
- **容器内路径**: `/app/storage`
- **宿主机路径**: 由 `STORAGE_HOST_PATH` 环境变量指定（默认 `./storage`）
- **存储结构**:
  ```
  storage/
  ├── uploads/{fileId}/
  │   └── original.zip
  └── extracted/{fileId}/
      ├── index.html
      └── ...
  ```

### 生产环境推荐配置

```bash
# 创建持久化目录
sudo mkdir -p /opt/hyperdesign/data/storage
sudo chown -R 1000:1000 /opt/hyperdesign/data/storage

# 设置环境变量
export STORAGE_HOST_PATH=/opt/hyperdesign/data/storage
```

## 部署步骤

### 1. 准备环境变量

```bash
cd HTML\ prototype/infra
cp .env.example .env

# 编辑 .env 文件，设置安全的密码
nano .env
```

**必须修改的配置**:
```env
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_PASSWORD=your_secure_password
APP_ORIGIN=https://your-domain.com  # 生产环境域名
SESSION_COOKIE_SECURE=true          # HTTPS 环境必须启用
STORAGE_HOST_PATH=/opt/hyperdesign/data/storage
WEB_BIND_ADDRESS=127.0.0.1          # 仅允许宿主机反向代理访问
```

### 2. 构建和启动服务

```bash
# 构建镜像
docker compose build

# 启动所有服务（后台运行）
docker compose up -d

# 查看启动日志
docker compose logs -f
```

### 3. 初始化数据库

API 容器启动时会自动执行版本化 Prisma migration。首次部署后，显式创建生产管理员：

```bash
read -rp "Admin username: " ADMIN_USERNAME
read -rsp "Admin password: " ADMIN_PASSWORD && echo
export ADMIN_USERNAME ADMIN_PASSWORD
docker compose exec -e ADMIN_USERNAME -e ADMIN_PASSWORD api node dist-admin/init-admin.js
unset ADMIN_USERNAME ADMIN_PASSWORD
```

用户名必须是 5-64 位英文字母或数字。密码必须为 12-128 位英文字母或数字，同时包含大写字母、小写字母和数字，且不能包含用户名。若同名账号已经存在，命令会失败，不会覆盖密码或权限。

### 4. 验证部署

```bash
# 检查所有服务健康状态
docker compose ps

# 应该看到：
# mysql   Up (healthy)
# api     Up (healthy)
# web     Up

# 访问健康检查端点
curl http://localhost:8080/api/health
# 预期输出: {"status":"ok"}
```

### 5. 访问应用

打开浏览器访问: `http://localhost:8080`

生产环境没有默认账号，请使用上一步创建的管理员登录。`node dist-seed/seed.js` 只允许在本地开发和验收环境执行，禁止在生产环境运行。

## 日常运维

### 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f api
docker compose logs -f mysql
```

### 重启服务

```bash
# 重启所有服务
docker compose restart

# 重启单个服务
docker compose restart api
```

### 停止服务

```bash
# 停止所有服务（保留数据）
docker compose down

# 停止并删除所有数据（危险操作！）
docker compose down -v
```

### 备份数据

#### 备份 MySQL 数据库

```bash
# 导出数据库
docker compose exec mysql mysqldump \
  -u hyperdesign -p hyperdesign > backup-$(date +%Y%m%d).sql

# 恢复数据库
docker compose exec -T mysql mysql \
  -u hyperdesign -p hyperdesign < backup-20260819.sql
```

#### 备份文件存储

```bash
# 压缩文件存储目录
tar -czf storage-backup-$(date +%Y%m%d).tar.gz \
  /opt/hyperdesign/data/storage

# 恢复文件存储
tar -xzf storage-backup-20260819.tar.gz -C /
```

### 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker compose build

# 重启服务
docker compose up -d

# API 容器启动时会自动执行待部署的版本化 migration
```

## 生产环境优化

### 1. 反向代理（推荐使用 Caddy 或 Nginx）

#### Caddy 配置示例

```caddyfile
# /etc/caddy/Caddyfile
hyperdesign.yourdomain.com {
    reverse_proxy localhost:8080
    encode gzip
    log {
        output file /var/log/caddy/hyperdesign.log
    }
}
```

#### Nginx 配置示例

```nginx
# /etc/nginx/sites-available/hyperdesign
server {
    listen 443 ssl http2;
    server_name hyperdesign.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/hyperdesign.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hyperdesign.yourdomain.com/privkey.pem;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. 数据库连接池优化

在 `backend/.env` 或 docker-compose.yml 中调整：

```env
# Prisma 连接池配置
DATABASE_URL="mysql://hyperdesign:***@mysql:3306/hyperdesign?connection_limit=10&pool_timeout=20"
```

### 3. 文件存储监控

```bash
# 查看存储空间使用情况
du -sh /opt/hyperdesign/data/storage

# 查看各子目录大小
du -sh /opt/hyperdesign/data/storage/*
```

### 4. MySQL 性能优化

编辑 `docker-compose.yml`，添加 MySQL 配置：

```yaml
mysql:
  command:
    - --character-set-server=utf8mb4
    - --collation-server=utf8mb4_unicode_ci
    - --max_connections=200
    - --innodb_buffer_pool_size=512M
```

## 故障排查

### 问题 1：API 连接 MySQL 失败

**现象**: API 日志显示 `Can't reach database server at mysql:3306`

**解决方案**:
```bash
# 检查 MySQL 是否健康
docker compose ps mysql

# 查看 MySQL 日志
docker compose logs mysql

# 手动测试连接
docker compose exec api sh -c 'mysqladmin ping -h mysql -u hyperdesign -p'
```

### 问题 2：文件上传后无法访问

**现象**: 上传成功但预览 404

**解决方案**:
```bash
# 检查存储目录权限
ls -la /opt/hyperdesign/data/storage

# 检查容器内路径
docker compose exec api ls -la /app/storage

# 检查 web 容器是否挂载了存储目录
docker compose exec web ls -la /app/storage
```

### 问题 3：健康检查一直失败

**现象**: `docker compose ps` 显示服务 unhealthy

**解决方案**:
```bash
# 手动运行健康检查命令
docker compose exec api node -e "fetch('http://127.0.0.1:3001/api/health').then(r => console.log(r.status))"

# 检查端口监听
docker compose exec api netstat -tlnp | grep 3001
```

## 从 SQLite 迁移到 MySQL

如果已有 SQLite 数据需要迁移：

### 1. 导出 SQLite 数据

```bash
# 安装 sqlite3
apt-get install sqlite3

# 导出为 SQL
sqlite3 dev.db .dump > sqlite-export.sql
```

### 2. 转换为 MySQL 格式

```bash
# 移除 SQLite 特定语法
sed -i 's/PRAGMA foreign_keys=OFF;//g' sqlite-export.sql
sed -i 's/BEGIN TRANSACTION;//g' sqlite-export.sql
sed -i 's/COMMIT;//g' sqlite-export.sql

# 替换自增主键语法
sed -i 's/INTEGER PRIMARY KEY AUTOINCREMENT/INT AUTO_INCREMENT PRIMARY KEY/g' sqlite-export.sql
```

### 3. 导入到 MySQL

```bash
# 创建数据库
docker compose exec mysql mysql -u hyperdesign -p -e "CREATE DATABASE IF NOT EXISTS hyperdesign;"

# 导入数据
docker compose exec -T mysql mysql -u hyperdesign -p hyperdesign < sqlite-export.sql
```

## 环境变量完整参考

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `MYSQL_ROOT_PASSWORD` | 无，必填 | MySQL root 强密码；缺失或为空时 Compose 拒绝启动 |
| `MYSQL_PASSWORD` | 无，必填 | hyperdesign 用户强密码；缺失或为空时 Compose 拒绝启动 |
| `WEB_BIND_ADDRESS` | 127.0.0.1 | Web 宿主机监听地址；生产环境由反向代理访问 |
| `WEB_PORT` | 8080 | Web 服务对外端口 |
| `APP_ORIGIN` | http://localhost:8080 | 前端访问地址 |
| `SESSION_COOKIE_SECURE` | false | Cookie Secure 标志 |
| `MAX_UPLOAD_BYTES` | 104857600 | 最大上传大小（100MB） |
| `STORAGE_HOST_PATH` | ./storage | 文件存储宿主机路径 |

## 技术支持

遇到问题请查看：
- 项目文档: `HTML prototype/docs/`
- GitHub Issues: https://github.com/chrisjiang2016/HyperDesign/issues
- API 日志: `docker compose logs api`
- MySQL 日志: `docker compose logs mysql`
