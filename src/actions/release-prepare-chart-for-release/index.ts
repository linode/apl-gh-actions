import * as core from '@actions/core'
import { prepareChartForRelease } from '../../prepare_chart_for_release'

async function run() {
  const releaseTag = core.getInput('release_tag', { required: true })
  const chartPath = core.getInput('chart_path') || 'chart/apl'
  prepareChartForRelease(releaseTag, chartPath)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  core.setFailed(message)
})
