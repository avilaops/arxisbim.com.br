/**
 * Icon helpers using Iconoir
 * Apple-inspired icon library
 */

export type IconName = 
  | 'target'           // 🎯
  | 'eye'              // 👁️
  | 'eye-off'          // 🚫👁️
  | 'list'             // 📋
  | 'search'           // 🔍
  | 'ruler'            // 📏
  | 'cut'              // ✂️
  | 'trash'            // 🗑️
  | 'folder'           // 📁
  | 'settings'         // ⚙️
  | 'home'             // 🏠
  | 'grid'             // ⊞
  | 'arrow-up'         // ⬆️
  | 'arrow-down'       // ⬇️
  | 'arrow-left'       // ⬅️
  | 'arrow-right'      // ➡️
  | 'rotate'           // 🔄
  | 'camera'           // 📸
  | 'copy'             // 📎
  | 'mouse'            // 🖱️
  | 'keyboard'         // ⌨️
  | 'layers'           // 📚
  | 'cube'             // 📦
  | 'building'         // 🏗️
  | 'check'            // ✅
  | 'close'            // ✕
  | 'menu'             // ☰
  | 'play'             // ▶
  | 'pause'            // ⏸
  | 'compass'          // 🧭
  | 'graduation-cap'   // 🎓
  | 'open-book';       // 📖

/**
 * Get Iconoir icon class
 */
export function getIcon(name: IconName): string {
  // Mapeamento direto para classes Iconoir
  const iconMap: Record<IconName, string> = {
    'target': 'iconoir-focus',
    'eye': 'iconoir-eye',
    'eye-off': 'iconoir-eye-off',
    'list': 'iconoir-list',
    'search': 'iconoir-search',
    'ruler': 'iconoir-ruler',
    'cut': 'iconoir-cut',
    'trash': 'iconoir-trash',
    'folder': 'iconoir-folder',
    'settings': 'iconoir-settings',
    'home': 'iconoir-home',
    'grid': 'iconoir-grid',
    'arrow-up': 'iconoir-arrow-up',
    'arrow-down': 'iconoir-arrow-down',
    'arrow-left': 'iconoir-arrow-left',
    'arrow-right': 'iconoir-arrow-right',
    'rotate': 'iconoir-rotate-camera-right',
    'camera': 'iconoir-camera',
    'copy': 'iconoir-copy',
    'mouse': 'iconoir-mouse',
    'keyboard': 'iconoir-keyboard',
    'layers': 'iconoir-layers',
    'cube': 'iconoir-3d-cube',
    'building': 'iconoir-building',
    'check': 'iconoir-check',
    'close': 'iconoir-xmark',
    'menu': 'iconoir-menu',
    'play': 'iconoir-play',
    'pause': 'iconoir-pause',
    'compass': 'iconoir-compass',
    'graduation-cap': 'iconoir-graduation-cap',
    'open-book': 'iconoir-open-book'
  };

  return iconMap[name] || 'iconoir-circle';
}

/**
 * Create icon element
 */
export function createIcon(name: IconName, size: number = 20): HTMLElement {
  const icon = document.createElement('i');
  icon.className = getIcon(name);
  icon.style.fontSize = `${size}px`;
  return icon;
}

/**
 * Create icon HTML string
 */
export function iconHtml(name: IconName, size: number = 20): string {
  return `<i class="${getIcon(name)}" style="font-size: ${size}px;"></i>`;
}
