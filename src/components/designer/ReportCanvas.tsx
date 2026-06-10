import { Rnd } from 'react-rnd'
import { useReportStore } from '../../store/reportStore'
import { ReportElementRenderer } from '../ReportElementRenderer'

export function ReportCanvas() {
  const template = useReportStore((state) => state.template)
  const sampleData = useReportStore((state) => state.sampleData)
  const selectedElementId = useReportStore((state) => state.selectedElementId)
  const selectedSectionId = useReportStore((state) => state.selectedSectionId)
  const selectElement = useReportStore((state) => state.selectElement)
  const selectSection = useReportStore((state) => state.selectSection)
  const updateElement = useReportStore((state) => state.updateElement)

  return (
    <section className="canvas-workbench">
      <div className="canvas-toolbar app-chrome">
        <span>
          {template.page.size} / {template.page.orientation === 'portrait' ? '세로' : '가로'}
        </span>
        <span>
          {template.page.width}px x {template.page.height}px
        </span>
      </div>

      <div
        className="report-page designer-page"
        style={{
          width: template.page.width,
          height: template.page.height,
        }}
        onMouseDown={() => selectElement(null)}
      >
        <div
          className="page-margin-guide"
          style={{
            top: template.page.margin.top,
            right: template.page.margin.right,
            bottom: template.page.margin.bottom,
            left: template.page.margin.left,
          }}
        />

        {template.sections.map((section) => (
          <div
            key={section.id}
            className={`section-guide ${section.type} ${selectedSectionId === section.id ? 'selected' : ''}`}
            data-section-id={section.id}
            style={{
              top: section.baseY,
              height: section.height,
            }}
            onMouseDown={(event) => {
              event.stopPropagation()
              selectSection(section.id)
            }}
          >
            <span>{section.name}</span>
          </div>
        ))}

        {template.elements.map((element) => (
          <Rnd
            key={element.id}
            bounds="parent"
            dragGrid={[4, 4]}
            resizeGrid={[4, 4]}
            minWidth={element.type === 'line' ? 24 : 48}
            minHeight={element.type === 'line' ? 2 : 24}
            size={{
              width: element.width,
              height: element.height,
            }}
            position={{
              x: element.x,
              y: element.y,
            }}
            className={`designer-element ${selectedElementId === element.id ? 'selected' : ''}`}
            onMouseDown={(event: MouseEvent) => {
              event.stopPropagation()
              selectElement(element.id)
            }}
            onDragStop={(_event, data) => {
              updateElement(element.id, {
                x: data.x,
                y: data.y,
              })
            }}
            onResizeStop={(_event, _direction, ref, _delta, position) => {
              updateElement(element.id, {
                width: ref.offsetWidth,
                height: ref.offsetHeight,
                x: position.x,
                y: position.y,
              })
            }}
          >
            <ReportElementRenderer element={element} data={sampleData} mode="designer" />
          </Rnd>
        ))}
      </div>
    </section>
  )
}
