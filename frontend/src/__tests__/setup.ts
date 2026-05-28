/**
 * Vitest Setup File
 * Configuração global para todos os testes
 */

import { vi } from 'vitest';

// Mock do canvas para testes
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as any;
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
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

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: window.localStorage,
  });

  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: window.sessionStorage,
  });

  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: window.requestAnimationFrame?.bind(window) ?? ((callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 16)),
  });

  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    value: window.cancelAnimationFrame?.bind(window) ?? ((id: number) => clearTimeout(id)),
  });
}

// Mock básico do Three.js para testes
globalThis.THREE = {} as any;

// Setup adicional se necessário
beforeEach(() => {
  // Limpar mocks antes de cada teste
});

afterEach(() => {
  // Cleanup após cada teste
});
