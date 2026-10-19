# Releasing

0.x only, always on the npm `next` tag. Install with `npm install astro-og-kit@next`. Publishing uses [trusted publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC). No `NPM_TOKEN`.

## Day to day

1. Make your change.
2. From the repo root, run `npx changeset`. Pick `astro-og-kit`, the bump, and a short summary.
3. Commit the new file in `.changeset/` with the rest of the work and open a PR.
4. When that PR merges to `main`, GitHub opens or updates a **Version Packages** PR (version + `packages/astro-og-kit/CHANGELOG.md`).
5. Merge the Version PR. CI runs `changeset publish --tag next` and publishes with provenance.

Docs and CI-only PRs do not need a changeset. CI warns you if `packages/astro-og-kit/src` changed without one. Use `npx changeset --empty` when you touched `src` but it should not release.

## Why `--tag next`, not prerelease mode

`changeset pre enter next` would version as `0.1.0-next.N`, but Changesets publishes those to **`latest`** while every published version is still a `next` prerelease — which is the current npm state (`0.1.0-next.0` only). You also cannot pass `--tag next` in prerelease mode.

So we keep normal 0.x versions and publish with `changeset publish --tag next`, plus `publishConfig.tag: next`. The release script refuses anything that is not 0.x.

## One-time leftover setup

1. **Trusted publisher** (if not already): https://www.npmjs.com/package/astro-og-kit → **Settings** → **Trusted Publisher** → **GitHub Actions**. Owner `lukemcdonald`, repo `astro-og-kit`, workflow filename `release.yml`. Allow **`npm publish`**. Complete a real publish within 2 days or the config expires.
2. **Repo setting**: Settings → Actions → General → enable **Allow GitHub Actions to create and approve pull requests**. Without this, the Version Packages PR fails (`GitHub Actions is not permitted to create or approve pull requests`).
3. Optional: `npm dist-tag rm astro-og-kit latest` so a bare `npm install astro-og-kit` does not install the experimental build. The first publish created both `latest` and `next`.

## Later: 1.0 and `latest`

1. Drop `"tag": "next"` from `packages/astro-og-kit/package.json` `publishConfig`.
2. Change the root `release` script to `changeset publish` (no `--tag next`).
3. Remove `scripts/guard-0x-version.mjs` from that script.
4. Add a major changeset, merge, then merge the Version PR.
