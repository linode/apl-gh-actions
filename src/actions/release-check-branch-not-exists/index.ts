import * as core from '@actions/core'
import { checkBranchNotExists } from '../../release/check-branch-not-exists'

async function run() {
  const releaseBranch = core.getInput('release_branch', { required: true })
  checkBranchNotExists(releaseBranch)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
})
