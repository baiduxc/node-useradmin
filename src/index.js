const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database/connection');
const { initStorage } = require('./services/storage');
const { initEmail } = require('./services/email');

// 路由
const userRoutes = require('./routes/users');
const pointRoutes = require('./routes/points');
const rechargeRoutes = require('./routes/recharge');
const adminRoutes = require('./routes/admin');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// API路由
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/points', pointRoutes);
app.use('/api/v1/recharge', rechargeRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404处理
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: '接口不存在' 
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('错误:', err);
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 初始化服务
async function start() {
  try {
    // 初始化数据库
    initDatabase();
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`数据库类型: ${process.env.DB_TYPE || 'sqlite'}`);
      console.log('提示: 存储、邮件、短信服务配置需要在后台管理中设置');
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

start();

module.exports = app;

