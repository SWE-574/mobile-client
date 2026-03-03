/**
 * Auth API – login, register, refresh token
 * POST /api/auth/login/, POST /api/auth/register/, POST /api/auth/refresh/
 */

import { apiRequest, setAuthToken } from './client';
import type { TokenPair } from './types';

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username?: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface RefreshRequest {
  refresh: string;
}

export async function login(body: LoginRequest): Promise<TokenPair> {
  const data = await apiRequest<TokenPair>('/auth/login/', { method: 'POST', body });
  if (data.access) setAuthToken(data.access);
  return data;
}

export async function register(body: RegisterRequest): Promise<TokenPair> {
  const data = await apiRequest<TokenPair>('/auth/register/', { method: 'POST', body });
  if (data.access) setAuthToken(data.access);
  return data;
}

export async function refresh(body: RefreshRequest): Promise<TokenPair> {
  const data = await apiRequest<TokenPair>('/auth/refresh/', { method: 'POST', body });
  if (data.access) setAuthToken(data.access);
  return data;
}
