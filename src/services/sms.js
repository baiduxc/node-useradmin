const axios = require('axios');
const { queryOne } = require('../database/connection');

let smsConfig = null;

/**
 * 从数据库加载短信配置
 */
async function loadSMSConfig() {
  try {
    const { query } = require('../database/connection');
    const configs = await query(
      `SELECT config_key, config_value FROM system_configs 
       WHERE config_key IN ('sms_enabled', 'sms_username', 'sms_password', 'sms_sign')
       ORDER BY config_key`
    );

    if (!configs || configs.length === 0) {
      return null;
    }

    const config = {
      enabled: false,
      username: '',
      password: '',
      sign: ''
    };

    configs.forEach(item => {
      const key = item.config_key;
      const value = item.config_value || '';
      
      if (key === 'sms_enabled') {
        config.enabled = value === 'true';
      } else if (key === 'sms_username') {
        config.username = value;
      } else if (key === 'sms_password') {
        config.password = value;
      } else if (key === 'sms_sign') {
        config.sign = value;
      }
    });

    return config;
  } catch (error) {
    console.error('加载短信配置失败:', error);
    return null;
  }
}

/**
 * 初始化短信配置
 */
async function initSMS() {
  smsConfig = await loadSMSConfig();
}

/**
 * 重新加载配置（配置更新后调用）
 */
async function reloadConfig() {
  smsConfig = null;
  await initSMS();
}

/**
 * 发送短信（smsbao短信宝）
 * @param {String} phone 手机号
 * @param {String} content 短信内容
 * @returns {Promise<Object>}
 */
async function sendSMS(phone, content) {
  if (!smsConfig) {
    await initSMS();
  }

  if (!smsConfig || !smsConfig.enabled) {
    throw new Error('短信服务未启用');
  }

  if (!smsConfig.username || !smsConfig.password) {
    throw new Error('短信服务配置不完整');
  }

  try {
    // smsbao短信宝API
    const url = 'https://api.smsbao.com/sms';
    const params = {
      u: smsConfig.username,
      p: smsConfig.password,
      m: phone,
      c: `${smsConfig.sign || ''}${content}`,
    };

    const response = await axios.get(url, { params });
    
    // smsbao返回格式：0表示成功，其他为错误码
    if (response.data === '0') {
      return { success: true, message: '发送成功' };
    } else {
      const errorMessages = {
        '-1': '参数不全',
        '-2': '服务器空间不支持,请确认支持curl或者fsocket,联系您的空间商解决或者更换空间',
        '30': '密码错误',
        '40': '账号不存在',
        '41': '余额不足',
        '42': '账户已过期',
        '43': 'IP地址限制',
        '50': '内容含有敏感词',
      };
      throw new Error(errorMessages[response.data] || '发送失败');
    }
  } catch (error) {
    throw new Error(`短信发送失败: ${error.message}`);
  }
}

/**
 * 发送验证码短信
 * @param {String} phone 手机号
 * @param {String} code 验证码
 * @returns {Promise<Object>}
 */
async function sendVerificationCode(phone, code) {
  const content = `您的验证码是：${code}，5分钟内有效，请勿泄露给他人。`;
  return sendSMS(phone, content);
}

module.exports = {
  initSMS,
  reloadConfig,
  sendSMS,
  sendVerificationCode
};
