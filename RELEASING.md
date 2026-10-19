# Releasing

0.x only, always on the npm `next` tag. Install with `npm install astro-og-kit@next`. Publishing uses [trusted publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC). No `NPM_TOKEN`.

## Day to day

1. Make your change.
2. From the repo root, run `npx changeset`. Pick `astro-og-kit`, the bump, and a short summary.
3. Commit the new file in `.changeset/` with the rest of the work and open a PR.
4. When that PR merges to `main`, GitHub opens or updates a Version PR titled `chore: version packages`.
5. Merge the Version PR. CI publishes with `changeset publish --tag next`.

Docs and CI-only PRs do not need a changeset. If `packages/astro-og-kit/src` changed without one, the required `check` fails. Use `npx changeset --empty` when you touched `src` but it should not release.

PR titles must be Conventional Commits. `pr-title` stays advisory: the Version PR is opened with `GITHUB_TOKEN`, so that check never runs there and must not be required.

### Version PR and `check`

`main` requires `check`. The Version PR is opened with `GITHUB_TOKEN`, which does not start `push` / `pull_request` workflows. After opening or updating that PR, `release.yml` dispatches `ci.yml` onto `changeset-release/*`. If `check` is still missing, merge with admin bypass.

## Why `--tag next`, not prerelease mode

`changeset pre enter next` would version as `0.1.0-next.N`, but Changesets publishes those to `latest` while every published version is still a `next` prerelease (today: `0.1.0-next.0` only). You also cannot pass `--tag next` in prerelease mode.

We keep normal 0.x versions and publish with `changeset publish --tag next`, plus `publishConfig.tag: next`. The release script refuses anything that is not 0.x.

`latest` stays on `0.1.0-next.0`. New releases go to `next`. npm will not remove the `latest` tag.

## One-time leftover setup

1. **Trusted publisher** (if not already): https://www.npmjs.com/package/astro-og-kit → Settings → Trusted Publisher → GitHub Actions. Owner `lukemcdonald`, repo `astro-og-kit`, workflow filename `release.yml`. Leave Environment blank. Allow `npm publish`. A new config must complete its first publish within [2 days](https://docs.npmjs.com/trusted-publishers/).
2. **Repo setting**: Settings → Actions → General → enable Allow GitHub Actions to create and approve pull requests.

## Later: 1.0 and `latest`

1. Drop `"tag": "next"` from `packages/astro-og-kit/package.json` `publishConfig`.
2. Change the root `release` script to `changeset publish` (no `--tag next`).
3. Remove `scripts/guard-0x-version.mjs` from that script.
4. Add a major changeset, merge, then merge the Version PR.
