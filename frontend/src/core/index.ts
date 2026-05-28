/**
 * Core Layer - Barrel Export
 * Infraestrutura central do ArxisVR
 */

export * from './types';
export * from './EventBus';
export * from './AppState';
export * from './theme';
export * from './utils';
export * from './Logger';
export * from './ErrorBoundary';
export * from './errors';

// Enterprise Systems
export * from './monitoring/PerformanceMonitor';
export * from './features/FeatureFlags';
export * from './registry/ComponentRegistry';
export * from './analytics/Analytics';
