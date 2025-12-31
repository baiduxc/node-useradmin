const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
require('dotenv').config();

let db = null;
let pool = null;

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

/**
 * 转换SQL语句和参数（SQLite的?占位符转换为PostgreSQL的$1, $2...）
 */
function convertSql(sql, params) {
  if (DB_TYPE === 'postgres' || DB_TYPE === 'pgs') {
    let paramIndex = 1;
    const convertedParams = [];
    const convertedSql = sql.replace(/\?/g, () => {
      convertedParams.push(params[paramIndex - 1]);
      return `$${paramIndex++}`;
    });
    return { sql: convertedSql, params: convertedParams };
  }
  return { sql, params };
}

/**
 * 初始化数据库连接
 */
function initDatabase() {
  if (DB_TYPE === 'postgres' || DB_TYPE === 'pgs') {
    pool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432'),
      database: process.env.PG_DATABASE || 'member_db',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
    });

    pool.on('error', (err) => {
      console.error('PostgreSQL连接错误:', err);
    });

    console.log('PostgreSQL数据库连接已建立');
  } else {
    const dbPath = process.env.SQLITE_DB_PATH || './data/member.db';
    const fs = require('fs');
    const path = require('path');
    
    // 确保目录存在
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('SQLite数据库连接错误:', err);
      } else {
        console.log('SQLite数据库连接已建立');
      }
    });
  }
}

/**
 * 执行查询（返回多行）
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    const { sql: convertedSql, params: convertedParams } = convertSql(sql, params);
    if (DB_TYPE === 'postgres' || DB_TYPE === 'pgs') {
      pool.query(convertedSql, convertedParams, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.rows);
        }
      });
    } else {
      db.all(convertedSql, convertedParams, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    }
  });
}

/**
 * 执行查询（返回单行）
 */
function queryOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    const { sql: convertedSql, params: convertedParams } = convertSql(sql, params);
    if (DB_TYPE === 'postgres' || DB_TYPE === 'pgs') {
      pool.query(convertedSql, convertedParams, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.rows[0] || null);
        }
      });
    } else {
      db.get(convertedSql, convertedParams, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    }
  });
}

/**
 * 执行更新/插入/删除
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (DB_TYPE === 'postgres' || DB_TYPE === 'pgs') {
      // PostgreSQL需要处理INSERT语句以获取lastID
      let finalSql = sql;
      if (sql.trim().toUpperCase().startsWith('INSERT')) {
        // 尝试添加RETURNING id
        const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
        if (insertMatch && !sql.includes('RETURNING')) {
          finalSql = sql.replace(/;?\s*$/, '') + ' RETURNING id';
        }
      }
      
      const { sql: convertedSql, params: convertedParams } = convertSql(finalSql, params);
      pool.query(convertedSql, convertedParams, (err, result) => {
        if (err) {
          reject(err);
        } else {
          const lastID = result.rows && result.rows[0] ? result.rows[0].id : null;
          resolve({ lastID, changes: result.rowCount || 0 });
        }
      });
    } else {
      const { sql: convertedSql, params: convertedParams } = convertSql(sql, params);
      db.run(convertedSql, convertedParams, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    }
  });
}

/**
 * 关闭数据库连接
 */
function close() {
  if (DB_TYPE === 'postgres' || DB_TYPE === 'pgs') {
    return pool.end();
  } else {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

/**
 * 获取数据库类型
 */
function getDbType() {
  return DB_TYPE;
}

/**
 * 获取SQL方言差异处理
 */
function getSqlDialect() {
  if (DB_TYPE === 'postgres' || DB_TYPE === 'pgs') {
    return {
      autoIncrement: 'SERIAL PRIMARY KEY',
      datetime: 'TIMESTAMP',
      now: 'NOW()',
      limitOffset: (limit, offset) => `LIMIT ${limit} OFFSET ${offset}`
    };
  } else {
    return {
      autoIncrement: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      datetime: 'DATETIME',
      now: "datetime('now')",
      limitOffset: (limit, offset) => `LIMIT ${limit} OFFSET ${offset}`
    };
  }
}

/**
 * 获取当前时间SQL表达式
 */
function getNowSql() {
  if (DB_TYPE === 'postgres' || DB_TYPE === 'pgs') {
    return 'NOW()';
  } else {
    return "datetime('now')";
  }
}

/**
 * 获取当前时间字符串（用于参数绑定）
 */
function getNowString() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = {
  initDatabase,
  query,
  queryOne,
  run,
  close,
  getDbType,
  getSqlDialect,
  getNowSql,
  getNowString
};

