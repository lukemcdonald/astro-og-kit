import { mkdir, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Resvg } from '@resvg/resvg-js'

import { defineOg, svg } from '../packages/astro-og-kit/dist/index.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const docs = join(root, 'docs')
const font = join(root, 'examples/editorial/src/assets/Inter-SemiBold.ttf')

const fontConfig = { family: 'Inter', files: [font], weight: 600 }
const theme = {
  accent: '#c6c6bd',
  background: '#122023',
  foreground: '#f4f3ec',
  muted: '#c6c6bd',
}

/** Same function as the README custom snippet. */
const card = ({ font, height, page, theme, width }) => svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${theme.background}" />
    <text x="96" y="360" font-family="${font.family}" font-size="80"
      fill="${theme.foreground}">${page.title}</text>
  </svg>`

async function writePhoto() {
  const art = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#3d6b76"/>
  <circle cx="640" cy="160" r="280" fill="#e8e4d4" fill-opacity="0.55"/>
  <circle cx="120" cy="680" r="320" fill="#8fbf9a" fill-opacity="0.5"/>
  <circle cx="430" cy="390" r="150" fill="#f4f3ec" fill-opacity="0.2"/>
  <path d="M0 520 L800 220 L800 800 L0 800 Z" fill="#2a5058" fill-opacity="0.35"/>
</svg>`
  const png = new Resvg(art, {
    fitTo: { mode: 'width', value: 800 },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng()
  const file = join(tmpdir(), 'astro-og-kit-readme-photo.png')
  await writeFile(file, png)

  return file
}

async function write(name, config, page) {
  const og = defineOg({
    cacheDir: false,
    ...config,
  })
  const file = join(docs, name)
  const png = await og.render(page)
  await writeFile(file, png)
  const { size } = await stat(file)
  console.log(`${name} ${size} bytes`)
}

await mkdir(docs, { recursive: true })
const photo = await writePhoto()

await write(
  'editorial.png',
  {
    font: fontConfig,
    mark: 'example.com',
    theme,
  },
  { image: photo, title: 'Hello, world' },
)
await write(
  'backdrop.png',
  {
    background: { src: photo },
    font: fontConfig,
    mark: 'example.com',
    template: 'backdrop',
    theme,
  },
  { title: 'Hello, world' },
)
await write(
  'custom.png',
  {
    font: fontConfig,
    template: card,
    theme,
  },
  { title: 'Hello, world' },
)
