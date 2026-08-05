# Overview

This repository hosts reusable GitHub Actions for the software release process.
The whole concept is built around the idea of enabling software engineers to continue development while working on a given software release in parallel. That being said, the main branch should never be blocked by the release process. Moreover, software engineers can always deliver patches on existing release branches, as presented in the git graph below:

```
main            ●───●───●───●───────────────────────────●───●───●───●───●───▶
                        │                               |
                        │ cut release branch            |
                        ▼                               |
releases/v1.4           ●───●───●───▶                   |
                        │       │                       |
                        ▼       ▼                       |
                     tag      tag                       |
                v1.4.0-rc.1  v1.4.0                     |
                                                        |
releases/v2.                                            ●───●───●───●───▶
                                                        │       │       
                                                        ▼       ▼       
                                                      tag      tag      
                                                v2.0.0-rc.1  v2.0.0-rc.2
```
From above:
1. A release branch (`releases/vMAJOR.MINOR`) is cut from `main` at a stable point.
2. `main` keeps moving independently (top line); fixes needed for the release are applied directly on the release branch.
3. Each git tag is derived from the previous git tag

# Quickstart

The best starting point is to look at GitHub workflows defined in the `./examples` and to reuse them in your repository.


# Usage
Run any script from the repository root:

```sh
npm run <script-name>
```

When changing action runtime code under `src/actions/` or release logic under `src/release/`, rebuild committed action bundles:

```sh
npm run build:actions
```

---

## `test`

Runs all Jest unit tests under `src/`.

---

# Release scripts

These scripts are designed to be called from GitHub Actions CI workflows. All read configuration from environment variables; use a `.env` file locally.

### `release:configure-git`

Sets the global git identity used for release commits.

| Variable | Description |
|---|---|
| `BOT_EMAIL` | `user.email` value |
| `BOT_USERNAME` | `user.name` value |

---

### `release:derive-release-branch`

Finds the highest stable tag and derives the next release branch name (`releases/vMAJOR.MINOR`) based on the requested bump type. Writes `branch` to `GITHUB_OUTPUT` and `RELEASE_BRANCH` to `GITHUB_ENV`.

| Variable | Description |
|---|---|
| `BUMP_TYPE` | `minor` or `major` |

---

### `release:check-branch-not-exists`

Exits non-zero if `RELEASE_BRANCH` already exists on `origin`. Prevents a CI workflow from restarting itself in a loop.

| Variable | Description |
|---|---|
| `RELEASE_BRANCH` | Branch name to check |

---

### `release:create-release-branch`

Creates a local git branch named `RELEASE_BRANCH`.

| Variable | Description |
|---|---|
| `RELEASE_BRANCH` | Branch name to create |

---

### `release:check-versions-yaml`

Validates `versions.yaml` at the repo root before a release is tagged:

- All values must be valid semver.
- On a stable release (`IS_PRERELEASE != true`), no RC versions are allowed.
- All referenced container images must exist on Docker Hub (`docker manifest inspect`).
- All referenced GitHub tags must exist (`gh api`).

| Variable | Default | Description |
|---|---|---|
| `IS_PRERELEASE` | — | Set to `true` for RC releases |
| `REPO_ROOT` | `../..` relative to script | Path to the repository root |

---

### `release:compute-tag`

Computes the next tag to create. When `IS_PRERELEASE=true`, increments the RC counter on `RELEASE_BRANCH`. When `IS_PRERELEASE` is absent or `false`, promotes the highest RC to a stable tag.

By default, promoting to stable does not require a prior RC tag on the branch: if none exists, the tag is derived from the highest existing stable patch in the series (or patch `0` if none exists). Set `REQUIRE_RC_BEFORE_STABLE=true` to restore the stricter behavior, where promoting without a prior RC tag fails.

Writes `tag` and `is_prerelease` to `GITHUB_OUTPUT`.

| Variable | Description |
|---|---|
| `RELEASE_BRANCH` | Branch name (e.g. `releases/v6.1`) |
| `IS_PRERELEASE` | `true` to cut an RC; omit or `false` to promote to stable |
| `REQUIRE_RC_BEFORE_STABLE` | `true` to require a prior RC tag before promoting to stable; omit or `false` to allow promoting without one |

---

### `release:check-tag-not-exists`

Exits non-zero if `RELEASE_TAG` already exists. Prevents duplicate releases.

| Variable | Description |
|---|---|
| `RELEASE_TAG` | Tag to check (e.g. `v6.1.0-rc.3`) |

---

### `release:tag-release`

Creates an annotated git tag for `RELEASE_TAG` and pushes it.

| Variable | Default | Description |
|---|---|---|
| `RELEASE_TAG` | — | Tag to create and push |
| `DRY_RUN` | `false` | Print the would-be command without executing |

---

### `release:create-github-release`

Creates a GitHub release using `gh release create --generate-notes`. Uses the previous tag as the notes start point so the generated changelog covers only the relevant range. Adds a pre-release warning banner for RC releases.

| Variable | Default | Description |
|---|---|---|
| `RELEASE_TAG` | — | Tag to release (must already exist) |
| `IS_PRERELEASE` | — | `true` to mark as pre-release |
| `DRY_RUN` | `false` | Print the would-be command without executing |

---

### `release:prepare-chart-for-release`

Prepares Helm chart files for a release tag:

- Updates `Chart.yaml` placeholders:
  - `0.0.0-chart-version` -> `<release-version>` derived from `RELEASE_TAG` via `semver.coerce`
  - `APP_VERSION_PLACEHOLDER` -> exact `RELEASE_TAG` input value
- Generates `values.schema.json` from `values-schema.yaml`

| Variable | Default | Description |
|---|---|---|
| `RELEASE_TAG` | — | Release tag to apply (for example `v6.0.0-rc.9`) |
| `CHART_PATH` | `chart/apl` | Chart directory containing `Chart.yaml` |

---
