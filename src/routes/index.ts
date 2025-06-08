import { Router } from 'express';
import authRoutes from './auth.routes';
import chatRoutes from './chat.routes';
import { ApiResponse } from '../types/common.types';

const router = Router();

// Monter les routes
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);

// Route racine de l'API
router.get('/', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      name: 'Phi-3 Backend Simple',
      version: '1.0.0',
      description: 'Backend simplifié pour Phi-3 chat avec authentification JWT',
      endpoints: {
        auth: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          profile: 'GET /api/auth/me',
          logout: 'POST /api/auth/logout'
        },
        chat: {
          send: 'POST /api/chat',
          status: 'GET /api/chat/status',
          test: 'POST /api/chat/test'
        },
        health: 'GET /health'
      }
    },
    message: 'API is running successfully'
  };

  res.json(response);
});

export default router;