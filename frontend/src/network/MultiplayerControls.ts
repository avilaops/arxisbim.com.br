/**
 * Multiplayer Controls UI - Controles de voz e screen share
 */

export class MultiplayerControls {
  private container: HTMLDivElement;
  private voiceButton: HTMLButtonElement;
  private screenShareButton: HTMLButtonElement;
  private roomButton: HTMLButtonElement;
  
  private voiceEnabled = false;
  private screenShareActive = false;
  private inRoom = false;
  
  // Callbacks
  private onVoiceToggle?: () => void;
  private onScreenShareToggle?: () => void;
  private onJoinRoom?: () => void;
  private onLeaveRoom?: () => void;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'multiplayer-controls';
    this.container.innerHTML = `
      <div class="multiplayer-controls-panel">
        <button class="mp-control-btn" data-action="voice" title="Toggle Voice">
          <i class="iconoir-mic"></i>
          <span class="mp-status-indicator"></span>
        </button>
        
        <button class="mp-control-btn" data-action="screen" title="Screen Share">
          <i class="iconoir-screen-sharing"></i>
          <span class="mp-status-indicator"></span>
        </button>
        
        <button class="mp-control-btn mp-room-btn" data-action="room" title="Join Room">
          <i class="iconoir-ev-plug"></i>
          <span class="mp-room-text">Connect</span>
        </button>
        
        <div class="mp-participants">
          <i class="iconoir-group"></i>
          <span class="mp-count">0</span>
        </div>
      </div>
    `;
    
    this.voiceButton = this.container.querySelector('[data-action="voice"]')!;
    this.screenShareButton = this.container.querySelector('[data-action="screen"]')!;
    this.roomButton = this.container.querySelector('[data-action="room"]')!;
    
    this.attachEventListeners();
    
    document.body.appendChild(this.container);
  }

  private attachEventListeners(): void {
    this.voiceButton.addEventListener('click', () => {
      this.toggleVoice();
    });
    
    this.screenShareButton.addEventListener('click', () => {
      this.toggleScreenShare();
    });
    
    this.roomButton.addEventListener('click', () => {
      if (this.inRoom) {
        if (this.onLeaveRoom) this.onLeaveRoom();
      } else {
        if (this.onJoinRoom) this.onJoinRoom();
      }
    });
  }

  private toggleVoice(): void {
    this.voiceEnabled = !this.voiceEnabled;
    
    if (this.voiceEnabled) {
      this.voiceButton.classList.add('active');
      this.voiceButton.querySelector('i')!.className = 'iconoir-mic';
    } else {
      this.voiceButton.classList.remove('active');
      this.voiceButton.querySelector('i')!.className = 'iconoir-mic-mute';
    }
    
    if (this.onVoiceToggle) this.onVoiceToggle();
  }

  private toggleScreenShare(): void {
    this.screenShareActive = !this.screenShareActive;
    
    if (this.screenShareActive) {
      this.screenShareButton.classList.add('active');
    } else {
      this.screenShareButton.classList.remove('active');
    }
    
    if (this.onScreenShareToggle) this.onScreenShareToggle();
  }

  public setRoomState(inRoom: boolean): void {
    this.inRoom = inRoom;
    const textElement = this.roomButton.querySelector('.mp-room-text')!;
    
    if (inRoom) {
      this.roomButton.classList.add('active');
      textElement.textContent = 'Leave';
      this.roomButton.querySelector('i')!.className = 'iconoir-ev-plug-charging';
    } else {
      this.roomButton.classList.remove('active');
      textElement.textContent = 'Connect';
      this.roomButton.querySelector('i')!.className = 'iconoir-ev-plug';
      
      // Reset outros estados ao sair
      this.voiceEnabled = false;
      this.screenShareActive = false;
      this.voiceButton.classList.remove('active');
      this.screenShareButton.classList.remove('active');
    }
  }

  public setParticipantCount(count: number): void {
    const countElement = this.container.querySelector('.mp-count')!;
    countElement.textContent = count.toString();
  }

  public setVisible(visible: boolean): void {
    this.container.style.display = visible ? 'flex' : 'none';
  }

  // Setters de callbacks
  public setVoiceToggleCallback(callback: () => void): void {
    this.onVoiceToggle = callback;
  }

  public setScreenShareToggleCallback(callback: () => void): void {
    this.onScreenShareToggle = callback;
  }

  public setJoinRoomCallback(callback: () => void): void {
    this.onJoinRoom = callback;
  }

  public setLeaveRoomCallback(callback: () => void): void {
    this.onLeaveRoom = callback;
  }

  public dispose(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}
