import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { HEIGHT, WIDTH, defineOg } from '../src/index.ts'
import { pagePath } from '../src/page-path.ts'
import { createMeta, imagePath } from '../src/route.ts'

function tag(tags: ReturnType<ReturnType<typeof createMeta>>, key: string) {
  return tags.find((t) => ('property' in t && t.property === key) || ('name' in t && t.name === key))?.content
}

const font = fileURLToPath(
  new URL('../../../examples/editorial/src/assets/Inter-SemiBold.ttf', import.meta.url),
)

/** Astro's detector in packages/astro/src/core/routing/prerender.ts */
const ASTRO_PRERENDER = /^\s*export\s+const\s+prerender\s*=\s*(true|false);?/m

test('path and meta', () => {
  const og = defineOg({ font: { family: 'Inter', files: [font] } })
  assert.equal(og.path('/'), '/og/index.png')
  assert.equal(og.path('/about/team/'), '/og/about/team.png')
  const tags = og.meta({
    site: 'https://example.com',
    title: 'About',
    url: '/about/',
  })
  assert.equal(tag(tags, 'og:image'), 'https://example.com/og/about.png')
  assert.equal(tag(tags, 'og:url'), 'https://example.com/about/')
  assert.equal(WIDTH, 1200)
  assert.equal(HEIGHT, 630)
})

test('path and meta honor Astro base', () => {
  assert.equal(imagePath('/about/', '/og', '/docs'), '/docs/og/about.png')
  assert.equal(imagePath('/docs/about/', '/og', '/docs'), '/docs/og/about.png')
  assert.equal(imagePath('/docs/', '/og', '/docs'), '/docs/og/index.png')
  assert.equal(imagePath('/', '/og', '/docs'), '/docs/og/index.png')
  assert.equal(imagePath('/about/team/', '/og', '/docs/'), '/docs/og/about/team.png')
  assert.equal(imagePath('/about/', '/og', '/'), '/og/about.png')
  assert.equal(imagePath('/about.html', '/og', '/'), '/og/about.png')
  assert.equal(imagePath('/about/index.html', '/og', '/'), '/og/about.png')
  assert.equal(imagePath('/index.html', '/og', '/'), '/og/index.png')
  assert.equal(imagePath('/docs/about.html', '/og', '/docs'), '/docs/og/about.png')

  const og = defineOg({ font: { family: 'Inter', files: [font] } })
  assert.equal(og.path('/about/', '/docs'), '/docs/og/about.png')
  assert.equal(og.path('/docs/about/', '/docs'), '/docs/og/about.png')
  assert.equal(og.path('/', '/docs'), '/docs/og/index.png')

  const tags = createMeta((pathname, deployBase) => imagePath(pathname, '/og', deployBase ?? '/'))({
    deployBase: '/docs',
    site: 'https://origin',
    title: 'About',
    url: 'https://origin/docs/about/',
  })
  assert.ok(
    tags.some(
      (t) => 'property' in t && t.property === 'og:image' && t.content === 'https://origin/docs/og/about.png',
    ),
  )
  assert.ok(tags.some((t) => 'property' in t && t.property === 'og:image:width' && t.content === '1200'))
  assert.ok(tags.some((t) => 'property' in t && t.property === 'og:image:height' && t.content === '630'))
})

test('prefix / does not produce a protocol-relative URL', () => {
  assert.equal(imagePath('/', '/', '/'), '/index.png')
  assert.equal(imagePath('/about/', '/', '/'), '/about.png')
  assert.equal(imagePath('/about/', '/', '/docs'), '/docs/about.png')
  const og = defineOg({ font: { family: 'Inter', files: [font] }, prefix: '/' })
  assert.equal(og.path('/'), '/index.png')
  assert.equal(new URL(og.path('/'), 'https://origin').toString(), 'https://origin/index.png')
})

test('example route files match Astro prerender regex', () => {
  const files = [
    '../../../examples/backdrop/src/pages/og/[...slug].png.ts',
    '../../../examples/editorial/src/pages/og/[...slug].png.ts',
    '../../../examples/custom/src/pages/og/[...slug].png.ts',
  ]
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8')
    assert.match(source, ASTRO_PRERENDER)
  }
})

test('pagePath strips file output and honors trailingSlash', () => {
  assert.equal(pagePath('/index.html'), '/')
  assert.equal(pagePath('/about/x.html'), '/about/x')
  assert.equal(pagePath('/about/x.html', { trailingSlash: 'always' }), '/about/x/')
  assert.equal(pagePath('/about/x.html', { trailingSlash: 'never' }), '/about/x')
  assert.equal(pagePath('/about/x.html', { buildFormat: 'file', trailingSlash: 'ignore' }), '/about/x')
  assert.equal(pagePath('/about/x', { buildFormat: 'directory', trailingSlash: 'ignore' }), '/about/x/')
  assert.equal(pagePath('/about/x/', { trailingSlash: 'never' }), '/about/x')
  assert.equal(pagePath('/about/team/index.html', { trailingSlash: 'always' }), '/about/team/')
  assert.equal(pagePath('/about/team/index.html', { trailingSlash: 'never' }), '/about/team')
  assert.equal(pagePath('/docs/index.html', { trailingSlash: 'never' }), '/docs')
})

test('meta strips file URLs for og:url and og:image', () => {
  const meta = createMeta((pathname, deployBase) => imagePath(pathname, '/og', deployBase ?? '/'))

  const file = meta({
    site: 'https://example.com',
    title: 'About',
    url: 'https://example.com/about/x.html',
  })
  assert.equal(tag(file, 'og:url'), 'https://example.com/about/x')
  assert.equal(tag(file, 'og:image'), 'https://example.com/og/about/x.png')

  const home = meta({
    site: 'https://example.com',
    title: 'Home',
    url: 'https://example.com/index.html',
  })
  assert.equal(tag(home, 'og:url'), 'https://example.com/')
  assert.equal(tag(home, 'og:image'), 'https://example.com/og/index.png')

  const nested = meta({
    site: 'https://example.com',
    title: 'Team',
    url: 'https://example.com/about/team/index.html',
  })
  assert.equal(tag(nested, 'og:url'), 'https://example.com/about/team/')
  assert.equal(tag(nested, 'og:image'), 'https://example.com/og/about/team.png')
})

test('meta honors base paths and url override', () => {
  const meta = createMeta((pathname, deployBase) => imagePath(pathname, '/og', deployBase ?? '/'))

  const base = meta({
    deployBase: '/docs',
    site: 'https://origin',
    title: 'About',
    url: 'https://origin/docs/about.html',
  })
  assert.equal(tag(base, 'og:url'), 'https://origin/docs/about')
  assert.equal(tag(base, 'og:image'), 'https://origin/docs/og/about.png')

  const baseHome = meta({
    deployBase: '/docs',
    site: 'https://origin',
    title: 'Home',
    url: 'https://origin/docs/index.html',
  })
  assert.equal(tag(baseHome, 'og:url'), 'https://origin/docs/')
  assert.equal(tag(baseHome, 'og:image'), 'https://origin/docs/og/index.png')

  const override = meta({
    site: 'https://example.com',
    title: 'About',
    url: '/contact',
  })
  assert.equal(tag(override, 'og:url'), 'https://example.com/contact')
  assert.equal(tag(override, 'og:image'), 'https://example.com/og/contact.png')

  const absolute = meta({
    site: 'https://example.com',
    title: 'About',
    url: new URL('https://example.com/about/x.html'),
  })
  assert.equal(tag(absolute, 'og:url'), 'https://example.com/about/x')
  assert.equal(tag(absolute, 'og:image'), 'https://example.com/og/about/x.png')
})

test('route() lists paths and rejects GET without title', async () => {
  const og = defineOg({ cacheDir: false, font: { family: 'Inter', files: [font] } })
  const endpoint = og.route([{ pathname: '/about', title: 'About' }])
  assert.equal('prerender' in endpoint, false)

  const paths = await endpoint.getStaticPaths()
  assert.deepEqual(paths, [
    {
      params: { slug: 'about' },
      props: { pathname: '/about', title: 'About' },
    },
  ])

  await assert.rejects(() => endpoint.GET({ props: {} }), /export const prerender = true/)

  const response = await endpoint.GET({ props: { title: 'About' } })
  assert.equal(response.headers.get('Content-Type'), 'image/png')
  const png = Buffer.from(await response.arrayBuffer())
  assert.equal(png.readUInt32BE(0), 0x89504e47)
})
