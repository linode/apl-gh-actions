import { execSync } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { computeTag, runComputeTagFromEnv } from './compute-tag'
import { releaseSeriesFromBranch } from './version'

describe('computeTag', () => {
  const releaseSeries = { major: 6, minor: 1 }
  const tagPrefix = 'v'

  it('returns next RC when branch has existing RC tags', () => {
    expect(computeTag(['v6.1.0-rc.2', 'v6.1.0-rc.1'], releaseSeries, false, tagPrefix, true)).toBe('v6.1.0-rc.3')
  })

  it('starts at rc.1 from branch name when no tags on branch', () => {
    expect(computeTag([], releaseSeries, false, tagPrefix, true)).toBe('v6.1.0-rc.1')
  })

  it('uses the configured release branch prefix', () => {
    const customSeries = releaseSeriesFromBranch('release/v6.1', 'release/')
    expect(computeTag([], customSeries, false, tagPrefix, true)).toBe('v6.1.0-rc.1')
  })

  it('promotes highest RC to stable', () => {
    expect(computeTag(['v6.1.0-rc.3', 'v6.1.0-rc.2'], releaseSeries, true, tagPrefix, true)).toBe('v6.1.0')
  })

  it('ignores RC tags from other release series when promoting', () => {
    expect(computeTag(['v7.0.0-rc.1', 'v6.1.0-rc.3'], releaseSeries, true, tagPrefix, true)).toBe('v6.1.0')
  })

  it('renders RC tags as pure SemVer when the tag prefix is empty', () => {
    expect(computeTag([], releaseSeries, false, '', true)).toBe('6.1.0-rc.1')
  })

  it('renders stable tags as pure SemVer when the tag prefix is empty', () => {
    expect(computeTag(['v6.1.0-rc.3'], releaseSeries, true, '', true)).toBe('6.1.0')
  })

  it('throws when requireRcBeforeStable is true and promoting to stable with no RC tags', () => {
    expect(() => computeTag([], releaseSeries, true, tagPrefix, true)).toThrow()
  })

  it('derives next stable patch when requireRcBeforeStable is false and no RC tags exist', () => {
    expect(computeTag(['v6.1.0', 'v6.1.1'], releaseSeries, true, tagPrefix, false)).toBe('v6.1.2')
  })
})

describe('runComputeTagFromEnv on a shallow checkout', () => {
  const originalCwd = process.cwd()
  const originalEnv = { ...process.env }
  let origin: string
  let shallowClone: string

  beforeEach(() => {
    origin = mkdtempSync(join(tmpdir(), 'release-tag-origin-'))
    execSync('git init -q -b releases/v6.1', { cwd: origin })
    execSync('git config user.email test@example.com', { cwd: origin })
    execSync('git config user.name Test', { cwd: origin })
    execSync('git commit -q --allow-empty -m first', { cwd: origin })
    execSync('git tag v6.1.0-rc.1', { cwd: origin })
    execSync('git commit -q --allow-empty -m second', { cwd: origin })

    shallowClone = mkdtempSync(join(tmpdir(), 'release-tag-clone-'))
    // fetch-depth: 1 leaves the clone with a single, parentless commit — mirrors the CI checkout
    // (file:// forces git to honor --depth; it's ignored for local filesystem paths)
    execSync(`git clone -q --depth 1 --branch releases/v6.1 "file://${origin}" .`, { cwd: shallowClone })
    execSync('git fetch -q --no-tags --depth 1 origin "+refs/tags/*:refs/tags/*"', { cwd: shallowClone })

    process.chdir(shallowClone)
    process.env.IS_PRERELEASE = 'true'
    process.env.RELEASE_BRANCH = 'releases/v6.1'
    process.env.RELEASE_BRANCH_PREFIX = 'releases/'
    process.env.RELEASE_TAG_PREFIX = 'v'
    process.env.REQUIRE_RC_BEFORE_STABLE = 'false'
    delete process.env.GITHUB_OUTPUT
  })

  afterEach(() => {
    process.chdir(originalCwd)
    process.env = { ...originalEnv }
    rmSync(origin, { recursive: true, force: true })
    rmSync(shallowClone, { recursive: true, force: true })
  })

  it('computes the next unused RC tag even when the prior RC commit is outside the shallow history', () => {
    expect(runComputeTagFromEnv()).toBe('v6.1.0-rc.2')
  })
})
