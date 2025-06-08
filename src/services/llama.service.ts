import { ChildProcess, spawn } from 'child_process';
import { ModelService } from './model.service';
import { ChatMessage, ChatRequest, ChatResponse } from '../types/chat.types';
import { logger } from '../utils/logger';

export interface ModelParams {
  temperature: number;
  maxTokens: number;
  topP: number;
  repeatPenalty: number;
  contextSize: number;
  seed: number;
}

export interface LlamaResponse {
  response: string;
  modelParams: ModelParams;
  metadata: {
    chunkCount: number;
    originalLength: number;
    processingTime: number;
  };
}

class LlamaService {
  private static instance: LlamaService;
  private modelService = ModelService.getInstance();
  private llamaCppPath: string;
  private currentProcess?: ChildProcess;

  constructor() {
    this.llamaCppPath = process.env.LLAMA_CPP_PATH || 'llama-cpp';
  }

  static getInstance(): LlamaService {
    if (!LlamaService.instance) {
      LlamaService.instance = new LlamaService();
    }
    return LlamaService.instance;
  }

  private getDefaultParams(): ModelParams {
    return {
      temperature: parseFloat(process.env.PHI3_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.PHI3_MAX_TOKENS || '2048'),
      topP: 0.9,
      repeatPenalty: 1.1,
      contextSize: 4096,
      seed: -1
    };
  }

  private buildArgs(prompt: string, params: ModelParams): string[] {
    const modelPath = this.modelService.getActiveModel();
    if (!modelPath) {
      throw new Error('Aucun modèle actif. Veuillez activer un modèle.');
    }

    const args: string[] = [
      '-m', modelPath,
      '-p', prompt,
      '-c', params.contextSize.toString(),
      '-n', params.maxTokens.toString(),
      '--temp', params.temperature.toString(),
      '--top-p', params.topP.toString(),
      '--repeat-penalty', params.repeatPenalty.toString(),
      '--no-display-prompt'
    ];

    if (params.seed !== -1) {
      args.push('--seed', params.seed.toString());
    }

    return args;
  }

  private buildPrompt(message: string, preprompt?: string, history?: ChatMessage[]): string {
    let prompt = '';
    
    // Ajouter le preprompt si fourni
    if (preprompt?.trim()) {
      prompt += `${preprompt.trim()}\n\n`;
    }

    // Ajouter l'historique si fourni
    if (history && history.length > 0) {
      for (const msg of history.slice(-10)) { // Garder seulement les 10 derniers messages
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        prompt += `${role}: ${msg.content}\n`;
      }
    }

    // Ajouter le message actuel
    prompt += `User: ${message}\nAssistant:`;
    
    return prompt;
  }

  private processResponse(rawResponse: string): string {
    let processed = rawResponse.trim();
    
    // Supprimer les séquences d'arrêt communes
    const stopSequences = ['User:', 'Human:', '<|endoftext|>', '</s>', '<s>'];
    for (const seq of stopSequences) {
      const index = processed.indexOf(seq);
      if (index !== -1) {
        processed = processed.substring(0, index).trim();
      }
    }

    return processed;
  }

  async generateResponse(request: ChatRequest, preprompt?: string, modelParams?: Partial<ModelParams>): Promise<ChatResponse> {
    const startTime = Date.now();
    const params = { ...this.getDefaultParams(), ...modelParams };
    
    // Construire le prompt complet
    const fullPrompt = this.buildPrompt(request.message, preprompt, request.history);
    const args = this.buildArgs(fullPrompt, params);
    const timeout = Math.max(30000, params.maxTokens * 100);

    logger.info('Starting llama.cpp generation', {
      promptLength: fullPrompt.length,
      params,
      timeout
    });

    return new Promise<ChatResponse>((resolve, reject) => {
      let response = '';
      let errorOutput = '';
      let chunkCount = 0;
      let responseSent = false;

      const llamaProcess: ChildProcess = spawn(this.llamaCppPath, args);
      this.currentProcess = llamaProcess;

      const sendResponse = (finalResponse: string): void => {
        if (!responseSent) {
          responseSent = true;
          const processingTime = Date.now() - startTime;
          const tokensUsed = Math.ceil(finalResponse.length / 4); // Estimation approximative
          
          resolve({
            response: finalResponse,
            tokensUsed,
            processingTime
          });
        }
      };

      const sendError = (error: string): void => {
        if (!responseSent) {
          responseSent = true;
          reject(new Error(error));
        }
      };

      // Traiter la sortie stdout
      llamaProcess.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        response += chunk;
        chunkCount++;

        logger.debug(`Received chunk ${chunkCount}:`, {
          length: chunk.length,
          preview: chunk.substring(0, 50)
        });

        // Vérifier les séquences d'arrêt
        if (this.containsStopSequence(chunk)) {
          logger.info('Stop sequence detected, terminating process');
          llamaProcess.kill('SIGTERM');
          const processedResponse = this.processResponse(response);
          sendResponse(processedResponse);
        }
      });

      // Traiter la sortie stderr
      llamaProcess.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        errorOutput += chunk;
        logger.warn('llama.cpp stderr:', chunk.substring(0, 100));
      });

      // Gérer la fermeture du processus
      llamaProcess.on('close', (code: number | null) => {
        logger.info('llama.cpp process closed', { code, chunkCount });
        if (!responseSent) {
          const processedResponse = this.processResponse(response);
          if (processedResponse.length > 0) {
            sendResponse(processedResponse);
          } else {
            sendError('Empty response from llama.cpp');
          }
        }
      });

      // Gérer les erreurs du processus
      llamaProcess.on('error', (error: Error) => {
        logger.error('llama.cpp process error:', error);
        sendError(`Process error: ${error.message}`);
      });

      // Timeout
      const timeoutId = setTimeout(() => {
        if (!responseSent) {
          logger.warn('llama.cpp timeout reached');
          llamaProcess.kill('SIGKILL');
          const processedResponse = this.processResponse(response);
          if (processedResponse.length > 0) {
            sendResponse(processedResponse);
          } else {
            sendError('Response timeout');
          }
        }
      }, timeout);

      // Nettoyer le timeout à la fermeture
      llamaProcess.on('close', () => {
        clearTimeout(timeoutId);
        this.currentProcess = undefined;
      });
    });
  }

  private containsStopSequence(text: string): boolean {
    const stopSequences = ['User:', 'Human:', '<|endoftext|>', '</s>'];
    return stopSequences.some(seq => text.includes(seq));
  }

  stopGeneration(): boolean {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = undefined;
      logger.info('Generation stopped by user');
      return true;
    }
    return false;
  }

  async testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const testProcess = spawn(this.llamaCppPath, ['--help']);

      let output = '';
      testProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      testProcess.on('close', (code) => {
        const isValid = code === 0 && output.includes('usage:');
        logger.info('llama.cpp connection test:', { success: isValid, code });
        resolve(isValid);
      });

      testProcess.on('error', (error) => {
        logger.warn('llama.cpp connection test failed:', error.message);
        resolve(false);
      });

      setTimeout(() => {
        testProcess.kill();
        resolve(false);
      }, 5000);
    });
  }

  getStatus() {
    const activeModel = this.modelService.getActiveModel();
    return {
      isLoaded: !!activeModel,
      modelName: activeModel ? activeModel.split('/').pop() : 'None',
      version: 'llama.cpp',
      lastRequest: new Date(),
      isGenerating: !!this.currentProcess
    };
  }
}

export { LlamaService };