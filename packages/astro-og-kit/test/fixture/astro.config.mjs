import mdx from '@astrojs/mdx'
import { defineConfig } from 'astro/config'

import ogkit from 'astro-og-kit/integration'

import { og } from './src/og.ts'

export default defineConfig({
  integrations: [mdx(), ogkit(og)],
  site: 'https://example.com',
})
