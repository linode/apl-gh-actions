import { execSync } from 'child_process'
import { config } from 'dotenv'
import { appendFileSync } from 'fs'
import {computeNextRcTag, computeStableTag, ReleaseSeries, highestTag} from './version'
import semver from "semver";

export function runComputeImageTagFromEnv(): string {
  const imageRepo = process.env.IMAGE_REPOSITORY
  const prerelease = process.env.IS_PRERELEASE !== 'true'
  const tagPrefix = process.env.RELEASE_TAG_PREFIX ?? ''
  const releaseType = process.env.RELEASE_TYPE ?? 'patch'
  const minorRaw = process.env.RELEASE_MINOR
  const majorRaw = process.env.RELEASE_MAJOR

  if (!imageRepo) {
    throw new Error('IMAGE_REPOSITORY is required')
  }
  if (!['patch', 'minor', 'major'].includes(releaseType)) {
    throw new Error('RELEASE_TYPE must be one of "patch" (default), "minor", or "major"')
  }
  if ((!minorRaw && majorRaw) || (minorRaw && !majorRaw)) {
    throw new Error('Either RELEASE_MINOR and RELEASE_MAJOR must be provided together, or neither of them.')
  }
  const minor = minorRaw ? parseInt(minorRaw, 10) : 0
  const major = majorRaw ? parseInt(majorRaw, 10) : 1
  if (isNaN(minor) || isNaN(major)) {
    throw new Error('RELEASE_MINOR and RELEASE_MAJOR must be valid integers')
  }

  const rawContent = execSync(`skopeo list-tags docker://${imageRepo}`, { encoding: 'utf8' })
  const parsedContent = JSON.parse(rawContent)

  const releaseSeries: ReleaseSeries = { major, minor }
  if (!majorRaw) {
    const latestTag = highestTag(parsedContent.Tags)
    if (latestTag) {
      const latestVersion = semver.parse(latestTag)
      if (latestVersion) {
          releaseSeries.major = latestVersion.major
          releaseSeries.minor = latestVersion.minor
      }
    }
    if (releaseType === 'minor') {
      releaseSeries.minor += 1
    } else if (releaseType === 'major') {
      releaseSeries.major += 1
      releaseSeries.minor = 0
    }
  }

  const tag = prerelease ?
      computeStableTag(parsedContent.Tags, releaseSeries, tagPrefix, false) : computeNextRcTag(parsedContent.Tags, releaseSeries, tagPrefix)
  console.log(`Computed tag: ${tag}`)

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `image_tag=${tag}\n`)
  }

  return tag
}

if (require.main === module && !process.env.GITHUB_ACTIONS) {
  config()
  try {
    runComputeImageTagFromEnv()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}
