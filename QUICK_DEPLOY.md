# 快速部署指南

## 🚀 5分钟快速部署

### 方式一：Railway（最简单，推荐）

1. **访问 Railway**
   - 打开 https://railway.app
   - 使用GitHub账号登录

2. **创建项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择您的仓库

3. **配置环境变量**
   - 在项目设置中找到 "Variables"
   - 添加以下必需变量：
     ```
     JWT_SECRET=your-secret-key
     ADMIN_SECRET=admin-secret-key
     DEFAULT_APP_SECRET=default-secret
     ```
   - 其他变量根据需要添加（参考 `env.example`）

4. **部署完成**
   - Railway会自动构建和部署
   - 等待几分钟，获得您的应用URL
   - 访问 `https://your-app.railway.app/health` 检查状态

5. **初始化数据库**
   - 在Railway控制台打开终端
   - 运行：`npm run migrate`

### 方式二：Render（免费额度）

1. **访问 Render**
   - 打开 https://render.com
   - 使用GitHub账号登录

2. **创建Web Service**
   - 点击 "New +" → "Web Service"
   - 连接GitHub仓库

3. **配置服务**
   - **Name**: member-system
   - **Environment**: Node
   - **Build Command**: `npm install && npm run migrate`
   - **Start Command**: `npm start`
   - **Plan**: Free（免费）

4. **添加环境变量**
   - 在 "Environment" 标签页添加变量
   - 参考 `env.example` 文件

5. **部署**
   - 点击 "Create Web Service"
   - 等待部署完成

### 方式三：Docker + 任意VPS

1. **准备服务器**
   ```bash
   # 安装Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # 安装Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **克隆代码**
   ```bash
   git clone https://github.com/your-username/member-system.git
   cd member-system
   ```

3. **配置环境变量**
   ```bash
   cp env.example .env
   nano .env  # 编辑配置
   ```

4. **启动服务**
   ```bash
   docker-compose up -d
   ```

5. **初始化数据库**
   ```bash
   docker-compose exec app npm run migrate
   ```

## 📋 必需的环境变量

最少需要配置以下变量：

```env
# 服务器
PORT=3000
NODE_ENV=production

# 数据库（使用SQLite最简单）
DB_TYPE=sqlite
SQLITE_DB_PATH=./data/member.db

# 安全密钥（必须修改！）
JWT_SECRET=your-very-secret-key-change-this
ADMIN_SECRET=admin-secret-key-change-this
DEFAULT_APP_SECRET=default-secret-change-this

# 管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

## ✅ 部署后检查

1. **健康检查**
   ```bash
   curl https://your-domain.com/health
   ```
   应该返回：
   ```json
   {
     "success": true,
     "message": "服务运行正常",
     "timestamp": "..."
   }
   ```

2. **测试管理员登录**
   ```bash
   curl -X POST https://your-domain.com/api/v1/admin/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"your-password"}'
   ```

3. **测试API**
   - 查看 [API.md](./API.md) 了解所有接口
   - 使用Postman或curl测试

## 🔧 常见问题

### 1. 部署后无法访问

- 检查端口是否正确暴露
- 检查防火墙设置
- 检查环境变量 `PORT` 是否正确

### 2. 数据库初始化失败

- 确保有写入权限
- 检查数据库路径配置
- 查看日志：`docker-compose logs app`

### 3. 环境变量未生效

- 确保在平台正确设置了环境变量
- 重启服务
- 检查变量名是否正确

## 📚 更多信息

- 详细部署说明：查看 [DEPLOY.md](./DEPLOY.md)
- API文档：查看 [API.md](./API.md)
- 快速开始：查看 [QUICKSTART.md](./QUICKSTART.md)

## 🎉 部署成功！

部署完成后，您可以：

1. 访问管理后台（通过API）
2. 创建应用
3. 创建充值卡
4. 开始使用！

祝您使用愉快！🚀

