const jwt = require('jsonwebtoken');
const { queryOne } = require('../database/connection');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret-key';

/**
 * 验证JWT Token
 */
async function verifyToken(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '未提供认证令牌' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: '认证令牌无效或已过期' 
    });
  }
}

/**
 * 验证应用
 */
async function verifyApp(req, res, next) {
  try {
    const appId = req.headers['x-app-id'] || req.body.app_id || req.query.app_id;
    const appSecret = req.headers['x-app-secret'] || req.body.app_secret || req.query.app_secret;

    if (!appId || !appSecret) {
      return res.status(401).json({ 
        success: false, 
        message: '未提供应用ID或密钥' 
      });
    }

    const app = await queryOne(
      'SELECT * FROM apps WHERE app_id = ? AND app_secret = ? AND status = ?',
      [appId, appSecret, 'active']
    );

    if (!app) {
      return res.status(401).json({ 
        success: false, 
        message: '应用ID或密钥错误，或应用已被禁用' 
      });
    }

    req.app = app;
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: '应用验证失败' 
    });
  }
}

/**
 * 验证管理员
 */
async function verifyAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '未提供认证令牌' 
      });
    }

    const decoded = jwt.verify(token, ADMIN_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: '管理员认证令牌无效或已过期' 
    });
  }
}

/**
 * 生成用户JWT Token
 */
function generateUserToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      appId: user.app_id,
      username: user.username 
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * 生成管理员JWT Token
 */
function generateAdminToken(admin) {
  return jwt.sign(
    { 
      adminId: admin.id, 
      username: admin.username,
      role: admin.role 
    },
    ADMIN_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * 验证会员（检查用户是否有有效会员）
 * 如果应用开启了收费模式，用户必须有有效会员才能使用
 */
async function verifyMember(req, res, next) {
  try {
    const userId = req.user.userId;
    const appId = req.user.appId || req.app?.app_id;

    // 获取应用信息
    const app = await queryOne('SELECT * FROM apps WHERE app_id = ?', [appId]);
    if (!app) {
      return res.status(404).json({ 
        success: false, 
        message: '应用不存在' 
      });
    }

    // 如果应用是免费模式，直接通过
    if (app.charge_mode === 'free') {
      return next();
    }

    // 收费模式，检查用户会员状态
    const user = await queryOne(
      'SELECT member_expires_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '用户不存在' 
      });
    }

    // 检查会员是否过期
    if (!user.member_expires_at) {
      return res.status(403).json({ 
        success: false, 
        message: '您还不是会员，请先开通会员' 
      });
    }

    const expiresAt = new Date(user.member_expires_at);
    const now = new Date();

    if (expiresAt <= now) {
      return res.status(403).json({ 
        success: false, 
        message: '您的会员已过期，请续费后使用',
        data: {
          member_expires_at: user.member_expires_at
        }
      });
    }

    // 会员有效，继续
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: '会员验证失败' 
    });
  }
}

module.exports = {
  verifyToken,
  verifyApp,
  verifyAdmin,
  verifyMember,
  generateUserToken,
  generateAdminToken
};

