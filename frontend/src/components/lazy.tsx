import React, { Suspense, lazy, ComponentType } from 'react';

/**
 * Lazy Loading Utility for UI Components
 * Provides code-splitting and lazy loading for heavy components
 */

interface LazyComponentProps {
  fallback?: React.ReactNode;
}

/**
 * Higher-order component for lazy loading with custom fallback
 */
export function withLazy<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback: React.ReactNode = <div className="p-4 text-gray-500">Carregando...</div>
): ComponentType<P> {
  const LazyComponent = lazy(importFn);

  const ComponenteComSuspense = (props: P) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
  // Sem displayName o React DevTools e as stacks de erro mostram só
  // "Anonymous" para tudo que passar por este HOC.
  ComponenteComSuspense.displayName = 'withLazy(Componente)';

  return ComponenteComSuspense;
}

/**
 * Preload a lazy component
 * Useful for preloading components before they're needed
 */
export function preloadComponent(importFn: () => Promise<any>): void {
  importFn();
}

/**
 * Lazy load wrapper with loading spinner
 */
export function LazyWrapper({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode 
}) {
  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

/**
 * Predefined lazy-loaded components for heavy UI elements
 * These can be imported and used directly
 */

// Example: Lazy load a complex property panel
export const LazyPropertyPanel = withLazy(
  () => import('./examples/UIComponentsExample').then(m => ({ default: m.PropertyPanelExample })),
  <div className="p-4 border border-gray-200 rounded-lg">
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
  </div>
);

// Example: Lazy load a complex toolbar
export const LazyToolbar = withLazy(
  () => import('./examples/UIComponentsExample').then(m => ({ default: m.ToolbarExample })),
  <div className="h-12 bg-gray-100 animate-pulse" />
);

// Example: Lazy load a complex dialog
export const LazyDialog = withLazy(
  () => import('./examples/UIComponentsExample').then(m => ({ default: m.ConfirmDialogExample })),
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div className="bg-white rounded-lg p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>
  </div>
);

/**
 * Hook to preload components on hover or other events
 */
export function usePreloadOnHover() {
  const preload = React.useCallback((importFn: () => Promise<any>) => {
    return {
      onMouseEnter: () => preloadComponent(importFn),
    };
  }, []);

  return preload;
}

/**
 * Intersection Observer lazy loading for components
 * Loads component only when it enters viewport
 */
export function LazyOnViewport<P extends object>({
  importFn,
  children,
  threshold = 0.1,
  rootMargin = '100px',
}: {
  importFn: () => Promise<{ default: ComponentType<P> }>;
  children: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoaded) {
          setIsVisible(true);
          setIsLoaded(true);
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, isLoaded]);

  const LazyComponent = React.useMemo(() => {
    if (!isVisible) return null;
    return lazy(importFn);
  }, [isVisible, importFn]);

  return (
    <div ref={ref}>
      {isVisible ? (
        <Suspense fallback={children}>
          <LazyComponent />
        </Suspense>
      ) : (
        children
      )}
    </div>
  );
}

export default {
  withLazy,
  preloadComponent,
  LazyWrapper,
  LazyPropertyPanel,
  LazyToolbar,
  LazyDialog,
  usePreloadOnHover,
  LazyOnViewport,
};
