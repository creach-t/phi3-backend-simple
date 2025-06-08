import { Request, Response } from 'express';
import { PrepromptService } from '../services/preprompt.service';
import { validateRequest } from '../utils/validation';
import { ApiResponse } from '../types/common.types';
import { logger } from '../utils/logger';
import Joi from 'joi';

const createPrepromptSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Name cannot be empty',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required'
  }),
  content: Joi.string().min(1).max(10000).required().messages({
    'string.min': 'Content cannot be empty',
    'string.max': 'Content must not exceed 10000 characters',
    'any.required': 'Content is required'
  }),
  description: Joi.string().max(500).optional().allow(''),
  isDefault: Joi.boolean().optional()
});

const updatePrepromptSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  content: Joi.string().min(1).max(10000).optional(),
  description: Joi.string().max(500).optional().allow(''),
  isDefault: Joi.boolean().optional()
});

export class PrepromptController {
  private prepromptService = PrepromptService.getInstance();

  async listPreprompts(req: Request, res: Response): Promise<void> {
    try {
      const preprompts = this.prepromptService.listPreprompts();
      
      const response: ApiResponse = {
        success: true,
        data: {
          preprompts,
          count: preprompts.length
        },
        message: 'Preprompts listed successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error listing preprompts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list preprompts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getPreprompt(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Missing Parameter',
          message: 'Preprompt ID is required'
        });
        return;
      }

      const preprompt = this.prepromptService.getPreprompt(id);
      
      if (!preprompt) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Preprompt not found'
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: preprompt,
        message: 'Preprompt retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting preprompt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get preprompt',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createPreprompt(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = validateRequest(createPrepromptSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error
        });
        return;
      }

      const preprompt = this.prepromptService.createPreprompt(value!);
      
      const response: ApiResponse = {
        success: true,
        data: preprompt,
        message: 'Preprompt created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Error creating preprompt:', error);
      res.status(400).json({
        success: false,
        error: 'Creation Failed',
        message: error instanceof Error ? error.message : 'Failed to create preprompt'
      });
    }
  }

  async updatePreprompt(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Missing Parameter',
          message: 'Preprompt ID is required'
        });
        return;
      }

      const { error, value } = validateRequest(updatePrepromptSchema, req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error
        });
        return;
      }

      const preprompt = this.prepromptService.updatePreprompt(id, value!);
      
      const response: ApiResponse = {
        success: true,
        data: preprompt,
        message: 'Preprompt updated successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error updating preprompt:', error);
      res.status(400).json({
        success: false,
        error: 'Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update preprompt'
      });
    }
  }

  async deletePreprompt(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Missing Parameter',
          message: 'Preprompt ID is required'
        });
        return;
      }

      this.prepromptService.deletePreprompt(id);
      
      const response: ApiResponse = {
        success: true,
        message: 'Preprompt deleted successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error deleting preprompt:', error);
      res.status(400).json({
        success: false,
        error: 'Deletion Failed',
        message: error instanceof Error ? error.message : 'Failed to delete preprompt'
      });
    }
  }

  async setDefault(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Missing Parameter',
          message: 'Preprompt ID is required'
        });
        return;
      }

      const preprompt = this.prepromptService.setDefault(id);
      
      const response: ApiResponse = {
        success: true,
        data: preprompt,
        message: 'Default preprompt set successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error setting default preprompt:', error);
      res.status(400).json({
        success: false,
        error: 'Set Default Failed',
        message: error instanceof Error ? error.message : 'Failed to set default preprompt'
      });
    }
  }

  async getDefault(req: Request, res: Response): Promise<void> {
    try {
      const preprompt = this.prepromptService.getDefaultPreprompt();
      
      if (!preprompt) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'No default preprompt found'
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: preprompt,
        message: 'Default preprompt retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting default preprompt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get default preprompt',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}