import * as core from '@actions/core'
import { checkVersionsYaml } from '../../release/check-versions-yaml'

async function run() {
  const isPrerelease = core.getInput('is_prerelease', { required: true })
  const repoRoot = core.getInput('repo_root') || process.env.GITHUB_WORKSPACE || '.'
  const token = core.getInput('github_token')

  if (token) {
    process.env.GITHUB_TOKEN = token
    process.env.GH_TOKEN = token
  }

  checkVersionsYaml(repoRoot, isPrerelease !== 'true')
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
})
