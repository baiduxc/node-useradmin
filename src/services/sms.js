const axios = require('axios');
require('dotenv').config();

const SMS_ENABLED = process.env.SMS_ENABLED === 'true';
const SMS_USERNAME = process.env.SMS_USERNAME || '';
const SMS_PASSWORD = process.env.SMS_PASSWORD || '';
const SMS_SIGN = process.env.SMS_SIGN || '';

/**
 * 发送短信（smsbao短信宝）
 * @param {String} phone 手机号
 * @param {String} content 短信内容
 * @returns {Promise<Object>}
 */
async function sendSMS(phone, content) {
  if (!SMS_ENABLED) {
    throw new Error('短信服务未启用');
  }

  if (!SMS_USERNAME || !SMS_PASSWORD) {
    throw new Error('短信服务配置不完整');
  }

  try {
    // smsbao短信宝API
    const url = 'https://api.smsbao.com/sms';
    const params = {
      u: SMS_USERNAME,
      p: SMS_PASSWORD,
      m: phone,
      c: `${SMS_SIGN}${content}`,
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
  sendSMS,
  sendVerificationCode
};

