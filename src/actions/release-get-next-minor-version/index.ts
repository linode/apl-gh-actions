import * as core from '@actions/core'
import { execSync } from 'child_process'
import { computeNextMinor, highestTag } from '../../release/version'

async function run() {
  const tagsRaw = execSync('git tag', { encoding: 'utf8' })
  const tags = tagsRaw.trim().split('\n').filter(Boolean)
  const highest = highestTag(tags)

  if (!highest) throw new Error('No valid SemVer tags found')

  const version = computeNextMinor(highest)
  core.setOutput('version', version)
  core.exportVariable('RELEASE_VERSION', version)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
})