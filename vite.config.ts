/// <reference types="vitest/config" />

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VERCEL === '1' ? '/' : '/finance-tracker/'

export default defineConfig({
  base,

  plugins: [
    react(),

    VitePWA({
      // A new version waits until the user taps "Обновить" in the banner
      // (src/pwa/registerServiceWorker.ts registers the worker itself).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],

      manifest: {
        name: 'Финансовый учёт',
        short_name: 'Финансы',
        description: 'Быстрый, приватный офлайн-трекер личных финансов.',
        // Light app background; the page's own <meta name="theme-color"> takes over
        // once it loads and follows the in-app theme.
        theme_color: '#f7f8fa',
        // Matches the startup screen / app background, so the installed-PWA
        // splash doesn't flash white before the app paints.
        background_color: '#f7f8fa',
        display: 'standalone',
        start_url: base,
        lang: 'ru',

        // PNGs for launchers that don't take SVG icons (older Android, some
        // desktop installs); the maskable one keeps the artwork in the safe zone.
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: `${base}icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: `${base}icons/icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
      },
    }),
  ],

  test: {
    environment: 'jsdom',
    globals: true,
  },
})
