/**
 * API Module - ArxisVR Backend Integration
 * Centraliza toda comunicação HTTP e WebSocket com o backend
 */

export * from './client';
export * from './services';

// WebSocket exports (evitando conflitos de nomes)
export { SocketManager } from './websocket/socket-manager';
export { MeetingsSocket } from './websocket/meetings-socket';

// Re-exports para facilitar imports
export { createAPIClient, getAPIClient, initializeAPI, type APIInitOptions } from './client';
export { getAuthService } from './services/auth.service';
export { getProjectsService } from './services/projects.service';
export { getMeetingsService } from './services/meetings.service';
export { getBillingService } from './services/billing.service';
