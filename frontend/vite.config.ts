import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'

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
        name: 'Arxis — Plataforma BIM',
        short_name: 'Arxis',
        description: 'Visualize modelos BIM. Analise possibilidades. Decida com clareza.',
        theme_color: '#0E6B8F',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/dashboard',
        icons: [
          { src: '/images/brand/arxis-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/images/brand/arxis-icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            authToken: process.env.SENTRY_AUTH_TOKEN,
            org: 'avilaops',
            project: 'arxisvr',
            telemetry: false,
            release: {
              name: process.env.VITE_SENTRY_RELEASE,
            },
            sourcemaps: {
              filesToDeleteAfterUpload: ['./dist/**/*.map'],
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
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
    sourcemap: process.env.SENTRY_AUTH_TOKEN ? 'hidden' : false,
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // Sem `manualChunks`: as telas são carregadas sob demanda (App.tsx) e
        // o empacotador separa sozinho o que cada uma usa. As regras por pasta
        // que existiam aqui puxavam as dependências junto com o grupo, e o
        // esquema do web-ifc (3,5 MB) acabava no caminho da tela de login.
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
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
