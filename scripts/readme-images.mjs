import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { backdrop, defineOg, svg } from '../packages/astro-og-kit/dist/index.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const docs = join(root, 'docs')
const font = join(root, 'examples/editorial/src/assets/Inter-SemiBold.ttf')

const fontConfig = { family: 'Inter', files: [font], weight: 600 }
const page = { title: 'Hello, world' }
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

async function write(dir, name, config, input = page) {
  const og = defineOg({
    cacheDir: false,
    ...config,
  })
  const file = join(dir, name)
  const png = await og.render(input)
  await writeFile(file, png)
  const { size } = await stat(file)
  console.log(`${name} ${size} bytes`)
}

async function writeIn(cwd, dir, name, config, input) {
  const previous = process.cwd()
  process.chdir(cwd)
  try {
    await write(dir, name, config, input)
  } finally {
    process.chdir(previous)
  }
}

await mkdir(docs, { recursive: true })

await write(docs, 'editorial.png', {
  font: fontConfig,
  mark: 'example.com',
  theme,
})
await write(docs, 'backdrop.png', {
  font: fontConfig,
  mark: 'example.com',
  template: 'backdrop',
  theme,
})
await write(docs, 'custom.png', {
  font: fontConfig,
  template: card,
  theme,
})

await writeIn(
  join(root, 'examples/editorial'),
  join(root, 'examples/editorial'),
  'og.png',
  {
    font: { family: 'Inter', files: ['src/assets/Inter-SemiBold.ttf'], weight: 600 },
    logo: { src: 'public/logo.svg', width: 72 },
    mark: 'lukemcdonald.com',
    theme: { accent: '#c6c6bd', background: '#122023', foreground: '#f4f3ec', muted: '#c6c6bd' },
  },
  { image: 'src/assets/luke-mustachio.jpg', title: 'Luke McDonald' },
)
await writeIn(
  join(root, 'examples/backdrop'),
  join(root, 'examples/backdrop'),
  'og.png',
  {
    background: {
      crop: [0, 0, 600, 600],
      opacity: 0.72,
      overlay: '#26040c',
      position: 'left',
      src: 'src/assets/hero.jpg',
    },
    font: { family: 'Merriweather', files: ['src/assets/Merriweather-Bold.ttf'] },
    logo: { css: '.text-secondary-200 { fill: #e8ddc1 }', src: 'public/logo.svg', width: 192 },
    mark: 'Berean Bible Church',
    template: backdrop({ titleMaxWidth: 720 }),
    theme: { accent: '#ba9b47', background: '#4c0818', foreground: '#f9f9f8', muted: '#cfb97f' },
  },
  { mark: false, title: 'Berean Bible Church' },
)
await writeIn(
  join(root, 'examples/custom'),
  join(root, 'examples/custom'),
  'og.png',
  {
    font: { family: 'Inter', files: ['src/assets/Inter-SemiBold.ttf'], weight: 600 },
    template: card,
    theme: { background: '#122023', foreground: '#f4f3ec' },
  },
  page,
)
