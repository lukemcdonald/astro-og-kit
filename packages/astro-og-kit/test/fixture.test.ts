import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { build, dev } from 'astro'

import { defineOg } from '../src/index.ts'
import { encodeRecord, extractRecords, pageUrl, pngSlug } from '../src/page-path.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixture = join(root, 'test/fixture')
const font = fileURLToPath(new URL('../../../examples/split/src/assets/Inter-SemiBold.ttf', import.meta.url))
const photo = fileURLToPath(new URL('./fixture/src/assets/photo.jpg', import.meta.url))
const dist = join(fixture, 'dist')
const tsc = join(root, '../../node_modules/typescript/bin/tsc')

execFileSync(process.execPath, [tsc, '-p', 'tsconfig.build.json'], { cwd: root })

test('carrier encode/extract and slug mapping', () => {
  assert.equal(pngSlug('/docs/og/about.png', '/og', '/docs'), 'about')
  assert.equal(pngSlug('/og/about.png', '/og', '/docs'), 'about')
  assert.equal(pngSlug('/og/index.png', '/og', '/'), 'index')
  assert.equal(pngSlug('/og/writing/hello.png', '/og', '/'), 'writing/hello')
  assert.equal(
    pageUrl('localhost:4321', '/docs', 'index', { trailingSlash: 'never' }),
    'http://localhost:4321/docs',
  )
  assert.equal(
    pageUrl('localhost:4321', '/docs', 'index', { trailingSlash: 'always' }),
    'http://localhost:4321/docs/',
  )
  assert.equal(
    pageUrl('localhost:4321', '/docs', 'index', { trailingSlash: 'ignore' }),
    'http://localhost:4321/docs/',
  )
  assert.equal(
    pageUrl('localhost:4321', '/docs', 'about', { trailingSlash: 'never' }),
    'http://localhost:4321/docs/about',
  )
  assert.equal(
    pageUrl('localhost:4321', '/docs', 'about', { trailingSlash: 'always' }),
    'http://localhost:4321/docs/about/',
  )
  assert.equal(
    pageUrl('localhost:4321', '/docs', 'about', { trailingSlash: 'ignore' }),
    'http://localhost:4321/docs/about',
  )
  assert.equal(
    pageUrl('localhost:4321', '/docs', 'index', { trailingSlash: 'never' }, true),
    'https://localhost:4321/docs',
  )
  const encoded = encodeRecord({
    heading: 'Getting started',
    pathname: '/about/',
    photo,
    title: 'Getting started | Example Site documentation and guides',
  })
  const { html, records } = extractRecords(`<head><meta name="astro-og-kit" content="${encoded}"></head>`)
  assert.equal(html.includes('astro-og-kit'), false)
  assert.equal(records[0]?.heading, 'Getting started')
  assert.equal(records[0]?.photo, photo)
  assert.equal(records[0]?.title, 'Getting started | Example Site documentation and guides')
  assert.equal(records[0]?.pathname, '/about/')
})

test('astro build writes PNGs from OgMeta and strips the carrier', { timeout: 120_000 }, async () => {
  rmSync(dist, { force: true, recursive: true })
  rmSync(join(fixture, '.astro'), { force: true, recursive: true })
  await build({ logLevel: 'error', root: fixture })

  const home = readFileSync(join(dist, 'og/index.png'))
  const about = readFileSync(join(dist, 'og/about.png'))
  const named = readFileSync(join(dist, 'og/named.png'))
  assert.equal(home.readUInt32BE(0), 0x89504e47)
  assert.deepEqual([home.readUInt32BE(16), home.readUInt32BE(20)], [1200, 630])
  assert.equal(about.readUInt32BE(0), 0x89504e47)
  assert.equal(existsSync(join(dist, 'og/skip.png')), false)
  assert.equal(existsSync(join(dist, 'og/override.png')), false)
  assert.match(
    readFileSync(join(dist, 'index.html'), 'utf8'),
    /content="https:\/\/example.com\/docs\/og\/index.png"/,
  )
  assert.match(
    readFileSync(join(dist, 'skip/index.html'), 'utf8'),
    /content="https:\/\/cdn.example.com\/custom.png"/,
  )
  assert.match(
    readFileSync(join(dist, 'override/index.html'), 'utf8'),
    /content="https:\/\/example.com\/custom-share.jpg"/,
  )
  assert.doesNotMatch(readFileSync(join(dist, 'override/index.html'), 'utf8'), /og:image:width/)
  assert.match(
    readFileSync(join(dist, 'about/index.html'), 'utf8'),
    /content="https:\/\/example.com\/docs\/og\/about.png"/,
  )
  const namedHtml = readFileSync(join(dist, 'named/index.html'), 'utf8')
  assert.match(
    namedHtml,
    /content="Getting started \| Example Site documentation and guides" property="og:title"/,
  )
  assert.match(
    namedHtml,
    /content="Getting started \| Example Site documentation and guides" name="twitter:title"/,
  )
  assert.match(namedHtml, /content="https:\/\/example.com\/docs\/og\/named.png"/)
  for (const name of readdirSync(dist, { recursive: true })) {
    if (String(name).endsWith('.html')) {
      assert.equal(readFileSync(join(dist, String(name)), 'utf8').includes('name="astro-og-kit"'), false)
    }
  }

  const og = defineOg({
    font: { family: 'Inter', files: [font] },
    footer: 'example.com',
    output: { compress: false },
  })
  const expected = Buffer.from(await og.render({ pathname: '/', photo, title: 'Home' }))
  assert.equal(home.equals(expected), true)

  const namedTitle = 'Getting started | Example Site documentation and guides'
  const namedHeading = Buffer.from(
    await og.render({ heading: 'Getting started', pathname: '/named/', photo, title: namedTitle }),
  )
  const namedAsTitle = Buffer.from(await og.render({ pathname: '/named/', photo, title: namedTitle }))
  assert.equal(named.equals(namedHeading), true)
  assert.equal(named.equals(namedAsTitle), false)
})

test('astro dev serves og:image before the page is requested', { timeout: 120_000 }, async () => {
  const server = await dev({ logLevel: 'error', root: fixture, server: { host: '127.0.0.1', port: 0 } })
  try {
    const origin = `http://127.0.0.1:${server.address.port}`
    const image = await fetch(`${origin}/docs/og/index.png`)
    const png = Buffer.from(await image.arrayBuffer())
    assert.equal(image.ok, true, `og:image ${image.status}`)
    assert.equal(image.headers.get('content-type'), 'image/png')
    assert.equal(png.readUInt32BE(0), 0x89504e47)
    const page = await fetch(`${origin}/docs/`)
    assert.equal(page.ok, true)
    assert.match(await page.text(), /og:image/)
  } finally {
    await server.stop()
  }
})
