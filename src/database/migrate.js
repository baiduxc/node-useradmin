const { initDatabase, run, query, getSqlDialect } = require('./connection');
const bcrypt = require('bcryptjs');

/**
 * 创建数据库表
 */
async function createTables() {
  const dialect = getSqlDialect();
  const isPostgres = dialect.autoIncrement.includes('SERIAL');
  
  // 应用表
  let sql = `
    CREATE TABLE IF NOT EXISTS apps (
      id ${dialect.autoIncrement},
      app_id VARCHAR(100) UNIQUE NOT NULL,
      app_name VARCHAR(200) NOT NULL,
      app_secret VARCHAR(255) NOT NULL,
      login_mode VARCHAR(20) DEFAULT 'password',
      charge_mode VARCHAR(20) DEFAULT 'free',
      status VARCHAR(20) DEFAULT 'active',
      created_at ${dialect.datetime} DEFAULT ${dialect.now},
      updated_at ${dialect.datetime} DEFAULT ${dialect.now}
    )
  `;
  await run(sql);
  
  // 添加charge_mode字段（如果表已存在）
  try {
    await run('ALTER TABLE apps ADD COLUMN charge_mode VARCHAR(20) DEFAULT \'free\'');
  } catch (e) {
    // 字段已存在，忽略错误
  }

  // 用户表
  sql = `
    CREATE TABLE IF NOT EXISTS users (
      id ${dialect.autoIncrement},
      app_id VARCHAR(100) NOT NULL,
      username VARCHAR(100),
      password VARCHAR(255),
      machine_code VARCHAR(255),
      email VARCHAR(200),
      phone VARCHAR(20),
      avatar_url VARCHAR(500),
      points INTEGER DEFAULT 0,
      balance DECIMAL(10, 2) DEFAULT 0.00,
      level_id INTEGER DEFAULT 1,
      member_expires_at ${dialect.datetime},
      status VARCHAR(20) DEFAULT 'active',
      last_login_at ${dialect.datetime},
      created_at ${dialect.datetime} DEFAULT ${dialect.now},
      updated_at ${dialect.datetime} DEFAULT ${dialect.now}
    )
  `;
  await run(sql);
  
  // 添加member_expires_at字段（如果表已存在）
  try {
    await run(`ALTER TABLE users ADD COLUMN member_expires_at ${dialect.datetime}`);
  } catch (e) {
    // 字段已存在，忽略错误
  }
  
  // 创建唯一索引
  try {
    await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_app_username ON users(app_id, username) WHERE username IS NOT NULL');
  } catch (e) {
    // SQLite不支持WHERE子句，使用表约束
    if (!isPostgres) {
      // SQLite会在表创建时处理，这里忽略错误
    }
  }
  
  try {
    await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_app_machine ON users(app_id, machine_code) WHERE machine_code IS NOT NULL');
  } catch (e) {
    // 忽略
  }

  // 会员等级表
  sql = `
    CREATE TABLE IF NOT EXISTS member_levels (
      id ${dialect.autoIncrement},
      level_name VARCHAR(100) NOT NULL,
      level_value INTEGER NOT NULL,
      min_points INTEGER DEFAULT 0,
      discount DECIMAL(3, 2) DEFAULT 1.00,
      benefits TEXT,
      status VARCHAR(20) DEFAULT 'active',
      created_at ${dialect.datetime} DEFAULT ${dialect.now},
      updated_at ${dialect.datetime} DEFAULT ${dialect.now}
    )
  `;
  await run(sql);

  // 积分记录表
  sql = `
    CREATE TABLE IF NOT EXISTS point_records (
      id ${dialect.autoIncrement},
      user_id INTEGER NOT NULL,
      app_id VARCHAR(100) NOT NULL,
      points INTEGER NOT NULL,
      type VARCHAR(50) NOT NULL,
      description VARCHAR(500),
      related_id INTEGER,
      created_at ${dialect.datetime} DEFAULT ${dialect.now}
    )
  `;
  await run(sql);

  // 充值卡表
  sql = `
    CREATE TABLE IF NOT EXISTS recharge_cards (
      id ${dialect.autoIncrement},
      card_no VARCHAR(100) UNIQUE NOT NULL,
      card_password VARCHAR(255) NOT NULL,
      expires_days INTEGER NOT NULL,
      points INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'unused',
      used_by INTEGER,
      used_at ${dialect.datetime},
      expired_at ${dialect.datetime},
      created_at ${dialect.datetime} DEFAULT ${dialect.now},
      updated_at ${dialect.datetime} DEFAULT ${dialect.now}
    )
  `;
  await run(sql);
  
  // 迁移现有表：如果存在amount字段，添加expires_days字段
  try {
    await run('ALTER TABLE recharge_cards ADD COLUMN expires_days INTEGER');
    // 如果有amount字段，可以设置默认值或迁移数据
    // 这里先添加字段，旧数据需要手动处理
  } catch (e) {
    // 字段已存在，尝试删除旧的amount字段
    try {
      await run('ALTER TABLE recharge_cards DROP COLUMN amount');
    } catch (e2) {
      // 忽略错误
    }
  }

  // 充值记录表
  sql = `
    CREATE TABLE IF NOT EXISTS recharge_records (
      id ${dialect.autoIncrement},
      user_id INTEGER NOT NULL,
      app_id VARCHAR(100) NOT NULL,
      expires_days INTEGER,
      points INTEGER DEFAULT 0,
      type VARCHAR(50) NOT NULL,
      card_id INTEGER,
      order_no VARCHAR(100) UNIQUE,
      payment_method VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending',
      paid_at ${dialect.datetime},
      created_at ${dialect.datetime} DEFAULT ${dialect.now},
      updated_at ${dialect.datetime} DEFAULT ${dialect.now}
    )
  `;
  await run(sql);
  
  // 迁移现有表：添加expires_days字段
  try {
    await run('ALTER TABLE recharge_records ADD COLUMN expires_days INTEGER');
  } catch (e) {
    // 字段已存在，忽略错误
  }

  // 系统配置表
  sql = `
    CREATE TABLE IF NOT EXISTS system_configs (
      id ${dialect.autoIncrement},
      config_key VARCHAR(100) UNIQUE NOT NULL,
      config_value TEXT,
      config_type VARCHAR(50) DEFAULT 'string',
      description VARCHAR(500),
      created_at ${dialect.datetime} DEFAULT ${dialect.now},
      updated_at ${dialect.datetime} DEFAULT ${dialect.now}
    )
  `;
  await run(sql);

  // 管理员表
  sql = `
    CREATE TABLE IF NOT EXISTS admins (
      id ${dialect.autoIncrement},
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      status VARCHAR(20) DEFAULT 'active',
      last_login_at ${dialect.datetime},
      created_at ${dialect.datetime} DEFAULT ${dialect.now},
      updated_at ${dialect.datetime} DEFAULT ${dialect.now}
    )
  `;
  await run(sql);

  console.log('数据库表创建完成');
}

/**
 * 初始化默认数据
 */
async function initDefaultData() {
  const dialect = getSqlDialect();
  
  // 创建默认应用
  const defaultApp = await query('SELECT * FROM apps WHERE app_id = ?', [process.env.DEFAULT_APP_ID || 'default-app']);
  if (defaultApp.length === 0) {
    await run(
      'INSERT INTO apps (app_id, app_name, app_secret, login_mode, charge_mode, status) VALUES (?, ?, ?, ?, ?, ?)',
      [
        process.env.DEFAULT_APP_ID || 'default-app',
        '默认应用',
        process.env.DEFAULT_APP_SECRET || 'default-secret',
        'password',
        'free',
        'active'
      ]
    );
    console.log('默认应用创建完成');
  }

  // 创建默认会员等级
  const defaultLevel = await query('SELECT * FROM member_levels WHERE level_value = 1');
  if (defaultLevel.length === 0) {
    await run(
      'INSERT INTO member_levels (level_name, level_value, min_points, discount, benefits) VALUES (?, ?, ?, ?, ?)',
      ['普通会员', 1, 0, 1.00, JSON.stringify({})]
    );
    console.log('默认会员等级创建完成');
  }

  // 创建默认管理员
  const defaultAdmin = await query('SELECT * FROM admins WHERE username = ?', [process.env.ADMIN_USERNAME || 'admin']);
  if (defaultAdmin.length === 0) {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    await run(
      'INSERT INTO admins (username, password, role, status) VALUES (?, ?, ?, ?)',
      [process.env.ADMIN_USERNAME || 'admin', hashedPassword, 'admin', 'active']
    );
    console.log('默认管理员创建完成（用户名: admin, 密码: admin123）');
  }

  // 初始化系统配置
  const configs = [
    { key: 'sms_enabled', value: process.env.SMS_ENABLED || 'false', type: 'boolean', desc: '短信服务是否启用' },
    { key: 'email_enabled', value: process.env.EMAIL_ENABLED || 'false', type: 'boolean', desc: '邮件服务是否启用' },
    { key: 'storage_type', value: process.env.STORAGE_TYPE || 'r2', type: 'string', desc: '存储类型' },
  ];

  for (const config of configs) {
    const existing = await query('SELECT * FROM system_configs WHERE config_key = ?', [config.key]);
    if (existing.length === 0) {
      await run(
        'INSERT INTO system_configs (config_key, config_value, config_type, description) VALUES (?, ?, ?, ?)',
        [config.key, config.value, config.type, config.desc]
      );
    }
  }

  console.log('默认数据初始化完成');
}

/**
 * 执行迁移
 */
async function migrate() {
  try {
    initDatabase();
    await createTables();
    await initDefaultData();
    console.log('数据库迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库迁移失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate, createTables, initDefaultData };

