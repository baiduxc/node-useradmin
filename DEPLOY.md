# 部署指南

本指南将帮助您将多应用会员管理系统部署到各种平台。

## 前置准备

1. **GitHub仓库**
   - 将代码推送到GitHub
   - 确保包含所有必要文件

2. **环境变量配置**
   - 复制 `env.example` 为 `.env`
   - 根据实际环境修改配置

## 部署方式

### 1. Docker部署（推荐）

#### 本地Docker部署

```bash
# 构建镜像
docker build -t member-system .

# 运行容器
docker run -d \
  --name member-system \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/.env:/app/.env \
  --restart unless-stopped \
  member-system

# 初始化数据库
docker exec member-system npm run migrate
```

#### 使用Docker Compose

```bash
# 启动服务
docker-compose up -d

# 初始化数据库
docker-compose exec app npm run migrate

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 2. Railway部署

[Railway](https://railway.app) 是一个现代化的部署平台，支持自动从GitHub部署。

#### 步骤：

1. 访问 [Railway](https://railway.app) 并登录
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择您的仓库
5. Railway会自动检测Dockerfile并构建
6. 在项目设置中添加环境变量（从`.env`文件复制）
7. 部署完成后，Railway会提供一个URL

#### 环境变量设置：

在Railway项目设置中添加所有`.env`文件中的变量。

### 3. Render部署

[Render](https://render.com) 提供免费的Node.js托管服务。

#### 步骤：

1. 访问 [Render](https://render.com) 并登录
2. 点击 "New +" → "Web Service"
3. 连接您的GitHub仓库
4. 配置：
   - **Name**: member-system
   - **Environment**: Node
   - **Build Command**: `npm install && npm run migrate`
   - **Start Command**: `npm start`
   - **Environment Variables**: 添加所有`.env`变量
5. 点击 "Create Web Service"

### 4. Fly.io部署

[Fly.io](https://fly.io) 支持全球部署。

#### 步骤：

1. 安装Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. 登录: `fly auth login`
3. 初始化: `fly launch`
4. 部署: `fly deploy`
5. 设置环境变量: `fly secrets set KEY=value`

### 5. Vercel部署

[Vercel](https://vercel.com) 主要用于前端，但也可以部署Node.js API。

#### 步骤：

1. 安装Vercel CLI: `npm i -g vercel`
2. 登录: `vercel login`
3. 部署: `vercel`
4. 设置环境变量: 在Vercel控制台添加

#### 注意：

需要在项目根目录创建 `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.js"
    }
  ]
}
```

### 6. Hugging Face Spaces部署

虽然Hugging Face Spaces主要用于ML模型，但也可以部署Node.js应用。

#### 步骤：

1. 在Hugging Face创建Space
2. 选择SDK: **Docker**
3. 上传代码
4. 在Space设置中添加环境变量（Secrets）
5. 等待构建完成

#### 创建 `app.py`（用于HF Spaces）:

```python
# Hugging Face Spaces需要这个文件
# 实际运行的是Docker容器
import subprocess
import os

if __name__ == "__main__":
    # 运行Node.js应用
    os.system("npm start")
```

### 7. 传统VPS部署

#### 使用PM2管理进程：

```bash
# 安装PM2
npm install -g pm2

# 克隆代码
git clone https://github.com/your-username/member-system.git
cd member-system

# 安装依赖
npm install

# 初始化数据库
npm run migrate

# 启动应用
pm2 start src/index.js --name member-system

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs member-system
```

#### 使用Nginx反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 环境变量配置

所有平台都需要配置以下环境变量（根据实际需求）：

### 必需变量：
- `PORT`: 端口号（默认3000）
- `JWT_SECRET`: JWT密钥
- `ADMIN_SECRET`: 管理员密钥
- `DEFAULT_APP_SECRET`: 默认应用密钥

### 数据库配置：
- `DB_TYPE`: sqlite 或 postgres
- SQLite: `SQLITE_DB_PATH`
- PostgreSQL: `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD`

### 可选配置：
- 存储配置（R2/腾讯云COS）
- 短信配置（smsbao）
- 邮件配置

## 数据库迁移

部署后需要运行数据库迁移：

```bash
npm run migrate
```

或在Docker容器中：

```bash
docker exec -it container-name npm run migrate
```

## 健康检查

部署后可以通过以下端点检查服务状态：

```
GET /health
```

## 常见问题

### 1. 端口冲突

如果3000端口被占用，修改`.env`中的`PORT`变量。

### 2. 数据库文件权限

确保应用有权限读写数据库文件：

```bash
chmod 755 data
chmod 644 data/*.db
```

### 3. 环境变量未生效

确保在部署平台正确设置了环境变量，并且重启了服务。

### 4. 依赖安装失败

某些平台可能需要指定Node.js版本，在`package.json`中添加：

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## 持续集成/持续部署 (CI/CD)

### GitHub Actions示例

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@v0.2.4
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
```

## 监控和日志

建议使用以下工具监控应用：

- **Sentry**: 错误追踪
- **LogRocket**: 日志和会话重放
- **Uptime Robot**: 服务可用性监控

## 备份

定期备份数据库：

```bash
# SQLite
cp data/member.db backups/member-$(date +%Y%m%d).db

# PostgreSQL
pg_dump -h localhost -U postgres member_db > backup.sql
```

