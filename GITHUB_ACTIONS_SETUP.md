# GitHub Actions 配置说明

由于GitHub App权限限制,无法通过API直接创建workflow文件。请按以下步骤手动配置GitHub Actions。

## 方式一:通过GitHub网页界面创建

### 1. 创建CI工作流

1. 访问 https://github.com/jgit853/rebate-system
2. 点击顶部菜单的 **Actions** 标签
3. 点击 **New workflow** 按钮
4. 点击 **set up a workflow yourself** 链接
5. 将文件名改为 `ci.yml`
6. 复制以下内容到编辑器:

```yaml
name: CI

on:
  push:
    branches: ["main"]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "pnpm"

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: "9"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint (if present)
        run: pnpm -s run lint --if-present

      - name: Typecheck (if present)
        run: pnpm -s run typecheck --if-present

      - name: Test (if present)
        run: pnpm -s run test --if-present

      - name: Build
        run: pnpm -s run build
```

7. 点击 **Commit changes** 按钮
8. 选择 **Commit directly to the main branch**
9. 点击 **Commit changes** 确认

### 2. 创建CD工作流(部署到腾讯云)

1. 在 **Actions** 页面,点击 **New workflow**
2. 点击 **set up a workflow yourself**
3. 将文件名改为 `deploy-tencent.yml`
4. 复制以下内容:

```yaml
name: Deploy to Tencent Cloud

on:
  push:
    branches: ["main"]

concurrency:
  group: deploy-production
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Start SSH agent
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.TC_SSH_PRIVATE_KEY }}

      - name: Add known hosts
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -p "${{ secrets.TC_PORT }}" "${{ secrets.TC_HOST }}" >> ~/.ssh/known_hosts

      - name: Deploy on server
        env:
          TC_HOST: ${{ secrets.TC_HOST }}
          TC_PORT: ${{ secrets.TC_PORT }}
          TC_USER: ${{ secrets.TC_USER }}
          DEPLOY_PATH: ${{ secrets.TC_DEPLOY_PATH }}
          GIT_BRANCH: main
          REPO_URL: https://github.com/jgit853/rebate-system.git
        run: |
          ssh -p "$TC_PORT" "$TC_USER@$TC_HOST" "bash -s" << 'EOF'
          set -euo pipefail

          : "${DEPLOY_PATH:?missing}"
          : "${REPO_URL:?missing}"
          : "${GIT_BRANCH:?missing}"

          if [ ! -d "$DEPLOY_PATH" ]; then
            sudo mkdir -p "$DEPLOY_PATH"
            sudo chown -R "$USER:$USER" "$DEPLOY_PATH"
          fi

          if [ ! -d "$DEPLOY_PATH/.git" ]; then
            git clone --branch "$GIT_BRANCH" --depth 1 "$REPO_URL" "$DEPLOY_PATH"
          fi

          cd "$DEPLOY_PATH"
          git fetch --all --prune
          git reset --hard "origin/$GIT_BRANCH"

          bash scripts/deploy_remote.sh
          EOF
```

5. 点击 **Commit changes** 提交

### 3. 配置GitHub Secrets

CD工作流需要配置以下Secrets:

1. 访问 https://github.com/jgit853/rebate-system/settings/secrets/actions
2. 点击 **New repository secret** 按钮
3. 依次添加以下Secrets:

| Name | Value | 说明 |
|------|-------|------|
| `TC_HOST` | 例: `123.456.789.0` | 腾讯云服务器公网IP或域名 |
| `TC_PORT` | 例: `22` | SSH端口(通常为22) |
| `TC_USER` | 例: `ubuntu` | 部署用户(建议非root) |
| `TC_SSH_PRIVATE_KEY` | SSH私钥内容 | 部署用户的SSH私钥(OpenSSH格式) |
| `TC_DEPLOY_PATH` | 例: `/opt/rebate-system` | 服务器上的部署目录 |

#### 生成SSH密钥对(如果还没有)

在本地或服务器上执行:

```bash
# 生成SSH密钥对
ssh-keygen -t ed25519 -C "deploy@rebate-system" -f ~/.ssh/rebate_deploy

# 将公钥添加到服务器的authorized_keys
cat ~/.ssh/rebate_deploy.pub >> ~/.ssh/authorized_keys

# 复制私钥内容(用于GitHub Secret)
cat ~/.ssh/rebate_deploy
```

将私钥内容完整复制到 `TC_SSH_PRIVATE_KEY` Secret中(包括 `-----BEGIN` 和 `-----END` 行)。

## 方式二:通过Git命令行推送(需要个人访问令牌)

如果您有GitHub个人访问令牌(Personal Access Token)且具有workflow权限:

1. 在本地克隆仓库:
```bash
git clone https://github.com/jgit853/rebate-system.git
cd rebate-system
```

2. 将本地的 `.github/workflows/` 目录复制到仓库中

3. 使用个人访问令牌推送:
```bash
git add .github/
git commit -m "ci: 添加GitHub Actions工作流"
git push https://<YOUR_TOKEN>@github.com/jgit853/rebate-system.git main
```

## 验证配置

配置完成后:

1. 访问 https://github.com/jgit853/rebate-system/actions
2. 应该能看到CI和CD两个工作流
3. 每次推送到main分支会自动触发CI检查
4. CI通过后会自动触发CD部署到腾讯云

## 故障排查

### CI失败
- 检查Node.js版本是否为22+
- 检查pnpm版本是否为9+
- 查看具体错误日志定位问题

### CD失败
- 检查GitHub Secrets配置是否正确
- 确认SSH私钥格式正确(OpenSSH格式)
- 确认服务器SSH端口开放
- 确认部署用户有足够权限
- 查看服务器上的部署日志

## 相关文档

- [技术设计文档](./docs/TECHNICAL_DESIGN.md)
- [腾讯云部署指南](./DEPLOYMENT_GUIDE.md)
- [快速启动指南](./QUICK_START.md)
