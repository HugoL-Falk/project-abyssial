import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [
    react(),
    // PWA disabled in production builds (workbox-build ESM compat issue on Railway).
    // Re-enable once Node version is pinned or workbox updated.
    !isProd && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Project Abyssial',
        short_name: 'Abyssial',
        description: 'A cult management card game. Summon an Ancient One before the unravelling takes you.',
        theme_color: '#0d0b07',
        background_color: '#0d0b07',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/cards\/.*\.jpe?g$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'card-art-v1',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      }
    })
  ].filter(Boolean)
})
