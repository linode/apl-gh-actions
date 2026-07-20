import * as core from '@actions/core'
import { createGithubRelease } from '../../release/create-github-release'

async function run() {
  const releaseTag = core.getInput('release_tag', { required: true })
  const isPrerelease = core.getInput('is_prerelease') === 'true'
  const dryRun = core.getBooleanInput('dry_run')
  const token = core.getInput('github_token')

  if (token) {
    process.env.GITHUB_TOKEN = token
    process.env.GH_TOKEN = token
  }

  await createGithubRelease(releaseTag, isPrerelease, dryRun)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
})
