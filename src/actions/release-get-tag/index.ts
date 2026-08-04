import * as core from '@actions/core'
import { validateReleaseBranch } from '../../release/validate-branch'
import { runComputeTagFromEnv } from '../../release/compute-tag'
import { checkTagNotExists } from '../../release/check-tag-not-exists'

async function run() {
  const releaseBranch = core.getInput('release_branch', { required: true })
  const releaseBranchPrefix = core.getInput('release_branch_prefix') || 'releases/'
  const validateBranch = core.getBooleanInput('validate_branch')
  const checkTagExists = core.getBooleanInput('check_tag_not_exists')

  if (validateBranch) {
    validateReleaseBranch(releaseBranch, releaseBranchPrefix)
  }

  process.env.IS_PRERELEASE = core.getInput('is_prerelease', { required: true })
  process.env.RELEASE_BRANCH = releaseBranch
  process.env.RELEASE_BRANCH_PREFIX = releaseBranchPrefix
  process.env.RELEASE_TAG_PREFIX = core.getInput('release_tag_prefix') || 'v'
  process.env.REQUIRE_RC_BEFORE_STABLE = core.getInput('require_rc_before_stable') || 'false'

  const tag = runComputeTagFromEnv()

  if (checkTagExists) {
    checkTagNotExists(tag)
  }

  core.setOutput('tag', tag)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
})
