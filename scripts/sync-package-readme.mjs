import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'README.md')
const target = join(root, 'packages/astro-og-kit/README.md')
const raw = 'https://raw.githubusercontent.com/lukemcdonald/astro-og-kit/main/'

function packageReadme(rootReadme) {
  return rootReadme.replaceAll('src="docs/', `src="${raw}docs/`)
}

const expected = packageReadme(await readFile(source, 'utf8'))
const check = process.argv.includes('--check')

if (check) {
  const current = await readFile(target, 'utf8')
  if (current !== expected) {
    console.error('packages/astro-og-kit/README.md is out of date. Run npm run docs:readme.')
    process.exit(1)
  }
} else {
  await writeFile(target, expected)
}
