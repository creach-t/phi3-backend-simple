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

interface ModelInfo {
  hasChatTemplate: boolean;
  modelType: 'croissant' | 'phi3' | 'generic';
  defaultParams: Partial<ModelParams>;
  stopSequences: string[];
}

class LlamaService {
  private static instance: LlamaService;
  private modelService = ModelService.getInstance();
  private llamaCppPath: string;
  private currentProcess?: ChildProcess;
  private modelInfo?: ModelInfo;

  constructor() {
    this.llamaCppPath = process.env.LLAMA_CPP_PATH || 'llama-cpp';
  }

  static getInstance(): LlamaService {
    if (!LlamaService.instance) {
      LlamaService.instance = new LlamaService();
    }
    return LlamaService.instance;
  }

  private detectModelType(modelPath: string): ModelInfo {
    const modelName = modelPath.toLowerCase();
    
    if (modelName.includes('croissant')) {
      return {
        hasChatTemplate: true,
        modelType: 'croissant',
        defaultParams: {
          temperature: 0.3, // Minimum recommandé pour CroissantLLM
          topP: 0.9,
          repeatPenalty: 1.05,
          contextSize: 2048, // Taille d'entraînement du modèle
        },
        stopSequences: ['<|im_end|>', 'User:', 'Human:']
      };
    } else if (modelName.includes('phi') || modelName.includes('phi3')) {
      return {
        hasChatTemplate: false,
        modelType: 'phi3',
        defaultParams: {
          temperature: 0.7,
          topP: 0.9,
          repeatPenalty: 1.1,
          contextSize: 4096,
        },
        stopSequences: ['User:', 'Human:', '<|endoftext|>', '</s>']
      };
    } else {
      return {
        hasChatTemplate: false,
        modelType: 'generic',
        defaultParams: {
          temperature: 0.7,
          topP: 0.9,
          repeatPenalty: 1.1,
          contextSize: 2048,
        },
        stopSequences: ['User:', 'Human:', '<|endoftext|>', '</s>']
      };
    }
  }

  private getDefaultParams(): ModelParams {
    const baseParams = {
      temperature: parseFloat(process.env.PHI3_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.PHI3_MAX_TOKENS || '2048'),
      topP: 0.9,
      repeatPenalty: 1.1,
      contextSize: 4096,
      seed: -1
    };

    // Fusionner avec les paramètres spécifiques au modèle
    if (this.modelInfo?.defaultParams) {
      return { ...baseParams, ...this.modelInfo.defaultParams };
    }

    return baseParams;
  }

  private buildArgs(prompt: string, params: ModelParams): string[] {
    const modelPath = this.modelService.getActiveModel();
    if (!modelPath) {
      throw new Error('Aucun modèle actif. Veuillez activer un modèle.');
    }

    // Détecter le type de modèle si pas encore fait
    if (!this.modelInfo) {
      this.modelInfo = this.detectModelType(modelPath);
      logger.info('Model detected', { 
        type: this.modelInfo.modelType, 
        hasChatTemplate: this.modelInfo.hasChatTemplate 
      });
    }

    const args: string[] = [
      '-m', modelPath,
      '-c', params.contextSize.toString(),
      '-n', params.maxTokens.toString(),
      '--temp', params.temperature.toString(),
      '--top-p', params.topP.toString(),
      '--repeat-penalty', params.repeatPenalty.toString(),
      '--no-display-prompt'
    ];

    // Mode conversation pour les modèles avec chat template
    if (this.modelInfo.hasChatTemplate) {
      args.push('-cnv'); // Active le mode conversation
      // Pour les modèles avec chat template, on envoie le message via stdin
    } else {
      // Mode prompt classique pour les autres modèles
      args.push('-p', prompt);
    }

    if (params.seed !== -1) {
      args.push('--seed', params.seed.toString());
    }

    return args;
  }

  private buildPrompt(message: string, preprompt?: string, history?: ChatMessage[]): string {
    // Si le modèle a un chat template, on laisse llama.cpp le gérer
    if (this.modelInfo?.hasChatTemplate) {
      // Pour les modèles CroissantLLM, on retourne juste le message
      // Le template sera appliqué automatiquement par llama.cpp
      return message;
    }

    // Pour les modèles sans chat template (Phi-3, etc.)
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
    
    // Utiliser les séquences d'arrêt spécifiques au modèle
    const stopSequences = this.modelInfo?.stopSequences || 
      ['User:', 'Human:', '<|endoftext|>', '</s>', '<s>'];
    
    for (const seq of stopSequences) {
      const index = processed.indexOf(seq);
      if (index !== -1) {
        processed = processed.substring(0, index).trim();
      }
    }

    // Nettoyer les artefacts spécifiques aux modèles avec chat template
    if (this.modelInfo?.hasChatTemplate) {
      // Supprimer les tags résiduels
      processed = processed.replace(/<\|im_start\|>/g, '');
      processed = processed.replace(/<\|im_end\|>/g, '');
      processed = processed.replace(/^assistant\s*/i, '');
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
      timeout,
      modelType: this.modelInfo?.modelType,
      hasChatTemplate: this.modelInfo?.hasChatTemplate
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

      // Pour les modèles avec chat template, envoyer le message via stdin
      if (this.modelInfo?.hasChatTemplate && llamaProcess.stdin) {
        // Envoyer le message en mode interactif
        llamaProcess.stdin.write(fullPrompt + '\n');
        // Attendre un peu puis terminer l'input
        setTimeout(() => {
          if (llamaProcess.stdin) {
            llamaProcess.stdin.end();
          }
        }, 100);
      }

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
        
        // Filtrer les logs verbeux de llama.cpp
        if (!chunk.includes('load_tensors:') && 
            !chunk.includes('llama_model_loader:') &&
            !chunk.includes('print_info:') &&
            !chunk.includes('load_backend:')) {
          logger.warn('llama.cpp stderr:', chunk.substring(0, 100));
        }
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
    const stopSequences = this.modelInfo?.stopSequences || 
      ['User:', 'Human:', '<|endoftext|>', '</s>'];
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
      modelType: this.modelInfo?.modelType || 'unknown',
      hasChatTemplate: this.modelInfo?.hasChatTemplate || false,
      version: 'llama.cpp adaptive',
      lastRequest: new Date(),
      isGenerating: !!this.currentProcess
    };
  }

  // Méthode pour forcer la redétection du modèle (utile lors du changement de modèle)
  resetModelInfo(): void {
    this.modelInfo = undefined;
    logger.info('Model info reset, will be detected on next generation');
  }
}

export { LlamaService };