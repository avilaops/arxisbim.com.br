/**
 * CollaborativeChat Component
 * Chat colaborativo em tempo real para usuários do viewer
 */

import { getRealtimeService, RealtimeMessage } from '../../services/RealtimeService';

export interface CollaborativeChatProps {
  container?: HTMLElement;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export class CollaborativeChat {
  private container: HTMLElement;
  private realtimeService: ReturnType<typeof getRealtimeService>;
  private chatElement: HTMLElement | null = null;
  private messagesElement: HTMLElement | null = null;
  private inputElement: HTMLInputElement | null = null;
  private isOpen: boolean = false;
  private position: string;

  constructor(props: CollaborativeChatProps = {}) {
    this.container = props.container || document.body;
    this.position = props.position || 'bottom-right';
    this.realtimeService = getRealtimeService();
    this.init();
  }

  private init(): void {
    // Conectar ao serviço realtime
    this.realtimeService.connect();

    // Criar UI do chat
    this.createChatUI();

    // Ouvir eventos
    this.realtimeService.onRealtimeEvent((event) => {
      this.handleRealtimeEvent(event);
    });
  }

  private createChatUI(): void {
    this.chatElement = document.createElement('div');
    this.chatElement.className = 'collaborative-chat';
    
    const positionStyles: Record<string, string> = {
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;',
    };

    this.chatElement.style.cssText = `
      position: fixed;
      ${positionStyles[this.position]}
      width: 320px;
      max-height: 400px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: transform 0.3s ease;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    `;
    header.innerHTML = `
      <span style="font-weight: bold;">Chat Colaborativo</span>
      <span class="toggle-icon">▼</span>
    `;
    header.addEventListener('click', () => this.toggle());

    // Messages container
    this.messagesElement = document.createElement('div');
    this.messagesElement.className = 'chat-messages';
    this.messagesElement.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    // Input area
    const inputArea = document.createElement('div');
    inputArea.style.cssText = `
      padding: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 8px;
    `;

    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.placeholder = 'Digite uma mensagem...';
    this.inputElement.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      outline: none;
    `;
    this.inputElement.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });

    const sendButton = document.createElement('button');
    sendButton.textContent = 'Enviar';
    sendButton.style.cssText = `
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: #4ECDC4;
      color: white;
      cursor: pointer;
      font-weight: bold;
    `;
    sendButton.addEventListener('click', () => this.sendMessage());

    inputArea.appendChild(this.inputElement);
    inputArea.appendChild(sendButton);

    this.chatElement.appendChild(header);
    this.chatElement.appendChild(this.messagesElement);
    this.chatElement.appendChild(inputArea);

    this.container.appendChild(this.chatElement);

    // Carregar mensagens existentes
    this.loadMessages();
  }

  private toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.chatElement) {
      const icon = this.chatElement.querySelector('.toggle-icon');
      if (icon) {
        icon.textContent = this.isOpen ? '▲' : '▼';
      }
      
      if (this.messagesElement) {
        this.messagesElement.style.display = this.isOpen ? 'flex' : 'none';
      }
      
      if (this.inputElement) {
        this.inputElement.parentElement!.style.display = this.isOpen ? 'flex' : 'none';
      }
    }
  }

  private loadMessages(): void {
    if (!this.messagesElement) {
      return;
    }

    const messages = this.realtimeService.getMessages();
    messages.forEach(message => this.addMessageToUI(message));
  }

  private addMessageToUI(message: RealtimeMessage): void {
    if (!this.messagesElement) {
      return;
    }

    const messageElement = document.createElement('div');
    messageElement.style.cssText = `
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      max-width: 80%;
      align-self: flex-start;
    `;

    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageElement.innerHTML = `
      <div style="font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-bottom: 4px;">
        ${message.userName} • ${time}
      </div>
      <div>${message.content}</div>
    `;

    this.messagesElement.appendChild(messageElement);
    this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
  }

  private sendMessage(): void {
    if (!this.inputElement) {
      return;
    }

    const content = this.inputElement.value.trim();
    if (!content) {
      return;
    }

    this.realtimeService.sendMessage(content);
    this.inputElement.value = '';
  }

  private handleRealtimeEvent(event: any): void {
    if (event.type === 'message') {
      this.addMessageToUI(event.data.message);
    }
  }

  open(): void {
    if (!this.isOpen) {
      this.toggle();
    }
  }

  close(): void {
    if (this.isOpen) {
      this.toggle();
    }
  }

  dispose(): void {
    if (this.chatElement) {
      this.chatElement.remove();
    }
    this.realtimeService.disconnect();
  }
}

export default CollaborativeChat;
