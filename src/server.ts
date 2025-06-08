import dotenv from 'dotenv';

// Charger les variables d'environnement en premier
dotenv.config();

import app from './app';
import { DatabaseService } from './services/database.service';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialiser la base de données
    const dbService = DatabaseService.getInstance();
    await dbService.initialize();
    logger.info('Database initialized successfully');

    // Démarrer le serveur
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('🚀 Phi-3 Backend Simple is ready!');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error('Detailed error:', error);
    process.exit(1);
  }
}

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Gestion des erreurs non gérées
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();