import * as core from '@actions/core'
import { computeNextTag, parseBumpType } from '../../release/compute-next-tag'

async function run() {
  const releaseBranch = core.getInput('release_branch') || 'main'
  const bumpType = parseBumpType(core.getInput('bump_type', { required: true }))
  // getBooleanInput rejects an empty string, so treat an omitted/blank value as the documented default
  const isPrerelease = core.getInput('is_prerelease') !== '' && core.getBooleanInput('is_prerelease')
  const requireRcBeforeStable = core.getBooleanInput('require_rc_before_stable')
  // action.yml supplies the "v" default; an explicitly empty prefix must survive as-is
  const tagPrefix = core.getInput('release_tag_prefix')

  const tag = computeNextTag({ releaseBranch, bumpType, isPrerelease, tagPrefix, requireRcBeforeStable })
  core.info(`Computed tag: ${tag}`)
  core.setOutput('tag', tag)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
})
