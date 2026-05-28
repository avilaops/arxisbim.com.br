/**
 * WebSocket Client
 * Handles WebSocket connections with automatic reconnection and event handling
 */

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (data: any) => void;
}

export type WebSocketMessageHandler = (data: any) => void;
export type UnsubscribeFn = () => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, Set<WebSocketMessageHandler>>;
  private isManualClose: boolean = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      onConnect: config.onConnect || (() => {}),
      onDisconnect: config.onDisconnect || (() => {}),
      onError: config.onError || (() => {}),
      onMessage: config.onMessage || (() => {}),
    };
    this.messageHandlers = new Map();
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isManualClose = true;
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send message to WebSocket server
   */
  send(data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected');
      return;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  }

  /**
   * Subscribe to a specific channel/message type
   */
  subscribe(channel: string, handler: WebSocketMessageHandler): UnsubscribeFn {
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, new Set());
    }

    this.messageHandlers.get(channel)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(channel);
        }
      }
    };
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.clearReconnectTimer();
    this.config.onConnect();
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.ws = null;
    this.config.onDisconnect();

    // Attempt to reconnect if not manually closed
    if (!this.isManualClose) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.config.onError(event);
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Call global message handler
      this.config.onMessage(data);

      // Call channel-specific handlers
      if (data.channel) {
        const handlers = this.messageHandlers.get(data.channel);
        if (handlers) {
          handlers.forEach(handler => handler(data));
        }
      }

      // Call type-specific handlers
      if (data.type) {
        const handlers = this.messageHandlers.get(data.type);
        if (handlers) {
          handlers.forEach(handler => handler(data));
        }
      }
    } catch (error) {
      // If not JSON, pass as raw string
      this.config.onMessage(event.data);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.clearReconnectTimer();

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);
      this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Get connection state
   */
  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * WebSocket Manager
 * Manages multiple WebSocket connections
 */
class WebSocketManager {
  private connections: Map<string, WebSocketClient>;

  constructor() {
    this.connections = new Map();
  }

  /**
   * Create or get existing WebSocket connection
   */
  connect(id: string, config: WebSocketConfig): WebSocketClient {
    let client = this.connections.get(id);

    if (!client) {
      client = new WebSocketClient(config);
      this.connections.set(id, client);
    }

    client.connect();
    return client;
  }

  /**
   * Disconnect a specific connection
   */
  disconnect(id: string): void {
    const client = this.connections.get(id);
    if (client) {
      client.disconnect();
      this.connections.delete(id);
    }
  }

  /**
   * Disconnect all connections
   */
  disconnectAll(): void {
    this.connections.forEach((client, id) => {
      client.disconnect();
    });
    this.connections.clear();
  }

  /**
   * Get a specific connection
   */
  get(id: string): WebSocketClient | undefined {
    return this.connections.get(id);
  }
}

// Create global WebSocket manager instance
export const wsManager = new WebSocketManager();

export default WebSocketClient;
