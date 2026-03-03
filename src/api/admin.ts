/**
 * Admin API – reports (list, get, pause, resolve); users (list, adjust-karma, ban, unban, warn)
 * GET /api/admin/reports/, GET /api/admin/reports/{id}/, POST pause/resolve
 * GET /api/admin/users/, POST adjust-karma, ban, unban, warn
 */

import { apiRequest } from './client';
import type { PaginatedResponse } from './types';

export interface Report {
  id: string;
  reporter?: string | object;
  reported?: string | object;
  handshake?: string;
  reason?: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface AdminUser {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  karma_score?: number;
  role?: string;
  [key: string]: unknown;
}

export interface AdminListParams {
  page?: number;
  page_size?: number;
  status?: string;
}

export function listReports(params?: AdminListParams): Promise<PaginatedResponse<Report>> {
  return apiRequest<PaginatedResponse<Report>>('/admin/reports/', { params: params as Record<string, string | number | undefined> });
}

export function getReport(id: string): Promise<Report> {
  return apiRequest<Report>(`/admin/reports/${id}/`);
}

export function pauseReport(id: string, body?: object): Promise<Report> {
  return apiRequest<Report>(`/admin/reports/${id}/pause/`, { method: 'POST', body: body ?? {} });
}

export function resolveReport(id: string, body?: object): Promise<Report> {
  return apiRequest<Report>(`/admin/reports/${id}/resolve/`, { method: 'POST', body: body ?? {} });
}

export function listAdminUsers(params?: AdminListParams): Promise<PaginatedResponse<AdminUser>> {
  return apiRequest<PaginatedResponse<AdminUser>>('/admin/users/', { params: params as Record<string, string | number | undefined> });
}

export function adjustKarma(userId: string, body: { amount: number; reason?: string }): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/admin/users/${userId}/adjust-karma/`, { method: 'POST', body });
}

export function banUser(userId: string, body?: { reason?: string; duration?: string }): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/admin/users/${userId}/ban/`, { method: 'POST', body: body ?? {} });
}

export function unbanUser(userId: string, body?: object): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/admin/users/${userId}/unban/`, { method: 'POST', body: body ?? {} });
}

export function warnUser(userId: string, body?: { message?: string }): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/admin/users/${userId}/warn/`, { method: 'POST', body: body ?? {} });
}
