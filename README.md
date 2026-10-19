# astro-og-kit

> [!WARNING]
> **Experimental.** 0.x releases. The API may change in any release
> until 1.0. Pin an exact version.

Build-time Open Graph images for Astro. SVG templates, rendered to PNG with
[resvg](https://github.com/yisibl/resvg-js).

## Install

```sh
npm i astro-og-kit
```

## Quick start

**1.** `src/og.ts`:

```ts
import { defineOg } from 'astro-og-kit'

export const og = defineOg({
  font: { family: 'Inter', files: ['src/assets/Inter.ttf'] },
})
```

**2.** `astro.config.mjs`:

```js
import ogkit from 'astro-og-kit/integration'
import { defineConfig } from 'astro/config'
import { og } from './src/og'

export default defineConfig({
  integrations: [ogkit(og)],
  site: 'https://example.com',
})
```

**3.** In your layout `<head>`:

```astro
---
import OgMeta from 'astro-og-kit/OgMeta.astro'
import { og } from '../og'
---

<OgMeta description={description} image={photo} og={og} title={title} />
```

Every prerendered page that renders `<OgMeta>` gets a PNG at its `og:image` URL. No page list, no
route file. `og.route()` is still there if you want an explicit list or on-demand rendering.
On-demand pages are skipped; duplicate pathnames keep the last `<OgMeta>`.

Set `site` in `astro.config` so image URLs are absolute. Pass the imported image object into
`image`, not `.src`. A string URL (`https://...` or a site path) overrides `og:image` and skips
generation. Optional `url` (string or URL) is the page URL for `og:url` and `og:image`; relative
values use `Astro.site`. Defaults to `Astro.url`.

## Templates

### editorial

<img src="docs/editorial.png" alt="editorial template" width="600" />

```ts
import { defineOg } from 'astro-og-kit'

export const og = defineOg({
  font: { family: 'Inter', files: ['src/assets/Inter.ttf'] },
  footer: 'example.com',
  logo: { src: 'docs/logo.svg', width: 56 },
  theme: { accent: '#c6c6bd', background: '#122023', foreground: '#f4f3ec', muted: '#c6c6bd' },
})

og.route([{ image: 'src/assets/photo.jpg', pathname: '/', title: 'Hello, world' }])
```

### backdrop

<img src="docs/backdrop.png" alt="backdrop template" width="600" />

```ts
import { defineOg } from 'astro-og-kit'

export const og = defineOg({
  background: { src: 'src/assets/photo.jpg' },
  font: { family: 'Inter', files: ['src/assets/Inter.ttf'] },
  footer: 'example.com',
  logo: { src: 'docs/logo.svg', width: 56 },
  template: 'backdrop',
  theme: { accent: '#c6c6bd', background: '#122023', foreground: '#f4f3ec', muted: '#c6c6bd' },
})
```

Tweak a built-in without writing a template: `template: editorial({ titleSize: 64, accentBar: false })`
(`titleLineHeight`, `titleMaxLines`, `titleMaxWidth`).

## Custom template

<table>
<tr>
<td>

```ts
import { defineOg, svg, type OgTemplate } from 'astro-og-kit'

const card: OgTemplate = ({ font, height, logo, page, theme, width }) => svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${theme.background}" />
    ${logo?.at(96, 80)}
    <text x="96" y="360" font-family="${font.family}" font-size="80"
      fill="${theme.foreground}">${page.title}</text>
  </svg>`

export const og = defineOg({
  font: { family: 'Inter', files: ['src/assets/Inter.ttf'] },
  logo: { src: 'docs/logo.svg', width: 56 },
  template: card,
  theme: { background: '#122023', foreground: '#f4f3ec' },
})
```

</td>
<td>
<img src="docs/custom.png" alt="custom template" width="400" />
</td>
</tr>
</table>

## Options

| Option       | What it does                                                |
| ------------ | ----------------------------------------------------------- |
| `font`       | `{ family, files, weight? }`. TTF or OTF, not WOFF2.        |
| `template`   | `'editorial'` (default), `'backdrop'`, or a function.       |
| `theme`      | `{ background, foreground, muted, accent }`.                |
| `logo`       | `{ src, width? }`.                                          |
| `background` | `{ src, overlay?, opacity? }`.                              |
| `footer`     | Small line under the title.                                 |
| `prefix`     | Image route. Default `/og`. Not Astro's `base`.             |
| `compress`   | Shrink PNGs with sharp when installed. Default `true`.      |
| `cacheDir`   | Default `node_modules/.astro-og-kit`. `false` turns it off. |

Per page (on `<OgMeta>` or `og.route()`): `title`, `pathname`, `image`, `background`, `footer`,
`logo`, `template`, `theme`, `data`. `logo: false` hides the site logo; an object is merged over it.
`WIDTH` and `HEIGHT` (`1200`, `630`) are exported for custom templates. A logo file's inner
`<style>` is stripped; color comes from `logo.color` / `currentColor`.

## More

[editorial](examples/editorial), [backdrop](examples/backdrop), and [custom](examples/custom)
examples. `npm test`, `npm run examples`, and `npm run docs:images`.

0.x releases: see [RELEASING.md](RELEASING.md).

## License

MIT
