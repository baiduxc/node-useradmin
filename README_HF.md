# Hugging Face Spaces 部署说明

本文件说明如何在Hugging Face Spaces上部署此Node.js应用。

## 重要提示

Hugging Face Spaces主要设计用于Python/ML模型。对于Node.js应用，建议使用：
- **Railway** (推荐)
- **Render**
- **Fly.io**
- **Vercel**

如果您仍想在HF Spaces上部署，请使用Docker方式。

## Docker部署方式

### 1. 创建Space

1. 访问 [Hugging Face Spaces](https://huggingface.co/spaces)
2. 点击 "Create new Space"
3. 填写信息：
   - **Space name**: member-system
   - **SDK**: **Docker**
   - **Hardware**: CPU Basic (免费) 或根据需要选择
   - **Visibility**: Public 或 Private

### 2. 上传代码

将以下文件上传到Space：

- `Dockerfile`
- `package.json`
- `src/` 目录
- `.env.example` (重命名为 `.env` 并配置)
- 其他必要文件

### 3. 配置环境变量

在Space设置中添加Secrets（环境变量）：

1. 进入Space设置
2. 找到 "Repository secrets" 或 "Variables"
3. 添加所有必要的环境变量（参考 `env.example`）

### 4. 修改Dockerfile（如果需要）

确保Dockerfile适合HF Spaces环境：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p data

# HF Spaces使用PORT环境变量
ENV PORT=7860
EXPOSE 7860

CMD ["npm", "start"]
```

### 5. 修改应用端口

在 `src/index.js` 中，确保使用环境变量中的PORT：

```javascript
const PORT = process.env.PORT || 3000;
```

HF Spaces通常使用7860端口。

## 替代方案

### Railway部署（推荐）

1. 访问 [Railway](https://railway.app)
2. 连接GitHub仓库
3. 自动部署
4. 配置环境变量
5. 完成！

### Render部署

1. 访问 [Render](https://render.com)
2. 创建Web Service
3. 连接GitHub
4. 配置构建和启动命令
5. 部署

## 注意事项

1. **数据库持久化**: HF Spaces的存储是临时的，重启会丢失数据。建议使用外部数据库（PostgreSQL）。
2. **文件上传**: 上传的文件在重启后会丢失，建议使用对象存储（R2/COS）。
3. **性能**: 免费层资源有限，适合测试使用。
4. **端口**: HF Spaces使用7860端口，确保应用监听正确的端口。

## 推荐配置

对于生产环境，建议：

1. 使用PostgreSQL数据库（外部服务如Supabase、Railway等）
2. 使用对象存储（R2或腾讯云COS）
3. 使用专业的Node.js托管服务（Railway、Render等）

