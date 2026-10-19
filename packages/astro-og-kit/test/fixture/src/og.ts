import { defineOg } from 'astro-og-kit'
import { fileURLToPath } from 'node:url'

const font = fileURLToPath(
  new URL('../../../../../examples/editorial/src/assets/Inter-SemiBold.ttf', import.meta.url),
)

export const og = defineOg({
  compress: false,
  font: { family: 'Inter', files: [font] },
  footer: 'example.com',
})
