/**
 * Chats API – list, create, retrieve
 * GET/POST /api/chats/, GET /api/chats/{id}/
 */

import { apiRequest } from './client';

export interface Chat {
  id: string;
  participants?: unknown[];
  created_at?: string;
  [key: string]: unknown;
}

export interface CreateChatRequest {
  [key: string]: unknown;
}

export interface ChatsListParams {
  page?: number;
  page_size?: number;
}

export function listChats(params?: ChatsListParams): Promise<{ results: Chat[]; count: number; next: string | null; previous: string | null }> {
  return apiRequest(`/chats/`, { params: params as Record<string, string | number | undefined> });
}

export function createChat(body?: CreateChatRequest): Promise<Chat> {
  return apiRequest<Chat>('/chats/', { method: 'POST', body: body ?? {} });
}

export function getChat(id: string): Promise<Chat> {
  return apiRequest<Chat>(`/chats/${id}/`);
}
