# astro-og-kit

## 0.4.0

### Minor Changes

- 48492af: Reshape `defineOg` into a flat Brand / Layout / Build config. `theme` is now `colors` (optional keys, plus `colors.logo`), `prefix`/`compress`/`cacheDir` move to `output`, templates are `split`/`cover`, and `photo` replaces `background`. Breaking; no shims.
- 4fed8d7: Add `heading` for the card text (defaults to `title`). Breaking: rename the card photo prop from `image` to `photo`. `image` is now an explicit og:image override (absolute URL or a path resolved against the site) and skips PNG generation.

## 0.3.0

### Minor Changes

- 0c722ff: Generate Open Graph images from `<OgMeta>` via `ogKit(og)` in astro.config. No page list, route file, or `og` prop.

## 0.2.0

### Minor Changes

- 70be311: Fix og:url for build.format 'file' and native deps under pnpm. Add OgMeta url, titleLineHeight, WIDTH/HEIGHT, cover-box photo downscale, and per-page logo override.

## 0.1.0

### Minor Changes

- e890a06: Rename `mark` to `footer`. Simpler README with rendered examples.
