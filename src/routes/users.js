const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { query, queryOne, run, getNowString } = require('../database/connection');
const { verifyToken, verifyApp, generateUserToken } = require('../middleware/auth');
const { uploadFile } = require('../services/storage');
const { body, validationResult } = require('express-validator');

// 配置multer（内存存储）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,webp').split(',');
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
});

/**
 * 用户注册
 * POST /api/v1/users/register
 */
router.post('/register', verifyApp, [
  body('username').optional().isLength({ min: 3, max: 50 }),
  body('password').optional().isLength({ min: 6 }),
  body('machine_code').optional().isString(),
  body('email').optional().isEmail(),
  body('phone').optional().isMobilePhone('zh-CN'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { username, password, machine_code, email, phone } = req.body;
    const app = req.app;

    // 根据登录模式验证
    if (app.login_mode === 'password') {
      if (!username || !password) {
        return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
      }
      
      // 检查用户名是否已存在
      const existingUser = await queryOne(
        'SELECT * FROM users WHERE app_id = ? AND username = ?',
        [app.app_id, username]
      );
      if (existingUser) {
        return res.status(400).json({ success: false, message: '用户名已存在' });
      }
    } else if (app.login_mode === 'machine') {
      if (!machine_code) {
        return res.status(400).json({ success: false, message: '机器码不能为空' });
      }
      
      // 检查机器码是否已存在
      const existingUser = await queryOne(
        'SELECT * FROM users WHERE app_id = ? AND machine_code = ?',
        [app.app_id, machine_code]
      );
      if (existingUser) {
        return res.status(400).json({ success: false, message: '机器码已存在' });
      }
    }

    // 加密密码
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // 创建用户
    const result = await run(
      `INSERT INTO users (app_id, username, password, machine_code, email, phone, level_id, status) 
       VALUES (?, ?, ?, ?, ?, ?, 1, 'active')`,
      [app.app_id, username || null, hashedPassword, machine_code || null, email || null, phone || null]
    );

    const user = await queryOne('SELECT id, app_id, username, email, phone, avatar_url, points, balance, level_id, member_expires_at, created_at FROM users WHERE id = ?', [result.lastID]);

    res.json({
      success: true,
      message: '注册成功',
      data: {
        user,
        token: generateUserToken({ id: result.lastID, app_id: app.app_id, username })
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, message: '注册失败', error: error.message });
  }
});

/**
 * 用户登录
 * POST /api/v1/users/login
 */
router.post('/login', verifyApp, [
  body('username').optional().isString(),
  body('password').optional().isString(),
  body('machine_code').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { username, password, machine_code } = req.body;
    const app = req.app;

    let user = null;

    if (app.login_mode === 'password') {
      if (!username || !password) {
        return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
      }

      user = await queryOne(
        'SELECT * FROM users WHERE app_id = ? AND username = ? AND status = ?',
        [app.app_id, username, 'active']
      );

      if (!user || !user.password) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }
    } else if (app.login_mode === 'machine') {
      if (!machine_code) {
        return res.status(400).json({ success: false, message: '机器码不能为空' });
      }

      user = await queryOne(
        'SELECT * FROM users WHERE app_id = ? AND machine_code = ? AND status = ?',
        [app.app_id, machine_code, 'active']
      );

      if (!user) {
        return res.status(401).json({ success: false, message: '机器码无效或用户不存在' });
      }
    }

    // 更新最后登录时间
    await run('UPDATE users SET last_login_at = ? WHERE id = ?', [getNowString(), user.id]);

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userWithoutPassword,
        token: generateUserToken(user)
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, message: '登录失败', error: error.message });
  }
});

/**
 * 获取用户资料
 * GET /api/v1/users/profile
 */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, app_id, username, email, phone, avatar_url, points, balance, level_id, member_expires_at, created_at, last_login_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('获取用户资料错误:', error);
    res.status(500).json({ success: false, message: '获取用户资料失败', error: error.message });
  }
});

/**
 * 更新用户资料
 * PUT /api/v1/users/profile
 */
router.put('/profile', verifyToken, [
  body('username').optional().isLength({ min: 3, max: 50 }),
  body('email').optional().isEmail(),
  body('phone').optional().isMobilePhone('zh-CN'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { username, email, phone } = req.body;
    const userId = req.user.userId;

    // 检查用户名是否已被其他用户使用
    if (username) {
      const existingUser = await queryOne(
        'SELECT * FROM users WHERE app_id = ? AND username = ? AND id != ?',
        [req.user.appId, username, userId]
      );
      if (existingUser) {
        return res.status(400).json({ success: false, message: '用户名已被使用' });
      }
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    
    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    if (phone) {
      updates.push('phone = ?');
      values.push(phone);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有需要更新的字段' });
    }

    updates.push('updated_at = ?');
    values.push(getNowString());
    values.push(userId);

    await run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const user = await queryOne(
      'SELECT id, app_id, username, email, phone, avatar_url, points, balance, level_id, member_expires_at, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({ success: true, message: '更新成功', data: user });
  } catch (error) {
    console.error('更新用户资料错误:', error);
    res.status(500).json({ success: false, message: '更新用户资料失败', error: error.message });
  }
});

/**
 * 上传头像
 * POST /api/v1/users/avatar
 */
router.post('/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的文件' });
    }

    const userId = req.user.userId;
    
    // 获取旧头像URL
    const user = await queryOne('SELECT avatar_url FROM users WHERE id = ?', [userId]);
    
    // 上传新头像
    const fileUrl = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // 更新用户头像
    await run(
      'UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?',
      [fileUrl, getNowString(), userId]
    );

    // 删除旧头像（如果存在）
    if (user.avatar_url) {
      try {
        const { deleteFile } = require('../services/storage');
        await deleteFile(user.avatar_url);
      } catch (error) {
        console.error('删除旧头像失败:', error);
      }
    }

    res.json({ success: true, message: '头像上传成功', data: { avatar_url: fileUrl } });
  } catch (error) {
    console.error('上传头像错误:', error);
    res.status(500).json({ success: false, message: '头像上传失败', error: error.message });
  }
});

module.exports = router;

