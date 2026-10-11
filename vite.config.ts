import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// Served at /Metaphysics-/ on the old GitHub Pages site; the Cloudflare Pages build sets BASE_PATH=/ (docs/SCRUB_PLAN.md).
const raw = process.env.BASE_PATH?.trim() || '/Metaphysics-/';
const base = `/${raw.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');

export default defineConfig({
  base,
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['fonts/*.woff2', 'icons/*.png', 'ephe/*.se1'],
      manifest: {
        name: 'Metaphysics',
        short_name: 'Metaphysics',
        description: 'Personal calculation, interpretation and outcome ledger.',
        theme_color: '#131E27',
        background_color: '#131E27',
        display: 'standalone',
        scope: base,
        start_url: base,
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,png,svg,se1,json,woff2,tsv}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});
