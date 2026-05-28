/**
 * API Middleware
 * Provides middleware system for request/response processing
 * Supports logging, metrics, caching, and custom transformations
 */

import { api, type RequestConfig, type ApiResponse, type ApiError } from './client';

export interface MiddlewareContext {
  request: RequestConfig;
  response?: ApiResponse;
  error?: ApiError;
  metadata?: Record<string, any>;
}

export type MiddlewareFunction = (
  context: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;

class MiddlewareManager {
  private requestMiddlewares: MiddlewareFunction[];
  private responseMiddlewares: MiddlewareFunction[];
  private errorMiddlewares: MiddlewareFunction[];

  constructor() {
    this.requestMiddlewares = [];
    this.responseMiddlewares = [];
    this.errorMiddlewares = [];
  }

  /**
   * Add request middleware
   */
  useRequest(middleware: MiddlewareFunction): void {
    this.requestMiddlewares.push(middleware);
  }

  /**
   * Add response middleware
   */
  useResponse(middleware: MiddlewareFunction): void {
    this.responseMiddlewares.push(middleware);
  }

  /**
   * Add error middleware
   */
  useError(middleware: MiddlewareFunction): void {
    this.errorMiddlewares.push(middleware);
  }

  /**
   * Execute request middlewares
   */
  async executeRequest(context: MiddlewareContext): Promise<void> {
    let index = 0;

    const next = async () => {
      if (index < this.requestMiddlewares.length) {
        const middleware = this.requestMiddlewares[index++];
        await middleware(context, next);
      }
    };

    await next();
  }

  /**
   * Execute response middlewares
   */
  async executeResponse(context: MiddlewareContext): Promise<void> {
    let index = 0;

    const next = async () => {
      if (index < this.responseMiddlewares.length) {
        const middleware = this.responseMiddlewares[index++];
        await middleware(context, next);
      }
    };

    await next();
  }

  /**
   * Execute error middlewares
   */
  async executeError(context: MiddlewareContext): Promise<void> {
    let index = 0;

    const next = async () => {
      if (index < this.errorMiddlewares.length) {
        const middleware = this.errorMiddlewares[index++];
        await middleware(context, next);
      }
    };

    await next();
  }
}

// Create global middleware manager
export const middlewareManager = new MiddlewareManager();

/**
 * Logging Middleware
 * Logs all requests and responses
 */
export const loggingMiddleware: MiddlewareFunction = async (context, next) => {
  const startTime = Date.now();
  const { request } = context;

  console.log(`[API Request] ${request.method} ${request.url}`, {
    headers: request.headers,
    body: request.body,
  });

  await next();

  const duration = Date.now() - startTime;

  if (context.response) {
    console.log(`[API Response] ${request.method} ${request.url}`, {
      status: context.response.status,
      duration: `${duration}ms`,
    });
  }

  if (context.error) {
    console.error(`[API Error] ${request.method} ${request.url}`, {
      error: context.error,
      duration: `${duration}ms`,
    });
  }
};

/**
 * Metrics Middleware
 * Tracks API call metrics
 */
class MetricsCollector {
  private metrics: Map<string, { count: number; totalTime: number; errors: number }>;

  constructor() {
    this.metrics = new Map();
  }

  record(url: string, duration: number, error?: boolean): void {
    const key = url;
    const existing = this.metrics.get(key) || { count: 0, totalTime: 0, errors: 0 };

    this.metrics.set(key, {
      count: existing.count + 1,
      totalTime: existing.totalTime + duration,
      errors: existing.errors + (error ? 1 : 0),
    });
  }

  getMetrics(url?: string) {
    if (url) {
      return this.metrics.get(url);
    }
    return Object.fromEntries(this.metrics);
  }

  reset(): void {
    this.metrics.clear();
  }
}

export const metricsCollector = new MetricsCollector();

export const metricsMiddleware: MiddlewareFunction = async (context, next) => {
  const startTime = Date.now();
  const { request } = context;

  await next();

  const duration = Date.now() - startTime;
  const hasError = !!context.error;

  metricsCollector.record(request.url, duration, hasError);
};

/**
 * Request ID Middleware
 * Adds unique request ID for tracing
 */
export const requestIdMiddleware: MiddlewareFunction = async (context, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  context.metadata = {
    ...context.metadata,
    requestId,
  };

  context.request.headers = {
    ...context.request.headers,
    'X-Request-ID': requestId,
  };

  await next();
};

/**
 * Cache Middleware
 * Simple in-memory cache for GET requests
 */
class SimpleCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;

  constructor() {
    this.cache = new Map();
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cache = new SimpleCache();

export const cacheMiddleware: MiddlewareFunction = async (context, next) => {
  const { request } = context;

  // Only cache GET requests
  if (request.method !== 'GET') {
    await next();
    return;
  }

  const cacheKey = `${request.method}:${request.url}:${JSON.stringify(request.params)}`;
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    context.response = {
      data: cachedData,
      status: 200,
      statusText: 'OK (Cached)',
      headers: new Headers(),
    };
    return;
  }

  await next();

  // Cache successful responses
  if (context.response && context.response.status === 200) {
    cache.set(cacheKey, context.response.data, 60000); // 1 minute TTL
  }
};

/**
 * Register built-in middlewares
 */
export function registerBuiltInMiddlewares(): void {
  if (process.env.NODE_ENV === 'development') {
    middlewareManager.useRequest(loggingMiddleware);
  }

  middlewareManager.useRequest(requestIdMiddleware);
  middlewareManager.useRequest(metricsMiddleware);
  middlewareManager.useRequest(cacheMiddleware);
}

// Auto-register in development
if (process.env.NODE_ENV === 'development') {
  registerBuiltInMiddlewares();
}

export default MiddlewareManager;
