const express = require('express');
const router = express.Router();
const { query, queryOne, run, getNowString } = require('../database/connection');
const { verifyToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * 充值卡充值
 * POST /api/v1/recharge/card
 */
router.post('/card', verifyToken, [
  body('card_no').notEmpty().withMessage('卡号不能为空'),
  body('card_password').notEmpty().withMessage('卡密不能为空'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { card_no, card_password } = req.body;
    const userId = req.user.userId;

    // 获取用户信息
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 查找充值卡
    const card = await queryOne(
      'SELECT * FROM recharge_cards WHERE card_no = ?',
      [card_no]
    );

    if (!card) {
      return res.status(400).json({ success: false, message: '充值卡不存在' });
    }

    // 验证卡密
    const isValidPassword = await bcrypt.compare(card_password, card.card_password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, message: '卡密错误' });
    }

    // 检查充值卡状态
    if (card.status === 'used') {
      return res.status(400).json({ success: false, message: '充值卡已被使用' });
    }

    if (card.status === 'expired') {
      return res.status(400).json({ success: false, message: '充值卡已过期' });
    }

    if (card.expired_at && new Date(card.expired_at) < new Date()) {
      await run('UPDATE recharge_cards SET status = ? WHERE id = ?', ['expired', card.id]);
      return res.status(400).json({ success: false, message: '充值卡已过期' });
    }

    // 开始事务处理
    const now = getNowString();
    
    // 更新充值卡状态
    await run(
      'UPDATE recharge_cards SET status = ?, used_by = ?, used_at = ? WHERE id = ?',
      ['used', userId, now, card.id]
    );

    // 计算新的会员到期时间
    let newExpiresAt = null;
    const currentExpiresAt = user.member_expires_at;
    const nowDate = new Date();
    
    if (currentExpiresAt && new Date(currentExpiresAt) > nowDate) {
      // 如果会员未过期，在现有到期时间基础上延长
      const currentDate = new Date(currentExpiresAt);
      currentDate.setDate(currentDate.getDate() + (card.expires_days || 0));
      newExpiresAt = currentDate.toISOString().slice(0, 19).replace('T', ' ');
    } else {
      // 如果会员已过期或未开通，从当前时间开始计算
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + (card.expires_days || 0));
      newExpiresAt = newDate.toISOString().slice(0, 19).replace('T', ' ');
    }

    // 更新用户会员到期时间和积分
    await run(
      'UPDATE users SET member_expires_at = ?, points = points + ?, updated_at = ? WHERE id = ?',
      [newExpiresAt, card.points || 0, now, userId]
    );

    // 创建充值记录
    await run(
      `INSERT INTO recharge_records (user_id, app_id, expires_days, points, type, card_id, status, paid_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, user.app_id, card.expires_days || 0, card.points || 0, 'card', card.id, 'success', now]
    );

    const newUser = await queryOne('SELECT member_expires_at, points FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: '充值成功',
      data: {
        expires_days: card.expires_days || 0,
        points: card.points || 0,
        member_expires_at: newUser.member_expires_at,
        total_points: newUser.points
      }
    });
  } catch (error) {
    console.error('充值卡充值错误:', error);
    res.status(500).json({ success: false, message: '充值失败', error: error.message });
  }
});

/**
 * 在线充值（创建订单）
 * POST /api/v1/recharge/online
 */
router.post('/online', verifyToken, [
  body('expires_days').isInt({ min: 1 }).withMessage('会员天数必须大于0'),
  body('payment_method').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { expires_days, payment_method = 'online' } = req.body;
    const userId = req.user.userId;

    // 获取用户信息
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 生成订单号
    const orderNo = `R${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 创建充值记录
    const result = await run(
      `INSERT INTO recharge_records (user_id, app_id, expires_days, type, order_no, payment_method, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, user.app_id, expires_days, 'online', orderNo, payment_method, 'pending']
    );

    res.json({
      success: true,
      message: '订单创建成功',
      data: {
        order_id: result.lastID,
        order_no: orderNo,
        expires_days,
        payment_method,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('创建充值订单错误:', error);
    res.status(500).json({ success: false, message: '创建订单失败', error: error.message });
  }
});

/**
 * 充值记录
 * GET /api/v1/recharge/records
 */
router.get('/records', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');
    const offset = (page - 1) * limit;

    const records = await query(
      `SELECT * FROM recharge_records 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [req.user.userId, limit, offset]
    );

    const total = await queryOne(
      'SELECT COUNT(*) as count FROM recharge_records WHERE user_id = ?',
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
    console.error('查询充值记录错误:', error);
    res.status(500).json({ success: false, message: '查询充值记录失败', error: error.message });
  }
});

module.exports = router;

