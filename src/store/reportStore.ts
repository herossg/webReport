import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { normalizeReportTemplate, updateReportPage } from '../report/page'
import { sampleReportData } from '../report/sampleData'
import { normalizeTemplateSections } from '../report/sections'
import { cloneInitialTemplate, createReportElement } from '../report/template'
import type {
  ReportData,
  ReportDataSource,
  ReportElement,
  ReportElementType,
  ReportSection,
  ReportSectionType,
  ReportTableMode,
  ReportTemplate,
} from '../report/types'
import type { PageSettingsPatch } from '../report/page'

type Mode = 'designer' | 'viewer'

type SectionMoveDirection = 'up' | 'down'

type ElementLayerDirection = 'front' | 'back' | 'forward' | 'backward'

const MIN_SECTION_HEIGHT = 32

interface ImportResult {
  ok: boolean
  error?: string
}

interface ReportState {
  mode: Mode
  template: ReportTemplate
  sampleData: ReportData
  selectedElementId: string | null
  selectedSectionId: string | null
  setMode: (mode: Mode) => void
  setReportData: (data: ReportData) => void
  selectElement: (id: string | null) => void
  selectSection: (id: string | null) => void
  addElement: (type: ReportElementType) => void
  addSection: (type: ReportSectionType, tableMode?: ReportTableMode) => void
  moveSection: (id: string, direction: SectionMoveDirection) => void
  removeSection: (id: string) => void
  updatePage: (patch: PageSettingsPatch) => void
  addDataSource: () => void
  updateDataSource: (id: string, patch: Partial<ReportDataSource>) => void
  removeDataSource: (id: string) => void
  updateSection: (id: string, patch: Partial<ReportSection>) => void
  resizeSection: (id: string, height: number) => void
  assignElementToSection: (elementId: string, sectionId: string) => void
  updateElement: (id: string, patch: Partial<ReportElement>) => void
  moveElementLayer: (id: string, direction: ElementLayerDirection) => void
  removeElement: (id: string) => void
  duplicateElement: (id: string) => void
  resetTemplate: () => void
  loadTemplateFromJson: (json: string) => ImportResult
}

function withUpdatedAt(template: ReportTemplate): ReportTemplate {
  return {
    ...template,
    updatedAt: new Date().toISOString().slice(0, 10),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function normalizeTemplate(template: ReportTemplate): ReportTemplate {
  const normalizedTemplate = normalizeTemplateSections(normalizeReportTemplate(template))

  return {
    ...normalizedTemplate,
    dataSources: Array.isArray(normalizedTemplate.dataSources) ? normalizedTemplate.dataSources : [],
  }
}

function isReportTemplate(value: unknown): value is ReportTemplate {
  if (value == null || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<ReportTemplate>
  return Boolean(candidate.page && Array.isArray(candidate.elements))
}

function createStaticCells(rows: number, columns: number): string[][] {
  return Array.from({ length: rows }, (_row, rowIndex) =>
    Array.from({ length: columns }, (_column, columnIndex) => `R${rowIndex + 1}C${columnIndex + 1}`),
  )
}

function getNextDataSourceId(template: ReportTemplate): string {
  const usedIds = new Set(template.dataSources.map((dataSource) => dataSource.id))
  let index = template.dataSources.length + 1
  let id = `source${index}`

  while (usedIds.has(id)) {
    index += 1
    id = `source${index}`
  }

  return id
}

function getNextSectionBaseY(template: ReportTemplate): number {
  const flowSections = template.sections.filter((section) => section.repeat !== 'eachPage')
  const sectionBottom = flowSections.reduce((bottom, section) => {
    return Math.max(bottom, section.baseY + section.height + (section.gapAfter ?? 0))
  }, template.page.margin.top)

  return Math.max(template.page.margin.top, sectionBottom + 24)
}

function getSectionContentWidth(template: ReportTemplate): number {
  return Math.max(160, template.page.width - template.page.margin.left - template.page.margin.right)
}

function isHeaderSection(section: ReportSection): boolean {
  return section.role === 'header' || section.id.toLowerCase().includes('header')
}

function isFooterSection(section: ReportSection): boolean {
  return section.role === 'footer' || section.id.toLowerCase().includes('footer')
}

function isLockedSection(section: ReportSection): boolean {
  return isHeaderSection(section) || isFooterSection(section)
}

function getFirstBodySection(template: ReportTemplate): ReportSection | undefined {
  return template.sections.find((section) => !isLockedSection(section) && section.repeat !== 'eachPage')
}

function getElementSectionId(template: ReportTemplate, elementId: string | null): string | null {
  if (!elementId) {
    return null
  }

  const element = template.elements.find((item) => item.id === elementId)

  if (element?.sectionId && template.sections.some((section) => section.id === element.sectionId)) {
    return element.sectionId
  }

  return template.sections.find((section) => section.elementIds.includes(elementId))?.id ?? null
}

function getSelectedTargetSection(template: ReportTemplate, selectedSectionId: string | null, selectedElementId: string | null) {
  const sectionFromSelection = selectedSectionId
    ? template.sections.find((section) => section.id === selectedSectionId)
    : undefined
  const sectionFromElement = getElementSectionId(template, selectedElementId)
  const elementSection = sectionFromElement ? template.sections.find((section) => section.id === sectionFromElement) : undefined

  return sectionFromSelection ?? elementSection ?? getFirstBodySection(template) ?? template.sections[0]
}

function getSectionByElementPosition(template: ReportTemplate, element: ReportElement): ReportSection | undefined {
  const centerY = element.y + element.height / 2

  return template.sections.find((section) => centerY >= section.baseY && centerY < section.baseY + section.height)
}

function assignElementToSectionInTemplate(
  template: ReportTemplate,
  elementId: string,
  sectionId: string,
): ReportTemplate {
  const targetSection = template.sections.find((section) => section.id === sectionId)

  if (!targetSection) {
    return template
  }

  return {
    ...template,
    elements: template.elements.map((element) =>
      element.id === elementId
        ? {
            ...element,
            sectionId,
          }
        : element,
    ),
    sections: template.sections.map((section) => {
      const elementIds = section.elementIds.filter((id) => id !== elementId)
      const isTargetSection = section.id === sectionId
      const targetElement = template.elements.find((element) => element.id === elementId)

      return {
        ...section,
        elementIds: isTargetSection ? [...elementIds, elementId] : elementIds,
        tableElementId:
          section.tableElementId === elementId && !isTargetSection
            ? undefined
            : isTargetSection && section.type === 'table' && targetElement?.type === 'table' && !section.tableElementId
              ? elementId
              : section.tableElementId,
      }
    }),
  }
}

function isSameSectionMoveGroup(source: ReportSection, target: ReportSection): boolean {
  return !isLockedSection(source) && !isLockedSection(target)
}

function getAdjacentMoveTargetIndex(
  sections: ReportSection[],
  index: number,
  direction: SectionMoveDirection,
): number {
  const targetIndex = direction === 'up' ? index - 1 : index + 1

  if (targetIndex < 0 || targetIndex >= sections.length) {
    return -1
  }

  return isSameSectionMoveGroup(sections[index], sections[targetIndex]) ? targetIndex : -1
}

function reorderSections(sections: ReportSection[], index: number, targetIndex: number): ReportSection[] {
  const nextSections = [...sections]
  const [section] = nextSections.splice(index, 1)

  nextSections.splice(targetIndex, 0, section)

  return nextSections
}

function insertBodySection(sections: ReportSection[], section: ReportSection): ReportSection[] {
  const footerIndex = sections.findIndex(isFooterSection)

  if (footerIndex < 0) {
    return [...sections, section]
  }

  return [...sections.slice(0, footerIndex), section, ...sections.slice(footerIndex)]
}

function moveSectionLayout(
  template: ReportTemplate,
  sections: ReportSection[],
  fromIndex: number,
  toIndex: number,
): Pick<ReportTemplate, 'sections' | 'elements'> {
  const blockStartIndex = Math.min(fromIndex, toIndex)
  const blockEndIndex = Math.max(fromIndex, toIndex)
  const originalBlock = template.sections.slice(blockStartIndex, blockEndIndex + 1)
  const nextBaseYBySectionId = new Map<string, number>()
  let cursor = Math.min(...originalBlock.map((section) => section.baseY))

  sections.slice(blockStartIndex, blockEndIndex + 1).forEach((section) => {
    nextBaseYBySectionId.set(section.id, cursor)
    cursor += section.height + (section.gapAfter ?? 0)
  })

  const originalSectionById = new Map(template.sections.map((section) => [section.id, section]))
  const nextSections = sections.map((section) => {
    const nextBaseY = nextBaseYBySectionId.get(section.id)

    return nextBaseY == null
      ? section
      : {
          ...section,
          baseY: nextBaseY,
        }
  })
  const elementDeltaById = new Map<string, number>()

  nextSections.forEach((section) => {
    const originalSection = originalSectionById.get(section.id)

    if (!originalSection) {
      return
    }

    const deltaY = section.baseY - originalSection.baseY

    if (deltaY === 0) {
      return
    }

    section.elementIds.forEach((elementId) => {
      elementDeltaById.set(elementId, (elementDeltaById.get(elementId) ?? 0) + deltaY)
    })
  })

  return {
    sections: nextSections,
    elements: template.elements.map((element) => {
      const deltaY = elementDeltaById.get(element.id)

      return deltaY
        ? {
            ...element,
            y: element.y + deltaY,
          }
        : element
    }),
  }
}

function getSectionElements(template: ReportTemplate, section: ReportSection): ReportElement[] {
  const elementsById = new Map(template.elements.map((element) => [element.id, element]))

  return section.elementIds
    .map((elementId) => elementsById.get(elementId))
    .filter((element): element is ReportElement => element != null)
}

function getSectionMinimumHeight(template: ReportTemplate, section: ReportSection): number {
  const elements = getSectionElements(template, section)

  if (elements.length === 0) {
    return MIN_SECTION_HEIGHT
  }

  if (isFooterSection(section)) {
    const footerBottom = template.page.height - template.page.margin.bottom
    const contentTop = Math.min(...elements.map((element) => element.y))

    return Math.max(MIN_SECTION_HEIGHT, footerBottom - contentTop)
  }

  const contentBottom = Math.max(...elements.map((element) => element.y + element.height))

  return Math.max(MIN_SECTION_HEIGHT, contentBottom - section.baseY)
}

function getSectionMaximumHeight(template: ReportTemplate, section: ReportSection): number {
  if (isFooterSection(section)) {
    return template.page.height - template.page.margin.bottom
  }

  const footer = template.sections.find(isFooterSection)
  const contentBottom = footer?.baseY ?? template.page.height - template.page.margin.bottom

  return Math.max(getSectionMinimumHeight(template, section), contentBottom - section.baseY)
}

function resizeSectionLayout(
  template: ReportTemplate,
  id: string,
  rawHeight: number,
): Pick<ReportTemplate, 'sections' | 'elements'> | null {
  const sectionIndex = template.sections.findIndex((section) => section.id === id)

  if (sectionIndex < 0) {
    return null
  }

  const targetSection = template.sections[sectionIndex]
  const minimumHeight = getSectionMinimumHeight(template, targetSection)
  const maximumHeight = getSectionMaximumHeight(template, targetSection)
  const nextHeight = clamp(rawHeight, minimumHeight, maximumHeight)
  const deltaY = nextHeight - targetSection.height

  if (deltaY === 0) {
    return null
  }

  const shiftedSectionIds = new Set<string>()
  const nextSections = template.sections.map((section, index) => {
    if (section.id === id) {
      return {
        ...section,
        height: nextHeight,
      }
    }

    if (index > sectionIndex && !isLockedSection(section)) {
      shiftedSectionIds.add(section.id)

      return {
        ...section,
        baseY: section.baseY + deltaY,
      }
    }

    return section
  })
  const shiftedElementIds = new Set(
    template.sections
      .filter((section) => shiftedSectionIds.has(section.id))
      .flatMap((section) => section.elementIds),
  )

  return {
    sections: nextSections,
    elements: template.elements.map((element) =>
      shiftedElementIds.has(element.id)
        ? {
            ...element,
            y: element.y + deltaY,
          }
        : element,
    ),
  }
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const nextItems = [...items]
  const [item] = nextItems.splice(fromIndex, 1)

  nextItems.splice(toIndex, 0, item)

  return nextItems
}

function getLayerTargetIndex(
  currentIndex: number,
  itemCount: number,
  direction: ElementLayerDirection,
): number {
  if (direction === 'front') {
    return itemCount - 1
  }

  if (direction === 'back') {
    return 0
  }

  if (direction === 'forward') {
    return Math.min(itemCount - 1, currentIndex + 1)
  }

  return Math.max(0, currentIndex - 1)
}

function moveElementLayerInTemplate(
  template: ReportTemplate,
  elementId: string,
  direction: ElementLayerDirection,
): ReportTemplate | null {
  const sectionId = getElementSectionId(template, elementId)
  const section = sectionId ? template.sections.find((item) => item.id === sectionId) : undefined

  if (!section) {
    return null
  }

  const elementIds = section.elementIds.filter((id, index, ids) => ids.indexOf(id) === index)
  const currentIndex = elementIds.indexOf(elementId)

  if (currentIndex < 0 || elementIds.length < 2) {
    return null
  }

  const targetIndex = getLayerTargetIndex(currentIndex, elementIds.length, direction)

  if (targetIndex === currentIndex) {
    return null
  }

  const nextElementIds = moveItem(elementIds, currentIndex, targetIndex)

  return {
    ...template,
    sections: template.sections.map((item) =>
      item.id === section.id
        ? {
            ...item,
            elementIds: nextElementIds,
          }
        : item,
    ),
  }
}

export const useReportStore = create<ReportState>()(
  persist(
    (set, get) => ({
      mode: 'designer',
      template: normalizeTemplate(cloneInitialTemplate()),
      sampleData: sampleReportData,
      selectedElementId: 'title',
      selectedSectionId: 'report-header',
      setMode: (mode) => set({ mode }),
      setReportData: (data) => set({ sampleData: data }),
      selectElement: (id) => {
        const { template } = get()

        set({
          selectedElementId: id,
          selectedSectionId: id ? getElementSectionId(template, id) : get().selectedSectionId,
        })
      },
      selectSection: (id) => set({ selectedSectionId: id, selectedElementId: null }),
      addElement: (type) => {
        const { template, selectedElementId, selectedSectionId } = get()
        const targetSection = getSelectedTargetSection(template, selectedSectionId, selectedElementId)

        if (!targetSection) {
          return
        }

        const element = createReportElement(type, template.elements.length)
        const elementTop = targetSection.baseY + 12

        element.sectionId = targetSection.id
        element.x = template.page.margin.left
        element.y = Math.min(elementTop, targetSection.baseY + Math.max(0, targetSection.height - element.height))

        set({
          template: withUpdatedAt(
            normalizeTemplate({
              ...template,
              sections: template.sections.map((section) =>
                section.id === targetSection.id
                  ? {
                      ...section,
                      elementIds: section.elementIds.includes(element.id)
                        ? section.elementIds
                        : [...section.elementIds, element.id],
                      tableElementId:
                        section.type === 'table' && element.type === 'table' && !section.tableElementId
                          ? element.id
                          : section.tableElementId,
                    }
                  : section,
              ),
              elements: [...template.elements, element],
            }),
          ),
          selectedElementId: element.id,
          selectedSectionId: targetSection.id,
        })
      },
      addSection: (type, tableMode = 'data') => {
        const { template } = get()
        const baseY = getNextSectionBaseY(template)
        const sectionIndex = template.sections.length + 1
        const elements = [...template.elements]
        const sectionId = `${type}-${Date.now()}`
        let selectedElementId: string
        let section: ReportSection

        if (type === 'table') {
          const tableElement = createReportElement('table', template.elements.length)
          const isStaticTable = tableMode === 'static'
          const tableHeight = isStaticTable ? 176 : 280

          tableElement.name = isStaticTable ? '고정폼 테이블' : '반복 테이블'
          tableElement.x = template.page.margin.left
          tableElement.y = baseY
          tableElement.width = getSectionContentWidth(template)
          tableElement.height = tableHeight
          tableElement.sectionId = sectionId
          tableElement.tableMode = tableMode

          if (isStaticTable) {
            tableElement.dataSource = undefined
            tableElement.columns = undefined
            tableElement.staticRows = 4
            tableElement.staticColumns = 4
            tableElement.staticCells = createStaticCells(4, 4)
          }

          elements.push(tableElement)
          selectedElementId = tableElement.id
          section = {
            id: sectionId,
            name: isStaticTable ? `고정폼 테이블 영역 ${sectionIndex}` : `반복 테이블 영역 ${sectionIndex}`,
            type: 'table',
            role: 'body',
            flow: 'continue',
            repeat: 'once',
            baseY,
            height: tableHeight,
            gapAfter: 0,
            elementIds: [tableElement.id],
            tableElementId: tableElement.id,
            repeatHeader: true,
            headerHeight: 40,
            rowHeight: 40,
          }
        } else {
          const textElement = createReportElement('text', template.elements.length)

          textElement.name = `고정 영역 ${sectionIndex}`
          textElement.x = template.page.margin.left
          textElement.y = baseY + 12
          textElement.width = Math.min(320, getSectionContentWidth(template))
          textElement.height = 32
          textElement.sectionId = sectionId
          textElement.value = `고정 영역 ${sectionIndex}`

          elements.push(textElement)
          selectedElementId = textElement.id
          section = {
            id: sectionId,
            name: `고정 출력 영역 ${sectionIndex}`,
            type: 'fixed',
            role: 'body',
            flow: 'continue',
            repeat: 'once',
            baseY,
            height: 96,
            gapAfter: 0,
            elementIds: [textElement.id],
          }
        }

        set({
          template: withUpdatedAt(
            normalizeTemplate({
              ...template,
              sections: insertBodySection(template.sections, section),
              elements,
            }),
          ),
          selectedElementId,
          selectedSectionId: section.id,
        })
      },
      moveSection: (id, direction) => {
        const { template } = get()
        const sectionIndex = template.sections.findIndex((section) => section.id === id)

        if (sectionIndex < 0) {
          return
        }

        const targetIndex = getAdjacentMoveTargetIndex(template.sections, sectionIndex, direction)

        if (targetIndex < 0) {
          return
        }

        const reorderedSections = reorderSections(template.sections, sectionIndex, targetIndex)
        const layout = moveSectionLayout(template, reorderedSections, sectionIndex, targetIndex)

        set({
          template: withUpdatedAt(
            normalizeTemplate({
              ...template,
              sections: layout.sections,
              elements: layout.elements,
            }),
          ),
        })
      },
      removeSection: (id) => {
        const { template, selectedElementId, selectedSectionId } = get()
        const section = template.sections.find((item) => item.id === id)

        if (!section || isLockedSection(section)) {
          return
        }

        const removedElementIds = new Set(section.elementIds)
        const sections = template.sections.filter((item) => item.id !== id)
        const elements = template.elements.filter((element) => !removedElementIds.has(element.id))
        const nextTemplate = normalizeTemplate({
          ...template,
          sections,
          elements,
        })

        set({
          template: withUpdatedAt(nextTemplate),
          selectedElementId: selectedElementId && removedElementIds.has(selectedElementId) ? null : selectedElementId,
          selectedSectionId: selectedSectionId === id ? getFirstBodySection(nextTemplate)?.id ?? null : selectedSectionId,
        })
      },
      updatePage: (patch) => {
        const { template } = get()

        set({
          template: withUpdatedAt(
            normalizeTemplate({
              ...template,
              page: updateReportPage(template.page, patch),
            }),
          ),
        })
      },
      addDataSource: () => {
        const { template } = get()
        const id = getNextDataSourceId(template)

        set({
          template: withUpdatedAt({
            ...template,
            dataSources: [
              ...template.dataSources,
              {
                id,
                label: `데이터소스 ${template.dataSources.length + 1}`,
                description: '',
                url: '',
                path: '',
              },
            ],
          }),
        })
      },
      updateDataSource: (id, patch) => {
        const { template } = get()
        const nextIdCandidate = typeof patch.id === 'string' ? patch.id.trim() : id
        const canChangeId =
          nextIdCandidate &&
          nextIdCandidate !== id &&
          !template.dataSources.some((dataSource) => dataSource.id === nextIdCandidate)
        const nextId = canChangeId ? nextIdCandidate : id

        set({
          template: withUpdatedAt({
            ...template,
            dataSources: template.dataSources.map((dataSource) =>
              dataSource.id === id
                ? {
                    ...dataSource,
                    ...patch,
                    id: nextId,
                  }
                : dataSource,
            ),
            sections: template.sections.map((section) =>
              section.dataSource === id
                ? {
                    ...section,
                    dataSource: nextId,
                  }
                : section,
            ),
            elements: template.elements.map((element) =>
              element.dataSource === id
                ? {
                    ...element,
                    dataSource: nextId,
                  }
                : element,
            ),
          }),
        })
      },
      removeDataSource: (id) => {
        const { template } = get()

        set({
          template: withUpdatedAt({
            ...template,
            dataSources: template.dataSources.filter((dataSource) => dataSource.id !== id),
            sections: template.sections.map((section) =>
              section.dataSource === id
                ? {
                    ...section,
                    dataSource: undefined,
                  }
                : section,
            ),
            elements: template.elements.map((element) =>
              element.dataSource === id
                ? {
                    ...element,
                    dataSource: undefined,
                  }
                : element,
            ),
          }),
        })
      },
      updateSection: (id, patch) => {
        const { template } = get()

        set({
          template: withUpdatedAt(
            normalizeTemplate({
              ...template,
              sections: template.sections.map((section) =>
                section.id === id
                  ? {
                      ...section,
                      ...patch,
                    }
                  : section,
              ),
            }),
          ),
        })
      },
      resizeSection: (id, height) => {
        const { template } = get()
        const layout = resizeSectionLayout(template, id, height)

        if (!layout) {
          return
        }

        set({
          template: withUpdatedAt(
            normalizeTemplate({
              ...template,
              sections: layout.sections,
              elements: layout.elements,
            }),
          ),
        })
      },
      assignElementToSection: (elementId, sectionId) => {
        const { template } = get()

        set({
          template: withUpdatedAt(normalizeTemplate(assignElementToSectionInTemplate(template, elementId, sectionId))),
          selectedSectionId: sectionId,
        })
      },
      updateElement: (id, patch) => {
        const { template } = get()
        const elements = template.elements.map((element) =>
          element.id === id
            ? {
                ...element,
                ...patch,
              }
            : element,
        )
        const nextElement = elements.find((element) => element.id === id)
        const explicitSectionId = typeof patch.sectionId === 'string' ? patch.sectionId : undefined
        const movedElement = patch.x != null || patch.y != null || patch.height != null
        const sectionByPosition = nextElement && movedElement ? getSectionByElementPosition(template, nextElement) : undefined
        const nextSectionId = explicitSectionId ?? sectionByPosition?.id
        const nextTemplate = {
          ...template,
          elements,
        }

        set({
          template: withUpdatedAt(
            normalizeTemplate(
              nextSectionId ? assignElementToSectionInTemplate(nextTemplate, id, nextSectionId) : nextTemplate,
            ),
          ),
          selectedSectionId: nextSectionId ?? getElementSectionId(template, id),
        })
      },
      moveElementLayer: (id, direction) => {
        const { template } = get()
        const nextTemplate = moveElementLayerInTemplate(template, id, direction)

        if (!nextTemplate) {
          return
        }

        set({
          template: withUpdatedAt(normalizeTemplate(nextTemplate)),
          selectedElementId: id,
          selectedSectionId: getElementSectionId(nextTemplate, id),
        })
      },
      removeElement: (id) => {
        const { template, selectedElementId } = get()
        const elements = template.elements.filter((element) => element.id !== id)

        set({
          template: withUpdatedAt(
            normalizeTemplate({
              ...template,
              elements,
              sections: template.sections.map((section) => ({
                ...section,
                elementIds: section.elementIds.filter((elementId) => elementId !== id),
                tableElementId: section.tableElementId === id ? undefined : section.tableElementId,
              })),
            }),
          ),
          selectedElementId: selectedElementId === id ? elements[0]?.id ?? null : selectedElementId,
        })
      },
      duplicateElement: (id) => {
        const { template } = get()
        const element = template.elements.find((item) => item.id === id)

        if (!element) {
          return
        }

        const duplicated: ReportElement = {
          ...structuredClone(element),
          id: `${element.type}-${Date.now()}`,
          name: `${element.name} 복사본`,
          x: element.x + 20,
          y: element.y + 20,
        }

        set({
          template: withUpdatedAt(
            normalizeTemplate({
              ...template,
              elements: [...template.elements, duplicated],
            }),
          ),
          selectedElementId: duplicated.id,
          selectedSectionId: duplicated.sectionId ?? getElementSectionId(template, element.id),
        })
      },
      resetTemplate: () => {
        const template = normalizeTemplate(cloneInitialTemplate())

        set({
          template,
          selectedElementId: template.elements[0]?.id ?? null,
          selectedSectionId: template.elements[0]?.sectionId ?? template.sections[0]?.id ?? null,
        })
      },
      loadTemplateFromJson: (json) => {
        try {
          const parsed = JSON.parse(json) as unknown

          if (!isReportTemplate(parsed)) {
            return {
              ok: false,
              error: 'page와 elements 배열이 있는 리포트 JSON이어야 합니다.',
            }
          }

          const template = withUpdatedAt(normalizeTemplate(parsed))

          set({
            template,
            selectedElementId: template.elements[0]?.id ?? null,
            selectedSectionId: template.elements[0]?.sectionId ?? template.sections[0]?.id ?? null,
          })

          return { ok: true }
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : 'JSON을 읽을 수 없습니다.',
          }
        }
      },
    }),
    {
      name: 'webreport-studio-template',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ReportState>

        return {
          ...currentState,
          ...persisted,
          template: persisted.template
            ? normalizeTemplate(persisted.template)
            : normalizeTemplate(currentState.template),
        }
      },
      partialize: (state) => ({
        template: state.template,
        selectedElementId: state.selectedElementId,
        selectedSectionId: state.selectedSectionId,
      }),
    },
  ),
)
