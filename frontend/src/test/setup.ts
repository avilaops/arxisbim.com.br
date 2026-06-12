/**
 * Vitest setup file
 */

import { vi } from 'vitest';

// Habilita act(...) para testes de componente React (react-dom/client).
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nota: @testing-library/dom não exporta `cleanup` (isso é @testing-library/react,
// não instalado). Cada teste de componente faz seu próprio unmount.

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock IndexedDB
const indexedDBMock = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          add: vi.fn(),
          get: vi.fn(),
          put: vi.fn(),
          delete: vi.fn(),
        })),
      })),
    },
  })),
};
global.indexedDB = indexedDBMock as any;
