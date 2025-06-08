import { Request, Response } from 'express';
import { Phi3Service } from '../services/phi3.service';
import { DatabaseService } from '../services/database.service';
import { validateRequest, chatSchema } from '../utils/validation';
import { ChatRequest, ChatResponse } from '../types/chat.types';
import { ApiResponse } from '../types/common.types';
import { logger } from '../utils/logger';

export class ChatController {
  private phi3Service = Phi3Service.getInstance();
  private db = DatabaseService.getInstance();

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      // Valider les données d'entrée
      const { error, value } = validateRequest<ChatRequest>(chatSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error
        });
        return;
      }

      const chatRequest = value!;
      const userId = req.user?.id;

      logger.info(`Chat request from user ${userId}: ${chatRequest.message.substring(0, 100)}...`);

      // Générer la réponse avec Phi-3
      const chatResponse = await this.phi3Service.generateResponse(chatRequest);

      // Sauvegarder dans l'historique si l'utilisateur est authentifié
      if (userId) {
        await this.db.saveChatHistory(
          userId,
          chatRequest.message,
          chatResponse.response,
          chatResponse.tokensUsed,
          chatResponse.processingTime
        );
      }

      const response: ApiResponse<ChatResponse> = {
        success: true,
        data: chatResponse,
        message: 'Response generated successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Chat Error',
        message: 'An error occurred while processing your message'
      });
    }
  }

  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = this.phi3Service.getStatus();

      const response: ApiResponse = {
        success: true,
        data: status,
        message: 'Model status retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Get status error:', error);
      res.status(500).json({
        success: false,
        error: 'Status Error',
        message: 'An error occurred while retrieving model status'
      });
    }
  }

  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      // Test simple pour vérifier que le modèle fonctionne
      const testRequest: ChatRequest = {
        message: 'Hello, this is a test message.',
        maxTokens: 50,
        temperature: 0.7
      };

      const testResponse = await this.phi3Service.generateResponse(testRequest);

      const response: ApiResponse = {
        success: true,
        data: {
          connectionStatus: 'OK',
          testResponse: testResponse.response,
          processingTime: testResponse.processingTime
        },
        message: 'Connection test successful'
      };

      res.json(response);
    } catch (error) {
      logger.error('Connection test error:', error);
      res.status(500).json({
        success: false,
        error: 'Connection Test Failed',
        message: 'Failed to connect to Phi-3 model'
      });
    }
  }
}