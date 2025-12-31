# 快速开始指南

## 1. 安装依赖

```bash
npm install
```

## 2. 配置环境变量

复制环境变量示例文件：

```bash
# Windows
copy env.example .env

# Linux/Mac
cp env.example .env
```

编辑 `.env` 文件，根据你的实际情况修改配置：

- **数据库配置**: 默认使用SQLite，如需使用PostgreSQL，设置 `DB_TYPE=postgres` 并配置PostgreSQL连接信息
- **JWT密钥**: 修改 `JWT_SECRET` 和 `ADMIN_SECRET` 为安全的随机字符串
- **应用配置**: 修改默认应用的 `DEFAULT_APP_ID` 和 `DEFAULT_APP_SECRET`
- **存储配置**: 如需使用对象存储，配置R2或腾讯云COS的相关信息
- **短信/邮件**: 如需使用短信或邮件服务，配置相应参数

## 3. 初始化数据库

```bash
npm run migrate
```

这将创建所有必要的数据库表并初始化默认数据：
- 默认应用（app_id: default-app）
- 默认会员等级（普通会员）
- 默认管理员（用户名: admin, 密码: admin123）

## 4. 启动服务

开发模式（自动重启）：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

服务将在 `http://localhost:3000` 启动（可在 `.env` 中修改PORT）

## 5. 测试API

### 测试健康检查
```bash
curl http://localhost:3000/health
```

### 测试管理员登录
```bash
curl -X POST http://localhost:3000/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 测试用户注册（需要应用认证）
```bash
curl -X POST http://localhost:3000/api/v1/users/register \
  -H "Content-Type: application/json" \
  -H "x-app-id: default-app" \
  -H "x-app-secret: default-secret" \
  -d '{"username":"testuser","password":"123456"}'
```

## 6. 创建新应用

通过后台管理API创建新应用：

1. 先登录获取管理员token
2. 使用token创建新应用：
```bash
curl -X POST http://localhost:3000/api/v1/admin/apps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{
    "app_id": "my-app",
    "app_name": "我的应用",
    "login_mode": "password"
  }'
```

返回的 `app_secret` 需要保存，用于API调用时的应用认证。

## 7. 创建充值卡

通过后台管理API创建充值卡：

```bash
curl -X POST http://localhost:3000/api/v1/admin/cards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{
    "amount": 100.00,
    "points": 10,
    "count": 5
  }'
```

返回的充值卡信息包含 `card_no` 和 `card_password`，可用于充值。

## 注意事项

1. **生产环境配置**:
   - 务必修改所有默认密钥和密码
   - 使用强密码
   - 配置HTTPS
   - 定期备份数据库

2. **数据库选择**:
   - SQLite: 适合小型应用，无需额外配置
   - PostgreSQL: 适合生产环境，性能更好，支持并发

3. **对象存储**:
   - R2: Cloudflare R2，兼容S3 API
   - 腾讯云COS: 腾讯云对象存储
   - 头像上传功能需要配置对象存储

4. **应用模式**:
   - `password`: 用户名密码登录模式
   - `machine`: 免登录模式，通过机器码验证

更多API文档请参考 `API.md`

