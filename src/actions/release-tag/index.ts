import * as core from '@actions/core'
import { tagRelease } from '../../release/tag-release'

async function run() {
  const releaseTag = core.getInput('release_tag', { required: true })
  const dryRun = core.getBooleanInput('dry_run')
  tagRelease(releaseTag, dryRun)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
})
