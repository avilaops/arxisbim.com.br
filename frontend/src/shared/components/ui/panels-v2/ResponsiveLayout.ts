/**
 * Responsive Layout
 * Sistema de layout responsivo com breakpoints
 */

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface ResponsiveConfig {
  breakpoints?: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  onBreakpointChange?: (breakpoint: Breakpoint) => void;
}

export class ResponsiveLayout {
  private currentBreakpoint: Breakpoint = 'lg';
  private breakpoints = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400
  };
  private onBreakpointChange?: (breakpoint: Breakpoint) => void;
  private resizeObserver?: ResizeObserver;

  constructor(config?: ResponsiveConfig) {
    if (config?.breakpoints) {
      this.breakpoints = { ...this.breakpoints, ...config.breakpoints };
    }
    this.onBreakpointChange = config?.onBreakpointChange;

    this.init();
  }

  private init(): void {
    this.updateBreakpoint();
    this.attachListeners();
    this.injectStyles();
  }

  private attachListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Use ResizeObserver for more accurate detection
    this.resizeObserver = new ResizeObserver(() => {
      this.updateBreakpoint();
    });
    this.resizeObserver.observe(document.body);
  }

  private handleResize(): void {
    this.updateBreakpoint();
  }

  private updateBreakpoint(): void {
    const width = window.innerWidth;
    let newBreakpoint: Breakpoint = 'xs';

    if (width >= this.breakpoints.xxl) {
      newBreakpoint = 'xxl';
    } else if (width >= this.breakpoints.xl) {
      newBreakpoint = 'xl';
    } else if (width >= this.breakpoints.lg) {
      newBreakpoint = 'lg';
    } else if (width >= this.breakpoints.md) {
      newBreakpoint = 'md';
    } else if (width >= this.breakpoints.sm) {
      newBreakpoint = 'sm';
    }

    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint;
      this.updateBodyClass();
      this.onBreakpointChange?.(newBreakpoint);
    }
  }

  private updateBodyClass(): void {
    const body = document.body;
    
    // Remove all breakpoint classes
    ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'].forEach(bp => {
      body.classList.remove(`arxis-bp-${bp}`);
    });

    // Add current breakpoint class
    body.classList.add(`arxis-bp-${this.currentBreakpoint}`);

    // Add device type classes
    body.classList.toggle('arxis-mobile', this.isMobile());
    body.classList.toggle('arxis-tablet', this.isTablet());
    body.classList.toggle('arxis-desktop', this.isDesktop());
  }

  public getCurrentBreakpoint(): Breakpoint {
    return this.currentBreakpoint;
  }

  public isMobile(): boolean {
    return this.currentBreakpoint === 'xs' || this.currentBreakpoint === 'sm';
  }

  public isTablet(): boolean {
    return this.currentBreakpoint === 'md';
  }

  public isDesktop(): boolean {
    return this.currentBreakpoint === 'lg' || 
           this.currentBreakpoint === 'xl' || 
           this.currentBreakpoint === 'xxl';
  }

  public isAtLeast(breakpoint: Breakpoint): boolean {
    const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    const currentIndex = breakpointOrder.indexOf(this.currentBreakpoint);
    const targetIndex = breakpointOrder.indexOf(breakpoint);
    return currentIndex >= targetIndex;
  }

  public isAtMost(breakpoint: Breakpoint): boolean {
    const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    const currentIndex = breakpointOrder.indexOf(this.currentBreakpoint);
    const targetIndex = breakpointOrder.indexOf(breakpoint);
    return currentIndex <= targetIndex;
  }

  /**
   * Aplica classes responsivas a um elemento
   */
  public applyResponsiveClasses(
    element: HTMLElement, 
    classes: Partial<Record<Breakpoint, string>>
  ): void {
    // Remove all responsive classes
    Object.values(classes).forEach(className => {
      if (className) {
        className.split(' ').forEach(cls => element.classList.remove(cls));
      }
    });

    // Add class for current breakpoint
    const currentClass = classes[this.currentBreakpoint];
    if (currentClass) {
      currentClass.split(' ').forEach(cls => element.classList.add(cls));
    }
  }

  /**
   * Retorna valor responsivo baseado no breakpoint atual
   */
  public getResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>): T | undefined {
    const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    const currentIndex = breakpointOrder.indexOf(this.currentBreakpoint);

    // Try current and smaller breakpoints
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpointOrder[i];
      if (values[bp] !== undefined) {
        return values[bp];
      }
    }

    return undefined;
  }

  /**
   * Container responsivo que ajusta padding/margin
   */
  public createResponsiveContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'arxis-responsive-container';
    return container;
  }

  /**
   * Grid responsivo que ajusta colunas
   */
  public createResponsiveGrid(config?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
    gap?: string;
  }): HTMLDivElement {
    const grid = document.createElement('div');
    grid.className = 'arxis-responsive-grid';
    
    if (config) {
      const cols = this.getResponsiveValue({
        xs: config.xs,
        sm: config.sm,
        md: config.md,
        lg: config.lg,
        xl: config.xl,
        xxl: config.xxl
      }) || 1;

      grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      
      if (config.gap) {
        grid.style.gap = config.gap;
      }
    }

    return grid;
  }

  public destroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.resizeObserver?.disconnect();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-responsive-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-responsive-styles';
    style.textContent = `
      /* Responsive Container */
      .arxis-responsive-container {
        width: 100%;
        margin-left: auto;
        margin-right: auto;
        padding-left: 16px;
        padding-right: 16px;
      }

      .arxis-bp-sm .arxis-responsive-container {
        max-width: 540px;
      }

      .arxis-bp-md .arxis-responsive-container {
        max-width: 720px;
      }

      .arxis-bp-lg .arxis-responsive-container {
        max-width: 960px;
      }

      .arxis-bp-xl .arxis-responsive-container {
        max-width: 1140px;
      }

      .arxis-bp-xxl .arxis-responsive-container {
        max-width: 1320px;
      }

      /* Responsive Grid */
      .arxis-responsive-grid {
        display: grid;
        gap: 16px;
      }

      .arxis-bp-xs .arxis-responsive-grid {
        grid-template-columns: 1fr;
      }

      .arxis-bp-sm .arxis-responsive-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .arxis-bp-md .arxis-responsive-grid {
        grid-template-columns: repeat(3, 1fr);
      }

      .arxis-bp-lg .arxis-responsive-grid {
        grid-template-columns: repeat(4, 1fr);
      }

      /* Display utilities */
      .arxis-hide-mobile {
        display: none !important;
      }

      .arxis-bp-md .arxis-hide-mobile,
      .arxis-bp-lg .arxis-hide-mobile,
      .arxis-bp-xl .arxis-hide-mobile,
      .arxis-bp-xxl .arxis-hide-mobile {
        display: block !important;
      }

      .arxis-hide-desktop {
        display: block !important;
      }

      .arxis-bp-lg .arxis-hide-desktop,
      .arxis-bp-xl .arxis-hide-desktop,
      .arxis-bp-xxl .arxis-hide-desktop {
        display: none !important;
      }

      /* Touch-friendly sizing on mobile */
      .arxis-mobile button,
      .arxis-mobile .arxis-button {
        min-height: 44px;
        min-width: 44px;
      }

      .arxis-mobile input,
      .arxis-mobile select,
      .arxis-mobile textarea {
        min-height: 44px;
        font-size: 16px; /* Prevent zoom on iOS */
      }

      /* Stack panels on mobile */
      .arxis-mobile .arxis-panel-container {
        flex-direction: column !important;
      }

      .arxis-mobile .arxis-panel {
        width: 100% !important;
        max-width: 100% !important;
      }

      /* Responsive text */
      .arxis-text-responsive {
        font-size: 14px;
      }

      .arxis-bp-md .arxis-text-responsive {
        font-size: 15px;
      }

      .arxis-bp-lg .arxis-text-responsive {
        font-size: 16px;
      }

      /* Responsive spacing */
      .arxis-spacing-responsive {
        padding: 12px;
      }

      .arxis-bp-md .arxis-spacing-responsive {
        padding: 16px;
      }

      .arxis-bp-lg .arxis-spacing-responsive {
        padding: 20px;
      }

      .arxis-bp-xl .arxis-spacing-responsive {
        padding: 24px;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Singleton instance for global responsive layout
 */
let globalResponsiveLayout: ResponsiveLayout | null = null;

export function getResponsiveLayout(): ResponsiveLayout {
  if (!globalResponsiveLayout) {
    globalResponsiveLayout = new ResponsiveLayout();
  }
  return globalResponsiveLayout;
}

/**
 * Exemplo de uso:
 * 
 * const layout = new ResponsiveLayout({
 *   onBreakpointChange: (bp) => {
 *     console.log('Breakpoint changed to:', bp);
 *     // Reorganizar UI
 *   }
 * });
 * 
 * // Verificar dispositivo
 * if (layout.isMobile()) {
 *   // Show mobile UI
 * }
 * 
 * // Aplicar classes responsivas
 * layout.applyResponsiveClasses(panel, {
 *   xs: 'full-width',
 *   md: 'half-width',
 *   lg: 'third-width'
 * });
 * 
 * // Grid responsivo
 * const grid = layout.createResponsiveGrid({
 *   xs: 1,
 *   sm: 2,
 *   md: 3,
 *   lg: 4,
 *   gap: '16px'
 * });
 */
