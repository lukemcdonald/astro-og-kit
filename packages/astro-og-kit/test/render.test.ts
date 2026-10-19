import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

import { defineOg, fontMetrics, svg, wrapText } from '../src/index.ts'

const font = fileURLToPath(
  new URL('../../../examples/editorial/src/assets/Inter-SemiBold.ttf', import.meta.url),
)
const merriweather = fileURLToPath(
  new URL('../../../examples/backdrop/src/assets/Merriweather-Bold.ttf', import.meta.url),
)
const logo = fileURLToPath(new URL('../../../examples/editorial/public/logo.svg', import.meta.url))

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
        mark: 'example.com',
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
