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
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],

      manifest: {
        name: 'Финансовый учёт',
        short_name: 'Финансы',
        description: 'Быстрый, приватный офлайн-трекер личных финансов.',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: base,
        lang: 'ru',

        icons: [
          {
            src: `${base}icons/icon.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: `${base}icons/icon.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
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
