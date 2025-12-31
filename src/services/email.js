const nodemailer = require('nodemailer');
require('dotenv').config();

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
let transporter = null;

/**
 * 初始化邮件服务
 */
function initEmail() {
  if (!EMAIL_ENABLED) {
    return;
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  console.log('邮件服务已初始化');
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
  if (!EMAIL_ENABLED) {
    throw new Error('邮件服务未启用');
  }

  if (!transporter) {
    initEmail();
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
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
  sendEmail,
  sendVerificationCode
};

