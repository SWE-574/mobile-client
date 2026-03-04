/**
 * The Hive API – grouped by category
 * Docs: https://apiary.selmangunes.com/api/docs/
 */

export { apiRequest, setAuthToken, setAuthTokens, getAuthToken, getRefreshToken, clearAuth, BASE_URL } from './client';
export type { RequestConfig } from './client';
export * from './types';

export * as auth from './auth';
export * as tags from './tags';
export * as services from './services';
export * as servicesComments from './servicesComments';
export * as handshakes from './handshakes';
export * as chats from './chats';
export * as notifications from './notifications';
export * as reputation from './reputation';
export * as admin from './admin';
export * as forum from './forum';
export * as transactions from './transactions';
export * as users from './users';
export * as publicChat from './publicChat';
export * as wikidata from './wikidata';
