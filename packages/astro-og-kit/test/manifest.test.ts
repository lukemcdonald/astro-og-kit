import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  beginRecording,
  endRecording,
  isImageUrlOverride,
  readPages,
  recordPage,
  serializePage,
} from '../src/manifest.ts'

const photo = fileURLToPath(
  new URL('../../../examples/editorial/src/assets/luke-mustachio.jpg', import.meta.url),
)

test('isImageUrlOverride treats http and site paths as overrides', () => {
  assert.equal(isImageUrlOverride('https://cdn.example.com/og.png'), true)
  assert.equal(isImageUrlOverride('http://cdn.example.com/og.png'), true)
  assert.equal(isImageUrlOverride('//cdn.example.com/og.png'), true)
  assert.equal(isImageUrlOverride('/custom.png'), true)
  assert.equal(isImageUrlOverride('data:image/png;base64,aa'), true)
  assert.equal(isImageUrlOverride(photo), false)
  assert.equal(isImageUrlOverride('src/assets/photo.jpg'), false)
  assert.equal(isImageUrlOverride({ fsPath: photo, src: '/_astro/photo.jpg' }), false)
  assert.equal(isImageUrlOverride(undefined), false)
  assert.equal(isImageUrlOverride(''), false)
})

test('serializePage resolves image objects and drops template functions', () => {
  const record = serializePage({
    background: { opacity: 0.4, src: { fsPath: photo, src: '/_astro/bg.jpg' } },
    data: { n: 1 },
    footer: false,
    image: { fsPath: photo, src: '/_astro/hero.jpg' },
    logo: false,
    pathname: '/about/',
    template: () => '<svg></svg>',
    theme: { accent: '#fff' },
    title: 'About',
  })
  assert.equal(record.image, photo)
  assert.equal(record.background && record.background !== false && record.background.src, photo)
  assert.equal(record.footer, false)
  assert.equal(record.logo, false)
  assert.equal(record.template, undefined)
  assert.deepEqual(record.data, { n: 1 })
  assert.equal(record.pathname, '/about/')
  assert.equal(record.title, 'About')
})

test('recordPage is a no-op without beginRecording', () => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-manifest-'))
  recordPage({ cacheDir: dir, page: { pathname: '/', title: 'Home' } })
  assert.deepEqual(readPages(dir), { duplicates: [], pages: [] })
})

test('readPages last write wins and lists duplicates', () => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-manifest-'))
  beginRecording(dir)
  recordPage({ cacheDir: dir, page: { pathname: '/about/', title: 'First' } })
  recordPage({ cacheDir: dir, page: { pathname: '/about/', title: 'Second' } })
  recordPage({ cacheDir: dir, page: { pathname: '/', title: 'Home' } })
  const { duplicates, pages } = readPages(dir)
  assert.deepEqual(duplicates, ['/about/'])
  const about = pages.find((page) => page.pathname === '/about/')
  const home = pages.find((page) => page.pathname === '/')
  assert.equal(about?.title, 'Second')
  assert.equal(home?.title, 'Home')
  endRecording(dir)
  recordPage({ cacheDir: dir, page: { pathname: '/x/', title: 'Nope' } })
  assert.equal(readPages(dir).pages.length, 2)
})

test('beginRecording truncates a previous manifest', () => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-og-kit-manifest-'))
  beginRecording(dir)
  recordPage({ cacheDir: dir, page: { pathname: '/', title: 'Old' } })
  beginRecording(dir)
  recordPage({ cacheDir: dir, page: { pathname: '/new/', title: 'New' } })
  const { pages } = readPages(dir)
  assert.equal(pages.length, 1)
  assert.equal(pages[0]?.title, 'New')
  assert.equal(readFileSync(join(dir, 'pages.jsonl'), 'utf8').includes('Old'), false)
})
