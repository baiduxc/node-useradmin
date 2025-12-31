# 多应用会员管理系统

一个基于 Node.js + Express 的多应用会员管理系统，支持多个终端应用的会员统一管理。

## 功能特性

- ✅ 用户注册、登录（支持用户名密码和免登录模式）
- ✅ 积分管理（积分查询、增减）
- ✅ 充值功能（充值卡充值、在线充值）
- ✅ 用户资料管理（用户名、头像上传）
- ✅ 多应用支持
- ✅ S3对象存储（支持R2和腾讯云COS）
- ✅ 后台管理接口
- ✅ 短信和邮件服务

## 技术栈

- Node.js + Express
- SQLite（默认）/ PostgreSQL
- JWT认证
- S3对象存储（R2/腾讯云COS）
- 短信宝（smsbao）短信服务
- Nodemailer邮件服务

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

### 初始化数据库

```bash
npm run migrate
```

### 启动服务

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

## API文档

### 用户API

- `POST /api/v1/users/register` - 用户注册
- `POST /api/v1/users/login` - 用户登录
- `GET /api/v1/users/profile` - 获取用户资料
- `PUT /api/v1/users/profile` - 更新用户资料
- `POST /api/v1/users/avatar` - 上传头像

### 积分API

- `GET /api/v1/points` - 查询积分
- `POST /api/v1/points/add` - 增加积分
- `POST /api/v1/points/deduct` - 扣除积分

### 充值API

- `POST /api/v1/recharge/card` - 充值卡充值
- `POST /api/v1/recharge/online` - 在线充值

### 后台管理API

- `POST /api/v1/admin/login` - 管理员登录
- `GET /api/v1/admin/members` - 会员列表
- `GET /api/v1/admin/apps` - 应用列表
- `GET /api/v1/admin/cards` - 充值卡列表
- 更多接口请参考代码...

## 部署

### 一键部署

#### Railway（推荐）

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. 点击上方按钮
2. 连接GitHub仓库
3. 配置环境变量
4. 自动部署完成！

#### Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. 点击上方按钮
2. 连接GitHub仓库
3. 配置环境变量
4. 部署完成！

#### Docker部署

```bash
# 构建镜像
docker build -t member-system .

# 运行容器
docker run -d \
  --name member-system \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/.env:/app/.env \
  member-system

# 初始化数据库
docker exec member-system npm run migrate
```

#### 其他平台

- **Fly.io**: 使用 `fly launch` 命令
- **Vercel**: 使用 `vercel` 命令
- **Hugging Face Spaces**: 使用Docker方式（见 `README_HF.md`）

详细部署说明请参考 [DEPLOY.md](./DEPLOY.md)

## 项目结构

```
useradmin/
├── src/
│   ├── database/        # 数据库连接和迁移
│   ├── middleware/       # 中间件（认证等）
│   ├── routes/          # API路由
│   ├── services/         # 服务（存储、短信、邮件）
│   └── index.js         # 应用入口
├── Dockerfile           # Docker配置
├── docker-compose.yml   # Docker Compose配置
├── package.json         # 项目配置
└── README.md           # 项目说明
```

## 文档

- [API文档](./API.md) - 完整的API接口文档
- [快速开始](./QUICKSTART.md) - 快速上手指南
- [会员功能说明](./MEMBER_FEATURE.md) - 会员功能详细说明
- [部署指南](./DEPLOY.md) - 详细部署说明
- [Hugging Face部署](./README_HF.md) - HF Spaces部署说明

## 许可证

MIT

