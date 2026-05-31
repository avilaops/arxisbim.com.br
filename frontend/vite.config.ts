import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: __dirname,
  publicDir: 'public',
  plugins: [react()],
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
          // Core app modules
          if (id.includes('/app/')) {
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

