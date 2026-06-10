import { useMemo, useRef, useState } from 'react'
import { Clipboard, Download, FileUp, Upload } from 'lucide-react'
import { useReportStore } from '../store/reportStore'

function downloadTextFile(fileName: string, value: string) {
  const blob = new Blob([value], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function JsonPanel() {
  const template = useReportStore((state) => state.template)
  const loadTemplateFromJson = useReportStore((state) => state.loadTemplateFromJson)
  const templateJson = useMemo(() => JSON.stringify(template, null, 2), [template])

  return <JsonEditor key={templateJson} templateJson={templateJson} loadTemplateFromJson={loadTemplateFromJson} />
}

interface JsonEditorProps {
  templateJson: string
  loadTemplateFromJson: ReturnType<typeof useReportStore.getState>['loadTemplateFromJson']
}

function JsonEditor({ templateJson, loadTemplateFromJson }: JsonEditorProps) {
  const [draft, setDraft] = useState(templateJson)
  const [message, setMessage] = useState('템플릿 JSON은 다른 페이지의 Viewer에서 그대로 호출할 수 있습니다.')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const copyJson = async () => {
    await navigator.clipboard.writeText(templateJson)
    setMessage('현재 템플릿 JSON을 클립보드에 복사했습니다.')
  }

  const downloadJson = () => {
    const templateId = JSON.parse(templateJson) as { id?: unknown }
    const fileName = typeof templateId.id === 'string' ? `${templateId.id}.report.json` : 'report-template.report.json'

    downloadTextFile(fileName, templateJson)
    setMessage(`${fileName} 파일로 저장했습니다.`)
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const importFile = async (file: File | undefined) => {
    if (!file) {
      return
    }

    const text = await file.text()
    const result = loadTemplateFromJson(text)

    setDraft(text)

    if (result.ok) {
      setMessage(`${file.name} 파일을 불러와 캔버스에 반영했습니다.`)
      return
    }

    setMessage(result.error ?? `${file.name} 파일을 불러오지 못했습니다.`)
  }

  const importJson = () => {
    const result = loadTemplateFromJson(draft)

    if (result.ok) {
      setMessage('JSON 템플릿을 캔버스에 반영했습니다.')
      return
    }

    setMessage(result.error ?? 'JSON을 불러오지 못했습니다.')
  }

  return (
    <section className="panel json-panel app-chrome" id="json-panel">
      <div className="panel-header">
        <span>Report Template JSON</span>
        <small>{message}</small>
      </div>
      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck={false} />
      <div className="button-row">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            void importFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <button type="button" className="button subtle" onClick={copyJson}>
          <Clipboard size={16} />
          복사
        </button>
        <button type="button" className="button subtle" onClick={downloadJson}>
          <Download size={16} />
          파일 저장
        </button>
        <button type="button" className="button subtle" onClick={openFilePicker}>
          <FileUp size={16} />
          파일 불러오기
        </button>
        <button type="button" className="button primary" onClick={importJson}>
          <Upload size={16} />
          JSON 적용
        </button>
      </div>
    </section>
  )
}
