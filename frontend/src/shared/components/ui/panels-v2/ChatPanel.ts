/**
 * Chat Panel
 * Chat em tempo real para colaboração
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Input } from '../design-system/components/Input';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  avatar?: string;
  message: string;
  timestamp: number;
  type: 'text' | 'system' | 'file';
  fileUrl?: string;
  fileName?: string;
}

export interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
}

export class ChatPanel {
  private card: Card;
  private messages: ChatMessage[] = [];
  private currentUser: ChatUser;
  private onMessageSend?: (message: string) => void;
  private messagesContainer?: HTMLDivElement;
  private inputElement?: HTMLInputElement;

  constructor(options?: {
    currentUser?: ChatUser;
    onMessageSend?: (message: string) => void;
  }) {
    this.currentUser = options?.currentUser || {
      id: 'user-1',
      name: 'Você',
      status: 'online'
    };
    this.onMessageSend = options?.onMessageSend;
    
    this.card = new Card({
      title: '💬 Chat',
      variant: 'glass'
    });

    this.loadMockMessages();
    this.render();
  }

  private loadMockMessages(): void {
    const now = Date.now();
    this.messages = [
      {
        id: 'msg-1',
        userId: 'user-2',
        userName: 'João Silva',
        message: 'Olá! Alguém pode verificar a estrutura do pavimento 3?',
        timestamp: now - 300000,
        type: 'text'
      },
      {
        id: 'msg-2',
        userId: 'user-3',
        userName: 'Maria Santos',
        message: 'Eu verifico, pode deixar!',
        timestamp: now - 240000,
        type: 'text'
      },
      {
        id: 'msg-3',
        userId: 'system',
        userName: 'Sistema',
        message: 'João Silva marcou um ponto de atenção',
        timestamp: now - 180000,
        type: 'system'
      },
      {
        id: 'msg-4',
        userId: 'user-3',
        userName: 'Maria Santos',
        message: 'Encontrei um problema de interferência',
        timestamp: now - 120000,
        type: 'text'
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';
    body.style.cssText = 'display: flex; flex-direction: column; height: 500px; padding: 0;';

    // Messages container
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'arxis-chat__messages';
    this.renderMessages();
    body.appendChild(this.messagesContainer);

    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'arxis-chat__input-area';

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'arxis-chat__input-wrapper';

    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.className = 'arxis-chat__input';
    this.inputElement.placeholder = 'Digite uma mensagem...';
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.inputElement?.value.trim()) {
        this.sendMessage(this.inputElement.value);
      }
    });

    const sendBtn = new Button({ text: '📤', variant: 'primary', size: 'sm' });
    sendBtn.getElement().addEventListener('click', () => {
      if (this.inputElement?.value.trim()) {
        this.sendMessage(this.inputElement.value);
      }
    });

    const attachBtn = new Button({ text: '📎', variant: 'secondary', size: 'sm' });
    attachBtn.getElement().addEventListener('click', () => this.attachFile());

    inputWrapper.appendChild(this.inputElement);
    inputWrapper.appendChild(attachBtn.getElement());
    inputWrapper.appendChild(sendBtn.getElement());

    inputArea.appendChild(inputWrapper);
    body.appendChild(inputArea);

    this.injectStyles();
  }

  private renderMessages(): void {
    if (!this.messagesContainer) return;

    this.messagesContainer.innerHTML = '';

    this.messages.forEach(message => {
      const messageEl = this.createMessageElement(message);
      this.messagesContainer!.appendChild(messageEl);
    });

    // Auto scroll to bottom
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }
    }, 0);
  }

  private createMessageElement(message: ChatMessage): HTMLDivElement {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'arxis-chat__message';

    if (message.type === 'system') {
      messageDiv.classList.add('arxis-chat__message--system');
      messageDiv.innerHTML = `
        <div class="arxis-chat__system-text">${message.message}</div>
      `;
      return messageDiv;
    }

    const isOwn = message.userId === this.currentUser.id;
    if (isOwn) {
      messageDiv.classList.add('arxis-chat__message--own');
    }

    const avatar = document.createElement('div');
    avatar.className = 'arxis-chat__avatar';
    avatar.textContent = message.avatar || message.userName.charAt(0);

    const content = document.createElement('div');
    content.className = 'arxis-chat__content';

    const header = document.createElement('div');
    header.className = 'arxis-chat__header';

    const userName = document.createElement('span');
    userName.className = 'arxis-chat__username';
    userName.textContent = message.userName;

    const time = document.createElement('span');
    time.className = 'arxis-chat__time';
    time.textContent = this.formatTime(message.timestamp);

    header.appendChild(userName);
    header.appendChild(time);

    const messageText = document.createElement('div');
    messageText.className = 'arxis-chat__text';
    messageText.textContent = message.message;

    content.appendChild(header);
    content.appendChild(messageText);

    if (message.type === 'file' && message.fileName) {
      const file = document.createElement('div');
      file.className = 'arxis-chat__file';
      file.innerHTML = `📎 ${message.fileName}`;
      content.appendChild(file);
    }

    if (!isOwn) {
      messageDiv.appendChild(avatar);
    }
    messageDiv.appendChild(content);
    if (isOwn) {
      messageDiv.appendChild(avatar);
    }

    return messageDiv;
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  private sendMessage(text: string): void {
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      message: text,
      timestamp: Date.now(),
      type: 'text'
    };

    this.messages.push(message);
    this.renderMessages();

    if (this.inputElement) {
      this.inputElement.value = '';
    }

    this.onMessageSend?.(text);
  }

  private attachFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ifc,.rvt,.dwg,.pdf,.jpg,.png';
    input.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const message: ChatMessage = {
          id: `msg-${Date.now()}`,
          userId: this.currentUser.id,
          userName: this.currentUser.name,
          message: `Enviou um arquivo`,
          timestamp: Date.now(),
          type: 'file',
          fileName: file.name
        };
        this.messages.push(message);
        this.renderMessages();
      }
    });
    input.click();
  }

  public addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.renderMessages();
  }

  public getMessages(): ChatMessage[] {
    return this.messages;
  }

  public clearMessages(): void {
    this.messages = [];
    this.renderMessages();
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-chat-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-chat-styles';
    style.textContent = `
      .arxis-chat__messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .arxis-chat__message {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        animation: slideIn 0.2s;
      }

      .arxis-chat__message--own {
        flex-direction: row-reverse;
      }

      .arxis-chat__message--system {
        justify-content: center;
      }

      .arxis-chat__system-text {
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        text-align: center;
      }

      .arxis-chat__avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00d4ff, #7b2ff7);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        flex-shrink: 0;
      }

      .arxis-chat__content {
        max-width: 70%;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .arxis-chat__message--own .arxis-chat__content {
        align-items: flex-end;
      }

      .arxis-chat__header {
        display: flex;
        gap: 8px;
        align-items: center;
        font-size: 12px;
      }

      .arxis-chat__username {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 500;
      }

      .arxis-chat__time {
        color: rgba(255, 255, 255, 0.5);
      }

      .arxis-chat__text {
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        color: #fff;
        font-size: 14px;
        line-height: 1.4;
        word-wrap: break-word;
      }

      .arxis-chat__message--own .arxis-chat__text {
        background: rgba(0, 212, 255, 0.2);
      }

      .arxis-chat__file {
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-chat__file:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .arxis-chat__input-area {
        padding: 12px 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
      }

      .arxis-chat__input-wrapper {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .arxis-chat__input {
        flex: 1;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        color: #fff;
        font-size: 14px;
        outline: none;
        transition: all 0.2s;
      }

      .arxis-chat__input:focus {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(0, 212, 255, 0.5);
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}
