import { Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';
import { generateToken } from '../utils/jwt';
import { validateRequest, registerSchema, loginSchema } from '../utils/validation';
import { RegisterRequest, LoginRequest, AuthResponse } from '../types/auth.types';
import { ApiResponse } from '../types/common.types';
import { logger } from '../utils/logger';

export class AuthController {
  private db = DatabaseService.getInstance();

  async register(req: Request, res: Response): Promise<void> {
    try {
      // Valider les données d'entrée
      const { error, value } = validateRequest<RegisterRequest>(registerSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error
        });
        return;
      }

      const userData = value!;

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await this.db.getUserByEmail(userData.email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User Already Exists',
          message: 'A user with this email already exists'
        });
        return;
      }

      // Créer l'utilisateur
      const user = await this.db.createUser(userData);
      logger.info(`New user registered: ${user.email}`);

      // Générer le token JWT
      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username
      });

      // Supprimer le mot de passe de la réponse
      const { password, ...userWithoutPassword } = user;

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          token,
          user: userWithoutPassword
        },
        message: 'User registered successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration Failed',
        message: 'An error occurred during registration'
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      // Valider les données d'entrée
      const { error, value } = validateRequest<LoginRequest>(loginSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error
        });
        return;
      }

      const { email, password } = value!;

      // Trouver l'utilisateur
      const user = await this.db.getUserByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid Credentials',
          message: 'Invalid email or password'
        });
        return;
      }

      // Vérifier le mot de passe
      const isPasswordValid = await this.db.verifyPassword(password, user.password!);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid Credentials',
          message: 'Invalid email or password'
        });
        return;
      }

      logger.info(`User logged in: ${user.email}`);

      // Générer le token JWT
      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username
      });

      // Supprimer le mot de passe de la réponse
      const { password: _, ...userWithoutPassword } = user;

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          token,
          user: userWithoutPassword
        },
        message: 'Login successful'
      };

      res.json(response);
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login Failed',
        message: 'An error occurred during login'
      });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      // L'utilisateur est déjà disponible grâce au middleware d'authentification
      const response: ApiResponse = {
        success: true,
        data: req.user,
        message: 'Profile retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Profile Error',
        message: 'An error occurred while retrieving profile'
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      // Avec JWT, la déconnexion côté serveur est simple
      // Le token reste valide jusqu'à expiration, mais le client doit le supprimer
      
      const response: ApiResponse = {
        success: true,
        message: 'Logout successful'
      };

      res.json(response);
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout Failed',
        message: 'An error occurred during logout'
      });
    }
  }
}