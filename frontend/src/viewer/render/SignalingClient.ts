/**
 * SignalingClient — cliente WebSocket robusto para o servidor de sinalização
 * do Pixel Streaming (Unreal), com reconexão automática e backoff exponencial
 * (S33.11).
 */
export class SignalingClient {
  private socket?: WebSocket;
  private url: string;
  private onOpenCallback?: () => void;
  private onCloseCallback?: () => void;
  private onMessageCallback?: (msg: any) => void;

  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 8;
  private readonly baseDelayMs = 500;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private manuallyClosed = false;

  constructor(url: string) {
    this.url = url;
  }

  public connect(
    onOpen: () => void,
    onClose: () => void,
    onMessage: (msg: any) => void
  ): void {
    this.onOpenCallback = onOpen;
    this.onCloseCallback = onClose;
    this.onMessageCallback = onMessage;
    this.manuallyClosed = false;
    this.openSocket();
  }

  private openSocket(): void {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('[SignalingClient] Connected to signaling server');
      this.reconnectAttempts = 0;
      this.onOpenCallback?.();
    };

    this.socket.onclose = () => {
      console.warn('[SignalingClient] Disconnected from signaling server');
      this.onCloseCallback?.();
      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (err) => {
      console.error('[SignalingClient] Socket error:', err);
      // onclose dispara em seguida e cuida da reconexão.
    };

    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        this.onMessageCallback?.(parsed);
      } catch (err) {
        console.error('[SignalingClient] Failed to parse message:', err);
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SignalingClient] Max reconnect attempts reached. Giving up.');
      return;
    }
    const delay = Math.min(this.baseDelayMs * 2 ** this.reconnectAttempts, 15000);
    this.reconnectAttempts++;
    console.log(
      `[SignalingClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );
    this.reconnectTimer = setTimeout(() => this.openSocket(), delay);
  }

  public send(msg: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      console.warn('[SignalingClient] Socket not open. Message dropped:', msg);
    }
  }

  public disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
  }
}
