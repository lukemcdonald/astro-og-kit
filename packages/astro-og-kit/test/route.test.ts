import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { defineOg } from '../src/index.ts'
import { createMeta, imagePath } from '../src/route.ts'

const font = fileURLToPath(
  new URL('../../../examples/editorial/src/assets/Inter-SemiBold.ttf', import.meta.url),
)

test('path and meta', () => {
  const og = defineOg({ font: { family: 'Inter', files: [font] } })
  assert.equal(og.path('/'), '/og/index.png')
  assert.equal(og.path('/about/team/'), '/og/about/team.png')
  const tags = og.meta({
    site: 'https://example.com',
    title: 'About',
    url: '/about/',
  })
  assert.ok(
    tags.some(
      (t) => 'property' in t && t.property === 'og:image' && t.content === 'https://example.com/og/about.png',
    ),
  )
})

test('path and meta honor Astro base', () => {
  assert.equal(imagePath('/about/', '/og', '/docs'), '/docs/og/about.png')
  assert.equal(imagePath('/docs/about/', '/og', '/docs'), '/docs/og/about.png')
  assert.equal(imagePath('/docs/', '/og', '/docs'), '/docs/og/index.png')
  assert.equal(imagePath('/', '/og', '/docs'), '/docs/og/index.png')
  assert.equal(imagePath('/about/team/', '/og', '/docs/'), '/docs/og/about/team.png')
  assert.equal(imagePath('/about/', '/og', '/'), '/og/about.png')

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

test('route() prerenders and rejects GET without title', async () => {
  const og = defineOg({ cacheDir: false, font: { family: 'Inter', files: [font] } })
  const endpoint = og.route([{ pathname: '/about', title: 'About' }])
  assert.equal(endpoint.prerender, true)

  const paths = await endpoint.getStaticPaths()
  assert.deepEqual(paths, [
    {
      params: { slug: 'about' },
      props: { pathname: '/about', title: 'About' },
    },
  ])

  await assert.rejects(() => endpoint.GET({ props: {} }), /Missing page title/)

  const response = await endpoint.GET({ props: { title: 'About' } })
  assert.equal(response.headers.get('Content-Type'), 'image/png')
  const png = Buffer.from(await response.arrayBuffer())
  assert.equal(png.readUInt32BE(0), 0x89504e47)
})
