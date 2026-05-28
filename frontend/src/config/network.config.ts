/**
 * Network Configuration
 * Centralized network settings for ArxisVR
 */

export interface NetworkConfig {
  /** WebSocket server URL (ws:// for local, wss:// for production) */
  serverUrl: string;
  
  /** Auto-reconnect configuration */
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  
  /** Sync rate in Hz (updates per second) */
  syncRate: number;
  
  /** Enable VoIP */
  voipEnabled: boolean;
}

/**
 * Default network configuration
 * Uses environment variable or defaults to localhost
 */
export const networkConfig: NetworkConfig = {
  // Vite injects import.meta.env at build time
  serverUrl: import.meta.env.VITE_WS_SERVER || 'ws://localhost:3002',
  
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 2000, // ms
  
  syncRate: 20, // 20Hz = 50ms per update
  
  voipEnabled: true
};

/**
 * Get server URL based on environment
 */
export function getServerUrl(): string {
  // Development
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_WS_SERVER || 'ws://localhost:3002';
  }
  
  // Production - use environment variable or default
  return import.meta.env.VITE_WS_SERVER || 'wss://arxisvr-backend.onrender.com';
}

/**
 * Check if running in secure context (HTTPS)
 * Required for WebRTC VoIP
 */
export function isSecureContext(): boolean {
  return window.isSecureContext;
}

/**
 * Validate WebSocket URL
 */
export function validateWebSocketUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
  } catch {
    return false;
  }
}
