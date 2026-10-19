# Agents

- Templates are SVG strings. Do not add React, JSX, satori, or a headless browser.
- `@resvg/resvg-js` is the only runtime dependency. `sharp` stays an optional peer. Add no new dependencies.
- Do not merge, publish to npm, trigger the release workflow, or add secrets (no `NPM_TOKEN`). Add a changeset (`npx changeset`) for user-facing package changes. Never publish. See RELEASING.md.
- PR titles must be Conventional Commits (`feat:`, `fix:`, `ci:`, …). The repo squash-merges using the title.
- `defineOg({ prefix })` is the image route prefix (default `/og`), not astro.config `base`. Page paths passed to `og.path()` / `og.route()` omit the deploy base.
- The OG route file needs a literal `export const prerender = true` (Astro detects it by regex).
