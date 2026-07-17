import * as core from '@actions/core'
import { runComputeTagFromEnv } from '../../release/compute-tag'

async function run() {
  process.env.IS_PRERELEASE = core.getInput('is_prerelease', { required: true })
  process.env.RELEASE_BRANCH = core.getInput('release_branch', { required: true })
  process.env.RELEASE_BRANCH_PREFIX = core.getInput('release_branch_prefix') || 'releases/'
  process.env.RELEASE_TAG_PREFIX = core.getInput('release_tag_prefix') || 'v'

  const tag = runComputeTagFromEnv()
  core.setOutput('tag', tag)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
})
