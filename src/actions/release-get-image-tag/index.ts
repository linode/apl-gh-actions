import * as core from '@actions/core'
import { runComputeImageTagFromEnv } from "../../release/compute-image-tag";

async function run() {
  process.env.IMAGE_REPOSITORY = core.getInput('image_repository', { required: true })
  process.env.IS_PRERELEASE = core.getInput('is_prerelease') || 'false'
  process.env.RELEASE_TAG_PREFIX = core.getInput('release_tag_prefix') || 'v'
  process.env.RELEASE_TYPE = core.getInput('release_type') || 'patch'
  process.env.RELEASE_MINOR = core.getInput('release_minor') || ''
  process.env.RELEASE_MAJOR = core.getInput('release_major') || ''

  const tag = runComputeImageTagFromEnv()

  core.setOutput('tag', tag)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
})
