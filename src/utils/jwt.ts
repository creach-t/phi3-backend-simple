import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth.types';
import { logger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '86400'; // 24h par défaut

if (JWT_SECRET === 'fallback-secret-key') {
  logger.warn('Using fallback JWT secret. Please set JWT_SECRET environment variable for production.');
}

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: parseInt(JWT_EXPIRES_IN)
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    logger.debug('Token verification failed:', error);
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}