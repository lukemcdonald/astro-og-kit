import { defineConfig } from 'astro/config'

import ogKit from 'astro-og-kit/integration'

import { og } from './src/og.ts'

export default defineConfig({
  base: '/docs',
  integrations: [ogKit(og)],
  site: 'https://example.com',
})
