import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-pnpm-'))
const write = (path, body) => {
  mkdirSync(dirname(join(dir, path)), { recursive: true })
  writeFileSync(join(dir, path), body)
}

try {
  write(
    'package.json',
    `${JSON.stringify({
      dependencies: {
        astro: '^7.4.0',
        'astro-og-kit': `file:${join(root, 'packages/astro-og-kit')}`,
        sharp: '^0.35.4',
      },
      name: 'og-kit-pnpm-fixture',
      private: true,
      type: 'module',
    })}\n`,
  )
  write('.npmrc', 'shamefully-hoist=false\n')
  write(
    'astro.config.mjs',
    `import { defineConfig } from 'astro/config'\nexport default defineConfig({ site: 'https://example.com' })\n`,
  )
  mkdirSync(join(dir, 'src/assets'), { recursive: true })
  cpSync(
    join(root, 'examples/editorial/src/assets/Inter-SemiBold.ttf'),
    join(dir, 'src/assets/Inter-SemiBold.ttf'),
  )
  write(
    'src/og.ts',
    `import { defineOg } from 'astro-og-kit'\nexport const og = defineOg({ cacheDir: false, font: { family: 'Inter', files: ['src/assets/Inter-SemiBold.ttf'] } })\n`,
  )
  write(
    'src/pages/index.astro',
    `---
import OgMeta from 'astro-og-kit/OgMeta.astro'
import { og } from '../og'
---
<html><head><OgMeta og={og} title="Home" /></head></html>
`,
  )
  write(
    'src/pages/og/[...slug].png.ts',
    `import { og } from '../../og'\nexport const prerender = true\nexport const { GET, getStaticPaths } = og.route([{ pathname: '/', title: 'Home' }])\n`,
  )

  const run = (args) => {
    const result = spawnSync('npx', ['--yes', 'pnpm@10', ...args], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (result.status !== 0) {
      throw new Error(`${args.join(' ')}\n${result.stdout}\n${result.stderr}`.trim())
    }
  }

  run(['install'])
  if (JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).dependencies['@resvg/resvg-js']) {
    throw new Error('fixture must not depend on @resvg/resvg-js')
  }
  if (existsSync(join(dir, 'node_modules/@resvg'))) {
    throw new Error('expected @resvg not to be hoisted to the site root')
  }

  run(['exec', 'astro', 'build'])
  const png = readFileSync(join(dir, 'dist/og/index.png'))
  const html = readFileSync(join(dir, 'dist/index.html'), 'utf8')
  if (!html.includes('og:url') || !html.includes('https://example.com/')) {
    throw new Error(`expected og:url in index.html\n${html}`)
  }
  const { default: sharp } = await import('sharp')
  if (!(await sharp(png).metadata()).isPalette) {
    throw new Error('expected paletted PNG from compress')
  }
  console.log(`pnpm fixture ok: ${png.length} bytes`)
} finally {
  rmSync(dir, { force: true, recursive: true })
}
