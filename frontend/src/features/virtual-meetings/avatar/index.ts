/**
 * Avatar System - Export all avatar modules
 */

export type { AvatarConfig, AvatarMorphs, AvatarParts, AvatarColors } from './AvatarConfig';
export { 
  AVATAR_PRESET_DEFAULT,
  AVATAR_PRESET_ENGINEER,
  AVATAR_PRESET_ARCHITECT,
  AVATAR_PRESET_MANAGER,
  AVATAR_PARTS_CATALOG
} from './AvatarConfig';
export { Avatar } from './Avatar';
export { AvatarLoader } from './AvatarLoader';
export { AvatarSystem } from './AvatarSystem';
export type { AvatarSystemConfig } from './AvatarSystem';
export { AvatarCustomizer } from './AvatarCustomizer';
