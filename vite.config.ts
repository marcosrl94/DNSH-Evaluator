import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Base path para GitHub Pages (vacío para otros servicios)
    const base = process.env.GITHUB_PAGES === 'true' ? '/DNSH-Evaluator/' : '/';
    
    return {
      base,
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Optimize bundle size
        rollupOptions: {
          output: {
            manualChunks(id) {
              // Vendor chunks
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'react-vendor';
                }
                if (id.includes('leaflet')) {
                  return 'leaflet-vendor';
                }
                if (id.includes('lucide-react')) {
                  return 'lucide-vendor';
                }
                if (id.includes('jspdf') || id.includes('html2canvas')) {
                  return 'pdf-vendor';
                }
                if (id.includes('@google/generative-ai')) {
                  return 'gemini-vendor';
                }
                // Other node_modules
                return 'vendor';
              }
            },
          },
          external: (id) => {
            // Externalize socket.io-client to avoid build errors if not installed
            if (id === 'socket.io-client' || id.includes('socket.io-client')) {
              return true;
            }
            // Don't externalize @google/generative-ai - let it be bundled
            return false;
          }
        },
        // Increase chunk size warning limit
        chunkSizeWarningLimit: 1000,
        // Optimize for production (esbuild is faster than terser)
        minify: 'esbuild',
        commonjsOptions: {
          include: [/node_modules/],
          transformMixedEsModules: true,
        },
      },
      // Optimize dependencies
      optimizeDeps: {
        include: ['react', 'react-dom', 'leaflet', 'react-leaflet'],
        exclude: ['socket.io-client', '@google/generative-ai'], // Don't optimize optional dependency
      },
    };
});
