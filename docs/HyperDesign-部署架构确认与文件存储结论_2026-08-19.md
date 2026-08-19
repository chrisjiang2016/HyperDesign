# HyperDesign 部署架构确认与文件存储结论

> 确认日期：2026-08-19
> 状态：架构结论已确认，代码迁移尚未实施

## 1. 正式数据库要求

正式部署数据库确定使用 **MySQL**。

当前代码仍使用 SQLite：

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

当前 Docker Compose 也仍使用 SQLite。因此必须完成 SQLite → MySQL 的正式迁移后，才能称为满足正式部署要求。

正式目标：

```text
MySQL 8.0+
NestJS API
持久化文件存储
```

不再把 PostgreSQL 作为正式数据库目标。

## 2. 数据库与文件存储解耦

使用 MySQL 不代表将上传文件保存进 MySQL。推荐职责划分：

### MySQL 保存

- 用户、团队、项目；
- 原型文件元数据；
- 原始文件名、大小、解析状态；
- 文件存储 Key；
- 页面目录；
- 权限、评论、标注和分享链接。

### 文件存储保存

- 原始 ZIP；
- 解压后的 HTML、CSS、JavaScript、图片和其他静态资源。

## 3. 当前本地 SQLite 文件位置

当前环境变量：

```env
DATABASE_URL="file:./dev.db"
STORAGE_LOCAL_ROOT="./storage"
```

从 `backend` 目录启动时，上传文件位于：

```text
HTML prototype/backend/storage/uploads/{fileId}/original.zip
HTML prototype/backend/storage/extracted/{fileId}/
```

数据库文件位于：

```text
HTML prototype/backend/dev.db
```

## 4. 正式单机部署推荐

建议第一阶段采用服务器绑定目录：

```text
宿主机：/opt/hyperdesign/data/storage/
API 容器：/app/storage/
```

Compose：

```yaml
services:
  api:
    environment:
      DATABASE_URL: mysql://hyperdesign:***@mysql:3306/hyperdesign
      STORAGE_LOCAL_ROOT: /app/storage
    volumes:
      - /opt/hyperdesign/data/storage:/app/storage
```

实际文件：

```text
/opt/hyperdesign/data/storage/uploads/{fileId}/original.zip
/opt/hyperdesign/data/storage/extracted/{fileId}/
```

MySQL 数据目录独立于原型文件目录，例如：

```text
MySQL 容器：/var/lib/mysql
Docker volume：hyperdesign-mysql
```

Windows Docker Desktop 示例：

```yaml
volumes:
  - "D:/HyperDesign/data/storage:/app/storage"
```

## 5. 文件路径配置规则

当前代码读取：

```env
STORAGE_LOCAL_ROOT=./storage
```

路径规则：

```text
{STORAGE_LOCAL_ROOT}/uploads/{fileId}/original.zip
{STORAGE_LOCAL_ROOT}/extracted/{fileId}/
```

本地开发可以使用相对路径：

```env
STORAGE_LOCAL_ROOT="./storage"
```

也可以使用 Windows 绝对路径：

```env
STORAGE_LOCAL_ROOT="D:/HyperDesign/data/storage"
```

正式 Linux 部署建议容器内固定使用：

```env
STORAGE_LOCAL_ROOT="/app/storage"
```

再通过 Docker bind mount 映射到宿主机持久化目录。

## 6. 正式迁移建议

当前字段名为 `originalZipPath`、`extractedPath`。正式迁移到 MySQL 时，建议字段实际保存相对 Key，而不是环境相关的绝对路径：

```text
uploads/{fileId}/original.zip
extracted/{fileId}
```

后端运行时使用 `STORAGE_LOCAL_ROOT` 拼接绝对路径。这样支持：

- Windows 与 Linux 迁移；
- Docker 目录更换；
- 文件备份与恢复；
- 后续 MinIO/S3 适配。

## 7. 长期方案

如果未来部署多 API 实例、Kubernetes 或云服务器，建议升级为：

```text
MySQL + MinIO/S3
```

当前 `S3_ENDPOINT`、`S3_BUCKET` 等配置只是预留，现有上传逻辑仍使用本地 `fs.writeFile()`，尚未真正接入对象存储。

## 8. 后续实施切片

1. 修改 Prisma datasource 为 MySQL；
2. 设计并执行数据库迁移；
3. 更新测试数据库和测试流程；
4. 更新 Compose，接入 MySQL；
5. 将文件字段从绝对路径收敛为相对存储 Key；
6. 保持 `STORAGE_LOCAL_ROOT` 作为本地文件根目录配置；
7. 补充备份、恢复、升级和真实部署验证；
8. 更新旧部署文档中关于 SQLite/PostgreSQL 的过时描述。
