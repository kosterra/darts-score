import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { existsSync, readFileSync } from 'fs'

// The app's version lives in the repository's root package.json
// (in the dev container it is mounted elsewhere, see ROOT_PACKAGE in docker-compose.dev.yml)
const rootPackage = process.env.ROOT_PACKAGE ?? path.resolve(import.meta.dirname, '../package.json')
const appVersion = process.env.APP_VERSION
  ?? (existsSync(rootPackage) ? JSON.parse(readFileSync(rootPackage, 'utf8')).version : 'dev')

// The version is built into the app when the dev server starts, so a new
// version in the root package.json restarts the dev server to show it.
const restartOnVersionChange = () => ({
  name: 'restart-on-version-change',
  apply: 'serve' as const,
  configureServer(server) {
    if (!existsSync(rootPackage)) return
    server.watcher.add(rootPackage)
    server.watcher.on('change', (file) => {
      if (path.resolve(file) === rootPackage) server.restart()
    })
  },
})

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), restartOnVersionChange()],
  define: {
    // read as import.meta.env.VITE_APP_VERSION
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['import', 'global-builtin', 'if-function', 'color-functions'],
        loadPaths: [path.resolve(import.meta.dirname, 'node_modules')],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/primereact') || id.includes('node_modules/primeicons')) {
            return 'vendor-primereact';
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
