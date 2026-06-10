import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { ReportElement, ReportSection } from '../../report/types'
import { useReportStore } from '../../store/reportStore'

function isLockedSection(section: ReportSection): boolean {
  return section.role === 'header' || section.role === 'footer'
}

function getTypeLabel(section: ReportSection, tableElement?: ReportElement): string {
  if (section.role === 'header') {
    return 'HEAD'
  }

  if (section.role === 'footer') {
    return 'FOOT'
  }

  if (section.type !== 'table') {
    return '고정'
  }

  return tableElement?.tableMode === 'static' ? '고정표' : '반복표'
}

function canMoveSection(sections: ReportSection[], index: number, direction: 'up' | 'down'): boolean {
  const targetIndex = direction === 'up' ? index - 1 : index + 1

  if (targetIndex < 0 || targetIndex >= sections.length) {
    return false
  }

  return !isLockedSection(sections[index]) && !isLockedSection(sections[targetIndex])
}

export function SectionSettings() {
  const template = useReportStore((state) => state.template)
  const sections = template.sections
  const selectedSectionId = useReportStore((state) => state.selectedSectionId)
  const addSection = useReportStore((state) => state.addSection)
  const moveSection = useReportStore((state) => state.moveSection)
  const removeSection = useReportStore((state) => state.removeSection)
  const selectSection = useReportStore((state) => state.selectSection)

  return (
    <section className="panel section-settings app-chrome">
      <div className="panel-header">
        <span>리포트 영역</span>
        <small>{sections.length}개</small>
      </div>

      <div className="section-actions">
        <button type="button" className="button subtle" onClick={() => addSection('fixed')}>
          <Plus size={14} />
          고정
        </button>
        <button type="button" className="button subtle" onClick={() => addSection('table', 'data')}>
          <Plus size={14} />
          반복표
        </button>
        <button type="button" className="button subtle" onClick={() => addSection('table', 'static')}>
          <Plus size={14} />
          고정표
        </button>
      </div>

      <div className="section-list compact">
        {sections.map((section, sectionIndex) => {
          const tableElement = section.tableElementId
            ? template.elements.find((element) => element.id === section.tableElementId)
            : undefined
          const locked = isLockedSection(section)

          return (
            <article
              className={`section-card compact ${selectedSectionId === section.id ? 'selected' : ''}`}
              data-section-id={section.id}
              key={section.id}
              onClick={() => selectSection(section.id)}
            >
              <div className="section-card-header compact">
                <div className="section-list-title">
                  <strong>{section.name}</strong>
                  <small>
                    Y {section.baseY} / H {section.height} / {section.elementIds.length}개 요소
                  </small>
                </div>
                <span className={`section-badge ${section.type}`}>{getTypeLabel(section, tableElement)}</span>
                <div className="section-order-buttons">
                  <button
                    type="button"
                    aria-label="영역 위로 이동"
                    disabled={!canMoveSection(sections, sectionIndex, 'up')}
                    onClick={(event) => {
                      event.stopPropagation()
                      moveSection(section.id, 'up')
                    }}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label="영역 아래로 이동"
                    disabled={!canMoveSection(sections, sectionIndex, 'down')}
                    onClick={(event) => {
                      event.stopPropagation()
                      moveSection(section.id, 'down')
                    }}
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>
                <button
                  type="button"
                  className="section-delete-button"
                  aria-label="영역 삭제"
                  disabled={locked}
                  onClick={(event) => {
                    event.stopPropagation()
                    removeSection(section.id)
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
