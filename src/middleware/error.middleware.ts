import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ErrorResponse } from '../types/common.types';

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction): void {
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Erreurs de validation Joi
  if (error.isJoi) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Validation Error',
      message: error.details.map((detail: any) => detail.message).join(', '),
      statusCode: 400
    };
    res.status(400).json(errorResponse);
    return;
  }

  // Erreurs de base de données SQLite
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Duplicate Entry',
      message: 'A record with this information already exists',
      statusCode: 409
    };
    res.status(409).json(errorResponse);
    return;
  }

  // Erreurs JWT
  if (error.name === 'JsonWebTokenError') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Invalid Token',
      message: 'The provided token is invalid',
      statusCode: 401
    };
    res.status(401).json(errorResponse);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Token Expired',
      message: 'The provided token has expired',
      statusCode: 401
    };
    res.status(401).json(errorResponse);
    return;
  }

  // Erreur par défaut
  const statusCode = error.statusCode || error.status || 500;
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
    statusCode
  };

  res.status(statusCode).json(errorResponse);
}

export function notFoundHandler(req: Request, res: Response): void {
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404
  };

  res.status(404).json(errorResponse);
}