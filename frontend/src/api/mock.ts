/**
 * Mock API
 * Provides fake API responses for development and testing
 * Allows offline development and automated testing
 */

import { api, type ApiRequestOptions, type ApiResponse } from './client';

export interface MockResponse {
  data: any;
  delay?: number;
  status?: number;
}

export interface MockEndpoint {
  [key: string]: MockResponse | ((params?: any, data?: any) => MockResponse);
}

class MockAPI {
  private enabled: boolean = false;
  private endpoints: MockEndpoint;
  private defaultDelay: number = 500;

  constructor(initialEndpoints: MockEndpoint = {}) {
    this.endpoints = initialEndpoints;
  }

  /**
   * Enable mock mode
   */
  enable(): void {
    this.enabled = true;
    api.enableMock();
    console.log('Mock API enabled');
  }

  /**
   * Disable mock mode
   */
  disable(): void {
    this.enabled = false;
    api.disableMock();
    console.log('Mock API disabled');
  }

  /**
   * Check if mock is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set mock endpoints
   */
  setEndpoints(endpoints: MockEndpoint): void {
    this.endpoints = { ...this.endpoints, ...endpoints };
  }

  /**
   * Add a single mock endpoint
   */
  addEndpoint(url: string, response: MockResponse | ((params?: any, data?: any) => MockResponse)): void {
    this.endpoints[url] = response;
  }

  /**
   * Remove a mock endpoint
   */
  removeEndpoint(url: string): void {
    delete this.endpoints[url];
  }

  /**
   * Clear all mock endpoints
   */
  clearEndpoints(): void {
    this.endpoints = {};
  }

  /**
   * Get mock response for a URL
   */
  getResponse(url: string, params?: any, data?: any): MockResponse | null {
    const endpoint = this.endpoints[url];
    
    if (!endpoint) {
      return null;
    }

    if (typeof endpoint === 'function') {
      return endpoint(params, data);
    }

    return endpoint;
  }

  /**
   * Simulate API call with delay
   */
  async simulateCall<T>(
    url: string,
    response: MockResponse
  ): Promise<ApiResponse<T>> {
    const delay = response.delay ?? this.defaultDelay;
    
    await new Promise(resolve => setTimeout(resolve, delay));

    return {
      data: response.data,
      status: response.status ?? 200,
      statusText: 'OK',
      headers: new Headers(),
    };
  }

  /**
   * Set default delay for mock responses
   */
  setDefaultDelay(delay: number): void {
    this.defaultDelay = delay;
  }
}

// Create global mock API instance
export const mockAPI = new MockAPI();

/**
 * Predefined mock data for common endpoints
 */
export const mockData = {
  projects: [
    {
      id: '1',
      name: 'Sample Project',
      description: 'A sample BIM project',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
    },
    {
      id: '2',
      name: 'Another Project',
      description: 'Another BIM project',
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-02-15T00:00:00Z',
    },
  ],

  models: [
    {
      id: '1',
      projectId: '1',
      name: 'Building Model',
      type: 'IFC',
      size: 1024000,
      uploadedAt: '2024-01-10T00:00:00Z',
    },
  ],

  users: [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'user',
    },
  ],

  notifications: [
    {
      id: '1',
      type: 'info',
      title: 'System Update',
      message: 'System will be updated tonight at 10 PM',
      createdAt: '2024-01-20T00:00:00Z',
      read: false,
    },
  ],
};

/**
 * Setup default mock endpoints
 */
export function setupDefaultMocks(): void {
  mockAPI.setEndpoints({
    // Projects
    '/api/v1/projects': {
      data: mockData.projects,
      delay: 300,
    },
    '/api/v1/projects/:id': (params) => ({
      data: mockData.projects.find(p => p.id === params?.id) || null,
      delay: 200,
    }),

    // Models
    '/api/v1/models': {
      data: mockData.models,
      delay: 300,
    },
    '/api/v1/models/:id': (params) => ({
      data: mockData.models.find(m => m.id === params?.id) || null,
      delay: 200,
    }),

    // Users
    '/api/v1/users': {
      data: mockData.users,
      delay: 300,
    },
    '/api/v1/users/:id': (params) => ({
      data: mockData.users.find(u => u.id === params?.id) || null,
      delay: 200,
    }),

    // Notifications
    '/api/v1/notifications': {
      data: mockData.notifications,
      delay: 250,
    },

    // Auth
    '/api/v1/auth/login': (params, data) => ({
      data: {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        expiresAt: Date.now() + 3600000,
        user: mockData.users[0],
      },
      delay: 500,
    }),

    '/api/v1/auth/refresh': {
      data: {
        accessToken: 'mock_refreshed_access_token',
        refreshToken: 'mock_refresh_token',
        expiresAt: Date.now() + 3600000,
      },
      delay: 300,
    },

    // Upload
    '/api/v1/upload': (params, data) => ({
      data: {
        url: 'https://example.com/uploads/mock-file.ifc',
        filename: 'mock-file.ifc',
        size: 1024000,
      },
      delay: 1000,
    }),
  });
}

/**
 * Hook mock API into the main API client
 */
export function hookMockAPI(): void {
  const originalRequest = (api as any).request.bind(api);

  (api as any).request = async function(
    config: any,
    retries: number = 0
  ): Promise<ApiResponse> {
    if (!mockAPI.isEnabled()) {
      return originalRequest(config, retries);
    }

    const mockResponse = mockAPI.getResponse(config.url, config.params, config.body);

    if (mockResponse) {
      return mockAPI.simulateCall(config.url, mockResponse);
    }

    // Fall back to real API if no mock found
    return originalRequest(config, retries);
  };
}

// Auto-setup if mock mode is enabled by environment
const env = import.meta.env as any;
if (env.VITE_USE_MOCK_API === 'true') {
  setupDefaultMocks();
  mockAPI.enable();
  hookMockAPI();
}

export default MockAPI;
