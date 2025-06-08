export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  response: string;
  tokensUsed: number;
  processingTime: number;
}

export interface ModelStatus {
  isLoaded: boolean;
  modelName: string;
  version: string;
  lastRequest?: Date;
}