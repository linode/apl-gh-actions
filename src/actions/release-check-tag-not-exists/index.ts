import * as core from '@actions/core'
import { checkTagNotExists } from '../../release/check-tag-not-exists'

async function run() {
  const releaseTag = core.getInput('release_tag', { required: true })
  checkTagNotExists(releaseTag)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
})
