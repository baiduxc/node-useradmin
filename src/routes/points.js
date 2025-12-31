const express = require('express');
const router = express.Router();
const { query, queryOne, run, getNowString } = require('../database/connection');
const { verifyToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

/**
 * 查询积分
 * GET /api/v1/points
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, points, level_id FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({ 
      success: true, 
      data: { 
        points: user.points || 0,
        level_id: user.level_id || 1
      } 
    });
  } catch (error) {
    console.error('查询积分错误:', error);
    res.status(500).json({ success: false, message: '查询积分失败', error: error.message });
  }
});

/**
 * 增加积分
 * POST /api/v1/points/add
 */
router.post('/add', verifyToken, [
  body('points').isInt({ min: 1 }).withMessage('积分必须为正整数'),
  body('type').optional().isString(),
  body('description').optional().isString(),
  body('related_id').optional().isInt(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { points, type = 'earn', description, related_id } = req.body;
    const userId = req.user.userId;

    // 获取用户信息
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 更新积分
    await run(
      'UPDATE users SET points = points + ?, updated_at = ? WHERE id = ?',
      [points, getNowString(), userId]
    );

    // 记录积分变化
    await run(
      `INSERT INTO point_records (user_id, app_id, points, type, description, related_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, user.app_id, points, type, description || null, related_id || null]
    );

    // 检查是否需要升级会员等级
    const newUser = await queryOne('SELECT points, level_id FROM users WHERE id = ?', [userId]);
    const level = await queryOne(
      'SELECT * FROM member_levels WHERE min_points <= ? AND status = ? ORDER BY level_value DESC LIMIT 1',
      [newUser.points, 'active']
    );

    if (level && level.id !== newUser.level_id) {
      await run('UPDATE users SET level_id = ? WHERE id = ?', [level.id, userId]);
    }

    res.json({ 
      success: true, 
      message: '积分增加成功',
      data: { 
        points: newUser.points,
        level_id: newUser.level_id
      } 
    });
  } catch (error) {
    console.error('增加积分错误:', error);
    res.status(500).json({ success: false, message: '增加积分失败', error: error.message });
  }
});

/**
 * 扣除积分
 * POST /api/v1/points/deduct
 */
router.post('/deduct', verifyToken, [
  body('points').isInt({ min: 1 }).withMessage('积分必须为正整数'),
  body('type').optional().isString(),
  body('description').optional().isString(),
  body('related_id').optional().isInt(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { points, type = 'deduct', description, related_id } = req.body;
    const userId = req.user.userId;

    // 获取用户信息
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 检查积分是否足够
    if (user.points < points) {
      return res.status(400).json({ success: false, message: '积分不足' });
    }

    // 更新积分
    await run(
      'UPDATE users SET points = points - ?, updated_at = ? WHERE id = ?',
      [points, getNowString(), userId]
    );

    // 记录积分变化
    await run(
      `INSERT INTO point_records (user_id, app_id, points, type, description, related_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, user.app_id, -points, type, description || null, related_id || null]
    );

    const newUser = await queryOne('SELECT points, level_id FROM users WHERE id = ?', [userId]);

    res.json({ 
      success: true, 
      message: '积分扣除成功',
      data: { 
        points: newUser.points,
        level_id: newUser.level_id
      } 
    });
  } catch (error) {
    console.error('扣除积分错误:', error);
    res.status(500).json({ success: false, message: '扣除积分失败', error: error.message });
  }
});

/**
 * 积分记录
 * GET /api/v1/points/records
 */
router.get('/records', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');
    const offset = (page - 1) * limit;

    const records = await query(
      `SELECT * FROM point_records 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [req.user.userId, limit, offset]
    );

    const total = await queryOne(
      'SELECT COUNT(*) as count FROM point_records WHERE user_id = ?',
      [req.user.userId]
    );

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total: total.count,
          pages: Math.ceil(total.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('查询积分记录错误:', error);
    res.status(500).json({ success: false, message: '查询积分记录失败', error: error.message });
  }
});

module.exports = router;

