import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { defineOg } from '../src/index.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const font = fileURLToPath(
  new URL('../../../examples/editorial/src/assets/Inter-SemiBold.ttf', import.meta.url),
)
const photo = fileURLToPath(new URL('./fixture/src/assets/photo.jpg', import.meta.url))
const fixture = join(root, 'test/fixture')
const astro = join(root, '../../node_modules/astro/bin/astro.mjs')
const distPng = (slug: string) => join(fixture, 'dist/og', slug)

function run(args: string[], opts: { cwd: string; env?: NodeJS.ProcessEnv } = { cwd: fixture }) {
  return new Promise<{ code: number; stderr: string; stdout: string }>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr?.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ code: code ?? 1, stderr, stdout })
    })
  })
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('no port'))
        return
      }
      const port = address.port
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve(port)
      })
    })
    server.on('error', reject)
  })
}

function waitFor(child: ChildProcess, match: RegExp, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = ''
    const done = (error?: Error) => {
      clearTimeout(timer)
      child.stdout?.off('data', onData)
      child.stderr?.off('data', onData)
      child.off('close', onClose)
      if (error) {
        reject(error)
        return
      }
      resolve(output)
    }
    const timer = setTimeout(() => {
      done(new Error(`timed out waiting for ${match}\n${output}`))
    }, timeoutMs)
    const onData = (chunk: Buffer) => {
      output += chunk
      if (match.test(output)) {
        done()
      }
    }
    const onClose = (code: number | null) => {
      done(new Error(`astro exited ${code}\n${output}`))
    }
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
    child.on('close', onClose)
  })
}

async function buildPackage() {
  const result = await run(['../../node_modules/typescript/bin/tsc', '-p', 'tsconfig.build.json'], {
    cwd: root,
  })
  if (result.code !== 0) {
    throw new Error(`tsc failed\n${result.stdout}\n${result.stderr}`)
  }
}

test('astro build writes PNGs from OgMeta with no page list', { timeout: 120_000 }, async () => {
  await buildPackage()
  rmSync(join(fixture, 'dist'), { force: true, recursive: true })
  rmSync(join(fixture, '.astro'), { force: true, recursive: true })
  const result = await run([astro, 'build'], { cwd: fixture })
  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`)

  const home = readFileSync(distPng('index.png'))
  const about = readFileSync(distPng('about.png'))
  const hello = readFileSync(distPng('writing/hello.png'))
  assert.equal(home.readUInt32BE(0), 0x89504e47)
  assert.deepEqual([home.readUInt32BE(16), home.readUInt32BE(20)], [1200, 630])
  assert.equal(about.readUInt32BE(0), 0x89504e47)
  assert.equal(hello.readUInt32BE(0), 0x89504e47)
  assert.equal(existsSync(distPng('skip.png')), false)

  const html = readFileSync(join(fixture, 'dist/index.html'), 'utf8')
  assert.match(html, /content="https:\/\/example.com\/og\/index.png"/)
  const skip = readFileSync(join(fixture, 'dist/skip/index.html'), 'utf8')
  assert.match(skip, /content="https:\/\/cdn.example.com\/custom.png"/)
  const aboutHtml = readFileSync(join(fixture, 'dist/about/index.html'), 'utf8')
  assert.match(aboutHtml, /content="https:\/\/example.com\/og\/about.png"/)
  const helloHtml = readFileSync(join(fixture, 'dist/writing/hello/index.html'), 'utf8')
  assert.match(helloHtml, /content="https:\/\/example.com\/og\/writing\/hello.png"/)

  const og = defineOg({
    compress: false,
    font: { family: 'Inter', files: [font] },
    footer: 'example.com',
  })
  const expected = Buffer.from(await og.render({ image: photo, pathname: '/', title: 'Home' }))
  assert.equal(home.equals(expected), true)
})

test('astro dev serves og:image after the page renders OgMeta', { timeout: 120_000 }, async () => {
  await buildPackage()
  const port = await freePort()
  const child = spawn(process.execPath, [astro, 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: fixture,
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', BROWSER: 'none' },
  })
  let logs = ''
  child.stdout?.on('data', (chunk) => {
    logs += chunk
  })
  child.stderr?.on('data', (chunk) => {
    logs += chunk
  })
  try {
    await waitFor(child, /localhost|127\.0\.0\.1/, 60_000)
    const page = await fetch(`http://127.0.0.1:${port}/`)
    assert.equal(page.ok, true, logs)
    const html = await page.text()
    assert.match(html, /og:image/)
    const image = await fetch(`http://127.0.0.1:${port}/og/index.png`)
    const png = Buffer.from(await image.arrayBuffer())
    assert.equal(image.ok, true, `og:image ${image.status}\n${logs}`)
    assert.equal(image.headers.get('content-type'), 'image/png')
    assert.equal(png.readUInt32BE(0), 0x89504e47)
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630])
  } finally {
    child.kill('SIGTERM')
  }
})
