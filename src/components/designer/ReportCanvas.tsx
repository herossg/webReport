import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Rnd } from 'react-rnd'
import { getScopedData } from '../../report/bindings'
import type { ReportElement, ReportSection, ReportTemplate } from '../../report/types'
import { useReportStore } from '../../store/reportStore'
import { ReportElementRenderer } from '../ReportElementRenderer'

interface SectionResizeState {
  sectionId: string
  startClientY: number
  startHeight: number
  direction: 'top' | 'bottom'
}

function snapToGrid(value: number): number {
  return Math.round(value / 4) * 4
}

function getLayeredElements(template: ReportTemplate): ReportElement[] {
  const elementsById = new Map(template.elements.map((element) => [element.id, element]))
  const usedElementIds = new Set<string>()
  const orderedElements: ReportElement[] = []

  template.sections.forEach((section) => {
    section.elementIds.forEach((elementId) => {
      const element = elementsById.get(elementId)

      if (!element || usedElementIds.has(element.id)) {
        return
      }

      orderedElements.push(element)
      usedElementIds.add(element.id)
    })
  })

  template.elements.forEach((element) => {
    if (!usedElementIds.has(element.id)) {
      orderedElements.push(element)
    }
  })

  return orderedElements
}

function getElementSection(template: ReportTemplate, element: ReportElement): ReportSection | undefined {
  return element.sectionId
    ? template.sections.find((section) => section.id === element.sectionId)
    : template.sections.find((section) => section.elementIds.includes(element.id))
}

export function ReportCanvas() {
  const template = useReportStore((state) => state.template)
  const sampleData = useReportStore((state) => state.sampleData)
  const selectedElementId = useReportStore((state) => state.selectedElementId)
  const selectedSectionId = useReportStore((state) => state.selectedSectionId)
  const selectElement = useReportStore((state) => state.selectElement)
  const selectSection = useReportStore((state) => state.selectSection)
  const updateElement = useReportStore((state) => state.updateElement)
  const resizeSection = useReportStore((state) => state.resizeSection)
  const resizeStateRef = useRef<SectionResizeState | null>(null)
  const [resizingSectionId, setResizingSectionId] = useState<string | null>(null)
  const layeredElements = getLayeredElements(template)

  useEffect(() => {
    if (!resizingSectionId) {
      return
    }

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect

    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current

      if (!resizeState) {
        return
      }

      const deltaY =
        resizeState.direction === 'top'
          ? resizeState.startClientY - event.clientY
          : event.clientY - resizeState.startClientY

      resizeSection(resizeState.sectionId, snapToGrid(resizeState.startHeight + deltaY))
    }

    const stopResize = () => {
      resizeStateRef.current = null
      setResizingSectionId(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize, { once: true })

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
    }
  }, [resizeSection, resizingSectionId])

  const startSectionResize = (event: ReactPointerEvent<HTMLDivElement>, section: ReportSection) => {
    event.preventDefault()
    event.stopPropagation()

    const direction = section.role === 'footer' ? 'top' : 'bottom'

    selectSection(section.id)
    resizeStateRef.current = {
      sectionId: section.id,
      startClientY: event.clientY,
      startHeight: section.height,
      direction,
    }
    setResizingSectionId(section.id)
  }

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

        {layeredElements.map((element) => {
          const section = getElementSection(template, element)
          const dataSource = element.type === 'table' ? element.dataSource ?? section?.dataSource : section?.dataSource
          const elementData = element.type === 'table' && element.tableMode !== 'static'
            ? sampleData
            : getScopedData(sampleData, dataSource)

          return (
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
              data-element-id={element.id}
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
              <ReportElementRenderer
                element={element}
                data={elementData}
                dataSource={dataSource}
                mode="designer"
              />
            </Rnd>
          )
        })}

        {template.sections.map((section) => {
          const direction = section.role === 'footer' ? 'top' : 'bottom'
          const handleTop = direction === 'top' ? section.baseY - 5 : section.baseY + section.height - 5

          return (
            <div
              key={`${section.id}-resize`}
              className={`section-resize-handle ${direction} ${
                selectedSectionId === section.id || resizingSectionId === section.id ? 'active' : ''
              }`}
              data-section-resize-id={section.id}
              role="separator"
              aria-label={`${section.name} 높이 조절`}
              aria-orientation="horizontal"
              style={{
                top: handleTop,
              }}
              onPointerDown={(event) => startSectionResize(event, section)}
            />
          )
        })}
      </div>
    </section>
  )
}
