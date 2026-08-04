import { validateReleaseBranch } from './validate-branch'

describe('validateReleaseBranch', () => {
  it('does not throw when the branch starts with the configured prefix', () => {
    expect(() => validateReleaseBranch('releases/v6.1', 'releases/')).not.toThrow()
  })

  it('throws a descriptive error when the branch does not start with the configured prefix', () => {
    expect(() => validateReleaseBranch('main', 'releases/')).toThrow(
      'release_from_branch may only run on releases/* branches. Got: main'
    )
  })
})
