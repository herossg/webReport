import { useEffect, useState } from 'react'
import './App.css'
import { TopBar } from './components/TopBar'
import { DesignerPage } from './components/designer/DesignerPage'
import { ViewerPage } from './components/viewer/ViewerPage'
import { useReportStore } from './store/reportStore'

function getUrlModeOptions() {
  const params = new URLSearchParams(window.location.search)
  const path = window.location.pathname.replace(/\/$/, '')
  const embedValue = (params.get('embed') ?? '').toLowerCase()

  return {
    shouldOpenViewer:
      path === '/viewer' ||
      params.has('template') ||
      params.has('templateUrl') ||
      params.has('data') ||
      params.has('dataUrl'),
    embed: embedValue === '1' || embedValue === 'true' || embedValue === 'yes',
  }
}

function App() {
  const mode = useReportStore((state) => state.mode)
  const setMode = useReportStore((state) => state.setMode)
  const page = useReportStore((state) => state.template.page)
  const [{ shouldOpenViewer, embed }] = useState(getUrlModeOptions)
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

  useEffect(() => {
    if (shouldOpenViewer) {
      setMode('viewer')
    }
  }, [setMode, shouldOpenViewer])

  return (
    <div className={`app ${embed ? 'app-embed' : ''}`}>
      <style>{printStyle}</style>
      {embed ? null : <TopBar />}
      <main>{mode === 'designer' ? <DesignerPage /> : <ViewerPage />}</main>
    </div>
  )
}

export default App
