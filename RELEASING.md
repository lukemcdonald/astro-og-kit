# Releasing

0.x only, always under the npm `next` dist-tag. The workflow uses [trusted publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC). It never uses `NPM_TOKEN` or `NODE_AUTH_TOKEN`. npm CLI 11.5.1+ is required; the job upgrades npm.

## One-time: first publish

The package must already exist on npm before a trusted publisher can be configured ([`npm trust`](https://docs.npmjs.com/cli/v11/commands/npm-trust/): "Package must exist"). A first OIDC publish fails when the package is missing.

From the repo root after `npm ci` and `npm run build`:

```sh
cd packages/astro-og-kit
npm publish --tag next --access public
```

`--tag next` sets `next`, not `latest`. Confirm with `npm dist-tag ls astro-og-kit`. If the registry also created `latest`, remove it:

```sh
npm dist-tag rm astro-og-kit latest
```

## One-time: trusted publisher

1. https://www.npmjs.com/package/astro-og-kit → **Settings** → **Trusted Publisher** → **GitHub Actions**.
2. Owner `lukemcdonald`, repository `astro-og-kit`, workflow filename `release.yml` (filename only). Leave environment blank.
3. Allow **`npm publish`**. Configs created after 3 Sep 2026 default to staged publish only.
4. Run a real (non-dry-run) workflow publish within 2 days, or the config expires.

## Cut a 0.x release on `next`

1. Bump `packages/astro-og-kit` to another `0.x` or `0.x` prerelease.
2. Merge to `main`.
3. Actions → **Release (next)** → Run workflow. Leave **dry_run** on to inspect the tarball; turn it off to publish.
4. The job refuses anything that is not `0.x` / `0.x`-prerelease, then runs `npm publish --tag next --provenance --access public`.
