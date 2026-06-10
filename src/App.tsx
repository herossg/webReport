import './App.css'
import { TopBar } from './components/TopBar'
import { DesignerPage } from './components/designer/DesignerPage'
import { ViewerPage } from './components/viewer/ViewerPage'
import { useReportStore } from './store/reportStore'

function App() {
  const mode = useReportStore((state) => state.mode)
  const page = useReportStore((state) => state.template.page)
  const printStyle = `
    @page {
      size: ${page.widthMm}mm ${page.heightMm}mm;
      margin: 0;
    }

    @media print {
      .report-page {
        width: ${page.widthMm}mm !important;
        height: ${page.heightMm}mm !important;
      }

      .page-margin-guide {
        display: none !important;
      }
    }
  `

  return (
    <div className="app">
      <style>{printStyle}</style>
      <TopBar />
      <main>{mode === 'designer' ? <DesignerPage /> : <ViewerPage />}</main>
    </div>
  )
}

export default App
