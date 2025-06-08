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
  interactiveMode: boolean;
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
          temperature: 0.3,
          topP: 0.9,
          repeatPenalty: 1.05,
          contextSize: 2048,
        },
        stopSequences: ['<|im_end|>', 'User:', 'Human:'],
        interactiveMode: true // CroissantLLM se met automatiquement en mode conversation
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
        stopSequences: ['User:', 'Human:', '<|endoftext|>', '</s>'],
        interactiveMode: false
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
        stopSequences: ['User:', 'Human:', '<|endoftext|>', '</s>'],
        interactiveMode: false
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

    if (!this.modelInfo) {
      this.modelInfo = this.detectModelType(modelPath);
      logger.info('Model detected', { 
        type: this.modelInfo.modelType, 
        hasChatTemplate: this.modelInfo.hasChatTemplate,
        interactiveMode: this.modelInfo.interactiveMode
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

    // Pour les modèles qui n'ont PAS de mode interactif automatique
    if (!this.modelInfo.interactiveMode) {
      args.push('-p', prompt);
    }
    // Pour les modèles avec mode interactif (CroissantLLM), on envoie le message via stdin

    if (params.seed !== -1) {
      args.push('--seed', params.seed.toString());
    }

    return args;
  }

  private buildPrompt(message: string, preprompt?: string, history?: ChatMessage[]): string {
    if (this.modelInfo?.hasChatTemplate) {
      let prompt = '';
      
      if (preprompt?.trim()) {
        prompt += `<|im_start|>system\n${preprompt.trim()}<|im_end|>\n`;
      }

      if (history && history.length > 0) {
        for (const msg of history.slice(-10)) {
          const role = msg.role === 'user' ? 'user' : 'assistant';
          prompt += `<|im_start|>${role}\n${msg.content}<|im_end|>\n`;
        }
      }

      prompt += `<|im_start|>user\n${message}<|im_end|>\n<|im_start|>assistant\n`;
      
      return prompt;
    }

    // Pour les modèles sans chat template
    let prompt = '';
    
    if (preprompt?.trim()) {
      prompt += `${preprompt.trim()}\n\n`;
    }

    if (history && history.length > 0) {
      for (const msg of history.slice(-10)) {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        prompt += `${role}: ${msg.content}\n`;
      }
    }

    prompt += `User: ${message}\nAssistant:`;
    
    return prompt;
  }

  private processResponse(rawResponse: string): string {
    let processed = rawResponse.trim();
    
    const stopSequences = this.modelInfo?.stopSequences || 
      ['User:', 'Human:', '<|endoftext|>', '</s>', '<s>'];
    
    for (const seq of stopSequences) {
      const index = processed.indexOf(seq);
      if (index !== -1) {
        processed = processed.substring(0, index).trim();
      }
    }

    if (this.modelInfo?.hasChatTemplate) {
      processed = processed.replace(/<\|im_start\|>/g, '');
      processed = processed.replace(/<\|im_end\|>/g, '');
      processed = processed.replace(/^assistant\s*/i, '');
      
      // Nettoyer les prompts résiduels du mode interactif
      processed = processed.replace(/^<\|im_start\|>\s*user[\s\S]*?<\|im_end\|>/gm, '');
      processed = processed.replace(/^>\s*/gm, ''); // Supprimer les ">" de prompt
    }

    return processed.trim();
  }

  async generateResponse(request: ChatRequest, preprompt?: string, modelParams?: Partial<ModelParams>): Promise<ChatResponse> {
    const startTime = Date.now();
    const params = { ...this.getDefaultParams(), ...modelParams };
    
    const fullPrompt = this.buildPrompt(request.message, preprompt, request.history);
    const args = this.buildArgs(fullPrompt, params);
    const timeout = Math.max(30000, params.maxTokens * 100);

    logger.info('Starting llama.cpp generation', {
      promptLength: fullPrompt.length,
      params,
      timeout,
      modelType: this.modelInfo?.modelType,
      hasChatTemplate: this.modelInfo?.hasChatTemplate,
      interactiveMode: this.modelInfo?.interactiveMode
    });

    return new Promise<ChatResponse>((resolve, reject) => {
      let response = '';
      let errorOutput = '';
      let chunkCount = 0;
      let responseSent = false;
      let isInteractiveMode = false;

      const llamaProcess: ChildProcess = spawn(this.llamaCppPath, args);
      this.currentProcess = llamaProcess;

      const sendResponse = (finalResponse: string): void => {
        if (!responseSent) {
          responseSent = true;
          const processingTime = Date.now() - startTime;
          const tokensUsed = Math.ceil(finalResponse.length / 4);
          
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
        
        // Détecter si llama.cpp est passé en mode interactif
        if (chunk.includes('interactive mode on') || chunk.includes('> ')) {
          isInteractiveMode = true;
          logger.info('Interactive mode detected, sending message via stdin');
          
          // Envoyer le message dans le mode interactif
          if (llamaProcess.stdin) {
            llamaProcess.stdin.write(request.message + '\n');
          }
          return;
        }

        // Si on est en mode interactif, ignorer les prompts et ne garder que les réponses
        if (isInteractiveMode) {
          // Ignorer les lignes de prompt et les métadonnées
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (!line.startsWith('>') && 
                !line.includes('llama_perf_') && 
                !line.includes('Interrupted') &&
                !line.match(/^\s*$/) &&
                !line.includes('<|im_start|>user') &&
                line.trim().length > 0) {
              response += line + '\n';
              chunkCount++;
            }
          }
        } else {
          // Mode normal
          response += chunk;
          chunkCount++;
        }

        logger.debug(`Received chunk ${chunkCount}:`, {
          length: chunk.length,
          preview: chunk.substring(0, 50),
          isInteractive: isInteractiveMode
        });

        // Vérifier les séquences d'arrêt
        if (this.containsStopSequence(chunk)) {
          logger.info('Stop sequence detected, terminating process');
          llamaProcess.kill('SIGTERM');
          const processedResponse = this.processResponse(response);
          sendResponse(processedResponse);
        }
      });

      // Pour les modèles avec mode interactif prévu, envoyer le message après un délai
      if (this.modelInfo?.interactiveMode) {
        setTimeout(() => {
          if (llamaProcess.stdin && !isInteractiveMode) {
            logger.info('Sending message to stdin for interactive model');
            llamaProcess.stdin.write(fullPrompt + '\n');
          }
        }, 1000); // Attendre que le modèle soit prêt
      }

      llamaProcess.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        errorOutput += chunk;
        
        // Filtrer les logs normaux
        if (!chunk.includes('load_tensors:') && 
            !chunk.includes('llama_model_loader:') &&
            !chunk.includes('print_info:') &&
            !chunk.includes('load_backend:') &&
            !chunk.includes('llama_context:') &&
            !chunk.includes('llama_kv_cache') &&
            !chunk.includes('main: llama threadpool') &&
            !chunk.includes('main: chat template') &&
            !chunk.includes('system_info:') &&
            !chunk.trim().match(/^\.+$/)) {
          logger.warn('llama.cpp stderr:', chunk.substring(0, 200));
        }
      });

      llamaProcess.on('close', (code: number | null) => {
        logger.info('llama.cpp process closed', { code, chunkCount, isInteractive: isInteractiveMode });
        if (!responseSent) {
          const processedResponse = this.processResponse(response);
          if (processedResponse.length > 0) {
            sendResponse(processedResponse);
          } else {
            sendError('Empty response from llama.cpp');
          }
        }
      });

      llamaProcess.on('error', (error: Error) => {
        logger.error('llama.cpp process error:', error);
        sendError(`Process error: ${error.message}`);
      });

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
      interactiveMode: this.modelInfo?.interactiveMode || false,
      version: 'llama.cpp adaptive',
      lastRequest: new Date(),
      isGenerating: !!this.currentProcess
    };
  }

  resetModelInfo(): void {
    this.modelInfo = undefined;
    logger.info('Model info reset, will be detected on next generation');
  }
}

export { LlamaService };