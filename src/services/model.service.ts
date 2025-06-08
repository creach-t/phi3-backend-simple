import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { logger } from '../utils/logger';

export interface ModelInfo {
  name: string;
  filename: string;
  size: number;
  path: string;
  isActive: boolean;
  downloadDate?: Date;
}

export interface DownloadProgress {
  id: string;
  url: string;
  filename: string;
  progress: number;
  status: 'downloading' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

class ModelService {
  private static instance: ModelService;
  private modelsDir: string;
  private activeDownloads: Map<string, DownloadProgress> = new Map();
  private activeModelPath: string = '';

  constructor() {
    this.modelsDir = path.join(process.cwd(), 'models');
    this.ensureModelsDir();
  }

  static getInstance(): ModelService {
    if (!ModelService.instance) {
      ModelService.instance = new ModelService();
    }
    return ModelService.instance;
  }

  private ensureModelsDir(): void {
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
      logger.info('Created models directory');
    }
  }

  listModels(): ModelInfo[] {
    try {
      const files = fs.readdirSync(this.modelsDir);
      const ggufFiles = files.filter(file => file.endsWith('.gguf'));
      
      return ggufFiles.map(filename => {
        const filePath = path.join(this.modelsDir, filename);
        const stats = fs.statSync(filePath);
        const isActive = this.activeModelPath === filePath;
        
        return {
          name: filename.replace('.gguf', ''),
          filename,
          size: stats.size,
          path: filePath,
          isActive,
          downloadDate: stats.birthtime
        };
      });
    } catch (error) {
      logger.error('Error listing models:', error);
      return [];
    }
  }

  async downloadModel(url: string, filename?: string): Promise<string> {
    if (!filename) {
      const urlParts = url.split('/');
      filename = urlParts[urlParts.length - 1];
    }

    if (!url.includes('huggingface.co') || !filename.endsWith('.gguf')) {
      throw new Error('URL invalide. Utilisez un lien direct vers un fichier .gguf depuis Hugging Face.');
    }

    const downloadId = Date.now().toString();
    const outputPath = path.join(this.modelsDir, filename);

    if (fs.existsSync(outputPath)) {
      throw new Error(`Le modèle ${filename} existe déjà.`);
    }

    const progress: DownloadProgress = {
      id: downloadId,
      url,
      filename,
      progress: 0,
      status: 'downloading'
    };
    this.activeDownloads.set(downloadId, progress);

    try {
      await this.downloadFile(url, outputPath, downloadId);
      progress.status = 'completed';
      progress.progress = 100;
      logger.info(`Model download completed: ${filename}`);
      
      return downloadId;
    } catch (error) {
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : 'Erreur inconnue';
      
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      
      throw error;
    }
  }

  private downloadFile(url: string, outputPath: string, downloadId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const curl = spawn('curl', [
        '-L',
        '-o', outputPath,
        '--progress-bar',
        '--fail',
        url
      ]);

      curl.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        const progressMatch = output.match(/(\d+\.\d+)%/);
        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          const downloadProgress = this.activeDownloads.get(downloadId);
          if (downloadProgress) {
            downloadProgress.progress = progress;
          }
        }
      });

      curl.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Échec du téléchargement (code: ${code})`));
        }
      });

      curl.on('error', (error) => {
        reject(new Error(`Erreur curl: ${error.message}`));
      });
    });
  }

  setActiveModel(filename: string): boolean {
    const modelPath = path.join(this.modelsDir, filename);
    
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Le modèle ${filename} n'existe pas.`);
    }

    this.activeModelPath = modelPath;
    logger.info(`Active model set to: ${filename}`);
    
    // Notifier le LlamaService qu'il faut redétecter le modèle
    try {
      const { LlamaService } = require('./llama.service');
      const llamaService = LlamaService.getInstance();
      if (llamaService && typeof llamaService.resetModelInfo === 'function') {
        llamaService.resetModelInfo();
      }
    } catch (error) {
      logger.warn('Could not reset LlamaService model info:', error);
    }
    
    return true;
  }

  getActiveModel(): string {
    return this.activeModelPath;
  }

  deleteModel(filename: string): boolean {
    const modelPath = path.join(this.modelsDir, filename);
    
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Le modèle ${filename} n'existe pas.`);
    }

    if (this.activeModelPath === modelPath) {
      throw new Error('Impossible de supprimer le modèle actuellement utilisé.');
    }

    fs.unlinkSync(modelPath);
    logger.info(`Model deleted: ${filename}`);
    return true;
  }

  getDownloadProgress(downloadId: string): DownloadProgress | undefined {
    return this.activeDownloads.get(downloadId);
  }

  getActiveDownloads(): DownloadProgress[] {
    return Array.from(this.activeDownloads.values());
  }

  cancelDownload(downloadId: string): boolean {
    const download = this.activeDownloads.get(downloadId);
    if (download && download.status === 'downloading') {
      download.status = 'cancelled';
      return true;
    }
    return false;
  }

  cleanupDownloads(): void {
    for (const [id, download] of this.activeDownloads.entries()) {
      if (download.status !== 'downloading') {
        this.activeDownloads.delete(id);
      }
    }
  }

  getTotalModelsSize(): number {
    const models = this.listModels();
    return models.reduce((total, model) => total + model.size, 0);
  }
}

export { ModelService };