import { execSync } from 'child_process'
import { config } from 'dotenv'

export function checkTagNotExists(tag: string) {
  if (!tag) {
    throw new Error('RELEASE_TAG is required')
  }

  let exists = true
  try {
    execSync(`git rev-parse --verify "refs/tags/${tag}"`, { stdio: 'pipe' })
  } catch {
    exists = false
  }

  if (exists) {
    throw new Error(`Tag "${tag}" already exists. Aborting to prevent duplicate release.`)
  }

  console.log(`Tag "${tag}" does not exist — safe to create`)
}

export function runCheckTagNotExistsFromEnv() {
  checkTagNotExists(process.env.RELEASE_TAG!)
}

if (require.main === module && !process.env.GITHUB_ACTIONS) {
  config()
  try {
    runCheckTagNotExistsFromEnv()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}
