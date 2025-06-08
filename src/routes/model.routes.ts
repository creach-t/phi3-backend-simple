import { Router } from 'express';
import { ModelController } from '../controllers/model.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const modelController = new ModelController();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes principales
router.get('/', modelController.listModels.bind(modelController));
router.post('/download', modelController.downloadModel.bind(modelController));
router.post('/activate', modelController.setActiveModel.bind(modelController));
router.delete('/:filename', modelController.deleteModel.bind(modelController));

// Routes de téléchargement
router.get('/downloads', modelController.getDownloadStatus.bind(modelController));
router.get('/downloads/:downloadId', modelController.getDownloadStatus.bind(modelController));
router.post('/downloads/:downloadId/cancel', modelController.cancelDownload.bind(modelController));
router.post('/downloads/cleanup', modelController.cleanupDownloads.bind(modelController));

export default router;