import { Database, FileJson, Printer } from 'lucide-react'
import { useReportStore } from '../../store/reportStore'
import { JsonPanel } from '../JsonPanel'
import { ReportPreview } from './ReportPreview'

export function ViewerPage() {
  const sampleData = useReportStore((state) => state.sampleData)

  return (
    <div className="viewer-grid">
      <aside className="panel viewer-info app-chrome">
        <div className="panel-header">
          <span>호출 방식</span>
        </div>
        <div className="flow-list">
          <p>
            <FileJson size={16} />
            <code>GET /api/reports/:id</code>
          </p>
          <p>
            <Database size={16} />
            <code>GET /api/report-data/:source</code>
          </p>
          <p>
            <Printer size={16} />
            <code>template + data = preview/pdf</code>
          </p>
        </div>
        <pre className="data-preview">{JSON.stringify(sampleData, null, 2)}</pre>
      </aside>
      <ReportPreview />
      <JsonPanel />
    </div>
  )
}
