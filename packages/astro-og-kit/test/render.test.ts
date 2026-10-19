import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

import { loadResvg } from '../src/native.ts'
import { defineOg, fontMetrics, split, svg, wrapText } from '../src/index.ts'

const font = fileURLToPath(new URL('../../../examples/split/src/assets/Inter-SemiBold.ttf', import.meta.url))
const merriweather = fileURLToPath(
  new URL('../../../examples/cover/src/assets/Merriweather-Bold.ttf', import.meta.url),
)
const logo = fileURLToPath(new URL('../../../examples/split/public/logo.svg', import.meta.url))

test('loadResvg uses createRequire from the package', () => {
  const { Resvg } = loadResvg()
  assert.equal(typeof Resvg, 'function')
})

test('svg escapes values but keeps nested markup', () => {
  const inner = svg`<b>${'<i>'}</b>`
  assert.equal(String(svg`<a>${inner}${false}${'"&'}</a>`), '<a><b>&lt;i&gt;</b>&quot;&amp;</a>')
})

test('wrapText balances lines and truncates with an ellipsis', () => {
  assert.deepEqual(wrapText('Getting started with docs', { maxChars: 22 }), ['Getting started', 'with docs'])
  assert.deepEqual(wrapText('one two three four five six', { maxChars: 9, maxLines: 2 }), [
    'one two',
    'three…',
  ])
})

test('wrapText wraps by measured glyph width', () => {
  const metrics = fontMetrics(readFileSync(merriweather))
  const measure = (text: string) => metrics.width(text, 72)
  assert.ok(measure('Acme Product Launch') > 720)
  assert.ok(measure('Acme Product Launch') < 1008)
  assert.deepEqual(wrapText('Acme Product Launch', { balance: true, maxWidth: 720, measure }), [
    'Acme Product',
    'Launch',
  ])
  assert.deepEqual(wrapText('Acme Product Launch', { balance: true, maxWidth: 1008, measure }), [
    'Acme Product Launch',
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
    const og = defineOg({ output: { cache: false }, font: { family: 'Display', files: [path] } })
    await assert.rejects(() => og.svg({ title: 'Hello' }), new RegExp(`${label}.*TTF or OTF`))
  }
})

test('renders a 1200x630 PNG with both built-in templates', async () => {
  for (const template of ['cover', 'split'] as const) {
    const og = defineOg({
      output: { cache: false },
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

test('cover uses the text column unless maxWidth is set', async () => {
  const og = defineOg({
    output: { cache: false },
    font: { family: 'Merriweather', files: [merriweather] },
    template: 'cover',
  })
  const markup = await og.svg({ title: 'Acme Product Launch' })
  assert.match(markup, />Acme Product Launch</)
  assert.doesNotMatch(markup, />Acme Product</)
})

test('cover draws the accent bar by default', async () => {
  const og = defineOg({
    colors: { accent: '#ba9b47', background: '#111111' },
    font: { family: 'Inter', files: [font] },
    output: { cache: false, compress: false },
    template: 'cover',
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
    font: { family: 'Inter', files: [font] },
    output: { cache: dir, compress: false },
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

test('split and cover svg keep logo, accent bar, and title tspans', async () => {
  const splitOg = defineOg({
    output: { cache: false },
    font: { family: 'Inter', files: [font] },
    logo: { src: logo },
    template: 'split',
  })
  const splitSvg = await splitOg.svg({ footer: 'example.com', title: 'Hello' })
  assert.match(splitSvg, /x="96" y="80"/)
  assert.match(splitSvg, /<rect width="12" height="630"/)
  assert.match(splitSvg, /<tspan x="96"/)

  const coverOg = defineOg({
    output: { cache: false },
    font: { family: 'Inter', files: [font] },
    logo: { src: logo },
    template: 'cover',
  })
  const coverSvg = await coverOg.svg({ title: 'Hello' })
  assert.match(coverSvg, /x="96" y="48"/)
  assert.match(coverSvg, /<rect width="12" height="630"/)
  assert.match(coverSvg, /<tspan x="96"/)
})

test('page footer: false hides the site footer', async () => {
  const og = defineOg({
    output: { cache: false },
    font: { family: 'Inter', files: [font] },
    footer: 'example.com',
  })
  const shown = await og.svg({ title: 'Hello' })
  assert.match(shown, />example.com</)
  const hidden = await og.svg({ footer: false, title: 'Hello' })
  assert.doesNotMatch(hidden, /example.com/)
})

test('lineHeight spaces wrapped title lines', async () => {
  const og = defineOg({
    output: { cache: false },
    font: { family: 'Inter', files: [font] },
    template: split({ lineHeight: 2, maxWidth: 200, size: 50 }),
  })
  const markup = await og.svg({ title: 'One Two Three Four' })
  const ys = [...markup.matchAll(/<tspan x="96" y="(\d+(?:\.\d+)?)"/g)].map((match) => Number(match[1]))
  assert.ok(ys.length >= 2, markup)
  assert.equal(ys[1]! - ys[0]!, 100)
})

test('page logo can hide, recolor, or swap src', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-page-logo-'))
  const siteLogo = join(dir, 'site.svg')
  const pageLogo = join(dir, 'page.svg')
  writeFileSync(
    siteLogo,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path id="site-mark" fill="currentColor" d="M0 0h10v10H0z"/></svg>`,
  )
  writeFileSync(
    pageLogo,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path id="page-mark" fill="currentColor" d="M0 0h10v10H0z"/></svg>`,
  )
  const og = defineOg({
    colors: { foreground: '#123456', logo: '#111111' },
    font: { family: 'Inter', files: [font] },
    logo: { src: siteLogo, width: 40 },
    output: { cache: false },
  })

  const hidden = await og.svg({ logo: false, title: 'Hello' })
  assert.doesNotMatch(hidden, /id="site-mark"/)

  const recolored = await og.svg({ colors: { logo: '#abcdef' }, title: 'Hello' })
  assert.match(recolored, /id="site-mark"/)
  assert.match(recolored, /color="#abcdef"/)
  assert.match(recolored, /fill="#abcdef"/)

  const swapped = await og.svg({ logo: { src: pageLogo }, title: 'Hello' })
  assert.match(swapped, /id="page-mark"/)
  assert.doesNotMatch(swapped, /id="site-mark"/)
  assert.match(swapped, /color="#111111"/)
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
    output: { cache: false },
    font: { family: 'Inter', files: [font] },
    colors: { foreground: '#123456' },
    logo: { src: logoSvg, width: 40 },
  })
  const markup = await og.svg({ title: 'Hello' })
  assert.match(markup, /color="#123456"/)
  assert.match(markup, /fill="#123456"/)
  assert.match(markup, /fill="currentColor"/)
  assert.doesNotMatch(markup, /path \{ fill: #ff0000/)
  assert.doesNotMatch(markup, /text \{ fill: #00ff00/)
  assert.match(markup, /fill="#123456"[^>]*>[\s\S]*Hello/)
})

test('colors.logo string, default, and false', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-logo-tint-'))
  const logoSvg = join(dir, 'mark.svg')
  writeFileSync(
    logoSvg,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
      <style>path { fill: #ff0000 }</style>
      <path fill="currentColor" d="M0 0h10v10H0z"/>
    </svg>`,
  )

  const painted = await defineOg({
    colors: { foreground: '#123456', logo: '#abcdef' },
    font: { family: 'Inter', files: [font] },
    logo: { src: logoSvg, width: 40 },
    output: { cache: false },
  }).svg({ title: 'Hello' })
  assert.match(painted, /color="#abcdef"/)
  assert.doesNotMatch(painted, /path \{ fill: #ff0000/)

  const fallback = await defineOg({
    colors: { foreground: '#123456' },
    font: { family: 'Inter', files: [font] },
    logo: { src: logoSvg, width: 40 },
    output: { cache: false },
  }).svg({ title: 'Hello' })
  assert.match(fallback, /color="#123456"/)

  const authored = await defineOg({
    colors: { foreground: '#123456', logo: false },
    font: { family: 'Inter', files: [font] },
    logo: { src: logoSvg, width: 40 },
    output: { cache: false },
  }).svg({ title: 'Hello' })
  assert.doesNotMatch(authored, /color="#123456"/)
  assert.doesNotMatch(authored, /color="#abcdef"/)
  assert.match(authored, /path \{ fill: #ff0000/)
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
    font: { family: 'Inter', files: [font] },
    output: { cache: false, compress: false },
    template: 'split',
  })
  const largeMeta = await embeddedSize(await og.svg({ photo: large, title: 'Large' }))
  assert.equal(largeMeta.width, 2400)
  assert.equal(largeMeta.height, 1800)

  const wideMeta = await embeddedSize(await og.svg({ photo: wide, title: 'Wide' }))
  assert.ok((wideMeta.height ?? 0) >= 630, `wide height ${wideMeta.height}`)

  const coverOg = defineOg({
    font: { family: 'Inter', files: [font] },
    output: { cache: false, compress: false },
    photo: large,
    template: 'cover',
  })
  assert.match(await coverOg.svg({ title: 'Back' }), /width="2400" height="1800"/)

  const portraitOg = defineOg({
    font: { family: 'Inter', files: [font] },
    output: { cache: false, compress: false },
    photo: portrait,
    template: 'cover',
  })
  const portraitMeta = await embeddedSize(await portraitOg.svg({ title: 'Portrait' }))
  assert.ok((portraitMeta.width ?? 0) >= 1200, `portrait width ${portraitMeta.width}`)
  assert.equal(portraitMeta.width, 2000)
  assert.equal(portraitMeta.height, 4000)

  const smallMeta = await embeddedSize(await og.svg({ photo: small, title: 'Small' }))
  assert.equal(smallMeta.width, 50)
  assert.equal(smallMeta.height, 40)
})

test('cache key follows whether compression ran', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-compress-'))
  const rawOg = defineOg({
    font: { family: 'Inter', files: [font] },
    output: { cache: dir, compress: false },
  })
  const raw = Buffer.from(await rawOg.render({ title: 'Sized' }))
  const packedOg = defineOg({
    font: { family: 'Inter', files: [font] },
    output: { cache: dir, compress: true },
  })
  const packed = Buffer.from(await packedOg.render({ title: 'Sized' }))
  const pngs = readdirSync(dir).filter((name) => name.endsWith('.png'))
  assert.equal(pngs.length, 2)
  assert.ok(packed.length < raw.length)
})

test('page photo: false hides the site photo', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-hide-photo-'))
  const photo = join(dir, 'hero.png')
  await sharp({
    create: { background: '#336699', channels: 3, height: 80, width: 80 },
  })
    .png()
    .toFile(photo)
  const og = defineOg({
    font: { family: 'Inter', files: [font] },
    output: { cache: false, compress: false },
    photo,
    template: 'split',
  })
  assert.match(await og.svg({ title: 'Shown' }), /href="data:image\/png/)
  assert.doesNotMatch(await og.svg({ photo: false, title: 'Hidden' }), /href="data:image/)
})

test('heading is drawn instead of title', async () => {
  const og = defineOg({
    output: { cache: false },
    font: { family: 'Inter', files: [font] },
  })
  const markup = await og.svg({
    heading: 'Getting started',
    title: 'Getting started | Example Site documentation and guides',
  })
  assert.match(markup, />Getting started</)
  assert.doesNotMatch(markup, /documentation/)
})

test('tells you to pass the imported image object, not .src', async () => {
  const og = defineOg({ output: { cache: false }, font: { family: 'Inter', files: [font] } })
  await assert.rejects(
    () => og.render({ photo: '/_astro/hero.hash.jpg', title: 'Hero' }),
    /Pass the imported image object, not \.src/,
  )
  await assert.rejects(
    () => og.render({ photo: { src: '/_astro/hero.hash.jpg' }, title: 'Hero' }),
    /Pass the imported image object, not \.src/,
  )
})
