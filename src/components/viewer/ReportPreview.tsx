import { useReportStore } from '../../store/reportStore'
import { paginateReport } from '../../report/pagination'
import { ReportElementRenderer } from '../ReportElementRenderer'

export function ReportPreview() {
  const template = useReportStore((state) => state.template)
  const sampleData = useReportStore((state) => state.sampleData)
  const previewScale = Math.min(1, 588 / template.page.width)
  const pages = paginateReport(template, sampleData)

  return (
    <section className="preview-workbench">
      <div className="preview-pages">
        {pages.map((page) => (
          <div
            key={page.pageNumber}
            className="preview-page-shell"
            style={{
              width: Math.round(template.page.width * previewScale),
              height: Math.round(template.page.height * previewScale),
            }}
          >
            <div
              className="report-page preview-page"
              style={{
                width: template.page.width,
                height: template.page.height,
                transform: `scale(${previewScale})`,
              }}
            >
              {page.elements.map((item, index) => (
                <div
                  key={`${item.element.id}-${page.pageNumber}-${index}`}
                  className="preview-element"
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                  }}
                >
                  <ReportElementRenderer
                    element={item.element}
                    data={sampleData}
                    mode="viewer"
                    tableRows={item.rows}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
