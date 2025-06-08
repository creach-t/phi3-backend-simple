import { Request, Response } from 'express';
import { ModelService } from '../services/model.service';
import { validateRequest } from '../utils/validation';
import { ApiResponse } from '../types/common.types';
import { logger } from '../utils/logger';
import Joi from 'joi';

const downloadSchema = Joi.object({
  url: Joi.string().uri().required().messages({
    'string.uri': 'URL must be a valid URI',
    'any.required': 'URL is required'
  }),
  filename: Joi.string().optional()
});

const setActiveSchema = Joi.object({
  filename: Joi.string().required().messages({
    'any.required': 'Filename is required'
  })
});

export class ModelController {
  private modelService = ModelService.getInstance();

  async listModels(req: Request, res: Response): Promise<void> {
    try {
      const models = this.modelService.listModels();
      
      const response: ApiResponse = {
        success: true,
        data: {
          models,
          count: models.length,
          totalSize: this.modelService.getTotalModelsSize()
        },
        message: 'Models listed successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error listing models:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list models',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async downloadModel(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = validateRequest(downloadSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error
        });
        return;
      }

      const { url, filename } = value!;
      const downloadId = await this.modelService.downloadModel(url, filename);
      
      const response: ApiResponse = {
        success: true,
        data: { downloadId },
        message: 'Download started successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error starting download:', error);
      res.status(400).json({
        success: false,
        error: 'Download Failed',
        message: error instanceof Error ? error.message : 'Failed to start download'
      });
    }
  }

  async setActiveModel(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = validateRequest(setActiveSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error
        });
        return;
      }

      const { filename } = value!;
      this.modelService.setActiveModel(filename);
      
      const response: ApiResponse = {
        success: true,
        message: `Model ${filename} activated successfully`
      };

      res.json(response);
    } catch (error) {
      logger.error('Error setting active model:', error);
      res.status(400).json({
        success: false,
        error: 'Activation Failed',
        message: error instanceof Error ? error.message : 'Failed to activate model'
      });
    }
  }

  async deleteModel(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      
      if (!filename) {
        res.status(400).json({
          success: false,
          error: 'Missing Parameter',
          message: 'Filename is required'
        });
        return;
      }

      this.modelService.deleteModel(filename);
      
      const response: ApiResponse = {
        success: true,
        message: `Model ${filename} deleted successfully`
      };

      res.json(response);
    } catch (error) {
      logger.error('Error deleting model:', error);
      res.status(400).json({
        success: false,
        error: 'Deletion Failed',
        message: error instanceof Error ? error.message : 'Failed to delete model'
      });
    }
  }

  async getDownloadStatus(req: Request, res: Response): Promise<void> {
    try {
      const { downloadId } = req.params;
      
      if (downloadId) {
        const progress = this.modelService.getDownloadProgress(downloadId);
        if (!progress) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Download not found'
          });
          return;
        }
        
        const response: ApiResponse = {
          success: true,
          data: progress,
          message: 'Download status retrieved'
        };
        
        res.json(response);
      } else {
        const activeDownloads = this.modelService.getActiveDownloads();
        
        const response: ApiResponse = {
          success: true,
          data: { downloads: activeDownloads },
          message: 'Active downloads retrieved'
        };
        
        res.json(response);
      }
    } catch (error) {
      logger.error('Error getting download status:', error);
      res.status(500).json({
        success: false,
        error: 'Status Error',
        message: 'Failed to get download status'
      });
    }
  }

  async cancelDownload(req: Request, res: Response): Promise<void> {
    try {
      const { downloadId } = req.params;
      
      if (!downloadId) {
        res.status(400).json({
          success: false,
          error: 'Missing Parameter',
          message: 'Download ID is required'
        });
        return;
      }

      const cancelled = this.modelService.cancelDownload(downloadId);
      
      if (cancelled) {
        const response: ApiResponse = {
          success: true,
          message: 'Download cancelled successfully'
        };
        res.json(response);
      } else {
        res.status(400).json({
          success: false,
          error: 'Cancellation Failed',
          message: 'Unable to cancel download'
        });
      }
    } catch (error) {
      logger.error('Error cancelling download:', error);
      res.status(500).json({
        success: false,
        error: 'Cancellation Error',
        message: 'Failed to cancel download'
      });
    }
  }

  async cleanupDownloads(req: Request, res: Response): Promise<void> {
    try {
      this.modelService.cleanupDownloads();
      
      const response: ApiResponse = {
        success: true,
        message: 'Downloads cleaned up successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error cleaning up downloads:', error);
      res.status(500).json({
        success: false,
        error: 'Cleanup Error',
        message: 'Failed to cleanup downloads'
      });
    }
  }
}