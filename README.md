# astro-og-kit

> [!WARNING]
> **Experimental.** 0.x releases, published under the `next` tag. The API may change in any release
> until 1.0. Pin an exact version.

Build-time Open Graph images for Astro. Templates are plain SVG strings, rendered to PNG with
[resvg](https://github.com/yisibl/resvg-js). No React, no JSX, no headless browser.

- **One dependency** (`@resvg/resvg-js`, ~4 MB with its native binary). `sharp`, which Astro already
  installs, is used when present to shrink PNGs and read WebP/AVIF.
- **Two built-in templates**, `editorial` and `backdrop`, that you configure rather than rewrite.
- **Your own template** is just a function that returns SVG.
- **Cached** between builds, keyed on the rendered SVG and font bytes.

## Install

```sh
npm install astro-og-kit@next
```

## Use it

**1. Configure once** in `src/og.ts`. Paths are relative to the project root.

```ts
import { backdrop, defineOg } from 'astro-og-kit'

export const og = defineOg({
  template: backdrop({ accentBar: true }),
  font: { family: 'Merriweather', files: ['src/assets/Merriweather-Bold.ttf'] },
  theme: { background: '#4c0818', foreground: '#f9f9f8', muted: '#cfb97f', accent: '#ba9b47' },
  logo: { src: 'public/logo.svg', width: 192 },
  background: { src: 'src/assets/hero.jpg', overlay: '#26040c', opacity: 0.72 },
  mark: 'Berean Bible Church',
})
```

**2. Add the route** at `src/pages/og/[...slug].png.ts`.

```ts
import { getCollection } from 'astro:content'
import { og } from '../../og'

export const { getStaticPaths, GET } = og.route(async () => [
  { pathname: '/', title: 'Berean Bible Church', mark: false },
  ...(await getCollection('pages')).map((page) => ({
    pathname: `/${page.id}`,
    title: page.data.title,
    image: page.data.image, // imported images work
  })),
])
```

**3. Add the tags** in your layout's `<head>`.

```astro
---
import OgMeta from 'astro-og-kit/OgMeta.astro'
import { og } from '../og'
---

<OgMeta og={og} title={title} description={description} siteName="Berean Bible Church" />
```

Set `site` in `astro.config` so image URLs are absolute. Prefer to write your own tags? Use
`og.path(Astro.url.pathname)` for the image path or `og.meta({...})` for the tag list.

## Templates

| Template    | Looks like                                                               |
| ----------- | ------------------------------------------------------------------------ |
| `editorial` | Solid canvas, logo top-left, title, page `image` in a panel on the right |
| `backdrop`  | Full-bleed `background` photo under a tinted overlay, logo, title        |

Tweak one without writing a template:

```ts
import { defineOg, editorial } from 'astro-og-kit'

defineOg({ template: editorial({ titleSize: 64, accentBar: false }), ... })
```

Options: `titleSize`, `titleMaxLines`, `titleMaxWidth`, `balance`, `accentBar` (`true` is 12px, or
pass a width), `logoX`, `logoY`, `photoWidth`. Titles wrap using the font's real glyph widths.
`backdrop` caps the title at 10em so a line like "Berean Bible Church" breaks in two.

### Your own template

A template gets the resolved page, theme, font, logo and images, and returns SVG. The `svg` tag
escapes interpolated text for you.

```ts
import { defineOg, svg, wrapText, type OgTemplate } from 'astro-og-kit'

const centered: OgTemplate = ({ width, height, page, theme, font, logo }) => svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${theme.background}" />
    ${logo?.at((width - logo.width) / 2, 64)}
    <text x="50%" y="${height / 2}" text-anchor="middle" font-family="${font.family}"
      font-size="80" font-weight="${font.weight}" fill="${theme.foreground}">
      ${wrapText(page.title, {
        maxWidth: width - 160,
        measure: (line) => font.width(line, 80),
      }).map((line, i) => svg`<tspan x="50%" dy="${i ? 92 : 0}">${line}</tspan>`)}
    </text>
  </svg>`

export const og = defineOg({ template: centered, font: { family: 'Inter', files: ['src/assets/Inter.ttf'] } })
```

Pass `data` on a page for anything extra your template needs. Use `og.svg(page)` to see the markup.

## Options

| Option       | What it does                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| `font`       | `{ family, files, weight? }`. TTF or OTF; resvg can't read WOFF2. System fonts are never used.           |
| `template`   | `'editorial'` (default), `'backdrop'`, a configured template, or a function.                             |
| `theme`      | `{ background, foreground, muted, accent }`.                                                             |
| `logo`       | `{ src, width?, color?, css? }`. SVG keeps it crisp; `color` fills `currentColor`; `css` styles classes. |
| `background` | `{ src, overlay?, opacity?, position?, crop? }`. `crop` is `[x, y, width, height]` in source pixels.     |
| `mark`       | Small line under the title, e.g. your domain.                                                            |
| `base`       | URL base for images. Default `/og`; match it to where the route file lives.                              |
| `compress`   | Shrink PNGs with sharp when installed. Default `true`.                                                   |
| `cacheDir`   | Default `node_modules/.astro-og-kit`. `false` turns caching off.                                         |

Per page you can set `title`, `description`, `mark` (or `false`), `image`, `background` (or `false`),
`template`, `theme` and `data`.

## Notes

- Titles wrap by the font's glyph advance widths (the `hmtx` table). `wrapText` still accepts
  `maxChars` if you are not measuring a font.
- Images can be PNG, JPEG or GIF. WebP and AVIF work when sharp is installed.
- The cache lives in `node_modules/.astro-og-kit` and is keyed on the SVG, font bytes, and
  `compress` flag. It does not prune itself — delete that folder whenever you like.

## Develop

```sh
npm ci
npm test
npm run examples
```

Examples: `examples/backdrop` (bbcmonticello.com), `examples/editorial` (lukemcdonald.com),
`examples/custom` (a template that is just a function).

## License

MIT
