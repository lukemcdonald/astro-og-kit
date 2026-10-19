import { defineConfig } from 'astro/config'

import ogkit from 'astro-og-kit/integration'

import { og } from './src/og.ts'

export default defineConfig({
  base: '/docs',
  integrations: [ogkit(og)],
  site: 'https://example.com',
})
