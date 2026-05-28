/**
 * Language Selector
 * Seletor de idioma com suporte i18n
 */

import { Card } from '../design-system/components/Card';
import { Select } from '../design-system/components/Select';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export class LanguageSelector {
  private card: Card;
  private languages: Language[] = [];
  private currentLanguage: string = 'pt-BR';
  private onLanguageChange?: (languageCode: string) => void;

  constructor(options?: {
    onLanguageChange?: (languageCode: string) => void;
  }) {
    this.onLanguageChange = options?.onLanguageChange;
    
    this.card = new Card({
      title: '🌍 Idioma',
      variant: 'glass'
    });

    this.loadLanguages();
    this.render();
  }

  private loadLanguages(): void {
    this.languages = [
      { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', flag: '🇧🇷' },
      { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', flag: '🇺🇸' },
      { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧' },
      { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español (España)', flag: '🇪🇸' },
      { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)', flag: '🇲🇽' },
      { code: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
      { code: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
      { code: 'it-IT', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
      { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
      { code: 'ko-KR', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
      { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳' },
      { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼' },
      { code: 'ru-RU', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
      { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Current language display
    const current = document.createElement('div');
    current.className = 'arxis-lang__current';

    const currentLang = this.languages.find(l => l.code === this.currentLanguage);
    if (currentLang) {
      current.innerHTML = `
        <div class="arxis-lang__current-flag">${currentLang.flag}</div>
        <div class="arxis-lang__current-info">
          <div class="arxis-lang__current-native">${currentLang.nativeName}</div>
          <div class="arxis-lang__current-name">${currentLang.name}</div>
        </div>
      `;
    }
    body.appendChild(current);

    // Language list
    const list = document.createElement('div');
    list.className = 'arxis-lang__list';

    this.languages.forEach(language => {
      const item = this.createLanguageItem(language);
      list.appendChild(item);
    });

    body.appendChild(list);

    // Info
    const info = document.createElement('div');
    info.className = 'arxis-lang__info';
    info.innerHTML = `
      <div class="arxis-lang__info-icon">ℹ️</div>
      <div class="arxis-lang__info-text">
        A alteração do idioma será aplicada imediatamente e afetará toda a interface.
      </div>
    `;
    body.appendChild(info);

    this.injectStyles();
  }

  private createLanguageItem(language: Language): HTMLDivElement {
    const item = document.createElement('div');
    item.className = `arxis-lang__item ${language.code === this.currentLanguage ? 'arxis-lang__item--active' : ''}`;

    const flag = document.createElement('div');
    flag.className = 'arxis-lang__flag';
    flag.textContent = language.flag;
    item.appendChild(flag);

    const info = document.createElement('div');
    info.className = 'arxis-lang__item-info';

    const nativeName = document.createElement('div');
    nativeName.className = 'arxis-lang__native';
    nativeName.textContent = language.nativeName;

    const name = document.createElement('div');
    name.className = 'arxis-lang__name';
    name.textContent = language.name;

    info.appendChild(nativeName);
    info.appendChild(name);
    item.appendChild(info);

    if (language.code === this.currentLanguage) {
      const check = document.createElement('div');
      check.className = 'arxis-lang__check';
      check.textContent = '✓';
      item.appendChild(check);
    }

    item.addEventListener('click', () => this.selectLanguage(language.code));

    return item;
  }

  public selectLanguage(code: string): void {
    this.currentLanguage = code;
    this.onLanguageChange?.(code);
    this.render();
    console.log('Idioma alterado para:', code);
  }

  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-lang-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-lang-styles';
    style.textContent = `
      .arxis-lang__current {
        display: flex;
        gap: 16px;
        align-items: center;
        padding: 20px;
        background: rgba(0, 212, 255, 0.1);
        border-radius: 12px;
        margin-bottom: 20px;
      }

      .arxis-lang__current-flag {
        font-size: 48px;
        line-height: 1;
      }

      .arxis-lang__current-info {
        flex: 1;
      }

      .arxis-lang__current-native {
        font-size: 20px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 4px;
      }

      .arxis-lang__current-name {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-lang__list {
        max-height: 400px;
        overflow-y: auto;
        margin-bottom: 16px;
      }

      .arxis-lang__item {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 12px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s;
        border: 2px solid transparent;
      }

      .arxis-lang__item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(3px);
      }

      .arxis-lang__item--active {
        background: rgba(0, 212, 255, 0.15);
        border-color: #00d4ff;
      }

      .arxis-lang__flag {
        font-size: 32px;
        line-height: 1;
        width: 40px;
        text-align: center;
      }

      .arxis-lang__item-info {
        flex: 1;
        min-width: 0;
      }

      .arxis-lang__native {
        font-size: 15px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 2px;
      }

      .arxis-lang__name {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-lang__check {
        font-size: 20px;
        color: #00d4ff;
        font-weight: bold;
      }

      .arxis-lang__info {
        display: flex;
        gap: 12px;
        padding: 12px;
        background: rgba(255, 170, 0, 0.1);
        border-left: 3px solid #ffaa00;
        border-radius: 6px;
      }

      .arxis-lang__info-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      .arxis-lang__info-text {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.5;
      }
    `;
    document.head.appendChild(style);
  }
}
