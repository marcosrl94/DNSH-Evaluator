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
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
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
                // Other node_modules
                return 'vendor';
              }
            },
          },
        },
        // Increase chunk size warning limit
        chunkSizeWarningLimit: 1000,
        // Optimize for production (esbuild is faster than terser)
        minify: 'esbuild',
      },
      // Optimize dependencies
      optimizeDeps: {
        include: ['react', 'react-dom', 'leaflet', 'react-leaflet'],
      },
    };
});
