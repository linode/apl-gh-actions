import { execSync } from 'child_process'
import { config } from 'dotenv'
import { appendFileSync } from 'fs'
import semver from 'semver'

const BUMP_TYPES = ['patch', 'minor', 'major'] as const
export type BumpType = (typeof BUMP_TYPES)[number]

export interface ComputeNextTagOptions {
  releaseBranch: string
  bumpType: BumpType
  isPrerelease: boolean
  tagPrefix: string
  requireRcBeforeStable: boolean
}

// Read-only view of the checkout's refs; the real implementation shells out to git.
export interface GitRefs {
  head(): string
  resolveRef(ref: string): string | null
  listTags(): string[]
}

function git(command: string): string {
  return execSync(`git ${command}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

export const localGitRefs: GitRefs = {
  head: () => git('rev-parse HEAD'),
  resolveRef: (ref) => {
    try {
      return git(`rev-parse --verify --quiet ${ref}`)
    } catch {
      return null
    }
  },
  listTags: () => git('tag').split('\n').filter(Boolean),
}

export function parseBumpType(raw: string | undefined): BumpType {
  if (!BUMP_TYPES.includes(raw as BumpType)) {
    throw new Error(`Invalid BUMP_TYPE: "${raw ?? ''}". Must be one of: ${BUMP_TYPES.join(', ')}.`)
  }
  return raw as BumpType
}

// semver.parse() tolerates a leading "v"/"=" — reject it so an empty prefix never matches "v1.2.3"
function parseUnprefixedVersion(text: string): semver.SemVer | null {
  return /^\d/.test(text) ? semver.parse(text) : null
}

// Versions in the namespace: literal prefix stripped once, remainder must be a full unprefixed SemVer version.
function versionsInNamespace(tags: string[], tagPrefix: string): semver.SemVer[] {
  return tags
    .filter((tag) => tag.startsWith(tagPrefix))
    .map((tag) => parseUnprefixedVersion(tag.slice(tagPrefix.length)))
    .filter((version): version is semver.SemVer => version !== null)
}

function highestStable(versions: semver.SemVer[]): semver.SemVer | undefined {
  return versions.filter((version) => version.prerelease.length === 0).sort(semver.rcompare)[0]
}

function highestRcNumber(versions: semver.SemVer[], target: string): number {
  return versions
    .filter((version) => version.compareMain(target) === 0)
    .filter((version) => version.prerelease[0] === 'rc' && typeof version.prerelease[1] === 'number')
    .reduce((highest, version) => Math.max(highest, version.prerelease[1] as number), 0)
}

function assertHeadIsBranchTip(branch: string, refs: GitRefs): void {
  const tip = refs.resolveRef(`refs/heads/${branch}`) ?? refs.resolveRef(`refs/remotes/origin/${branch}`)
  if (!tip) {
    throw new Error(
      `Branch "${branch}" not found in checkout (looked for refs/heads/${branch} and refs/remotes/origin/${branch}) — check the checkout ref`
    )
  }

  const head = refs.head()
  if (head !== tip) {
    throw new Error(`HEAD (${head}) does not match the tip of branch "${branch}" (${tip}) — checkout the branch tip first`)
  }
}

export function computeNextTag(options: ComputeNextTagOptions, refs: GitRefs = localGitRefs): string {
  const { releaseBranch, bumpType, isPrerelease, tagPrefix, requireRcBeforeStable } = options

  assertHeadIsBranchTip(releaseBranch, refs)

  const versions = versionsInNamespace(refs.listTags(), tagPrefix)
  const baseline = highestStable(versions)
  if (!baseline) {
    throw new Error(
      `No stable tag found with prefix "${tagPrefix}" — create an initial stable tag in this namespace first`
    )
  }

  const target = new semver.SemVer(baseline.version).inc(bumpType).version
  const highestRc = highestRcNumber(versions, target)

  if (!isPrerelease && requireRcBeforeStable && highestRc === 0) {
    throw new Error(`No RC tag found for ${tagPrefix}${target} — cannot release stable without a prior RC`)
  }

  const tag = isPrerelease ? `${tagPrefix}${target}-rc.${highestRc + 1}` : `${tagPrefix}${target}`
  if (refs.resolveRef(`refs/tags/${tag}`)) {
    throw new Error(`Tag "${tag}" already exists. Aborting to prevent duplicate release.`)
  }

  return tag
}

export function runComputeNextTagFromEnv(): string {
  const tag = computeNextTag({
    releaseBranch: process.env.RELEASE_BRANCH || 'main',
    bumpType: parseBumpType(process.env.BUMP_TYPE),
    isPrerelease: process.env.IS_PRERELEASE === 'true',
    tagPrefix: process.env.RELEASE_TAG_PREFIX ?? '',
    requireRcBeforeStable: process.env.REQUIRE_RC_BEFORE_STABLE === 'true',
  })
  console.log(`Computed tag: ${tag}`)

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`)
  }

  return tag
}

if (require.main === module && !process.env.GITHUB_ACTIONS) {
  config()
  try {
    runComputeNextTagFromEnv()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}
