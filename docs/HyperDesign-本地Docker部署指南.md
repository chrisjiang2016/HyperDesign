# HyperDesign Docker Compose 部署指南

> 当前 Compose 交付针对现有 Prisma SQLite schema：提供单机、持久化、可启动的 `api + web` 部署。PostgreSQL、Redis、MinIO 的正式接入需要先完成应用层 datasource / 存储适配，不能仅替换容器而宣称已支持。

## 前置条件

- Docker Engine 29+ 与 Docker Compose v2+
- 可用端口：默认 `8080`

## 启动

```bash
cd infra
cp .env.example .env
# 生产环境：设置公网 HTTPS 地址，并将 SESSION_COOKIE_SECURE=true
docker compose up -d --build
```

访问 `http://localhost:8080`。健康检查由 API 内部 `GET /api/health` 驱动；查看状态：

```bash
docker compose ps
docker compose logs -f api
```

## 环境变量

| 变量 | 说明 | 本地默认值 |
|---|---|---|
| `APP_ORIGIN` | 前端公开地址，API CORS 使用 | `http://localhost:8080` |
| `SESSION_COOKIE_SECURE` | HTTPS 时必须启用 | `false` |
| `WEB_PORT` | 宿主机 Web 端口 | `8080` |
| `MAX_UPLOAD_BYTES` | ZIP 上传字节上限 | `104857600` |

不要提交真实 `.env`、数据库或上传目录。

## 数据与备份

Compose 管理两个持久卷：

- `hyperdesign-data`：SQLite 数据库
- `hyperdesign-storage`：原型 ZIP 与解压资源

停止服务前可导出卷：

```bash
docker run --rm -v infra_hyperdesign-data:/data -v "${PWD}:/backup" alpine tar czf /backup/hyperdesign-data-backup.tgz -C /data .
docker run --rm -v infra_hyperdesign-storage:/data -v "${PWD}:/backup" alpine tar czf /backup/hyperdesign-storage-backup.tgz -C /data .
```

恢复时先停止服务，再将对应压缩包解入同名卷。备份文件必须加密存放，上传资源和 SQLite 数据库都可能包含业务数据。

## 生产上线要求

1. 使用 HTTPS 反向代理，并将 `APP_ORIGIN` 设置为实际 HTTPS 域名。
2. 设置 `SESSION_COOKIE_SECURE=true`。
3. 仅暴露 Web 端口；API 不映射到宿主机端口。
4. 定期备份上述两个卷，并完成恢复演练。
5. 生产迁移到多实例前，先完成 PostgreSQL、Redis、MinIO 的应用适配与迁移测试。

## 实机验证记录（2026-07-27）

在 Windows Docker Desktop（Docker Engine 29.6.1 / Compose v2）完成首次 Compose 实机验证：

- `docker compose --env-file .env.example config`：通过；
- `infra-api`、`infra-web` 镜像：构建成功；
- `docker compose up -d`：API 与 Web 容器均启动；
- API 容器健康检查：`healthy`，失败次数为 `0`；
- 通过 Nginx 访问 `GET http://localhost:8080/api/health`：返回 `status: ok`、`database: ok`；
- Chrome 打开 `http://localhost:8080/login`：登录页正常渲染，确认前端静态资源、Nginx 反代和 API 链路可用。

本次同时修复两项部署阻塞：

1. 移除前端 Vite/Rolldown 的包级 `manualChunks`。该规则会生成循环 chunk 依赖，造成生产 Docker 页面空白（`TypeError: t is not a function`）；现改用自动拆包。
2. 移除两个 Dockerfile 中会强制向 Docker Hub 拉取 frontend 的 `# syntax=docker/dockerfile:1` 声明。当前 Dockerfile 未使用该 frontend 专属语法，移除后可复用本地缓存基础镜像，避免临时 Docker Hub EOF 使构建失败。
3. Nginx 默认 `client_max_body_size` 仅为 1 MiB，会在请求到达 NestJS 前拒绝原型 ZIP 并返回 `413 Request Entity Too Large`。已在 `frontend/nginx.conf` 显式配置为 `100m`，与应用的 `MAX_UPLOAD_BYTES=104857600` 保持一致；用 1.44 MiB 的真实 Axure ZIP 上传、解析并在 Viewer 中打开 `start_with_pages.html`（共 7 页）验证通过。

当前容器保持运行，访问地址：`http://localhost:8080`。

## 停止与更新

```bash
cd infra
docker compose down
docker compose up -d --build
```

`docker compose down -v` 会删除数据库与上传卷，除非明确要清空数据，否则不要使用。
