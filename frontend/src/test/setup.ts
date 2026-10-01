/**
 * Vitest setup file
 */

import { vi } from 'vitest';
// Matchers de DOM (`toBeInTheDocument`, `toHaveClass`, `toHaveAttribute`). O
// pacote estava no package.json desde sempre, mas ninguém o registrava: os
// testes de componente chamavam os matchers e o vitest respondia
// "Invalid Chai property".
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Habilita act(...) para testes de componente React (react-dom/client).
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Desmonta o que cada teste renderizou: sem isto, `screen.getByText` passa a
// achar o mesmo texto em árvores de testes anteriores.
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia — só em env com DOM (jsdom). Testes em env 'node'
// (ex.: roundtrip GLB via GLTFLoader) não têm `window` e devem pular isto.
if (typeof window !== 'undefined') {
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
}

// Mock localStorage
let store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = String(value); }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { store = {}; }),
  key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  get length() { return Object.keys(store).length; }
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
