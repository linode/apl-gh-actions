export function validateReleaseBranch(branchName: string, branchPrefix: string): void {
  if (!branchName.startsWith(branchPrefix)) {
    throw new Error(`release_from_branch may only run on ${branchPrefix}* branches. Got: ${branchName}`)
  }
}
