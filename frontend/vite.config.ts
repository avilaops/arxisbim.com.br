import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  root: __dirname,
  publicDir: 'public',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ['**/*.{js,css,wasm,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(js|wasm)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'arxisvr-assets-v1',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /web-ifc.*\.(wasm|js)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'arxisvr-wasm-v1',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'arxisvr-fonts-v1',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(html)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'arxisvr-html-v1',
              expiration: { maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 3,
            },
          },
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: null,
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
        start_url: '/dashboard',
        icons: [
          { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      {
        find: 'react-router-dom',
        replacement: resolve(__dirname, 'src/shims/react-router-dom.ts'),
      },
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
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: (id) => {
          if (id.includes('web-ifc-three')) {
            return 'web-ifc'
          }
          if (id.includes('node_modules/three') && !id.includes('addons')) {
            return 'three-vendor'
          }
          if (id.includes('three/addons')) {
            return 'three-addons'
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules')) {
            return 'vendor'
          }
          if (id.includes('/viewer/')) {
            return 'viewer'
          }
          if (id.includes('/panels/')) {
            return 'panels'
          }
          if (id.includes('/features/bim-4d')) {
            return 'feature-bim-4d'
          }
          if (id.includes('/features/virtual-meetings')) {
            return 'feature-virtual-meetings'
          }
          if (id.includes('/features/')) {
            return 'features'
          }
          if (id.includes('/app/') && !id.includes('/app/entrypoints/')) {
            return 'app-core'
          }
          if (id.includes('/engine/')) {
            return 'engine'
          }
          if (id.includes('/commands/')) {
            return 'commands'
          }
          if (id.includes('/pages/')) {
            return 'pages'
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
})
