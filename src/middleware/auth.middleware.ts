import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyToken } from '../utils/jwt';
import { DatabaseService } from '../services/database.service';
import { User } from '../types/auth.types';

// Étendre l'interface Request pour inclure l'utilisateur
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid access token'
      });
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid or expired'
      });
      return;
    }

    // Récupérer l'utilisateur depuis la base de données
    const db = DatabaseService.getInstance();
    const user = await db.getUserById(payload.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'The user associated with this token no longer exists'
      });
      return;
    }

    // Supprimer le mot de passe de l'objet user avant de l'attacher à la requête
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword as User;

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An error occurred while authenticating the token'
    });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      // Token valide, ajouter les infos utilisateur (optionnel)
      req.user = {
        id: payload.userId,
        email: payload.email,
        username: payload.username,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  // Continuer même sans token valide
  next();
}