/**
 * API Module - ArxisVR Backend Integration
 * Centraliza toda comunicação HTTP e WebSocket com o backend
 */

export * from './v1/client';
export * from './v1/services';

// WebSocket exports (evitando conflitos de nomes)
export { SocketManager } from './v1/websocket/socket-manager';
export { MeetingsSocket } from './v1/websocket/meetings-socket';

// Re-exports para facilitar imports
export { createAPIClient, getAPIClient, initializeAPI, type APIInitOptions } from './v1/client';
export { getAuthService } from './v1/services/auth.service';
export { getProjectsService } from './v1/services/projects.service';
export { getMeetingsService } from './v1/services/meetings.service';
export { getBillingService } from './v1/services/billing.service';
