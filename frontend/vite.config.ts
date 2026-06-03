import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: __dirname,
  publicDir: 'public',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Gerar SW apenas no build de produção (não interfere no dev)
      devOptions: { enabled: false },
      workbox: {
        // Cache máximo de 7 dias para assets estáticos
        // Chunks com hash no nome = imutáveis = cache forever
        globPatterns: ['**/*.{js,css,wasm,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // ── Chunks JS/WASM — cache-first (hash garante imutabilidade) ───────
          {
            urlPattern: /\/assets\/.*\.(js|wasm)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'arxisvr-assets-v1',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 dias
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── web-ifc WASM — separado, maior TTL ──────────────────────────────
          {
            urlPattern: /web-ifc.*\.(wasm|js)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'arxisvr-wasm-v1',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 60 }, // 60 dias
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── Fontes externas ──────────────────────────────────────────────────
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'arxisvr-fonts-v1',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── HTML — network-first (sempre pega versão mais nova) ─────────────
          {
            urlPattern: /\.(html)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'arxisvr-html-v1',
              expiration: { maxAgeSeconds: 60 * 60 }, // 1 hora fallback
              networkTimeoutSeconds: 3,
            },
          },
        ],
        // Não pré-cachear o web-ifc WASM no install (muito grande — lazy ok)
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB limite por arquivo
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'ArxisVR — Plataforma BIM',
        short_name: 'ArxisVR',
        description: 'BIM com Copilot de IA e Realidade Estendida no navegador',
        theme_color: '#0D1117',
        background_color: '#0D1117',
        display: 'standalone',
        start_url: '/app.html',
        icons: [
          { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  resolve: {
    // Array form para permitir alias por regex (o shim do BufferGeometryUtils).
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      // web-ifc-three importa `mergeGeometries` do three 0.149, que não tem
      // esse export. Redireciona só o specifier `three/examples/jsm/...`
      // para o shim (o shim importa via `three/addons/...`, sem loop).
      {
        find: /^three\/examples\/jsm\/utils\/BufferGeometryUtils(\.js)?$/,
        replacement: resolve(__dirname, 'src/shims/three-BufferGeometryUtils.js'),
      },
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 3000,
    minify: 'esbuild',
    target: 'esnext',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        verifyEmail: resolve(__dirname, 'verify-email.html'),
        forgotPassword: resolve(__dirname, 'forgot-password.html'),
        resetPassword: resolve(__dirname, 'reset-password.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        arCalibration: resolve(__dirname, 'ar-calibration.html'),
      },
      output: {
        manualChunks: (id) => {
          // Separate web-ifc-three into its own chunk (lazy loaded)
          if (id.includes('web-ifc-three')) {
            return 'web-ifc';
          }
          // Three.js core
          if (id.includes('node_modules/three') && !id.includes('addons')) {
            return 'three-vendor';
          }
          // Three.js addons (loaders, controls, etc.)
          if (id.includes('three/addons')) {
            return 'three-addons';
          }
          // React and React DOM
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          // Viewer components
          if (id.includes('/viewer/')) {
            return 'viewer';
          }
          // Panel components
          if (id.includes('/panels/')) {
            return 'panels';
          }
          // Feature modules (lazy loaded individually)
          if (id.includes('/features/bim-4d')) {
            return 'feature-bim-4d';
          }
          if (id.includes('/features/virtual-meetings')) {
            return 'feature-virtual-meetings';
          }
          if (id.includes('/features/')) {
            return 'features';
          }
          // Core app modules (exclude entrypoints — they have top-level createRoot calls
          // and must stay in their own per-page chunks, not shared across all pages)
          if (id.includes('/app/') && !id.includes('/app/entrypoints/')) {
            return 'app-core';
          }
          // Engine modules
          if (id.includes('/engine/')) {
            return 'engine';
          }
          // Commands
          if (id.includes('/commands/')) {
            return 'commands';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    reportCompressedSize: false,
  },
  server: {
    port: 5173,
    host: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

