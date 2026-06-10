import { useMemo, useState } from 'react'
import { Clipboard, Upload } from 'lucide-react'
import { useReportStore } from '../store/reportStore'

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

  const copyJson = async () => {
    await navigator.clipboard.writeText(templateJson)
    setMessage('현재 템플릿 JSON을 클립보드에 복사했습니다.')
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
        <button type="button" className="button subtle" onClick={copyJson}>
          <Clipboard size={16} />
          복사
        </button>
        <button type="button" className="button primary" onClick={importJson}>
          <Upload size={16} />
          JSON 적용
        </button>
      </div>
    </section>
  )
}
