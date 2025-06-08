import { Request, Response } from 'express';
import { Phi3Service } from '../services/phi3.service';
import { DatabaseService } from '../services/database.service';
import { validateRequest, chatSchema } from '../utils/validation';
import { ChatRequest, ChatResponse } from '../types/chat.types';
import { ModelParams } from '../services/llama.service';
import { ApiResponse } from '../types/common.types';
import { logger } from '../utils/logger';
import Joi from 'joi';

// Schéma de validation étendu pour inclure prepromptId et paramètres
const extendedChatSchema = chatSchema.keys({
  prepromptId: Joi.string().optional(),
  modelParams: Joi.object({
    temperature: Joi.number().min(0).max(2).optional(),
    maxTokens: Joi.number().min(1).max(4096).optional(),
    topP: Joi.number().min(0).max(1).optional(),
    repeatPenalty: Joi.number().min(0).max(2).optional(),
    contextSize: Joi.number().min(512).max(8192).optional(),
    seed: Joi.number().integer().min(-1).optional()
  }).optional()
});

export class ChatController {
  private phi3Service = Phi3Service.getInstance();
  private db = DatabaseService.getInstance();

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      // Valider les données d'entrée
      const { error, value } = validateRequest<ChatRequest & { prepromptId?: string; modelParams?: Partial<ModelParams> }>(
        extendedChatSchema, 
        req.body
      );
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error
        });
        return;
      }

      const { message, history, prepromptId, modelParams } = value!;
      const userId = req.user?.id;

      logger.info(`Chat request from user ${userId}:`, {
        messageLength: message.length,
        historyCount: history?.length || 0,
        prepromptId,
        modelParams
      });

      // Préparer la requête de chat
      const chatRequest: ChatRequest = {
        message,
        history,
        maxTokens: modelParams?.maxTokens,
        temperature: modelParams?.temperature
      };

      // Générer la réponse avec Phi-3
      const chatResponse = await this.phi3Service.generateResponse(
        chatRequest,
        prepromptId,
        modelParams
      );

      // Sauvegarder dans l'historique si l'utilisateur est authentifié
      if (userId) {
        await this.db.saveChatHistory(
          userId,
          message,
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
      const isConnected = await this.phi3Service.testConnection();

      const response: ApiResponse = {
        success: true,
        data: {
          connectionStatus: isConnected ? 'OK' : 'FAILED',
          isConnected,
          timestamp: new Date().toISOString()
        },
        message: isConnected ? 'Connection test successful' : 'Connection test failed'
      };

      res.status(isConnected ? 200 : 503).json(response);
    } catch (error) {
      logger.error('Connection test error:', error);
      res.status(500).json({
        success: false,
        error: 'Connection Test Failed',
        message: 'Failed to test connection to Phi-3 model'
      });
    }
  }

  async stopGeneration(req: Request, res: Response): Promise<void> {
    try {
      const stopped = this.phi3Service.stopGeneration();

      const response: ApiResponse = {
        success: true,
        data: { stopped },
        message: stopped ? 'Generation stopped successfully' : 'No active generation to stop'
      };

      res.json(response);
    } catch (error) {
      logger.error('Stop generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Stop Error',
        message: 'Failed to stop generation'
      });
    }
  }
}