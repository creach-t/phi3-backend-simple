import { Router } from 'express';
import authRoutes from './auth.routes';
import chatRoutes from './chat.routes';
import modelRoutes from './model.routes';
import prepromptRoutes from './preprompt.routes';
import { ApiResponse } from '../types/common.types';

const router = Router();

// Monter les routes
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/models', modelRoutes);
router.use('/preprompts', prepromptRoutes);

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
          stop: 'POST /api/chat/stop',
          status: 'GET /api/chat/status',
          test: 'POST /api/chat/test'
        },
        models: {
          list: 'GET /api/models',
          download: 'POST /api/models/download',
          activate: 'POST /api/models/activate',
          delete: 'DELETE /api/models/:filename',
          downloads: 'GET /api/models/downloads',
          downloadStatus: 'GET /api/models/downloads/:downloadId',
          cancelDownload: 'POST /api/models/downloads/:downloadId/cancel',
          cleanup: 'POST /api/models/downloads/cleanup'
        },
        preprompts: {
          list: 'GET /api/preprompts',
          get: 'GET /api/preprompts/:id',
          create: 'POST /api/preprompts',
          update: 'PUT /api/preprompts/:id',
          delete: 'DELETE /api/preprompts/:id',
          setDefault: 'POST /api/preprompts/:id/set-default',
          getDefault: 'GET /api/preprompts/default'
        },
        health: 'GET /health'
      }
    },
    message: 'API is running successfully'
  };

  res.json(response);
});

export default router;