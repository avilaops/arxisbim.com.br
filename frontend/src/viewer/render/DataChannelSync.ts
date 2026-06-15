export interface CameraSyncPayload {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
}

export interface InteractionPayload {
  type: 'select' | 'hover' | 'hide' | 'isolate';
  expressIds: number[];
  color?: string;
}

export class DataChannelSync {
  private dataChannel?: RTCDataChannel;
  private onInteractionCallback?: (payload: InteractionPayload) => void;

  constructor(dataChannel?: RTCDataChannel) {
    if (dataChannel) {
      this.setDataChannel(dataChannel);
    }
  }

  public setDataChannel(dataChannel: RTCDataChannel): void {
    this.dataChannel = dataChannel;
    this.dataChannel.onmessage = this.handleMessage;
    this.dataChannel.onopen = () => console.log('[DataChannelSync] Data channel open');
    this.dataChannel.onclose = () => console.log('[DataChannelSync] Data channel closed');
  }

  public setInteractionCallback(callback: (payload: InteractionPayload) => void): void {
    this.onInteractionCallback = callback;
  }

  public syncCamera(cameraState: CameraSyncPayload): void {
    this.send({
      type: 'camera',
      data: cameraState,
    });
  }

  public syncInteraction(event: InteractionPayload): void {
    this.send({
      type: 'interaction',
      data: event,
    });
  }

  private send(payload: { type: string; data: any }): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(payload));
    }
  }

  private handleMessage = (event: MessageEvent): void => {
    try {
      const parsed = JSON.parse(event.data);
      if (parsed.type === 'interaction' && this.onInteractionCallback) {
        this.onInteractionCallback(parsed.data);
      }
    } catch (err) {
      console.error('[DataChannelSync] Failed to handle message:', err);
    }
  };
}
