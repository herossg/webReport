import { useEffect, useState } from 'react'
import { Database, FileJson, Link, Printer } from 'lucide-react'
import { useReportStore } from '../../store/reportStore'
import { resolvePath } from '../../report/bindings'
import type { ReportData, ReportDataSource } from '../../report/types'
import { JsonPanel } from '../JsonPanel'
import { ReportPreview } from './ReportPreview'

interface ViewerUrlOptions {
  templateUrl: string | null
  dataUrl: string | null
  embed: boolean
}

interface UrlLoadState {
  status: 'idle' | 'loading' | 'loaded' | 'error'
  message: string
}

function isRecord(value: unknown): value is ReportData {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isDataSource(value: unknown): value is ReportDataSource {
  if (!isRecord(value)) {
    return false
  }

  return typeof value.id === 'string' && typeof value.label === 'string'
}

function getTemplateDataSources(value: unknown): ReportDataSource[] {
  if (!isRecord(value) || !Array.isArray(value.dataSources)) {
    return []
  }

  return value.dataSources.filter(isDataSource)
}

function getDataSourcePayload(payload: unknown, path: string | undefined): unknown {
  const trimmedPath = path?.trim()

  return trimmedPath ? resolvePath(payload, trimmedPath) : payload
}

function getViewerUrlOptions(): ViewerUrlOptions {
  const params = new URLSearchParams(window.location.search)
  const embedValue = (params.get('embed') ?? '').toLowerCase()

  return {
    templateUrl: params.get('template') ?? params.get('templateUrl'),
    dataUrl: params.get('data') ?? params.get('dataUrl'),
    embed: embedValue === '1' || embedValue === 'true' || embedValue === 'yes',
  }
}

async function fetchRequired(url: string): Promise<Response> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`${url} 호출 실패 (${response.status})`)
  }

  return response
}

export function ViewerPage() {
  const sampleData = useReportStore((state) => state.sampleData)
  const loadTemplateFromJson = useReportStore((state) => state.loadTemplateFromJson)
  const setReportData = useReportStore((state) => state.setReportData)
  const [{ templateUrl, dataUrl, embed }] = useState(getViewerUrlOptions)
  const [loadState, setLoadState] = useState<UrlLoadState>({
    status: templateUrl || dataUrl ? 'loading' : 'idle',
    message: templateUrl || dataUrl ? 'URL 리소스를 불러오는 중입니다.' : 'URL 템플릿을 지정하지 않았습니다.',
  })

  useEffect(() => {
    if (!templateUrl && !dataUrl) {
      return
    }

    let active = true

    async function loadUrlResources() {
      setLoadState({
        status: 'loading',
        message: 'URL 리소스를 불러오는 중입니다.',
      })

      try {
        const loaded: string[] = []
        let nextData: ReportData | null = null
        let templateDataSources = useReportStore.getState().template.dataSources

        if (templateUrl) {
          const response = await fetchRequired(templateUrl)
          const templateText = await response.text()
          const parsedTemplate = JSON.parse(templateText) as unknown
          const result = loadTemplateFromJson(templateText)

          if (!result.ok) {
            throw new Error(result.error ?? '템플릿 JSON을 읽을 수 없습니다.')
          }

          templateDataSources = getTemplateDataSources(parsedTemplate)
          loaded.push('template')
        }

        if (dataUrl) {
          const response = await fetchRequired(dataUrl)
          const data = (await response.json()) as unknown

          if (!isRecord(data)) {
            throw new Error('데이터 JSON은 객체 형태여야 합니다.')
          }

          nextData = data
          loaded.push('data')
        }

        const sourceUrls = templateDataSources.filter((dataSource) => dataSource.url?.trim())

        if (sourceUrls.length > 0) {
          nextData = nextData ? { ...nextData } : { ...useReportStore.getState().sampleData }

          const responseCache = new Map<string, unknown>()

          for (const dataSource of sourceUrls) {
            const url = dataSource.url?.trim()

            if (!url) {
              continue
            }

            if (!responseCache.has(url)) {
              const response = await fetchRequired(url)
              responseCache.set(url, await response.json())
            }

            nextData[dataSource.id] = getDataSourcePayload(responseCache.get(url), dataSource.path)
          }

          loaded.push(`${sourceUrls.length} dataSource`)
        }

        if (nextData) {
          setReportData(nextData)
        }

        if (active) {
          setLoadState({
            status: 'loaded',
            message: `${loaded.join(' + ')} 로딩 완료`,
          })
        }
      } catch (error) {
        if (active) {
          setLoadState({
            status: 'error',
            message: error instanceof Error ? error.message : 'URL 리소스를 불러오지 못했습니다.',
          })
        }
      }
    }

    void loadUrlResources()

    return () => {
      active = false
    }
  }, [dataUrl, loadTemplateFromJson, setReportData, templateUrl])

  if (embed) {
    return (
      <div className="viewer-grid viewer-grid-embed">
        <ReportPreview />
      </div>
    )
  }

  return (
    <div className="viewer-grid">
      <aside className="panel viewer-info app-chrome">
        <div className="panel-header">
          <span>호출 방식</span>
        </div>
        <div className="flow-list">
          <p>
            <FileJson size={16} />
            <code>/viewer?template=/reports/:id.json</code>
          </p>
          <p>
            <Database size={16} />
            <code>template.dataSources[].url</code>
          </p>
          <p>
            <Printer size={16} />
            <code>template + data = preview/pdf</code>
          </p>
          <p>
            <Link size={16} />
            <code>&embed=1</code>
          </p>
        </div>
        <div className={`url-load-state ${loadState.status}`}>
          <strong>URL Viewer</strong>
          <span>{loadState.message}</span>
          {templateUrl ? <code>{templateUrl}</code> : null}
          {dataUrl ? <code>{dataUrl}</code> : null}
        </div>
        <pre className="data-preview">{JSON.stringify(sampleData, null, 2)}</pre>
      </aside>
      <ReportPreview />
      <JsonPanel />
    </div>
  )
}
