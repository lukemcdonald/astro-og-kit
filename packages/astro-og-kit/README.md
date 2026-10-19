# astro-og-kit

> [!WARNING]
> **Experimental.** 0.x, published under `next`. The API may change until 1.0. Pin an exact version.

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

<img src="https://raw.githubusercontent.com/lukemcdonald/astro-og-kit/main/docs/editorial.png" alt="editorial template" width="600" />

Add a page `image` for the photo panel on the right.

```ts
import { defineOg } from 'astro-og-kit'

export const og = defineOg({
  font: { family: 'Inter', files: ['src/assets/Inter.ttf'] },
  mark: 'example.com',
  theme: { accent: '#c6c6bd', background: '#122023', foreground: '#f4f3ec', muted: '#c6c6bd' },
})
```

### backdrop

<img src="https://raw.githubusercontent.com/lukemcdonald/astro-og-kit/main/docs/backdrop.png" alt="backdrop template" width="600" />

Add `background` for a full-bleed photo under a tint.

```ts
import { defineOg } from 'astro-og-kit'

export const og = defineOg({
  font: { family: 'Inter', files: ['src/assets/Inter.ttf'] },
  mark: 'example.com',
  template: 'backdrop',
  theme: { accent: '#c6c6bd', background: '#122023', foreground: '#f4f3ec', muted: '#c6c6bd' },
})
```

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
<img src="https://raw.githubusercontent.com/lukemcdonald/astro-og-kit/main/docs/custom.png" alt="custom template" width="400" />
</td>
</tr>
</table>

## Options

| Option       | What it does                                          |
| ------------ | ----------------------------------------------------- |
| `font`       | `{ family, files, weight? }`. TTF or OTF, not WOFF2.  |
| `template`   | `'editorial'` (default), `'backdrop'`, or a function. |
| `theme`      | `{ background, foreground, muted, accent }`.          |
| `logo`       | `{ src, width? }`.                                    |
| `background` | `{ src, overlay?, opacity? }`.                        |
| `mark`       | Small line under the title.                           |
| `prefix`     | Image route. Default `/og`. Not Astro's `base`.       |

## More

[editorial](https://github.com/lukemcdonald/astro-og-kit/tree/main/examples/editorial),
[backdrop](https://github.com/lukemcdonald/astro-og-kit/tree/main/examples/backdrop), and
[custom](https://github.com/lukemcdonald/astro-og-kit/tree/main/examples/custom) examples.

## License

MIT
