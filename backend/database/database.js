const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, 'data.db');
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('SQLite数据库连接成功');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS parse_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT,
        parsed_data TEXT,
        element_count INTEGER DEFAULT 0,
        parse_time INTEGER DEFAULT 0,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_url ON parse_results(url);
      CREATE INDEX IF NOT EXISTS idx_created_at ON parse_results(created_at);
      CREATE INDEX IF NOT EXISTS idx_status ON parse_results(status);
    `;

    return new Promise((resolve, reject) => {
      this.db.exec(createTableSQL, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('数据库表创建成功');
          resolve();
        }
      });
    });
  }

  async saveParseResult(data) {
    const {
      url,
      title,
      parsed_data,
      element_count,
      parse_time,
      status = 'success',
      error_message = null
    } = data;

    const sql = `
      INSERT INTO parse_results 
      (url, title, parsed_data, element_count, parse_time, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      const db = this.db;
      db.run(
        sql,
        [url, title, JSON.stringify(parsed_data), element_count, parse_time, status, error_message],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // 获取刚插入的记录
            const insertId = this.lastID;
            const selectSQL = 'SELECT * FROM parse_results WHERE id = ?';
            db.get(selectSQL, [insertId], (err, row) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  ...row,
                  parsed_data: row.parsed_data ? JSON.parse(row.parsed_data) : null
                });
              }
            });
          }
        }
      );
    });
  }

  async getParseResult(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM parse_results WHERE id = ?';
      const db = this.db;
      db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve({
            ...row,
            parsed_data: row.parsed_data ? JSON.parse(row.parsed_data) : null
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  async getParseHistory(limit = 20, offset = 0) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, url, title, element_count, parse_time, status, 
               error_message, created_at, updated_at
        FROM parse_results 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      const db = this.db;
      db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async getHistoryCount() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT COUNT(*) as count FROM parse_results';
      const db = this.db;
      db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.count : 0);
        }
      });
    });
  }

  async getCachedResult(url) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM parse_results 
        WHERE url = ? AND status = 'success'
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const db = this.db;
      db.get(sql, [url], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve({
            ...row,
            parsed_data: row.parsed_data ? JSON.parse(row.parsed_data) : null
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  async deleteParseResult(id) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM parse_results WHERE id = ?';
      const db = this.db;
      db.run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  async getStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_parses,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_parses,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_parses,
          AVG(CASE WHEN status = 'success' THEN parse_time END) as avg_parse_time,
          AVG(CASE WHEN status = 'success' THEN element_count END) as avg_element_count,
          MAX(created_at) as last_parse_time
        FROM parse_results
      `;
      
      const db = this.db;
      db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          const result = row || {};
          resolve({
            total_parses: result.total_parses || 0,
            successful_parses: result.successful_parses || 0,
            failed_parses: result.failed_parses || 0,
            success_rate: result.total_parses > 0 ? 
              Math.round((result.successful_parses / result.total_parses) * 100) : 0,
            avg_parse_time: Math.round(result.avg_parse_time || 0),
            avg_element_count: Math.round(result.avg_element_count || 0),
            last_parse_time: result.last_parse_time
          });
        }
      });
    });
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            console.error('关闭数据库连接失败:', err);
          } else {
            console.log('数据库连接已关闭');
          }
          resolve();
        });
      });
    }
  }
}

module.exports = Database;