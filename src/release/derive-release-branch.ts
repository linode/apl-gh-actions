import { appendFileSync } from 'fs'
import { execSync } from 'child_process'
import { config } from 'dotenv'
import { computeReleaseBranchName, highestTag } from './version'

export function deriveReleaseBranch(bumpType: 'minor' | 'major', branchPrefix: string, tags: string[]): string {
  const highest = highestTag(tags)

  if (!highest) {
    throw new Error('No stable tags found in repository — cannot derive release branch name.')
  }

  const branch = computeReleaseBranchName(highest, bumpType, branchPrefix)
  console.log(`Highest stable tag: ${highest}`)
  console.log(`Derived release branch: ${branch}`)
  return branch
}

export function runDeriveReleaseBranchFromEnv(): string {
  const bumpType = process.env.BUMP_TYPE as 'minor' | 'major'
  const branchPrefix = process.env.RELEASE_BRANCH_PREFIX!

  if (bumpType !== 'minor' && bumpType !== 'major') {
    throw new Error(`Invalid BUMP_TYPE: "${bumpType}". Must be "minor" or "major".`)
  }

  const tagsRaw = execSync('git tag', { encoding: 'utf8' })
  const tags = tagsRaw.trim().split('\n').filter(Boolean)
  const branch = deriveReleaseBranch(bumpType, branchPrefix, tags)

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `branch=${branch}\n`)
  }
  if (process.env.GITHUB_ENV) {
    appendFileSync(process.env.GITHUB_ENV, `RELEASE_BRANCH=${branch}\n`)
  }

  return branch
}

if (require.main === module) {
  config()
  try {
    runDeriveReleaseBranchFromEnv()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}
