import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'
import { config } from 'dotenv'
import semver from 'semver'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

function updateChartYaml(chartPath: string, appVersion: string, releaseTag: string): void {
  const chartYamlPath = join(chartPath, 'Chart.yaml')
  const chartYaml = readFileSync(chartYamlPath, 'utf8')

  const updated = chartYaml
    .replaceAll('0.0.0-chart-version', releaseTag)
    .replaceAll('APP_VERSION_PLACEHOLDER', appVersion)

  writeFileSync(chartYamlPath, updated)
}

function generateSchema(chartPath: string): void {
  const valuesSchemaYaml = readFileSync('values-schema.yaml', 'utf8')
  const parsed = yaml.load(valuesSchemaYaml)
  const valuesSchemaJsonPath = join(chartPath, 'values.schema.json')

  writeFileSync(valuesSchemaJsonPath, `${JSON.stringify(parsed, null, 2)}\n`)
}

export function prepareChartForRelease(releaseTag: string, chartPath = 'chart/apl'): void {
  const appVersion = releaseTag

  updateChartYaml(chartPath, appVersion, releaseTag)
  generateSchema(chartPath)

  console.log(`Chart files updated successfully with version ${appVersion}`)
}

function runFromEnv(): void {
  const chartPath = process.env.CHART_PATH ?? 'chart/apl'
  const releaseTag = getRequiredEnv('RELEASE_TAG')
  prepareChartForRelease(releaseTag, chartPath)
}

if (require.main === module && !process.env.GITHUB_ACTIONS) {
  config()
  try {
    runFromEnv()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}