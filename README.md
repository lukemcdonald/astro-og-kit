# astro-og-kit

> [!WARNING]
> **Experimental.** 0.x releases, published under the `next` tag. The API may change in any release
> until 1.0. Pin an exact version.

Build-time Open Graph images for Astro. SVG templates, rendered to PNG with
[resvg](https://github.com/yisibl/resvg-js).

## Install

```sh
npm install astro-og-kit@next
```

## Quick start

**1.** `src/og.ts`:

```ts
import { defineOg } from 'astro-og-kit'

export const og = defineOg({
  font: { family: 'Inter', files: ['src/assets/Inter.ttf'] },
})
```

**2.** `src/pages/og/[...slug].png.ts`:

```ts
import { og } from '../../og'

export const prerender = true
export const { GET, getStaticPaths } = og.route([{ pathname: '/', title: 'Home' }])
```

**3.** In your layout `<head>`:

```astro
---
import OgMeta from 'astro-og-kit/OgMeta.astro'
import { og } from '../og'
---

<OgMeta og={og} title={title} description={description} />
```

Set `site` in `astro.config` so image URLs are absolute. Pass the imported image object into
`image`, not `.src`.

## Templates

### editorial

<img src="docs/editorial.png" alt="editorial template" width="600" />

```ts
import { defineOg } from 'astro-og-kit'

export const og = defineOg({
  font: { family: 'Inter', files: ['src/assets/Inter.ttf'] },
  mark: 'example.com',
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
  mark: 'example.com',
  template: 'backdrop',
  theme: { accent: '#c6c6bd', background: '#122023', foreground: '#f4f3ec', muted: '#c6c6bd' },
})
```

Tweak a built-in without writing a template: `template: editorial({ titleSize: 64, accentBar: false })`
(`titleMaxLines`, `titleMaxWidth`).

## Custom template

<table>
<tr>
<td>

```ts
import { defineOg, svg, type OgTemplate } from 'astro-og-kit'

const card: OgTemplate = ({ font, height, page, theme, width }) => svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${theme.background}" />
    <text x="96" y="360" font-family="${font.family}" font-size="80"
      fill="${theme.foreground}">${page.title}</text>
  </svg>`

export const og = defineOg({
  font: { family: 'Inter', files: ['src/assets/Inter.ttf'] },
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
| `mark`       | Small line under the title.                                 |
| `prefix`     | Image route. Default `/og`. Not Astro's `base`.             |
| `compress`   | Shrink PNGs with sharp when installed. Default `true`.      |
| `cacheDir`   | Default `node_modules/.astro-og-kit`. `false` turns it off. |

Per page: `title`, `pathname`, `image`, `background`, `mark`, `template`, `theme`, `data`.

## More

[editorial](examples/editorial), [backdrop](examples/backdrop), and [custom](examples/custom)
examples. `npm test`, `npm run examples`, and `npm run docs:images`.

0.x `next` releases: see [RELEASING.md](RELEASING.md).

## License

MIT
