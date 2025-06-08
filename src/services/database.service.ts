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
      try {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            logger.error('Error opening database:', err);
            reject(err);
          } else {
            logger.info(`Connected to SQLite database at ${this.dbPath}`);
            this.createTables().then(resolve).catch(reject);
          }
        });
      } catch (error) {
        logger.error('Database initialization error:', error);
        reject(error);
      }
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

      this.db.serialize(() => {
        this.db!.run(createUsersTable, (err) => {
          if (err) {
            logger.error('Error creating users table:', err);
            reject(err);
            return;
          }
        });

        this.db!.run(createChatHistoryTable, (err) => {
          if (err) {
            logger.error('Error creating chat_history table:', err);
            reject(err);
            return;
          }
          logger.info('Database tables created successfully');
          resolve();
        });
      });
    });
  }

  async createUser(userData: RegisterRequest): Promise<User> {
    try {
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
            logger.error('Error creating user:', err);
            reject(err);
          } else {
            // Récupérer l'utilisateur créé
            const userId = this.lastID;
            DatabaseService.getInstance().getUserById(userId).then(resolve).catch(reject);
          }
        });

        stmt.finalize();
      });
    } catch (error) {
      logger.error('Error in createUser:', error);
      throw error;
    }
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
            logger.error('Error getting user by email:', err);
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
            logger.error('Error getting user by id:', err);
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
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Error verifying password:', error);
      return false;
    }
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
          logger.error('Error saving chat history:', err);
          reject(err);
        } else {
          resolve();
        }
      });

      stmt.finalize();
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            logger.error('Error closing database:', err);
          } else {
            logger.info('Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export { DatabaseService };