import { execSync } from 'child_process'
import { config } from 'dotenv'

export function tagRelease(releaseTag: string, dryRun: boolean) {
  if (!releaseTag) {
    throw new Error('RELEASE_TAG is required')
  }

  if (dryRun) {
    console.log(`[dry-run] Would create and push tag ${releaseTag}`)
    return
  }

  execSync(`git tag -a "${releaseTag}" -m "Release ${releaseTag}"`, { stdio: 'inherit' })
  execSync(`git push --follow-tags`, { stdio: 'inherit' })
  console.log(`Tagged and pushed: ${releaseTag}`)
}

export function runTagReleaseFromEnv() {
  const releaseTag = process.env.RELEASE_TAG!
  const dryRun = process.env.DRY_RUN === 'true'
  tagRelease(releaseTag, dryRun)
}

if (require.main === module && !process.env.GITHUB_ACTIONS) {
  config()
  try {
    runTagReleaseFromEnv()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}
