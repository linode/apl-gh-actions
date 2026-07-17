import { execSync } from 'child_process'
import { config } from 'dotenv'

export function createReleaseBranch(branch: string) {
  if (!branch) {
    throw new Error('RELEASE_BRANCH is required')
  }

  execSync(`git checkout -b "${branch}"`, { stdio: 'inherit' })
  console.log(`Created branch: ${branch}`)
}

export function runCreateReleaseBranchFromEnv() {
  createReleaseBranch(process.env.RELEASE_BRANCH!)
}

if (require.main === module && !process.env.GITHUB_ACTIONS) {
  config()
  try {
    runCreateReleaseBranchFromEnv()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}
