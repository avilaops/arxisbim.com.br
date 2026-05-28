/**
 * Theme Events - Sistema de eventos para mudanças de tema
 */
export enum ThemeEventType {
  THEME_CHANGED = 'THEME_CHANGED',
  THEME_LOADED = 'THEME_LOADED',
  THEME_REGISTERED = 'THEME_REGISTERED',
  THEME_UNREGISTERED = 'THEME_UNREGISTERED',
  THEME_COLOR_CHANGED = 'THEME_COLOR_CHANGED',
  THEME_ERROR = 'THEME_ERROR'
}

export interface ThemeEventData {
  [ThemeEventType.THEME_CHANGED]: {
    themeId: string;
    themeName: string;
  };
  
  [ThemeEventType.THEME_LOADED]: {
    themeId: string;
  };
  
  [ThemeEventType.THEME_REGISTERED]: {
    themeId: string;
    themeName: string;
  };
  
  [ThemeEventType.THEME_UNREGISTERED]: {
    themeId: string;
  };
  
  [ThemeEventType.THEME_COLOR_CHANGED]: {
    colorKey: string;
    oldValue: string;
    newValue: string;
  };
  
  [ThemeEventType.THEME_ERROR]: {
    error: Error;
    context: string;
  };
}
