import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { prepareChartForRelease } from './prepare_chart_for_release'

describe('prepareChartForRelease', () => {
  const originalCwd = process.cwd()
  let workspace: string
  let chartPath: string

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'prepare-chart-'))
    chartPath = join(workspace, 'charts', 'apl-test')
    mkdirSync(chartPath, { recursive: true })
    process.chdir(workspace)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(workspace, { recursive: true, force: true })
    jest.restoreAllMocks()
  })

  it('replaces all chart version and app version placeholders', () => {
    writeFileSync(join(chartPath, 'Chart.yaml'), [
      'version: 0.0.0-chart-version',
      'appVersion: APP_VERSION_PLACEHOLDER',
      'annotations:',
      '  release: 0.0.0-chart-version',
      '',
    ].join('\n'))
    writeFileSync('values-schema.yaml', '{}\n')

    prepareChartForRelease('v6.0.0-rc.9', chartPath)

    expect(readFileSync(join(chartPath, 'Chart.yaml'), 'utf8')).toBe([
      'version: v6.0.0-rc.9',
      'appVersion: v6.0.0-rc.9',
      'annotations:',
      '  release: v6.0.0-rc.9',
      '',
    ].join('\n'))
  })

  it('generates formatted JSON schema in the selected chart directory', () => {
    writeFileSync(join(chartPath, 'Chart.yaml'), 'version: 0.0.0-chart-version\n')
    writeFileSync('values-schema.yaml', [
      'type: object',
      'properties:',
      '  replicas:',
      '    type: integer',
      '',
    ].join('\n'))

    prepareChartForRelease('v1.2.3', chartPath)

    expect(readFileSync(join(chartPath, 'values.schema.json'), 'utf8')).toBe(`${JSON.stringify({
      type: 'object',
      properties: {
        replicas: {
          type: 'integer',
        },
      },
    }, null, 2)}\n`)
  })
})