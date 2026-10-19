import { defineOg } from 'astro-og-kit'
import { fileURLToPath } from 'node:url'

const font = fileURLToPath(
  new URL('../../../../../examples/split/src/assets/Inter-SemiBold.ttf', import.meta.url),
)

export const og = defineOg({
  font: { family: 'Inter', files: [font] },
  footer: 'example.com',
  output: { compress: false },
})
