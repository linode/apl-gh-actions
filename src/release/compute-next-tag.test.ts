import { execSync } from 'child_process'
import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { computeNextTag, runComputeNextTagFromEnv } from './compute-next-tag'

function git(cwd: string, command: string): string {
  return execSync(`git ${command}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function initRepo(branch = 'main'): string {
  const dir = mkdtempSync(join(tmpdir(), 'compute-next-tag-'))
  git(dir, `init -q -b ${branch}`)
  git(dir, 'config user.email test@example.com')
  git(dir, 'config user.name Test')
  git(dir, 'commit -q --allow-empty -m initial')
  return dir
}

function tagAll(dir: string, tags: string[]): void {
  for (const tag of tags) git(dir, `tag ${tag}`)
}

describe('runComputeNextTagFromEnv', () => {
  const originalCwd = process.cwd()
  const originalEnv = { ...process.env }
  const dirs: string[] = []

  function useRepo(dir: string, env: Record<string, string>): void {
    dirs.push(dir)
    process.chdir(dir)
    process.env.RELEASE_BRANCH = 'main'
    process.env.RELEASE_TAG_PREFIX = 'v'
    process.env.REQUIRE_RC_BEFORE_STABLE = 'false'
    delete process.env.GITHUB_OUTPUT
    Object.assign(process.env, env)
  }

  afterEach(() => {
    process.chdir(originalCwd)
    process.env = { ...originalEnv }
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  it('computes the first patch RC above the highest stable tag on main', () => {
    const repo = initRepo()
    tagAll(repo, ['v6.1.2'])
    git(repo, 'commit -q --allow-empty -m next')
    useRepo(repo, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'true' })

    expect(runComputeNextTagFromEnv()).toBe('v6.1.3-rc.1')
  })

  it('defaults RELEASE_BRANCH to main when unset', () => {
    const repo = initRepo('main')
    tagAll(repo, ['v6.1.2'])
    useRepo(repo, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'true' })
    delete process.env.RELEASE_BRANCH

    expect(runComputeNextTagFromEnv()).toBe('v6.1.3-rc.1')
  })

  it('defaults to a stable tag when IS_PRERELEASE is unset', () => {
    const repo = initRepo()
    tagAll(repo, ['v6.1.2'])
    useRepo(repo, { BUMP_TYPE: 'patch' })
    delete process.env.IS_PRERELEASE

    expect(runComputeNextTagFromEnv()).toBe('v6.1.3')
  })

  it.each([
    ['minor', 'v6.2.0-rc.1'],
    ['major', 'v7.0.0-rc.1'],
  ])('applies a %s bump to the highest stable tag', (bumpType, expected) => {
    const repo = initRepo()
    tagAll(repo, ['v6.1.2'])
    useRepo(repo, { BUMP_TYPE: bumpType, IS_PRERELEASE: 'true' })

    expect(runComputeNextTagFromEnv()).toBe(expected)
  })

  it('returns the bumped stable target directly when not a prerelease', () => {
    const repo = initRepo()
    tagAll(repo, ['v6.1.2'])
    useRepo(repo, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'false' })

    expect(runComputeNextTagFromEnv()).toBe('v6.1.3')
  })

  it('publishes the tag to GITHUB_OUTPUT', () => {
    const repo = initRepo()
    tagAll(repo, ['v6.1.2'])
    const output = join(repo, 'github-output')
    useRepo(repo, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'false', GITHUB_OUTPUT: output })

    runComputeNextTagFromEnv()

    expect(readFileSync(output, 'utf8')).toBe('tag=v6.1.3\n')
  })

  it('selects the baseline by SemVer precedence, ignoring prereleases, malformed and unrelated tags', () => {
    const repo = initRepo()
    tagAll(repo, ['v6.1.9', 'v6.1.10', 'v6.1.11-rc.1', 'v6.2.0-beta.1', 'v6.1.x', 'chart-9.9.9', 'latest'])
    useRepo(repo, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'false' })

    expect(runComputeNextTagFromEnv()).toBe('v6.1.11')
  })

  it('scopes the baseline to tags with the configured prefix', () => {
    const repo = initRepo()
    tagAll(repo, ['v9.0.0', 'chart-1.2.3', 'chart-1.2.4-rc.1'])
    useRepo(repo, { BUMP_TYPE: 'minor', IS_PRERELEASE: 'false', RELEASE_TAG_PREFIX: 'chart-' })

    expect(runComputeNextTagFromEnv()).toBe('chart-1.3.0')
  })

  it('accepts only unprefixed SemVer tags when the prefix is explicitly empty', () => {
    const repo = initRepo()
    tagAll(repo, ['v9.0.0', '1.2.3'])
    useRepo(repo, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'false', RELEASE_TAG_PREFIX: '' })

    expect(runComputeNextTagFromEnv()).toBe('1.2.4')
  })

  it('increments the highest numeric RC for the exact target, ignoring other targets and prefixes', () => {
    const repo = initRepo()
    tagAll(repo, ['v6.1.2', 'v6.1.3-rc.2', 'v6.1.3-rc.10', 'v6.2.0-rc.20', 'chart-6.1.3-rc.30'])
    useRepo(repo, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'true' })

    expect(runComputeNextTagFromEnv()).toBe('v6.1.3-rc.11')
  })

  describe('when REQUIRE_RC_BEFORE_STABLE=true', () => {
    it('returns the stable target when an RC exists for it', () => {
      const repo = initRepo()
      tagAll(repo, ['v6.1.2', 'v6.1.3-rc.1'])
      useRepo(repo, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'false', REQUIRE_RC_BEFORE_STABLE: 'true' })

      expect(runComputeNextTagFromEnv()).toBe('v6.1.3')
    })

    it('fails when only RCs for other targets or prefixes exist', () => {
      const repo = initRepo()
      tagAll(repo, ['v6.1.2', 'v6.2.0-rc.1', 'chart-6.1.3-rc.1'])
      useRepo(repo, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'false', REQUIRE_RC_BEFORE_STABLE: 'true' })

      expect(() => runComputeNextTagFromEnv()).toThrow(/no RC .*v6\.1\.3/i)
    })
  })

  it('fails clearly when no stable tag exists in the selected namespace', () => {
    const repo = initRepo()
    tagAll(repo, ['v6.1.0-rc.1', 'chart-1.0.0'])
    useRepo(repo, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'true' })

    expect(() => runComputeNextTagFromEnv()).toThrow(/no stable tag .*prefix "v"/i)
  })

  it.each(['prerelease', 'PATCH', ''])('rejects BUMP_TYPE "%s"', (bumpType) => {
    const repo = initRepo()
    tagAll(repo, ['v6.1.2'])
    useRepo(repo, { BUMP_TYPE: bumpType, IS_PRERELEASE: 'true' })

    expect(() => runComputeNextTagFromEnv()).toThrow(/Invalid BUMP_TYPE/)
  })

  describe('checkout identity', () => {
    it('fails when the requested branch ref is not available in the checkout', () => {
      const repo = initRepo('main')
      tagAll(repo, ['v6.1.2'])
      useRepo(repo, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'true', RELEASE_BRANCH: 'release' })

      expect(() => runComputeNextTagFromEnv()).toThrow(/branch "release" .*not found/i)
    })

    it('fails when HEAD is not the tip of the requested branch', () => {
      const repo = initRepo('main')
      tagAll(repo, ['v6.1.2'])
      git(repo, 'commit -q --allow-empty -m tip')
      git(repo, 'checkout -q HEAD~1')
      useRepo(repo, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'true' })

      expect(() => runComputeNextTagFromEnv()).toThrow(/HEAD .*does not match .*"main"/i)
    })

    it('accepts a detached HEAD pointing at the branch tip', () => {
      const repo = initRepo('main')
      tagAll(repo, ['v6.1.2'])
      git(repo, 'checkout -q --detach main')
      useRepo(repo, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'true' })

      expect(runComputeNextTagFromEnv()).toBe('v6.1.3-rc.1')
    })
  })

  describe('on a depth-1 checkout of main with fetched tag refs', () => {
    let origin: string
    let shallowClone: string

    beforeEach(() => {
      origin = initRepo('main')
      tagAll(origin, ['v6.1.2'])
      git(origin, 'commit -q --allow-empty -m "main work"')
      // a newer stable release and its RC live on a branch main has never merged
      git(origin, 'checkout -q -b releases/v6.2 HEAD~1')
      git(origin, 'commit -q --allow-empty -m "6.2 work"')
      tagAll(origin, ['v6.2.0', 'v6.2.1-rc.1'])
      git(origin, 'checkout -q main')
      git(origin, 'commit -q --allow-empty -m "more main work"')

      shallowClone = mkdtempSync(join(tmpdir(), 'compute-next-tag-clone-'))
      dirs.push(origin)
      // file:// forces git to honor --depth; mirrors actions/checkout fetch-depth: 1
      execSync(`git clone -q --depth 1 --branch main "file://${origin}" .`, { cwd: shallowClone })
      git(shallowClone, 'fetch -q --no-tags --depth 1 origin "+refs/tags/*:refs/tags/*"')
    })

    it('uses the repository-wide highest stable tag as baseline and counts RCs outside the shallow history', () => {
      useRepo(shallowClone, { BUMP_TYPE: 'patch', IS_PRERELEASE: 'true' })

      expect(runComputeNextTagFromEnv()).toBe('v6.2.1-rc.2')
    })

    it('leaves commits, branches and tags untouched', () => {
      useRepo(shallowClone, { BUMP_TYPE: 'minor', IS_PRERELEASE: 'false' })
      const refsBefore = git(shallowClone, 'show-ref')
      const headBefore = git(shallowClone, 'rev-parse HEAD')

      runComputeNextTagFromEnv()

      expect(git(shallowClone, 'show-ref')).toBe(refsBefore)
      expect(git(shallowClone, 'rev-parse HEAD')).toBe(headBefore)
      expect(git(origin, 'tag')).toEqual(expect.not.stringContaining('v6.3.0'))
    })
  })
})

describe('computeNextTag collision guard', () => {
  // Only reachable if tag listing and tag existence disagree (e.g. a tag created mid-run),
  // so the git boundary is faked to simulate that race.
  it('rejects an output tag that already exists instead of changing the bump', () => {
    const fakeGit = {
      head: () => 'abc',
      resolveRef: (ref: string) => (ref === 'refs/heads/main' || ref === 'refs/tags/v6.1.3' ? 'abc' : null),
      listTags: () => ['v6.1.2'],
    }

    expect(() =>
      computeNextTag(
        { releaseBranch: 'main', bumpType: 'patch', isPrerelease: false, tagPrefix: 'v', requireRcBeforeStable: false },
        fakeGit
      )
    ).toThrow(/Tag "v6\.1\.3" already exists/)
  })
})
