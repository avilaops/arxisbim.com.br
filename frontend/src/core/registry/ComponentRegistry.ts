/**
 * ComponentRegistry - Sistema de registro de componentes enterprise
 * Padrão usado por: Spring Framework, Angular DI, NestJS
 * 
 * Permite:
 * - Dependency Injection
 * - Lifecycle management
 * - Service locator pattern
 * - Plugin architecture
 * - Hot reload
 */

export type ComponentLifecycle = 'singleton' | 'transient' | 'scoped';

export interface ComponentMetadata {
  name: string;
  type: any;
  lifecycle: ComponentLifecycle;
  dependencies?: string[];
  factory?: (...args: any[]) => any;
  instance?: any;
  tags?: string[];
  version?: string;
  description?: string;
}

export interface ComponentDescriptor {
  name: string;
  lifecycle: ComponentLifecycle;
  dependencies?: string[];
  tags?: string[];
}

/**
 * Component Registry System
 */
export class ComponentRegistry {
  private static instance: ComponentRegistry;
  
  private components: Map<string, ComponentMetadata> = new Map();
  private instances: Map<string, any> = new Map();
  private scopes: Map<string, Map<string, any>> = new Map();
  
  private initializationOrder: string[] = [];
  private enableLogging: boolean = false;

  private constructor() {}

  public static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  /**
   * Registra componente
   */
  public register<T = any>(
    name: string,
    type: new (...args: any[]) => T,
    options: Partial<ComponentDescriptor> = {}
  ): void {
    const metadata: ComponentMetadata = {
      name,
      type,
      lifecycle: options.lifecycle || 'singleton',
      dependencies: options.dependencies || [],
      tags: options.tags || [],
      description: options.description
    };

    this.components.set(name, metadata);
    this.log(`Component registered: ${name}`, metadata);
  }

  /**
   * Registra factory function
   */
  public registerFactory<T = any>(
    name: string,
    factory: (...args: any[]) => T,
    options: Partial<ComponentDescriptor> = {}
  ): void {
    const metadata: ComponentMetadata = {
      name,
      type: Function,
      factory,
      lifecycle: options.lifecycle || 'singleton',
      dependencies: options.dependencies || [],
      tags: options.tags || []
    };

    this.components.set(name, metadata);
    this.log(`Factory registered: ${name}`, metadata);
  }

  /**
   * Registra instância existente
   */
  public registerInstance<T = any>(name: string, instance: T): void {
    const metadata: ComponentMetadata = {
      name,
      type: instance.constructor,
      lifecycle: 'singleton',
      instance
    };

    this.components.set(name, metadata);
    this.instances.set(name, instance);
    
    this.log(`Instance registered: ${name}`);
  }

  /**
   * Resolve componente (get instance)
   */
  public resolve<T = any>(name: string, scopeId?: string): T {
    const metadata = this.components.get(name);
    
    if (!metadata) {
      throw new Error(`Component not found: ${name}`);
    }

    // Singleton - retorna instância cached
    if (metadata.lifecycle === 'singleton') {
      if (!this.instances.has(name)) {
        const instance = this.createInstance(metadata);
        this.instances.set(name, instance);
        this.initializationOrder.push(name);
      }
      return this.instances.get(name) as T;
    }

    // Scoped - retorna instância do scope
    if (metadata.lifecycle === 'scoped' && scopeId) {
      if (!this.scopes.has(scopeId)) {
        this.scopes.set(scopeId, new Map());
      }
      
      const scope = this.scopes.get(scopeId)!;
      
      if (!scope.has(name)) {
        const instance = this.createInstance(metadata);
        scope.set(name, instance);
      }
      
      return scope.get(name) as T;
    }

    // Transient - sempre cria nova instância
    return this.createInstance(metadata) as T;
  }

  /**
   * Tenta resolver (não lança erro se não existir)
   */
  public tryResolve<T = any>(name: string, scopeId?: string): T | undefined {
    try {
      return this.resolve<T>(name, scopeId);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Cria instância resolvendo dependências
   */
  private createInstance(metadata: ComponentMetadata): any {
    // Se tem factory, usa ela
    if (metadata.factory) {
      const deps = this.resolveDependencies(metadata.dependencies || []);
      return metadata.factory(...deps);
    }

    // Se já tem instância, retorna
    if (metadata.instance) {
      return metadata.instance;
    }

    // Cria nova instância com dependências
    const deps = this.resolveDependencies(metadata.dependencies || []);
    return new metadata.type(...deps);
  }

  /**
   * Resolve array de dependências
   */
  private resolveDependencies(dependencies: string[]): any[] {
    return dependencies.map(dep => this.resolve(dep));
  }

  /**
   * Verifica se componente está registrado
   */
  public has(name: string): boolean {
    return this.components.has(name);
  }

  /**
   * Remove componente
   */
  public unregister(name: string): boolean {
    const existed = this.components.has(name);
    
    this.components.delete(name);
    this.instances.delete(name);
    
    // Remove de todos os scopes
    this.scopes.forEach(scope => scope.delete(name));
    
    this.log(`Component unregistered: ${name}`);
    
    return existed;
  }

  /**
   * Cria scope
   */
  public createScope(scopeId: string): void {
    if (!this.scopes.has(scopeId)) {
      this.scopes.set(scopeId, new Map());
      this.log(`Scope created: ${scopeId}`);
    }
  }

  /**
   * Destroi scope
   */
  public destroyScope(scopeId: string): void {
    const scope = this.scopes.get(scopeId);
    
    if (scope) {
      // Chama dispose em cada instância do scope (se tiver)
      scope.forEach((instance, name) => {
        if (instance && typeof instance.dispose === 'function') {
          instance.dispose();
          this.log(`Component disposed: ${name} (scope: ${scopeId})`);
        }
      });
      
      this.scopes.delete(scopeId);
      this.log(`Scope destroyed: ${scopeId}`);
    }
  }

  /**
   * Obtém todos os componentes registrados
   */
  public getAll(): ComponentMetadata[] {
    return Array.from(this.components.values());
  }

  /**
   * Obtém componentes por tag
   */
  public getByTag(tag: string): ComponentMetadata[] {
    return Array.from(this.components.values())
      .filter(c => c.tags?.includes(tag));
  }

  /**
   * Obtém metadata de componente
   */
  public getMetadata(name: string): ComponentMetadata | undefined {
    return this.components.get(name);
  }

  /**
   * Obtém ordem de inicialização
   */
  public getInitializationOrder(): string[] {
    return [...this.initializationOrder];
  }

  /**
   * Dispõe todos os singletons
   */
  public disposeAll(): void {
    this.instances.forEach((instance, name) => {
      if (instance && typeof instance.dispose === 'function') {
        instance.dispose();
        this.log(`Component disposed: ${name}`);
      }
    });
    
    this.instances.clear();
    this.initializationOrder = [];
    
    // Dispõe todos os scopes
    this.scopes.forEach((_, scopeId) => this.destroyScope(scopeId));
    
    this.log('All components disposed');
  }

  /**
   * Reset completo
   */
  public reset(): void {
    this.disposeAll();
    this.components.clear();
    this.scopes.clear();
    this.log('Registry reset');
  }

  /**
   * Habilita logging
   */
  public setLogging(enabled: boolean): void {
    this.enableLogging = enabled;
  }

  /**
   * Log
   */
  private log(message: string, data?: any): void {
    if (this.enableLogging) {
      console.log(`[ComponentRegistry] ${message}`, data || '');
    }
  }

  /**
   * Valida dependências (detecta ciclos)
   */
  public validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string, path: string[] = []): void => {
      if (visiting.has(name)) {
        errors.push(`Circular dependency detected: ${[...path, name].join(' -> ')}`);
        return;
      }

      if (visited.has(name)) {
        return;
      }

      visiting.add(name);
      const metadata = this.components.get(name);

      if (metadata?.dependencies) {
        metadata.dependencies.forEach(dep => {
          if (!this.components.has(dep)) {
            errors.push(`Missing dependency: ${name} -> ${dep}`);
          } else {
            visit(dep, [...path, name]);
          }
        });
      }

      visiting.delete(name);
      visited.add(name);
    };

    this.components.forEach((_, name) => visit(name));

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export para debug
   */
  public export(): string {
    return JSON.stringify({
      components: Array.from(this.components.entries()).map(([name, meta]) => ({
        name,
        lifecycle: meta.lifecycle,
        dependencies: meta.dependencies,
        tags: meta.tags,
        hasInstance: this.instances.has(name)
      })),
      initializationOrder: this.initializationOrder,
      scopes: Array.from(this.scopes.keys())
    }, null, 2);
  }
}

// Singleton instance
export const componentRegistry = ComponentRegistry.getInstance();

/**
 * Decorator para auto-registro de componentes (experimental)
 */
export function Component(options: Partial<ComponentDescriptor> = {}) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    const name = options.name || constructor.name;
    componentRegistry.register(name, constructor, options);
    return constructor;
  };
}

/**
 * Decorator para injeção de dependências (experimental)
 */
export function Inject(componentName: string) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get: () => componentRegistry.resolve(componentName),
      enumerable: true,
      configurable: true
    });
  };
}
