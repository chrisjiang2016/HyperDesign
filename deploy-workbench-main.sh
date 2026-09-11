#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="C:/Users/Chris J/WorkBuddy/HyperDesign"
WORKBENCH="$HOME/.local/bin/workbench.exe"
INSTANCE_ID="i-bp16zs7mthoe1m2k9ilp"
REGION="cn-hangzhou"
SERVER_ROOT="/root/HyperDesign"
REMOTE_URL="https://github.com/chrisjiang2016/HyperDesign.git"

cd "$PROJECT_ROOT"

if [[ ! -x "$WORKBENCH" ]]; then
  echo "找不到 Workbench CLI: $WORKBENCH" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "本地存在未提交的受版本管理改动；请先提交或暂存后再部署。" >&2
  exit 1
fi

LOCAL_REVISION="$(git rev-parse HEAD)"
GITHUB_REVISION="$(git ls-remote "$REMOTE_URL" refs/heads/main | awk '{print $1}')"

if [[ -z "$GITHUB_REVISION" ]]; then
  echo "无法读取 GitHub main 的提交号。" >&2
  exit 1
fi

if [[ "$LOCAL_REVISION" != "$GITHUB_REVISION" ]]; then
  echo "本地 HEAD ($LOCAL_REVISION) 与 GitHub main ($GITHUB_REVISION) 不一致；拒绝部署。" >&2
  exit 1
fi

GIT_BUNDLE="hyperdesign-main-${LOCAL_REVISION:0:12}.bundle"
cleanup() {
  rm -f "$GIT_BUNDLE"
}
trap cleanup EXIT

echo "目标提交: $LOCAL_REVISION"
echo "创建完整 Git bundle（含源码与提交历史）..."
git bundle create "$GIT_BUNDLE" --all
git bundle verify "$GIT_BUNDLE" >/dev/null

echo "上传离线提交包到服务器..."
"$WORKBENCH" upload -f "${PROJECT_ROOT//\//\\}\\$GIT_BUNDLE" "$SERVER_ROOT/" --instance-id "$INSTANCE_ID" --region "$REGION"

# Git bundle 已包含完整源码；只使用 git reset 切换版本，避免 git archive 的 LF 行尾
# 覆盖服务器检出文件后被误判为大批工作区改动。
REMOTE_COMMAND="set -e; cd $SERVER_ROOT; target=$LOCAL_REVISION; test -z \"\$(git status --porcelain --untracked-files=no)\" || { echo '服务器工作区不干净；请先完成备份和对齐，拒绝覆盖。' >&2; exit 1; }; git fetch $GIT_BUNDLE refs/heads/main:refs/remotes/offline/github-main; test \"\$(git rev-parse refs/remotes/offline/github-main)\" = \"\$target\"; git checkout --detach \$target; git branch -f main \$target; git checkout main; git reset --hard \$target; cd infra; docker compose build api web; docker compose run --rm --no-deps --entrypoint sh api -c 'npx prisma migrate deploy'; docker compose up -d api web; sleep 8; curl -fsS http://localhost:8080/api/health; test \"\$(git -C $SERVER_ROOT rev-parse HEAD)\" = \"\$target\"; test -z \"\$(git -C $SERVER_ROOT status --porcelain)\"; echo; echo \"部署完成，服务器提交: \$target\""

echo "导入 Git 历史、切换服务器提交并重建服务..."
"$WORKBENCH" exec --instance-id "$INSTANCE_ID" --region "$REGION" --command "$REMOTE_COMMAND" --timeout 480

echo "三端版本一致: $LOCAL_REVISION"
