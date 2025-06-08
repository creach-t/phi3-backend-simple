import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { User, RegisterRequest } from '../types/auth.types';
import { logger } from '../utils/logger';

class DatabaseService {
  private static instance: DatabaseService;
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = process.env.DB_PATH || './database.sqlite';
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          logger.error('Error opening database:', err);
          reject(err);
        } else {
          logger.info(`Connected to SQLite database at ${this.dbPath}`);
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  private async createTables(): Promise<void> {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createChatHistoryTable = `
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        response TEXT NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        processing_time INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.exec(createUsersTable, (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.db!.exec(createChatHistoryTable, (err) => {
          if (err) {
            reject(err);
          } else {
            logger.info('Database tables created successfully');
            resolve();
          }
        });
      });
    });
  }

  async createUser(userData: RegisterRequest): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const stmt = this.db.prepare(`
        INSERT INTO users (email, username, password)
        VALUES (?, ?, ?)
      `);

      stmt.run([userData.email, userData.username, hashedPassword], function(err) {
        if (err) {
          reject(err);
        } else {
          // Récupérer l'utilisateur créé
          DatabaseService.getInstance().getUserById(this.lastID).then(resolve).catch(reject);
        }
      });

      stmt.finalize();
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve({
              id: row.id,
              email: row.email,
              username: row.username,
              password: row.password,
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at)
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async getUserById(id: number): Promise<User | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(
        'SELECT * FROM users WHERE id = ?',
        [id],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve({
              id: row.id,
              email: row.email,
              username: row.username,
              password: row.password,
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at)
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async saveChatHistory(userId: number, message: string, response: string, tokensUsed: number, processingTime: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const stmt = this.db.prepare(`
        INSERT INTO chat_history (user_id, message, response, tokens_used, processing_time)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run([userId, message, response, tokensUsed, processingTime], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });

      stmt.finalize();
    });
  }
}

export { DatabaseService };