/**
 * Environment Variables Configuration
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_ENABLE_DEBUG: string;
  readonly VITE_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
