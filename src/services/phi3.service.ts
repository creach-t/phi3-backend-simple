import { LlamaService, ModelParams } from './llama.service';
import { PrepromptService } from './preprompt.service';
import { ChatMessage, ChatRequest, ChatResponse, ModelStatus } from '../types/chat.types';
import { logger } from '../utils/logger';

class Phi3Service {
  private static instance: Phi3Service;
  private llamaService = LlamaService.getInstance();
  private prepromptService = PrepromptService.getInstance();

  constructor() {}

  static getInstance(): Phi3Service {
    if (!Phi3Service.instance) {
      Phi3Service.instance = new Phi3Service();
    }
    return Phi3Service.instance;
  }

  async generateResponse(request: ChatRequest, prepromptId?: string, modelParams?: Partial<ModelParams>): Promise<ChatResponse> {
    try {
      // Récupérer le preprompt si fourni
      let prepromptContent = '';
      if (prepromptId) {
        const preprompt = this.prepromptService.getPreprompt(prepromptId);
        if (preprompt) {
          prepromptContent = preprompt.content;
        }
      } else {
        // Utiliser le preprompt par défaut
        const defaultPreprompt = this.prepromptService.getDefaultPreprompt();
        if (defaultPreprompt) {
          prepromptContent = defaultPreprompt.content;
        }
      }

      // Générer la réponse avec llama.cpp
      const response = await this.llamaService.generateResponse(
        request,
        prepromptContent,
        modelParams
      );

      logger.info('Response generated successfully', {
        tokens: response.tokensUsed,
        time: response.processingTime
      });

      return response;
    } catch (error) {
      logger.error('Error generating response:', error);
      throw new Error('Failed to generate response from Phi-3 model');
    }
  }

  getStatus(): ModelStatus {
    const llamaStatus = this.llamaService.getStatus();
    return {
      isLoaded: llamaStatus.isLoaded,
      modelName: llamaStatus.modelName || 'Phi-3',
      version: '3.0 (via llama.cpp)',
      lastRequest: llamaStatus.lastRequest
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      return await this.llamaService.testConnection();
    } catch (error) {
      logger.error('Connection test failed:', error);
      return false;
    }
  }

  stopGeneration(): boolean {
    return this.llamaService.stopGeneration();
  }

  async unloadModel(): Promise<void> {
    // Avec llama.cpp, pas besoin de décharger explicitement
    logger.info('Model unload requested (handled by llama.cpp)');
  }
}

export { Phi3Service };