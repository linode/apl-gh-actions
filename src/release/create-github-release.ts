import { execSync } from 'child_process'
import { config } from 'dotenv'
import { previousRcTag, previousStableTagBefore } from './version'

export async function createGithubRelease(tag: string, isPrerelease: boolean, dryRun: boolean) {
  if (!tag) {
    throw new Error('RELEASE_TAG is required')
  }

  const allTags = execSync('git tag --sort=-v:refname', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter((t) => t.startsWith('v'))

  const previousTag = isPrerelease
    ? previousRcTag(tag, allTags)
    : previousStableTagBefore(tag, allTags)

  const prereleaseFlag = isPrerelease ? '--prerelease' : ''
  const notesStartFlag = previousTag ? `--notes-start-tag "${previousTag}"` : ''
  console.log(`Creating GitHub release for ${tag}`)
  console.log(`  prerelease: ${isPrerelease}`)
  console.log(`  previous tag: ${previousTag ?? '(none)'}`)

  if (dryRun) {
    console.log(`[dry-run] Would run: gh release create ${tag} --generate-notes ${notesStartFlag} ${prereleaseFlag}`)
    return
  }

  const notesCmd = [
    `gh release create "${tag}"`,
    `--title "Release ${tag}"`,
    `--generate-notes`,
    notesStartFlag,
    prereleaseFlag
  ].filter(Boolean).join(' ')

  execSync(notesCmd, { stdio: 'inherit' })
}

export async function runCreateGithubReleaseFromEnv() {
  const tag = process.env.RELEASE_TAG!
  const isPrerelease = process.env.IS_PRERELEASE === 'true'
  const dryRun = process.env.DRY_RUN === 'true'
  await createGithubRelease(tag, isPrerelease, dryRun)
}

if (require.main === module && !process.env.GITHUB_ACTIONS) {
  config()
  runCreateGithubReleaseFromEnv().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
