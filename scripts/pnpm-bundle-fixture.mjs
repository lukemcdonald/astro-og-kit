import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const kit = join(root, 'packages/astro-og-kit')
const font = join(root, 'examples/editorial/src/assets/Inter-SemiBold.ttf')
const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-pnpm-'))

function run(cmd, args, cwd = dir) {
  const result = spawnSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim())
  }

  return result.stdout
}

try {
  writeFileSync(
    join(dir, 'package.json'),
    `${JSON.stringify(
      {
        dependencies: {
          astro: '^7.4.0',
          'astro-og-kit': `file:${kit}`,
          sharp: '^0.35.4',
        },
        name: 'og-kit-pnpm-fixture',
        private: true,
        scripts: { build: 'astro build' },
        type: 'module',
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(join(dir, '.npmrc'), 'shamefully-hoist=false\n')
  writeFileSync(
    join(dir, 'astro.config.mjs'),
    `import { defineConfig } from 'astro/config'\n\nexport default defineConfig({ site: 'https://example.com' })\n`,
  )
  mkdirSync(join(dir, 'src/assets'), { recursive: true })
  mkdirSync(join(dir, 'src/pages/og'), { recursive: true })
  cpSync(font, join(dir, 'src/assets/Inter-SemiBold.ttf'))
  writeFileSync(
    join(dir, 'src/og.ts'),
    `import { defineOg } from 'astro-og-kit'\n
export const og = defineOg({
  cacheDir: false,
  font: { family: 'Inter', files: ['src/assets/Inter-SemiBold.ttf'] },
})\n`,
  )
  writeFileSync(
    join(dir, 'src/pages/index.astro'),
    `---
import OgMeta from 'astro-og-kit/OgMeta.astro'
import { og } from '../og'
---
<html>
  <head>
    <OgMeta og={og} title="Home" />
  </head>
  <body>
    <h1>Home</h1>
  </body>
</html>
`,
  )
  writeFileSync(
    join(dir, 'src/pages/og/[...slug].png.ts'),
    `import { og } from '../../og'\n
export const prerender = true
export const { GET, getStaticPaths } = og.route([{ pathname: '/', title: 'Home' }])
`,
  )

  run('npx', ['--yes', 'pnpm@10', 'install'])
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  if (pkg.dependencies['@resvg/resvg-js']) {
    throw new Error('fixture must not depend on @resvg/resvg-js')
  }
  if (existsSync(join(dir, 'node_modules/@resvg'))) {
    throw new Error('expected @resvg not to be hoisted to the site root')
  }

  run('npx', ['--yes', 'pnpm@10', 'build'])
  const pngPath = join(dir, 'dist/og/index.png')
  if (!existsSync(pngPath)) {
    throw new Error(`missing ${pngPath}`)
  }
  const png = readFileSync(pngPath)
  if (png.readUInt32BE(0) !== 0x89504e47) {
    throw new Error('og image is not a PNG')
  }

  const html = readFileSync(join(dir, 'dist/index.html'), 'utf8')
  if (!html.includes('og:url') || !html.includes('https://example.com/')) {
    throw new Error(`expected og:url in index.html\n${html}`)
  }

  const { default: sharp } = await import('sharp')
  const meta = await sharp(png).metadata()
  if (!meta.isPalette) {
    throw new Error(`expected paletted PNG from compress, got ${JSON.stringify(meta)}`)
  }

  console.log(`pnpm fixture ok: ${png.length} bytes, palette ${meta.isPalette}`)
} finally {
  rmSync(dir, { force: true, recursive: true })
}
