/**
 * ComponentRegistry - Registro central com lazy loading
 * Mapeia string → factory para modals e panels
 */

export type ComponentFactory = () => Promise<any>;
export type ComponentType = 'modal' | 'panel';

export interface ComponentMeta {
  type: ComponentType;
  factory: ComponentFactory;
  dock?: 'left' | 'right' | 'bottom'; // Para panels
}

class ComponentRegistryManager {
  private static instance: ComponentRegistryManager;
  private registry: Map<string, ComponentMeta> = new Map();
  private cache: Map<string, any> = new Map();
  
  private constructor() {}
  
  static getInstance(): ComponentRegistryManager {
    if (!ComponentRegistryManager.instance) {
      ComponentRegistryManager.instance = new ComponentRegistryManager();
    }
    return ComponentRegistryManager.instance;
  }
  
  register(name: string, meta: ComponentMeta): void {
    this.registry.set(name, meta);
  }
  
  registerModal(name: string, factory: ComponentFactory): void {
    this.register(name, { type: 'modal', factory });
  }
  
  registerPanel(name: string, factory: ComponentFactory, dock: 'left' | 'right' | 'bottom' = 'right'): void {
    this.register(name, { type: 'panel', factory, dock });
  }
  
  has(name: string): boolean {
    return this.registry.has(name);
  }
  
  getMeta(name: string): ComponentMeta | undefined {
    return this.registry.get(name);
  }
  
  async load(name: string): Promise<any> {
    // Check cache first
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }
    
    const meta = this.registry.get(name);
    if (!meta) {
      throw new Error(`Component "${name}" not registered`);
    }
    
    try {
      const component = await meta.factory();
      this.cache.set(name, component);
      return component;
    } catch (error) {
      console.error(`Failed to load component "${name}":`, error);
      throw error;
    }
  }
  
  clearCache(name?: string): void {
    if (name) {
      this.cache.delete(name);
    } else {
      this.cache.clear();
    }
  }
  
  getAll(): string[] {
    return Array.from(this.registry.keys());
  }
  
  getAllByType(type: ComponentType): string[] {
    return Array.from(this.registry.entries())
      .filter(([_, meta]) => meta.type === type)
      .map(([name]) => name);
  }
}

export const componentRegistry = ComponentRegistryManager.getInstance();
