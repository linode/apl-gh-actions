import * as core from '@actions/core'
import { createReleaseBranch } from '../../release/create-release-branch'

async function run() {
  const releaseBranch = core.getInput('release_branch', { required: true })
  createReleaseBranch(releaseBranch)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
})
