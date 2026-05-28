/**
 * AvatarConfig - Configuração de avatar customizável
 * Sistema modular e leve para BIM colaborativo
 */

export interface AvatarMorphs {
  height: number;        // 0.0 - 1.0 (baixo -> alto)
  weight: number;        // 0.0 - 1.0 (magro -> gordo)
  shoulderWidth: number; // 0.0 - 1.0 (estreito -> largo)
  headSize: number;      // 0.0 - 1.0 (pequeno -> grande)
}

export interface AvatarParts {
  hair: string;          // ID do modelo de cabelo
  shirt: string;         // ID do modelo de camisa
  pants: string;         // ID do modelo de calça
  shoes?: string;        // ID do modelo de sapato (opcional)
  helmet?: string;       // ID do capacete (BIM)
  vest?: string;         // ID do colete (BIM)
}

export interface AvatarColors {
  skin: string;          // Cor da pele (HEX)
  hair: string;          // Cor do cabelo (HEX)
  shirt: string;         // Cor da camisa (HEX)
  pants: string;         // Cor da calça (HEX)
  shoes?: string;        // Cor do sapato (HEX)
  vest?: string;         // Cor do colete (HEX)
}

export interface AvatarConfig {
  version: '1.0';
  userId: string;
  
  morphs: AvatarMorphs;
  parts: AvatarParts;
  colors: AvatarColors;
  
  // Metadata
  displayName: string;
  role?: 'engineer' | 'architect' | 'manager' | 'client' | 'worker';
  createdAt: string;
  updatedAt: string;
}

// Presets prontos
export const AVATAR_PRESET_DEFAULT: AvatarConfig = {
  version: '1.0',
  userId: 'default',
  morphs: {
    height: 0.5,
    weight: 0.5,
    shoulderWidth: 0.5,
    headSize: 0.5
  },
  parts: {
    hair: 'hair_short',
    shirt: 'shirt_casual',
    pants: 'pants_casual'
  },
  colors: {
    skin: '#FFDBAC',
    hair: '#2C1810',
    shirt: '#4A90E2',
    pants: '#2C3E50'
  },
  displayName: 'Usuário',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const AVATAR_PRESET_ENGINEER: AvatarConfig = {
  version: '1.0',
  userId: 'engineer',
  morphs: {
    height: 0.6,
    weight: 0.55,
    shoulderWidth: 0.6,
    headSize: 0.5
  },
  parts: {
    hair: 'hair_short',
    shirt: 'shirt_work',
    pants: 'pants_work',
    helmet: 'helmet_construction',
    vest: 'vest_safety'
  },
  colors: {
    skin: '#FFDBAC',
    hair: '#3A2C1E',
    shirt: '#FF6B00',
    pants: '#1A4D8C',
    vest: '#FFD700'
  },
  displayName: 'Engenheiro',
  role: 'engineer',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const AVATAR_PRESET_ARCHITECT: AvatarConfig = {
  version: '1.0',
  userId: 'architect',
  morphs: {
    height: 0.55,
    weight: 0.45,
    shoulderWidth: 0.5,
    headSize: 0.5
  },
  parts: {
    hair: 'hair_medium',
    shirt: 'shirt_formal',
    pants: 'pants_formal'
  },
  colors: {
    skin: '#FFDBAC',
    hair: '#5A3E2B',
    shirt: '#2C3E50',
    pants: '#34495E'
  },
  displayName: 'Arquiteto',
  role: 'architect',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const AVATAR_PRESET_MANAGER: AvatarConfig = {
  version: '1.0',
  userId: 'manager',
  morphs: {
    height: 0.58,
    weight: 0.52,
    shoulderWidth: 0.55,
    headSize: 0.52
  },
  parts: {
    hair: 'hair_short',
    shirt: 'shirt_formal',
    pants: 'pants_formal'
  },
  colors: {
    skin: '#FFDBAC',
    hair: '#4A4A4A',
    shirt: '#FFFFFF',
    pants: '#1A1A1A'
  },
  displayName: 'Gerente',
  role: 'manager',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Catalog de partes disponíveis
export interface AvatarPartMetadata {
  id: string;
  name: string;
  category: 'hair' | 'shirt' | 'pants' | 'shoes' | 'helmet' | 'vest';
  path: string;        // Caminho para o GLB
  thumbnail?: string;  // Preview (opcional)
  bim?: boolean;       // Se é específico para BIM
}

export const AVATAR_PARTS_CATALOG: AvatarPartMetadata[] = [
  // Hair
  { id: 'hair_short', name: 'Cabelo Curto', category: 'hair', path: '/avatars/hair/hair_short.glb' },
  { id: 'hair_medium', name: 'Cabelo Médio', category: 'hair', path: '/avatars/hair/hair_medium.glb' },
  { id: 'hair_long', name: 'Cabelo Longo', category: 'hair', path: '/avatars/hair/hair_long.glb' },
  { id: 'hair_bald', name: 'Careca', category: 'hair', path: '/avatars/hair/hair_bald.glb' },
  
  // Shirts
  { id: 'shirt_casual', name: 'Camisa Casual', category: 'shirt', path: '/avatars/shirts/shirt_casual.glb' },
  { id: 'shirt_formal', name: 'Camisa Social', category: 'shirt', path: '/avatars/shirts/shirt_formal.glb' },
  { id: 'shirt_work', name: 'Camisa de Trabalho', category: 'shirt', path: '/avatars/shirts/shirt_work.glb', bim: true },
  
  // Pants
  { id: 'pants_casual', name: 'Calça Casual', category: 'pants', path: '/avatars/pants/pants_casual.glb' },
  { id: 'pants_formal', name: 'Calça Social', category: 'pants', path: '/avatars/pants/pants_formal.glb' },
  { id: 'pants_work', name: 'Calça de Trabalho', category: 'pants', path: '/avatars/pants/pants_work.glb', bim: true },
  
  // BIM specific
  { id: 'helmet_construction', name: 'Capacete', category: 'helmet', path: '/avatars/safety/helmet.glb', bim: true },
  { id: 'vest_safety', name: 'Colete Refletivo', category: 'vest', path: '/avatars/safety/vest.glb', bim: true }
];
