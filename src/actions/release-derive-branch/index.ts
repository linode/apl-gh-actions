import * as core from '@actions/core'
import { deriveReleaseBranch } from '../../release/derive-release-branch'
import { execSync } from 'child_process'

async function run() {
  const bumpType = core.getInput('bump_type', { required: true }) as 'minor' | 'major'
  const branchPrefix = core.getInput('release_branch_prefix') || 'releases/'
  const tagsRaw = execSync('git tag', { encoding: 'utf8' })
  const tags = tagsRaw.trim().split('\n').filter(Boolean)

  const branch = deriveReleaseBranch(bumpType, branchPrefix, tags)
  core.setOutput('branch', branch)
  core.exportVariable('RELEASE_BRANCH', branch)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
})
