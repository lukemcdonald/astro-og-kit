---
'astro-og-kit': minor
---

Reshape `defineOg` into a flat Brand / Layout / Build config. `theme` is now `colors` (optional keys, plus `colors.logo`), `prefix`/`compress`/`cacheDir` move to `output`, templates are `split`/`cover`, and `photo` replaces `background`. Breaking; no shims.
