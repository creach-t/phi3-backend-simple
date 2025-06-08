import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  username: Joi.string().min(3).max(30).alphanum().required().messages({
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username must not exceed 30 characters',
    'string.alphanum': 'Username must contain only alphanumeric characters',
    'any.required': 'Username is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  })
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

export const chatSchema = Joi.object({
  message: Joi.string().min(1).max(5000).required().messages({
    'string.min': 'Message cannot be empty',
    'string.max': 'Message must not exceed 5000 characters',
    'any.required': 'Message is required'
  }),
  maxTokens: Joi.number().min(1).max(4096).optional(),
  temperature: Joi.number().min(0).max(2).optional(),
  history: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('user', 'assistant').required(),
      content: Joi.string().required(),
      timestamp: Joi.date().optional()
    })
  ).optional()
});

export function validateRequest<T>(schema: Joi.ObjectSchema, data: unknown): { error?: string; value?: T } {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return { error: errorMessage };
  }
  
  return { value: value as T };
}