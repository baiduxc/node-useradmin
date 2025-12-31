const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query, queryOne, run, getNowString } = require('../database/connection');
const { verifyAdmin, generateAdminToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

/**
 * 管理员登录
 * POST /api/v1/admin/login
 */
router.post('/login', [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { username, password } = req.body;

    const admin = await queryOne(
      'SELECT * FROM admins WHERE username = ? AND status = ?',
      [username, 'active']
    );

    if (!admin) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await run('UPDATE admins SET last_login_at = ? WHERE id = ?', [getNowString(), admin.id]);

    const { password: _, ...adminWithoutPassword } = admin;

    res.json({
      success: true,
      message: '登录成功',
      data: {
        admin: adminWithoutPassword,
        token: generateAdminToken(admin)
      }
    });
  } catch (error) {
    console.error('管理员登录错误:', error);
    res.status(500).json({ success: false, message: '登录失败', error: error.message });
  }
});

/**
 * 会员列表
 * GET /api/v1/admin/members
 */
router.get('/members', verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');
    const offset = (page - 1) * limit;
    const appId = req.query.app_id;
    const keyword = req.query.keyword;

    let sql = 'SELECT id, app_id, username, email, phone, avatar_url, points, balance, level_id, member_expires_at, status, created_at, last_login_at FROM users WHERE 1=1';
    const params = [];

    if (appId) {
      sql += ' AND app_id = ?';
      params.push(appId);
    }

    if (keyword) {
      sql += ' AND (username LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const keywordParam = `%${keyword}%`;
      params.push(keywordParam, keywordParam, keywordParam);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const members = await query(sql, params);

    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM').replace(/ORDER BY.*/, '');
    const countParams = params.slice(0, -2);
    const total = await queryOne(countSql, countParams);

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          page,
          limit,
          total: total.count,
          pages: Math.ceil(total.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取会员列表错误:', error);
    res.status(500).json({ success: false, message: '获取会员列表失败', error: error.message });
  }
});

/**
 * 会员详情
 * GET /api/v1/admin/members/:id
 */
router.get('/members/:id', verifyAdmin, async (req, res) => {
  try {
    const member = await queryOne(
      'SELECT id, app_id, username, email, phone, avatar_url, points, balance, level_id, member_expires_at, status, created_at, last_login_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (!member) {
      return res.status(404).json({ success: false, message: '会员不存在' });
    }

    res.json({ success: true, data: member });
  } catch (error) {
    console.error('获取会员详情错误:', error);
    res.status(500).json({ success: false, message: '获取会员详情失败', error: error.message });
  }
});

/**
 * 更新会员信息
 * PUT /api/v1/admin/members/:id
 */
router.put('/members/:id', verifyAdmin, [
  body('points').optional().isInt({ min: 0 }),
  body('balance').optional().isFloat({ min: 0 }),
  body('level_id').optional().isInt(),
  body('member_expires_at').optional().isISO8601(),
  body('status').optional().isIn(['active', 'inactive']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { points, balance, level_id, member_expires_at, status } = req.body;
    const updates = [];
    const values = [];

    if (points !== undefined) {
      updates.push('points = ?');
      values.push(points);
    }
    if (balance !== undefined) {
      updates.push('balance = ?');
      values.push(balance);
    }
    if (level_id !== undefined) {
      updates.push('level_id = ?');
      values.push(level_id);
    }
    if (member_expires_at !== undefined) {
      updates.push('member_expires_at = ?');
      values.push(member_expires_at);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有需要更新的字段' });
    }

    updates.push('updated_at = ?');
    values.push(getNowString());
    values.push(req.params.id);

    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const member = await queryOne(
      'SELECT id, app_id, username, email, phone, avatar_url, points, balance, level_id, member_expires_at, status, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    res.json({ success: true, message: '更新成功', data: member });
  } catch (error) {
    console.error('更新会员信息错误:', error);
    res.status(500).json({ success: false, message: '更新会员信息失败', error: error.message });
  }
});

/**
 * 应用列表
 * GET /api/v1/admin/apps
 */
router.get('/apps', verifyAdmin, async (req, res) => {
  try {
    const apps = await query('SELECT id, app_id, app_name, login_mode, charge_mode, status, created_at, updated_at FROM apps ORDER BY created_at DESC');

    res.json({ success: true, data: apps });
  } catch (error) {
    console.error('获取应用列表错误:', error);
    res.status(500).json({ success: false, message: '获取应用列表失败', error: error.message });
  }
});

/**
 * 创建应用
 * POST /api/v1/admin/apps
 */
router.post('/apps', verifyAdmin, [
  body('app_id').notEmpty().withMessage('应用ID不能为空'),
  body('app_name').notEmpty().withMessage('应用名称不能为空'),
  body('login_mode').isIn(['password', 'machine']).withMessage('登录模式无效'),
  body('charge_mode').optional().isIn(['free', 'paid']).withMessage('收费模式无效'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { app_id, app_name, login_mode = 'password', charge_mode = 'free' } = req.body;

    // 检查应用ID是否已存在
    const existing = await queryOne('SELECT * FROM apps WHERE app_id = ?', [app_id]);
    if (existing) {
      return res.status(400).json({ success: false, message: '应用ID已存在' });
    }

    // 生成应用密钥
    const app_secret = uuidv4().replace(/-/g, '');

    const result = await run(
      'INSERT INTO apps (app_id, app_name, app_secret, login_mode, charge_mode, status) VALUES (?, ?, ?, ?, ?, ?)',
      [app_id, app_name, app_secret, login_mode, charge_mode, 'active']
    );

    const app = await queryOne(
      'SELECT id, app_id, app_name, login_mode, charge_mode, status, created_at FROM apps WHERE id = ?',
      [result.lastID]
    );

    res.json({ success: true, message: '应用创建成功', data: { ...app, app_secret } });
  } catch (error) {
    console.error('创建应用错误:', error);
    res.status(500).json({ success: false, message: '创建应用失败', error: error.message });
  }
});

/**
 * 更新应用
 * PUT /api/v1/admin/apps/:id
 */
router.put('/apps/:id', verifyAdmin, [
  body('app_name').optional().notEmpty(),
  body('login_mode').optional().isIn(['password', 'machine']),
  body('charge_mode').optional().isIn(['free', 'paid']),
  body('status').optional().isIn(['active', 'inactive']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { app_name, login_mode, charge_mode, status } = req.body;
    const updates = [];
    const values = [];

    if (app_name) {
      updates.push('app_name = ?');
      values.push(app_name);
    }
    if (login_mode) {
      updates.push('login_mode = ?');
      values.push(login_mode);
    }
    if (charge_mode) {
      updates.push('charge_mode = ?');
      values.push(charge_mode);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有需要更新的字段' });
    }

    updates.push('updated_at = ?');
    values.push(getNowString());
    values.push(req.params.id);

    await run(`UPDATE apps SET ${updates.join(', ')} WHERE id = ?`, values);

    const app = await queryOne(
      'SELECT id, app_id, app_name, login_mode, charge_mode, status, created_at FROM apps WHERE id = ?',
      [req.params.id]
    );

    res.json({ success: true, message: '更新成功', data: app });
  } catch (error) {
    console.error('更新应用错误:', error);
    res.status(500).json({ success: false, message: '更新应用失败', error: error.message });
  }
});

/**
 * 充值卡列表
 * GET /api/v1/admin/cards
 */
router.get('/cards', verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let sql = 'SELECT * FROM recharge_cards WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const cards = await query(sql, params);

    const countSql = sql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM').replace(/ORDER BY.*/, '');
    const countParams = params.slice(0, -2);
    const total = await queryOne(countSql, countParams);

    res.json({
      success: true,
      data: {
        cards,
        pagination: {
          page,
          limit,
          total: total.count,
          pages: Math.ceil(total.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取充值卡列表错误:', error);
    res.status(500).json({ success: false, message: '获取充值卡列表失败', error: error.message });
  }
});

/**
 * 创建充值卡
 * POST /api/v1/admin/cards
 */
router.post('/cards', verifyAdmin, [
  body('expires_days').isInt({ min: 1 }).withMessage('会员天数必须大于0'),
  body('points').optional().isInt({ min: 0 }),
  body('count').optional().isInt({ min: 1, max: 1000 }),
  body('expired_at').optional().isISO8601(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { expires_days, points = 0, count = 1, expired_at } = req.body;

    const cards = [];
    for (let i = 0; i < count; i++) {
      const card_no = `C${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const card_password = Math.random().toString(36).substr(2, 12).toUpperCase();
      const hashedPassword = await bcrypt.hash(card_password, 10);

      await run(
        'INSERT INTO recharge_cards (card_no, card_password, expires_days, points, status, expired_at) VALUES (?, ?, ?, ?, ?, ?)',
        [card_no, hashedPassword, expires_days, points, 'unused', expired_at || null]
      );

      cards.push({ card_no, card_password, expires_days, points });
    }

    res.json({
      success: true,
      message: `成功创建${count}张充值卡`,
      data: { cards }
    });
  } catch (error) {
    console.error('创建充值卡错误:', error);
    res.status(500).json({ success: false, message: '创建充值卡失败', error: error.message });
  }
});

/**
 * 会员等级列表
 * GET /api/v1/admin/levels
 */
router.get('/levels', verifyAdmin, async (req, res) => {
  try {
    const levels = await query('SELECT * FROM member_levels ORDER BY level_value ASC');

    res.json({ success: true, data: levels });
  } catch (error) {
    console.error('获取会员等级列表错误:', error);
    res.status(500).json({ success: false, message: '获取会员等级列表失败', error: error.message });
  }
});

/**
 * 创建会员等级
 * POST /api/v1/admin/levels
 */
router.post('/levels', verifyAdmin, [
  body('level_name').notEmpty().withMessage('等级名称不能为空'),
  body('level_value').isInt({ min: 1 }).withMessage('等级数值必须为正整数'),
  body('min_points').optional().isInt({ min: 0 }),
  body('discount').optional().isFloat({ min: 0, max: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { level_name, level_value, min_points = 0, discount = 1.00, benefits = {} } = req.body;

    const result = await run(
      'INSERT INTO member_levels (level_name, level_value, min_points, discount, benefits, status) VALUES (?, ?, ?, ?, ?, ?)',
      [level_name, level_value, min_points, discount, JSON.stringify(benefits), 'active']
    );

    const level = await queryOne('SELECT * FROM member_levels WHERE id = ?', [result.lastID]);

    res.json({ success: true, message: '会员等级创建成功', data: level });
  } catch (error) {
    console.error('创建会员等级错误:', error);
    res.status(500).json({ success: false, message: '创建会员等级失败', error: error.message });
  }
});

/**
 * 更新会员等级
 * PUT /api/v1/admin/levels/:id
 */
router.put('/levels/:id', verifyAdmin, [
  body('level_name').optional().notEmpty(),
  body('min_points').optional().isInt({ min: 0 }),
  body('discount').optional().isFloat({ min: 0, max: 1 }),
  body('status').optional().isIn(['active', 'inactive']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { level_name, min_points, discount, benefits, status } = req.body;
    const updates = [];
    const values = [];

    if (level_name) {
      updates.push('level_name = ?');
      values.push(level_name);
    }
    if (min_points !== undefined) {
      updates.push('min_points = ?');
      values.push(min_points);
    }
    if (discount !== undefined) {
      updates.push('discount = ?');
      values.push(discount);
    }
    if (benefits) {
      updates.push('benefits = ?');
      values.push(JSON.stringify(benefits));
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有需要更新的字段' });
    }

    updates.push('updated_at = ?');
    values.push(getNowString());
    values.push(req.params.id);

    await run(`UPDATE member_levels SET ${updates.join(', ')} WHERE id = ?`, values);

    const level = await queryOne('SELECT * FROM member_levels WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: '更新成功', data: level });
  } catch (error) {
    console.error('更新会员等级错误:', error);
    res.status(500).json({ success: false, message: '更新会员等级失败', error: error.message });
  }
});

/**
 * 系统配置列表
 * GET /api/v1/admin/configs
 */
router.get('/configs', verifyAdmin, async (req, res) => {
  try {
    const configs = await query('SELECT * FROM system_configs ORDER BY config_key ASC');

    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('获取系统配置错误:', error);
    res.status(500).json({ success: false, message: '获取系统配置失败', error: error.message });
  }
});

/**
 * 更新系统配置
 * PUT /api/v1/admin/configs/:key
 */
router.put('/configs/:key', verifyAdmin, [
  body('config_value').notEmpty().withMessage('配置值不能为空'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { config_value } = req.body;

    const existing = await queryOne('SELECT * FROM system_configs WHERE config_key = ?', [req.params.key]);
    
    if (existing) {
      await run(
        'UPDATE system_configs SET config_value = ?, updated_at = ? WHERE config_key = ?',
        [config_value, getNowString(), req.params.key]
      );
    } else {
      await run(
        'INSERT INTO system_configs (config_key, config_value, config_type) VALUES (?, ?, ?)',
        [req.params.key, config_value, 'string']
      );
    }

    const config = await queryOne('SELECT * FROM system_configs WHERE config_key = ?', [req.params.key]);

    res.json({ success: true, message: '配置更新成功', data: config });
  } catch (error) {
    console.error('更新系统配置错误:', error);
    res.status(500).json({ success: false, message: '更新系统配置失败', error: error.message });
  }
});

/**
 * 获取存储配置
 * GET /api/v1/admin/storage
 */
router.get('/storage', verifyAdmin, async (req, res) => {
  try {
    const configs = await query(
      `SELECT config_key, config_value FROM system_configs 
       WHERE config_key IN ('storage_type', 'r2_account_id', 'r2_access_key_id', 'r2_secret_access_key', 'r2_bucket_name', 'r2_public_url', 'tencent_secret_id', 'tencent_secret_key', 'tencent_region', 'tencent_bucket', 'tencent_public_url')
       ORDER BY config_key ASC`
    );

    // 转换为对象格式
    const storageConfig = {
      storage_type: 'r2',
      r2: {
        account_id: '',
        access_key_id: '',
        secret_access_key: '',
        bucket_name: '',
        public_url: ''
      },
      tencent: {
        secret_id: '',
        secret_key: '',
        region: 'ap-guangzhou',
        bucket: '',
        public_url: ''
      }
    };

    configs.forEach(config => {
      const key = config.config_key;
      const value = config.config_value || '';
      
      if (key === 'storage_type') {
        storageConfig.storage_type = value || 'r2';
      } else if (key === 'r2_account_id') {
        storageConfig.r2.account_id = value;
      } else if (key === 'r2_access_key_id') {
        storageConfig.r2.access_key_id = value;
      } else if (key === 'r2_secret_access_key') {
        storageConfig.r2.secret_access_key = value;
      } else if (key === 'r2_bucket_name') {
        storageConfig.r2.bucket_name = value;
      } else if (key === 'r2_public_url') {
        storageConfig.r2.public_url = value;
      } else if (key === 'tencent_secret_id') {
        storageConfig.tencent.secret_id = value;
      } else if (key === 'tencent_secret_key') {
        storageConfig.tencent.secret_key = value;
      } else if (key === 'tencent_region') {
        storageConfig.tencent.region = value || 'ap-guangzhou';
      } else if (key === 'tencent_bucket') {
        storageConfig.tencent.bucket = value;
      } else if (key === 'tencent_public_url') {
        storageConfig.tencent.public_url = value;
      }
    });

    res.json({ success: true, data: storageConfig });
  } catch (error) {
    console.error('获取存储配置错误:', error);
    res.status(500).json({ success: false, message: '获取存储配置失败', error: error.message });
  }
});

/**
 * 更新存储配置
 * PUT /api/v1/admin/storage
 */
router.put('/storage', verifyAdmin, [
  body('storage_type').isIn(['r2', 'tencent']).withMessage('存储类型必须是r2或tencent'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { storage_type, r2, tencent } = req.body;
    const now = getNowString();

    // 更新存储类型
    const existing = await queryOne('SELECT * FROM system_configs WHERE config_key = ?', ['storage_type']);
    if (existing) {
      await run('UPDATE system_configs SET config_value = ?, updated_at = ? WHERE config_key = ?', [storage_type, now, 'storage_type']);
    } else {
      await run('INSERT INTO system_configs (config_key, config_value, config_type, description, updated_at) VALUES (?, ?, ?, ?, ?)', ['storage_type', storage_type, 'string', '存储类型', now]);
    }

    // 更新R2配置
    if (r2) {
      const r2Configs = [
        { key: 'r2_account_id', value: r2.account_id || '' },
        { key: 'r2_access_key_id', value: r2.access_key_id || '' },
        { key: 'r2_secret_access_key', value: r2.secret_access_key || '' },
        { key: 'r2_bucket_name', value: r2.bucket_name || '' },
        { key: 'r2_public_url', value: r2.public_url || '' }
      ];

      for (const config of r2Configs) {
        const existing = await queryOne('SELECT * FROM system_configs WHERE config_key = ?', [config.key]);
        if (existing) {
          await run('UPDATE system_configs SET config_value = ?, updated_at = ? WHERE config_key = ?', [config.value, now, config.key]);
        } else {
          await run('INSERT INTO system_configs (config_key, config_value, config_type, description, updated_at) VALUES (?, ?, ?, ?, ?)', [config.key, config.value, 'string', `R2 ${config.key}`, now]);
        }
      }
    }

    // 更新腾讯云配置
    if (tencent) {
      const tencentConfigs = [
        { key: 'tencent_secret_id', value: tencent.secret_id || '' },
        { key: 'tencent_secret_key', value: tencent.secret_key || '' },
        { key: 'tencent_region', value: tencent.region || '' },
        { key: 'tencent_bucket', value: tencent.bucket || '' },
        { key: 'tencent_public_url', value: tencent.public_url || '' }
      ];

      for (const config of tencentConfigs) {
        const existing = await queryOne('SELECT * FROM system_configs WHERE config_key = ?', [config.key]);
        if (existing) {
          await run('UPDATE system_configs SET config_value = ?, updated_at = ? WHERE config_key = ?', [config.value, now, config.key]);
        } else {
          await run('INSERT INTO system_configs (config_key, config_value, config_type, description, updated_at) VALUES (?, ?, ?, ?, ?)', [config.key, config.value, 'string', `腾讯云 ${config.key}`, now]);
        }
      }
    }

    // 重新加载存储配置
    const { reloadConfig: reloadStorageConfig } = require('../services/storage');
    await reloadStorageConfig();

    res.json({ success: true, message: '存储配置更新成功' });
  } catch (error) {
    console.error('更新存储配置错误:', error);
    res.status(500).json({ success: false, message: '更新存储配置失败', error: error.message });
  }
});

/**
 * 获取短信配置
 * GET /api/v1/admin/sms
 */
router.get('/sms', verifyAdmin, async (req, res) => {
  try {
    const configs = await query(
      `SELECT * FROM system_configs 
       WHERE config_key IN ('sms_enabled', 'sms_username', 'sms_password', 'sms_sign')
       ORDER BY config_key ASC`
    );

    const smsConfig = {
      enabled: false,
      username: '',
      password: '',
      sign: ''
    };

    configs.forEach(config => {
      if (config.config_key === 'sms_enabled') {
        smsConfig.enabled = config.config_value === 'true';
      } else if (config.config_key === 'sms_username') {
        smsConfig.username = config.config_value || '';
      } else if (config.config_key === 'sms_password') {
        smsConfig.password = config.config_value || '';
      } else if (config.config_key === 'sms_sign') {
        smsConfig.sign = config.config_value || '';
      }
    });

    res.json({ success: true, data: smsConfig });
  } catch (error) {
    console.error('获取短信配置错误:', error);
    res.status(500).json({ success: false, message: '获取短信配置失败', error: error.message });
  }
});

/**
 * 更新短信配置
 * PUT /api/v1/admin/sms
 */
router.put('/sms', verifyAdmin, [
  body('enabled').optional().isBoolean(),
  body('username').optional().isString(),
  body('password').optional().isString(),
  body('sign').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { enabled, username, password, sign } = req.body;
    const now = getNowString();

    const configs = [
      { key: 'sms_enabled', value: enabled !== undefined ? String(enabled) : undefined, desc: '短信服务是否启用' },
      { key: 'sms_username', value: username, desc: '短信宝用户名' },
      { key: 'sms_password', value: password, desc: '短信宝密码' },
      { key: 'sms_sign', value: sign, desc: '短信签名' }
    ];

    for (const config of configs) {
      if (config.value !== undefined) {
        const existing = await queryOne('SELECT * FROM system_configs WHERE config_key = ?', [config.key]);
        if (existing) {
          await run('UPDATE system_configs SET config_value = ?, updated_at = ? WHERE config_key = ?', [config.value, now, config.key]);
        } else {
          await run('INSERT INTO system_configs (config_key, config_value, config_type, description, updated_at) VALUES (?, ?, ?, ?, ?)', [config.key, config.value, config.key === 'sms_enabled' ? 'boolean' : 'string', config.desc, now]);
        }
      }
    }

    // 重新加载短信配置
    const { reloadConfig: reloadSMSConfig } = require('../services/sms');
    await reloadSMSConfig();

    res.json({ success: true, message: '短信配置更新成功' });
  } catch (error) {
    console.error('更新短信配置错误:', error);
    res.status(500).json({ success: false, message: '更新短信配置失败', error: error.message });
  }
});

/**
 * 获取邮件配置
 * GET /api/v1/admin/email
 */
router.get('/email', verifyAdmin, async (req, res) => {
  try {
    const configs = await query(
      `SELECT * FROM system_configs 
       WHERE config_key IN ('email_enabled', 'email_host', 'email_port', 'email_secure', 'email_user', 'email_password', 'email_from')
       ORDER BY config_key ASC`
    );

    const emailConfig = {
      enabled: false,
      host: '',
      port: 587,
      secure: false,
      user: '',
      password: '',
      from: ''
    };

    configs.forEach(config => {
      if (config.config_key === 'email_enabled') {
        emailConfig.enabled = config.config_value === 'true';
      } else if (config.config_key === 'email_host') {
        emailConfig.host = config.config_value || '';
      } else if (config.config_key === 'email_port') {
        emailConfig.port = parseInt(config.config_value || '587');
      } else if (config.config_key === 'email_secure') {
        emailConfig.secure = config.config_value === 'true';
      } else if (config.config_key === 'email_user') {
        emailConfig.user = config.config_value || '';
      } else if (config.config_key === 'email_password') {
        emailConfig.password = config.config_value || '';
      } else if (config.config_key === 'email_from') {
        emailConfig.from = config.config_value || '';
      }
    });

    res.json({ success: true, data: emailConfig });
  } catch (error) {
    console.error('获取邮件配置错误:', error);
    res.status(500).json({ success: false, message: '获取邮件配置失败', error: error.message });
  }
});

/**
 * 更新邮件配置
 * PUT /api/v1/admin/email
 */
router.put('/email', verifyAdmin, [
  body('enabled').optional().isBoolean(),
  body('host').optional().isString(),
  body('port').optional().isInt({ min: 1, max: 65535 }),
  body('secure').optional().isBoolean(),
  body('user').optional().isString(),
  body('password').optional().isString(),
  body('from').optional().isEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { enabled, host, port, secure, user, password, from } = req.body;
    const now = getNowString();

    const configs = [
      { key: 'email_enabled', value: enabled !== undefined ? String(enabled) : undefined, desc: '邮件服务是否启用' },
      { key: 'email_host', value: host, desc: 'SMTP服务器地址' },
      { key: 'email_port', value: port !== undefined ? String(port) : undefined, desc: 'SMTP端口' },
      { key: 'email_secure', value: secure !== undefined ? String(secure) : undefined, desc: '是否使用SSL/TLS' },
      { key: 'email_user', value: user, desc: 'SMTP用户名' },
      { key: 'email_password', value: password, desc: 'SMTP密码' },
      { key: 'email_from', value: from, desc: '发件人邮箱' }
    ];

    for (const config of configs) {
      if (config.value !== undefined) {
        await run(
          'INSERT OR REPLACE INTO system_configs (config_key, config_value, config_type, description, updated_at) VALUES (?, ?, ?, ?, ?)',
          [config.key, config.value, config.key === 'email_enabled' || config.key === 'email_secure' ? 'boolean' : 'string', config.desc, now]
        );
      }
    }

    // 重新加载邮件配置
    const { reloadConfig: reloadEmailConfig } = require('../services/email');
    await reloadEmailConfig();

    res.json({ success: true, message: '邮件配置更新成功' });
  } catch (error) {
    console.error('更新邮件配置错误:', error);
    res.status(500).json({ success: false, message: '更新邮件配置失败', error: error.message });
  }
});

module.exports = router;

