import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from 'vite-plugin-pwa'; // ← أضف هذا السطر

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      cloudflare(),
      VitePWA({              // ← أضف هذه الكتلة
        registerType: 'autoUpdate',
        manifest: {
          name: 'متجر المنتجات',
          short_name: 'المتجر',
          theme_color: '#4f46e5',
          display: 'standalone',
          lang: 'ar',
          dir: 'rtl',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        }
      })
    ],
    define: {                // ← موجود كما كان
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
