import { build } from 'esbuild'

const actions = [
  'release-derive-branch',
  'release-check-branch-not-exists',
  'release-create-branch',
  'release-get-next-minor',
  'release-compute-tag',
  'release-check-tag-not-exists',
  'release-prepare-chart-for-release',
  'release-tag',
  'release-create-github-release',
  'release-check-versions-yaml',
]

for (const action of actions) {
  await build({
    bundle: true,
    entryPoints: [`src/actions/${action}/index.ts`],
    outfile: `actions/${action}/dist/index.js`,
    format: 'cjs',
    platform: 'node',
    target: 'node24',
    sourcemap: false,
  })
}
