export interface User {
  id: number;
  email: string;
  username: string;
  password?: string; // Optionnel pour les réponses
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}

export interface JwtPayload {
  userId: number;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}