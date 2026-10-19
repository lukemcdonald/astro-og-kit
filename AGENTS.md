# Agents

- Templates are SVG strings. Do not add React, JSX, satori, or a headless browser.
- `@resvg/resvg-js` is the only runtime dependency. `sharp` stays an optional peer. Add no new dependencies.
- Never merge, publish, run the release workflow, or add secrets. Add a changeset (`npx changeset`) for user-facing changes in packages/astro-og-kit/src.
- PR titles must be Conventional Commits (`feat:`, `fix:`, `ci:`, …). The repo squash-merges using the title.
- `defineOg({ prefix })` is the image route prefix (default `/og`), not astro.config `base`. Page paths passed to `og.path()` / `og.route()` omit the deploy base.
- The OG route file needs a literal `export const prerender = true` (Astro detects it by regex).
