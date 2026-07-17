import { execSync } from 'child_process'
import { config } from 'dotenv'

export function checkBranchNotExists(branch: string) {
  if (!branch) {
    throw new Error('RELEASE_BRANCH is required')
  }

  let exists = true
  try {
    execSync(`git ls-remote --exit-code origin refs/heads/${branch}`, { stdio: 'pipe' })
  } catch {
    exists = false
  }

  if (exists) {
    throw new Error(`Branch "${branch}" already exists. Aborting to prevent cycle restart.`)
  }

  console.log(`Branch "${branch}" does not exist — safe to create`)
}

export function runCheckBranchNotExistsFromEnv() {
  checkBranchNotExists(process.env.RELEASE_BRANCH!)
}

if (require.main === module && !process.env.GITHUB_ACTIONS) {
  config()
  try {
    runCheckBranchNotExistsFromEnv()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}
