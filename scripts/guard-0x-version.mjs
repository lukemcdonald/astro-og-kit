import { readFileSync } from 'node:fs'

const { version } = JSON.parse(
  readFileSync(new URL('../packages/astro-og-kit/package.json', import.meta.url), 'utf8'),
)

if (!/^0\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Refusing to publish ${version}; only 0.x or 0.x prereleases may use this workflow.`)
  process.exit(1)
}

console.log(`version=${version}`)
