import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

import { loadNative, loadResvg } from '../src/native.ts'
import { defineOg, editorial, fontMetrics, svg, wrapText } from '../src/index.ts'

const font = fileURLToPath(
  new URL('../../../examples/editorial/src/assets/Inter-SemiBold.ttf', import.meta.url),
)
const merriweather = fileURLToPath(
  new URL('../../../examples/backdrop/src/assets/Merriweather-Bold.ttf', import.meta.url),
)
const logo = fileURLToPath(new URL('../../../examples/editorial/public/logo.svg', import.meta.url))

test('loadResvg uses createRequire from the package', () => {
  const { Resvg } = loadResvg()
  assert.equal(typeof Resvg, 'function')
  assert.throws(() => loadNative('this-package-does-not-exist-og-kit'), /Cannot find module/)
})

test('svg escapes values but keeps nested markup', () => {
  const inner = svg`<b>${'<i>'}</b>`
  assert.equal(String(svg`<a>${inner}${false}${'"&'}</a>`), '<a><b>&lt;i&gt;</b>&quot;&amp;</a>')
})

test('wrapText balances lines and truncates with an ellipsis', () => {
  assert.deepEqual(wrapText('Summary of Essential Beliefs', { maxChars: 22 }), [
    'Summary of',
    'Essential Beliefs',
  ])
  assert.deepEqual(wrapText('one two three four five six', { maxChars: 9, maxLines: 2 }), [
    'one two',
    'three…',
  ])
})

test('wrapText wraps by measured glyph width', () => {
  const metrics = fontMetrics(readFileSync(merriweather))
  const measure = (text: string) => metrics.width(text, 72)
  assert.ok(measure('Berean Bible Church') > 720)
  assert.ok(measure('Berean Bible Church') < 1008)
  assert.deepEqual(wrapText('Berean Bible Church', { balance: true, maxWidth: 720, measure }), [
    'Berean Bible',
    'Church',
  ])
  assert.deepEqual(wrapText('Berean Bible Church', { balance: true, maxWidth: 1008, measure }), [
    'Berean Bible Church',
  ])
})

test('rejects WOFF and WOFF2 fonts with a clear error', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-'))
  for (const [file, magic, label] of [
    ['Display.woff2', 'wOF2', 'WOFF2'],
    ['Display.woff', 'wOFF', 'WOFF'],
  ] as const) {
    const path = join(dir, file)
    writeFileSync(path, Buffer.from(`${magic}....`))
    const og = defineOg({ cacheDir: false, font: { family: 'Display', files: [path] } })
    await assert.rejects(() => og.svg({ title: 'Hello' }), new RegExp(`${label}.*TTF or OTF`))
  }
})

test('renders a 1200x630 PNG with both built-in templates', async () => {
  for (const template of ['backdrop', 'editorial'] as const) {
    const og = defineOg({
      cacheDir: false,
      font: { family: 'Inter', files: [font] },
      logo: { src: logo },
      template,
    })
    const png = Buffer.from(
      await og.render({
        footer: 'example.com',
        title: 'Hello <world> & friends',
      }),
    )
    assert.equal(png.readUInt32BE(0), 0x89504e47)
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630])
  }
})

test('backdrop uses the text column unless titleMaxWidth is set', async () => {
  const og = defineOg({
    cacheDir: false,
    font: { family: 'Merriweather', files: [merriweather] },
    template: 'backdrop',
  })
  const markup = await og.svg({ title: 'Berean Bible Church' })
  assert.match(markup, />Berean Bible Church</)
  assert.doesNotMatch(markup, />Berean Bible</)
})

test('backdrop draws the accent bar by default', async () => {
  const og = defineOg({
    cacheDir: false,
    compress: false,
    font: { family: 'Inter', files: [font] },
    template: 'backdrop',
    theme: { accent: '#ba9b47', background: '#111111' },
  })
  const png = Buffer.from(await og.render({ title: 'Accent' }))
  const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const i = (315 * 1200 + 0) * 4
  const [r, g, b] = [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]
  assert.ok(r > 160 && g > 120 && b < 120, `left edge should be gold, got ${r},${g},${b}`)
})

test('cache write is atomic and rejects non-PNG hits', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-cache-'))
  const og = defineOg({
    cacheDir: dir,
    compress: false,
    font: { family: 'Inter', files: [font] },
  })
  const first = Buffer.from(await og.render({ title: 'Cached' }))
  assert.equal(first.readUInt32BE(0), 0x89504e47)

  const pngs = readdirSync(dir).filter((name) => name.endsWith('.png'))
  const tmps = readdirSync(dir).filter((name) => name.endsWith('.tmp'))
  assert.equal(pngs.length, 1)
  assert.equal(tmps.length, 0)

  const cacheFile = join(dir, pngs[0] ?? '')
  writeFileSync(cacheFile, 'not a png')
  const recovered = Buffer.from(await og.render({ title: 'Cached' }))
  assert.equal(recovered.readUInt32BE(0), 0x89504e47)
  assert.equal(readFileSync(cacheFile).readUInt32BE(0), 0x89504e47)

  const hit = Buffer.from(await og.render({ title: 'Cached' }))
  assert.equal(hit.equals(recovered), true)
})

test('editorial and backdrop svg keep logo, accent bar, and title tspans', async () => {
  const editorial = defineOg({
    cacheDir: false,
    font: { family: 'Inter', files: [font] },
    logo: { src: logo },
    template: 'editorial',
  })
  const editorialSvg = await editorial.svg({ footer: 'example.com', title: 'Hello' })
  assert.match(editorialSvg, /x="96" y="80"/)
  assert.match(editorialSvg, /<rect width="12" height="630"/)
  assert.match(editorialSvg, /<tspan x="96"/)

  const backdrop = defineOg({
    cacheDir: false,
    font: { family: 'Inter', files: [font] },
    logo: { src: logo },
    template: 'backdrop',
  })
  const backdropSvg = await backdrop.svg({ title: 'Hello' })
  assert.match(backdropSvg, /x="96" y="48"/)
  assert.match(backdropSvg, /<rect width="12" height="630"/)
  assert.match(backdropSvg, /<tspan x="96"/)
})

test('page footer: false hides the site footer', async () => {
  const og = defineOg({
    cacheDir: false,
    font: { family: 'Inter', files: [font] },
    footer: 'example.com',
  })
  const shown = await og.svg({ title: 'Hello' })
  assert.match(shown, />example.com</)
  const hidden = await og.svg({ footer: false, title: 'Hello' })
  assert.doesNotMatch(hidden, /example.com/)
})

test('titleLineHeight spaces wrapped title lines', async () => {
  const og = defineOg({
    cacheDir: false,
    font: { family: 'Inter', files: [font] },
    template: editorial({ titleLineHeight: 2, titleMaxWidth: 200, titleSize: 50 }),
  })
  const markup = await og.svg({ title: 'One Two Three Four' })
  const ys = [...markup.matchAll(/<tspan x="96" y="(\d+(?:\.\d+)?)"/g)].map((match) => Number(match[1]))
  assert.ok(ys.length >= 2, markup)
  assert.equal(ys[1]! - ys[0]!, 100)
})

test('logo currentColor inherits wrapper color and inner style is stripped', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-logo-'))
  const logoSvg = join(dir, 'mark.svg')
  writeFileSync(
    logoSvg,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
      <style>path { fill: #ff0000 } text { fill: #00ff00 }</style>
      <path fill="currentColor" d="M0 0h10v10H0z"/>
    </svg>`,
  )
  const og = defineOg({
    cacheDir: false,
    font: { family: 'Inter', files: [font] },
    logo: { src: logoSvg, width: 40 },
    theme: { foreground: '#123456' },
  })
  const markup = await og.svg({ title: 'Hello' })
  assert.match(markup, /color="#123456"/)
  assert.match(markup, /fill="#123456"/)
  assert.match(markup, /fill="currentColor"/)
  assert.doesNotMatch(markup, /path \{ fill: #ff0000/)
  assert.doesNotMatch(markup, /text \{ fill: #00ff00/)
  assert.match(markup, /fill="#123456"[^>]*>[\s\S]*Hello/)
})

async function embeddedSize(markup: string) {
  const href = markup.match(/href="data:image\/png;base64,([^"]+)"/)?.[1]
  assert.ok(href)
  return sharp(Buffer.from(href, 'base64')).metadata()
}

test('sharp downscales large photos to cover the canvas and never upscales', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-photo-'))
  const large = join(dir, 'large.png')
  const small = join(dir, 'small.png')
  const wide = join(dir, 'wide.png')
  const portrait = join(dir, 'portrait.png')
  await sharp({
    create: { background: '#336699', channels: 3, height: 3000, width: 4000 },
  })
    .png()
    .toFile(large)
  await sharp({
    create: { background: '#993366', channels: 3, height: 40, width: 50 },
  })
    .png()
    .toFile(small)
  await sharp({
    create: { background: '#669933', channels: 3, height: 1500, width: 4000 },
  })
    .png()
    .toFile(wide)
  await sharp({
    create: { background: '#996633', channels: 3, height: 4000, width: 2000 },
  })
    .png()
    .toFile(portrait)

  const og = defineOg({
    cacheDir: false,
    compress: false,
    font: { family: 'Inter', files: [font] },
    template: 'editorial',
  })
  const largeMeta = await embeddedSize(await og.svg({ image: large, title: 'Large' }))
  assert.equal(largeMeta.width, 2400)
  assert.equal(largeMeta.height, 1800)

  const wideMeta = await embeddedSize(await og.svg({ image: wide, title: 'Wide' }))
  assert.ok((wideMeta.height ?? 0) >= 630, `wide height ${wideMeta.height}`)

  const backdrop = defineOg({
    background: { src: large },
    cacheDir: false,
    compress: false,
    font: { family: 'Inter', files: [font] },
    template: 'backdrop',
  })
  assert.match(await backdrop.svg({ title: 'Back' }), /width="2400" height="1800"/)

  const portraitOg = defineOg({
    background: { src: portrait },
    cacheDir: false,
    compress: false,
    font: { family: 'Inter', files: [font] },
    template: 'backdrop',
  })
  const portraitMeta = await embeddedSize(await portraitOg.svg({ title: 'Portrait' }))
  assert.ok((portraitMeta.width ?? 0) >= 1200, `portrait width ${portraitMeta.width}`)
  assert.equal(portraitMeta.width, 2000)
  assert.equal(portraitMeta.height, 4000)

  const smallMeta = await embeddedSize(await og.svg({ image: small, title: 'Small' }))
  assert.equal(smallMeta.width, 50)
  assert.equal(smallMeta.height, 40)
})

test('cache key follows whether compression ran', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-compress-'))
  const rawOg = defineOg({
    cacheDir: dir,
    compress: false,
    font: { family: 'Inter', files: [font] },
  })
  const raw = Buffer.from(await rawOg.render({ title: 'Sized' }))
  const packedOg = defineOg({
    cacheDir: dir,
    compress: true,
    font: { family: 'Inter', files: [font] },
  })
  const packed = Buffer.from(await packedOg.render({ title: 'Sized' }))
  const pngs = readdirSync(dir).filter((name) => name.endsWith('.png'))
  assert.equal(pngs.length, 2)
  assert.ok(packed.length < raw.length)
})

test('tells you to pass the imported image object, not .src', async () => {
  const og = defineOg({ cacheDir: false, font: { family: 'Inter', files: [font] } })
  await assert.rejects(
    () => og.render({ image: '/_astro/hero.hash.jpg', title: 'Hero' }),
    /Pass the imported image object, not \.src/,
  )
  await assert.rejects(
    () => og.render({ image: { src: '/_astro/hero.hash.jpg' }, title: 'Hero' }),
    /Pass the imported image object, not \.src/,
  )
})
