import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    build: {
      minify: 'esbuild',
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            three: ['three', '@react-three/fiber', '@react-three/drei'],
            ui: ['framer-motion', 'lucide-react']
          }
        }
      }
    },
    // SECURITY: No API keys are bundled into frontend code
    // All AI calls go through authenticated backend endpoints
    preview: {
      allowedHosts: ['yokaizencampus.com', 'www.yokaizencampus.com', 'ai.yokaizencampus.com', '207.180.227.179'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
