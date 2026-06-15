export class SignalingClient {
  private socket?: WebSocket;
  private url: string;
  private onMessageCallback?: (msg: any) => void;

  constructor(url: string) {
    this.url = url;
  }

  public connect(
    onOpen: () => void,
    onClose: () => void,
    onMessage: (msg: any) => void
  ): void {
    this.onMessageCallback = onMessage;
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('[SignalingClient] Connected to signaling server');
      onOpen();
    };

    this.socket.onclose = () => {
      console.warn('[SignalingClient] Disconnected from signaling server');
      onClose();
    };

    this.socket.onerror = (err) => {
      console.error('[SignalingClient] Socket error:', err);
    };

    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (this.onMessageCallback) {
          this.onMessageCallback(parsed);
        }
      } catch (err) {
        console.error('[SignalingClient] Failed to parse message:', err);
      }
    };
  }

  public send(msg: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      console.warn('[SignalingClient] Socket not open. Message queued or dropped:', msg);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
  }
}
