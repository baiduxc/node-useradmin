const nodemailer = require('nodemailer');
const { queryOne } = require('../database/connection');

let transporter = null;
let emailConfig = null;

/**
 * 从数据库加载邮件配置
 */
async function loadEmailConfig() {
  try {
    const { query } = require('../database/connection');
    const configs = await query(
      `SELECT config_key, config_value FROM system_configs 
       WHERE config_key IN ('email_enabled', 'email_host', 'email_port', 'email_secure', 'email_user', 'email_password', 'email_from')
       ORDER BY config_key`
    );

    if (!configs || configs.length === 0) {
      return null;
    }

    const config = {
      enabled: false,
      host: '',
      port: 587,
      secure: false,
      user: '',
      password: '',
      from: ''
    };

    configs.forEach(item => {
      const key = item.config_key;
      const value = item.config_value || '';
      
      if (key === 'email_enabled') {
        config.enabled = value === 'true';
      } else if (key === 'email_host') {
        config.host = value;
      } else if (key === 'email_port') {
        config.port = parseInt(value || '587');
      } else if (key === 'email_secure') {
        config.secure = value === 'true';
      } else if (key === 'email_user') {
        config.user = value;
      } else if (key === 'email_password') {
        config.password = value;
      } else if (key === 'email_from') {
        config.from = value;
      }
    });

    return config;
  } catch (error) {
    console.error('加载邮件配置失败:', error);
    return null;
  }
}

/**
 * 初始化邮件服务
 */
async function initEmail() {
  emailConfig = await loadEmailConfig();
  
  if (!emailConfig || !emailConfig.enabled) {
    return;
  }

  if (!emailConfig.host || !emailConfig.user || !emailConfig.password) {
    console.log('邮件配置不完整，邮件服务将不可用');
    return;
  }

  transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: {
      user: emailConfig.user,
      pass: emailConfig.password,
    },
  });

  console.log('邮件服务已初始化');
}

/**
 * 重新加载配置（配置更新后调用）
 */
async function reloadConfig() {
  emailConfig = null;
  transporter = null;
  await initEmail();
}

/**
 * 发送邮件
 * @param {String} to 收件人
 * @param {String} subject 主题
 * @param {String} html 内容（HTML格式）
 * @param {String} text 内容（纯文本格式，可选）
 * @returns {Promise<Object>}
 */
async function sendEmail(to, subject, html, text = null) {
  if (!emailConfig || !emailConfig.enabled) {
    throw new Error('邮件服务未启用');
  }

  if (!transporter) {
    await initEmail();
  }

  if (!transporter) {
    throw new Error('邮件服务配置不完整');
  }

  try {
    const info = await transporter.sendMail({
      from: emailConfig.from || emailConfig.user,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // 如果没有text，从html中提取纯文本
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    throw new Error(`邮件发送失败: ${error.message}`);
  }
}

/**
 * 发送验证码邮件
 * @param {String} email 邮箱
 * @param {String} code 验证码
 * @returns {Promise<Object>}
 */
async function sendVerificationCode(email, code) {
  const subject = '验证码';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>验证码</h2>
      <p>您的验证码是：<strong style="font-size: 24px; color: #007bff;">${code}</strong></p>
      <p>验证码5分钟内有效，请勿泄露给他人。</p>
      <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
    </div>
  `;
  return sendEmail(email, subject, html);
}

module.exports = {
  initEmail,
  reloadConfig,
  sendEmail,
  sendVerificationCode
};
