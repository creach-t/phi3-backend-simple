import { Router } from 'express';
import { PrepromptController } from '../controllers/preprompt.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const prepromptController = new PrepromptController();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes principales
router.get('/', prepromptController.listPreprompts.bind(prepromptController));
router.get('/default', prepromptController.getDefault.bind(prepromptController));
router.get('/:id', prepromptController.getPreprompt.bind(prepromptController));
router.post('/', prepromptController.createPreprompt.bind(prepromptController));
router.put('/:id', prepromptController.updatePreprompt.bind(prepromptController));
router.delete('/:id', prepromptController.deletePreprompt.bind(prepromptController));
router.post('/:id/set-default', prepromptController.setDefault.bind(prepromptController));

export default router;