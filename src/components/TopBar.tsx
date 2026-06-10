import { Download, Eye, FileJson, PenLine, Printer } from 'lucide-react'
import { useReportStore } from '../store/reportStore'

function downloadJson(fileName: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function TopBar() {
  const mode = useReportStore((state) => state.mode)
  const setMode = useReportStore((state) => state.setMode)
  const template = useReportStore((state) => state.template)

  return (
    <header className="top-bar app-chrome">
      <div>
        <p className="eyebrow">WebReport Studio</p>
        <h1>{template.name}</h1>
      </div>

      <div className="top-actions">
        <div className="segmented" aria-label="작업 모드">
          <button
            type="button"
            className={mode === 'designer' ? 'active' : ''}
            onClick={() => setMode('designer')}
          >
            <PenLine size={16} />
            Designer
          </button>
          <button
            type="button"
            className={mode === 'viewer' ? 'active' : ''}
            onClick={() => setMode('viewer')}
          >
            <Eye size={16} />
            Viewer
          </button>
        </div>

        <button
          type="button"
          className="button"
          onClick={() => downloadJson(`${template.id}.report.json`, template)}
        >
          <FileJson size={16} />
          JSON 다운로드
        </button>
        <button type="button" className="button" onClick={() => window.print()}>
          <Printer size={16} />
          PDF 출력
        </button>
        <a className="button primary" href="#json-panel">
          <Download size={16} />
          템플릿 확인
        </a>
      </div>
    </header>
  )
}
