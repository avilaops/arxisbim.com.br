/**
 * Theme System - Barrel Export
 * Sistema completo de temas do ArxisVR
 */

export * from './Theme';
export * from './ThemeManager';
export * from './ThemeSelector';
export * from './ColorPicker';
export * from './events/ThemeEvents';

// Advanced components
export * from './AdvancedColorPicker';
export * from './AdvancedThemeSelector';

// Default theme imports
import defaultTheme from './themes/default.json';
import darkTheme from './themes/dark.json';
import highContrastTheme from './themes/highContrast.json';
import oceanTheme from './themes/ocean.json';
import forestTheme from './themes/forest.json';
import sunsetTheme from './themes/sunset.json';

export const defaultThemes = {
  default: defaultTheme,
  dark: darkTheme,
  highContrast: highContrastTheme,
  ocean: oceanTheme,
  forest: forestTheme,
  sunset: sunsetTheme
};
