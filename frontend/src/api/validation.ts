/**
 * Schema Validation
 * Integrates Zod schema validation with API client
 * Ensures data contracts are respected
 */

import { ZodSchema, ZodError } from 'zod';
import { api, type ApiRequestOptions, type ApiError } from './client';

export interface ValidationOptions {
  schema?: ZodSchema<any>;
  requestSchema?: ZodSchema<any>;
  responseSchema?: ZodSchema<any>;
  strict?: boolean;
}

/**
 * Validate data against Zod schema
 */
export function validateSchema<T>(data: any, schema: ZodSchema<T>, strict: boolean = false): T {
  try {
    if (strict) {
      return schema.parse(data);
    }
    return schema.safeParse(data).data as T;
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError: ApiError = {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      };
      throw validationError;
    }
    throw error;
  }
}

/**
 * Extended API options with validation
 */
export interface ValidatedApiRequestOptions extends ApiRequestOptions {
  validation?: ValidationOptions;
}

/**
 * Validation middleware for API client
 */
export class ValidationMiddleware {
  /**
   * Validate request data before sending
   */
  static validateRequest(data: any, schema?: ZodSchema<any>): any {
    if (!schema) return data;
    return validateSchema(data, schema, true);
  }

  /**
   * Validate response data after receiving
   */
  static validateResponse(data: any, schema?: ZodSchema<any>): any {
    if (!schema) return data;
    return validateSchema(data, schema, false);
  }
}

/**
 * Extend API client with validation support
 */
class ValidatedApiClient {
  /**
   * GET request with schema validation
   */
  static async get<T>(
    url: string,
    params?: Record<string, any>,
    options?: ValidatedApiRequestOptions
  ): Promise<T> {
    // Validate request params if schema provided
    const validatedParams = options?.validation?.requestSchema
      ? ValidationMiddleware.validateRequest(params, options.validation.requestSchema)
      : params;

    const response = await api.get<T>(url, validatedParams, options);

    // Validate response if schema provided
    if (options?.validation?.responseSchema) {
      return ValidationMiddleware.validateResponse(response, options.validation.responseSchema);
    }

    return response;
  }

  /**
   * POST request with schema validation
   */
  static async post<T>(
    url: string,
    data?: any,
    options?: ValidatedApiRequestOptions
  ): Promise<T> {
    // Validate request data if schema provided
    const validatedData = options?.validation?.requestSchema
      ? ValidationMiddleware.validateRequest(data, options.validation.requestSchema)
      : data;

    const response = await api.post<T>(url, validatedData, options);

    // Validate response if schema provided
    if (options?.validation?.responseSchema) {
      return ValidationMiddleware.validateResponse(response, options.validation.responseSchema);
    }

    return response;
  }

  /**
   * PUT request with schema validation
   */
  static async put<T>(
    url: string,
    data?: any,
    options?: ValidatedApiRequestOptions
  ): Promise<T> {
    const validatedData = options?.validation?.requestSchema
      ? ValidationMiddleware.validateRequest(data, options.validation.requestSchema)
      : data;

    const response = await api.put<T>(url, validatedData, options);

    if (options?.validation?.responseSchema) {
      return ValidationMiddleware.validateResponse(response, options.validation.responseSchema);
    }

    return response;
  }

  /**
   * DELETE request with schema validation
   */
  static async delete<T>(
    url: string,
    options?: ValidatedApiRequestOptions
  ): Promise<T> {
    const response = await api.delete<T>(url, options);

    if (options?.validation?.responseSchema) {
      return ValidationMiddleware.validateResponse(response, options.validation.responseSchema);
    }

    return response;
  }

  /**
   * PATCH request with schema validation
   */
  static async patch<T>(
    url: string,
    data?: any,
    options?: ValidatedApiRequestOptions
  ): Promise<T> {
    const validatedData = options?.validation?.requestSchema
      ? ValidationMiddleware.validateRequest(data, options.validation.requestSchema)
      : data;

    const response = await api.patch<T>(url, validatedData, options);

    if (options?.validation?.responseSchema) {
      return ValidationMiddleware.validateResponse(response, options.validation.responseSchema);
    }

    return response;
  }
}

/**
 * Common schema definitions
 */
import { z } from 'zod';

export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.number().min(1).optional(),
    limit: z.number().min(1).max(100).optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
  }),

  // ID
  id: z.string().uuid(),

  // Timestamp
  timestamp: z.string().datetime(),

  // Error response
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
  }),

  // Success response
  success: z.object({
    success: z.boolean(),
    message: z.string().optional(),
  }),
};

/**
 * Schema registry for easy access
 */
class SchemaRegistry {
  private schemas: Map<string, ZodSchema<any>>;

  constructor() {
    this.schemas = new Map();
  }

  register(name: string, schema: ZodSchema<any>): void {
    this.schemas.set(name, schema);
  }

  get(name: string): ZodSchema<any> | undefined {
    return this.schemas.get(name);
  }

  has(name: string): boolean {
    return this.schemas.has(name);
  }
}

export const schemaRegistry = new SchemaRegistry();

// Register common schemas
schemaRegistry.register('pagination', commonSchemas.pagination);
schemaRegistry.register('id', commonSchemas.id);
schemaRegistry.register('timestamp', commonSchemas.timestamp);
schemaRegistry.register('error', commonSchemas.error);
schemaRegistry.register('success', commonSchemas.success);

export default ValidatedApiClient;
