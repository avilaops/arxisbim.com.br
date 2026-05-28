/**
 * Background Presets for BIM Visualization
 * Fundos otimizados para visualização de estruturas
 */

export interface BackgroundPreset {
  id: string;
  name: string;
  description: string;
  type: 'gradient' | 'solid' | 'skybox';
  colors: {
    top: string;
    bottom: string;
  };
  fog?: {
    enabled: boolean;
    color: string;
    near: number;
    far: number;
  };
  grid?: {
    enabled: boolean;
    size: number;
    divisions: number;
    color: string;
    opacity: number;
  };
}

/**
 * Predefined background presets
 */
export const BACKGROUND_PRESETS: Record<string, BackgroundPreset> = {
  // Céu realista - melhor para apresentações
  SKY: {
    id: 'sky',
    name: 'Céu Realista',
    description: 'Gradiente azul-branco, ideal para apresentações',
    type: 'gradient',
    colors: {
      top: '#D0E8F2',    // Sky blue dessaturado
      bottom: '#F0F6FA'  // Quase branco
    },
    fog: {
      enabled: false,
      color: '#F0F6FA',
      near: 50,
      far: 500
    },
    grid: {
      enabled: true,
      size: 1000,
      divisions: 100,
      color: '#CCCCCC',  // Cinza médio
      opacity: 0.25  // Muito mais sutil
    }
  },

  // Horizonte suave - muito usado em BIM
  HORIZON: {
    id: 'horizon',
    name: 'Arquitetura clara',
    description: 'Ambiente claro e neutro para revisão BIM e apresentação corporativa',
    type: 'gradient',
    colors: {
      top: '#F8FAFC',    // Branco azulado corporativo
      bottom: '#EEF2F7'  // Cinza frio neutro
    },
    fog: {
      enabled: false,
      color: '#EEF2F7',
      near: 100,
      far: 600
    },
    grid: {
      enabled: true,
      size: 1000,
      divisions: 100,
      color: '#CBD5E1',  // Slate discreto
      opacity: 0.16  // Grid corporativo sutil
    }
  },

  // Neutro profissional - estilo Rhino
  NEUTRAL: {
    id: 'neutral',
    name: 'Neutro Profissional',
    description: 'Cinza uniforme, foco na geometria',
    type: 'gradient',
    colors: {
      top: '#F7F8FA',    // Cinza muito claro
      bottom: '#ECEFF3'  // Cinza claro frio
    },
    fog: {
      enabled: false,
      color: '#E8E8E8',
      near: 100,
      far: 1000
    },
    grid: {
      enabled: true,
      size: 200,
      divisions: 100,
      color: '#CBD5E1',
      opacity: 0.18
    }
  },

  // Branco minimalista - estilo SketchUp
  MINIMAL: {
    id: 'minimal',
    name: 'Branco Minimalista',
    description: 'Fundo branco limpo, máxima claridade',
    type: 'gradient',
    colors: {
      top: '#FFFFFF',
      bottom: '#F8F8F8'
    },
    fog: {
      enabled: true,
      color: '#FFFFFF',
      near: 200,
      far: 800
    },
    grid: {
      enabled: true,
      size: 200,
      divisions: 100,
      color: '#DDDDDD',
      opacity: 0.25
    }
  },

  // Estúdio - sem distrações
  STUDIO: {
    id: 'studio',
    name: 'Estúdio',
    description: 'Gradiente suave neutro, sem grid',
    type: 'gradient',
    colors: {
      top: '#F8FAFC',
      bottom: '#E2E8F0'
    },
    fog: {
      enabled: true,
      color: '#E2E8F0',
      near: 150,
      far: 700
    },
    grid: {
      enabled: false,
      size: 200,
      divisions: 100,
      color: '#000000',
      opacity: 0
    }
  },

  // Amanhecer - para renders bonitos
  DAWN: {
    id: 'dawn',
    name: 'Amanhecer',
    description: 'Tons quentes, ideal para renders',
    type: 'gradient',
    colors: {
      top: '#FFB88C',    // Laranja suave
      bottom: '#FFF5E6'  // Creme
    },
    fog: {
      enabled: true,
      color: '#FFF5E6',
      near: 80,
      far: 500
    },
    grid: {
      enabled: true,
      size: 200,
      divisions: 100,
      color: '#DDB892',
      opacity: 0.25
    }
  },

  // Escuro - para contraste
  DARK: {
    id: 'dark',
    name: 'Escuro',
    description: 'Fundo escuro, alto contraste',
    type: 'gradient',
    colors: {
      top: '#2A2A2A',
      bottom: '#1A1A1A'
    },
    fog: {
      enabled: true,
      color: '#1A1A1A',
      near: 100,
      far: 600
    },
    grid: {
      enabled: true,
      size: 200,
      divisions: 100,
      color: '#444444',
      opacity: 0.35
    }
  }
};

/**
 * Get preset by ID
 */
export function getBackgroundPreset(id: string): BackgroundPreset | undefined {
  return BACKGROUND_PRESETS[id.toUpperCase()];
}

/**
 * Get all preset IDs
 */
export function getBackgroundPresetIds(): string[] {
  return Object.keys(BACKGROUND_PRESETS);
}

/**
 * Get all presets
 */
export function getAllBackgroundPresets(): BackgroundPreset[] {
  return Object.values(BACKGROUND_PRESETS);
}
