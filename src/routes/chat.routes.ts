import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();
const chatController = new ChatController();

// Routes avec authentification optionnelle
router.post('/', optionalAuth, chatController.sendMessage.bind(chatController));
router.post('/stop', optionalAuth, chatController.stopGeneration.bind(chatController));
router.get('/status', chatController.getStatus.bind(chatController));
router.post('/test', chatController.testConnection.bind(chatController));

export default router;