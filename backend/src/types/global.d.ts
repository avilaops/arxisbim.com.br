/**
 * Global type definitions
 */

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly [key: string]: any;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// Add HeadersInit type if not available
type HeadersInit = string[][] | Record<string, string> | Headers;

export {};
