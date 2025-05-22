import sqlite3 from 'sqlite3';

class Database {
    constructor(dbPath = 'database.db') {
        this.db = new sqlite3.Database(dbPath);
        this.initialize();
        this.createDefaultAdmin();
    }

    initialize() {
        this.db.serialize(() => {
            const sqlCreateUsersTable = /* sql */ `
        CREATE TABLE IF NOT EXISTS users (
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          ip TEXT,
          role TEXT,
          vps_name TEXT
        )
      `;
            this.db.run(sqlCreateUsersTable);

            const sqlCreateDomainsTable = /* sql */ `
        CREATE TABLE IF NOT EXISTS domains (
          user_id INTEGER NOT NULL,
          domain TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;
            this.db.run(sqlCreateDomainsTable);

            const sqlCreateTelegramTable = /* sql */ `
        CREATE TABLE IF NOT EXISTS telegram (
          user_id INTEGER PRIMARY KEY,
          chat_id TEXT NOT NULL DEFAULT '',
          telegram_token TEXT NOT NULL DEFAULT '',
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;
            this.db.run(sqlCreateTelegramTable);

            const sqlCreateSettingsTable = /* sql */ `
        CREATE TABLE IF NOT EXISTS login_settings (
          user_id INTEGER PRIMARY KEY,
          max_password_attempts INTEGER DEFAULT 3,
          max_code_attempts INTEGER DEFAULT 3,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;
            this.db.run(sqlCreateSettingsTable);

            const sqlCreateDomainIndex = /* sql */ `
        CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain)
      `;
            this.db.run(sqlCreateDomainIndex);
        });
    }

    createDefaultAdmin = () => {
        const checkAdminSql = `SELECT * FROM users WHERE username = 'admin' AND role = 'admin'`;

        this.db.get(checkAdminSql, (err, row) => {
            if (err) {
                return;
            }

            if (!row) {
                const insertAdminSql = `
                    INSERT INTO users (username, password, role)
                    VALUES (?, ?, ?)
                `;

                this.db.run(insertAdminSql, ['admin', 'admin', 'admin']);
            }
        });
    };

    getUserByUsername = async (username) => {
        return new Promise((resolve) => {
            const sql = `SELECT id, username, password, role, ip, vps_name
                      FROM users
                      WHERE username = ?`;

            this.db.get(sql, [username], (err, user) => {
                if (err || !user) {
                    resolve(null);
                    return;
                }
                resolve(user);
            });
        });
    };

    getListUsers = async () => {
        return new Promise((resolve) => {
            const sql = `SELECT id, username, ip, vps_name FROM users WHERE role != 'admin'`;

            this.db.all(sql, (err, rows) => {
                if (err) {
                    resolve([]);
                    return;
                }
                resolve(rows);
            });
        });
    };
    getSettingsByDomain = async (domain) => {
        return new Promise((resolve, reject) => {
            const sql = `
              SELECT
                u.id as user_id,
                ls.max_password_attempts,
                ls.max_code_attempts,
                t.chat_id,
                t.telegram_token
              FROM domains d
              JOIN users u ON d.user_id = u.id
              LEFT JOIN login_settings ls ON u.id = ls.user_id
              LEFT JOIN telegram t ON u.id = t.user_id
              WHERE d.domain = ?
            `;

            this.db.get(sql, [domain], (err, result) => {
                if (err || !result) {
                    resolve(null);
                    return;
                }
                const settings = {
                    userId: result.user_id,
                    loginSettings: {
                        maxPasswordAttempts: result.max_password_attempts || 3,
                        maxCodeAttempts: result.max_code_attempts || 3
                    },
                    telegramSettings: result.chat_id
                        ? {
                              chatId: result.chat_id,
                              telegramToken: result.telegram_token
                          }
                        : null
                };

                resolve(settings);
            });
        });
    };

    getDomainsByUserId = async (userId) => {
        return new Promise((resolve) => {
            const sql = `SELECT domain FROM domains WHERE user_id = ?`;

            this.db.all(sql, [userId], (err, rows) => {
                if (err) {
                    resolve([]);
                    return;
                }
                resolve(rows.map((row) => row.domain));
            });
        });
    };

    getTelegramByUserId = async (userId) => {
        return new Promise((resolve) => {
            const sql = `SELECT chat_id, telegram_token
                        FROM telegram
                        WHERE user_id = ?`;

            this.db.get(sql, [userId], (err, result) => {
                if (err || !result) {
                    resolve(null);
                    return;
                }

                resolve({
                    chatId: result.chat_id,
                    telegramToken: result.telegram_token
                });
            });
        });
    };

    getSettingsByUserId = async (userId) => {
        return new Promise((resolve) => {
            const sql = `SELECT max_password_attempts, max_code_attempts
                        FROM login_settings
                        WHERE user_id = ?`;

            this.db.get(sql, [userId], (err, result) => {
                if (err || !result) {
                    resolve(null);
                    return;
                }

                resolve({
                    maxPasswordAttempts: result.max_password_attempts || 3,
                    maxCodeAttempts: result.max_code_attempts || 3
                });
            });
        });
    };
}
export default Database;
