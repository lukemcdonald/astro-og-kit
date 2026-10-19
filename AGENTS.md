# Agents

- Templates are SVG strings. Do not add React, JSX, satori, or a headless browser.
- `@resvg/resvg-js` is the only runtime dependency. `sharp` stays an optional peer. Add no new dependencies.
- Do not merge, publish to npm, trigger the release workflow, or add secrets.
- `defineOg({ prefix })` is the image route prefix (default `/og`), not astro.config `base`. Page paths passed to `og.path()` / `og.route()` omit the deploy base.
- The OG route file needs a literal `export const prerender = true` (Astro detects it by regex).
