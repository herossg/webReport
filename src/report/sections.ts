import type { ReportElement, ReportPage, ReportSection, ReportSectionRole, ReportTemplate } from './types'

const DEFAULT_SECTION_HEIGHT = 80
const DEFAULT_TABLE_HEADER_HEIGHT = 40
const DEFAULT_TABLE_ROW_HEIGHT = 40

interface TemplateShape {
  page: ReportPage
  elements: ReportElement[]
  sections?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function toText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function toNumber(value: unknown, fallback: number, min = 0): number {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return fallback
  }

  return Math.max(min, numberValue)
}

function toOptionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function elementBottom(element: ReportElement): number {
  return element.y + element.height
}

function maxBottom(elements: ReportElement[], fallback = DEFAULT_SECTION_HEIGHT): number {
  if (elements.length === 0) {
    return fallback
  }

  return Math.max(...elements.map(elementBottom), fallback)
}

function minY(elements: ReportElement[], fallback = 0): number {
  if (elements.length === 0) {
    return fallback
  }

  return Math.min(...elements.map((element) => element.y))
}

function isSectionRole(value: unknown): value is ReportSectionRole {
  return value === 'header' || value === 'body' || value === 'footer'
}

function inferSectionRole(section: Record<string, unknown>, index: number): ReportSectionRole {
  const id = typeof section.id === 'string' ? section.id.toLowerCase() : ''

  if (id.includes('header') || id.includes('head')) {
    return 'header'
  }

  if (id.includes('footer') || id.includes('foot')) {
    return 'footer'
  }

  return index === 0 ? 'header' : 'body'
}

function normalizeSectionBaseY(
  role: ReportSectionRole,
  page: ReportPage,
  height: number,
  value: unknown,
): number {
  if (role === 'header') {
    return 0
  }

  if (role === 'footer') {
    return Math.max(0, page.height - page.margin.bottom - height)
  }

  return toNumber(value, 0)
}

function dedupeElementIds(ids: unknown, elementsById: Map<string, ReportElement>, assigned?: Set<string>): string[] {
  if (!Array.isArray(ids)) {
    return []
  }

  const nextIds: string[] = []
  const localIds = new Set<string>()

  ids.forEach((id) => {
    if (typeof id !== 'string' || localIds.has(id) || !elementsById.has(id) || assigned?.has(id)) {
      return
    }

    localIds.add(id)
    nextIds.push(id)
    assigned?.add(id)
  })

  return nextIds
}

function getSectionAtElementPosition(sections: ReportSection[], element: ReportElement): ReportSection | undefined {
  const centerY = element.y + element.height / 2

  return sections.find((section) => centerY >= section.baseY && centerY < section.baseY + section.height)
}

function getFallbackSection(sections: ReportSection[]): ReportSection | undefined {
  return (
    sections.find((section) => section.role === 'body' && section.repeat !== 'eachPage') ??
    sections.find((section) => section.role === 'header') ??
    sections[0]
  )
}

function appendElementToSection(section: ReportSection, element: ReportElement) {
  if (!section.elementIds.includes(element.id)) {
    section.elementIds.push(element.id)
  }

  if (section.type === 'table' && element.type === 'table' && !section.tableElementId) {
    section.tableElementId = element.id
  }
}

export function createDefaultSections(template: TemplateShape): ReportSection[] {
  const tableElement = template.elements.find((element) => element.type === 'table')

  if (!tableElement) {
    return [
      {
        id: 'report-header',
        name: '기본 출력 영역',
        type: 'fixed',
        role: 'header',
        flow: 'continue',
        repeat: 'once',
        baseY: 0,
        height: maxBottom(template.elements),
        gapAfter: 0,
        elementIds: template.elements.map((element) => element.id),
      },
    ]
  }

  const tableBottom = elementBottom(tableElement)
  const footerThreshold = template.page.height - template.page.margin.bottom - 120
  const nonTableElements = template.elements.filter((element) => element.id !== tableElement.id)
  const headerElements = nonTableElements.filter((element) => element.y < tableElement.y)
  const footerElements = nonTableElements.filter((element) => element.y >= footerThreshold)
  const summaryElements = nonTableElements.filter((element) => {
    return element.y >= tableBottom && element.y < footerThreshold
  })
  const assignedIds = new Set<string>([
    tableElement.id,
    ...headerElements.map((element) => element.id),
    ...summaryElements.map((element) => element.id),
    ...footerElements.map((element) => element.id),
  ])
  const floatingElements = nonTableElements.filter((element) => !assignedIds.has(element.id))
  const headerElementIds = [...headerElements, ...floatingElements].map((element) => element.id)
  const sections: ReportSection[] = [
    {
      id: 'report-header',
      name: '고정 출력 영역',
      type: 'fixed',
      role: 'header',
      flow: 'continue',
      repeat: 'once',
      baseY: 0,
      height: Math.max(tableElement.y, maxBottom(headerElements, 0)),
      gapAfter: 0,
      elementIds: headerElementIds,
    },
    {
      id: 'detail-table',
      name: '반복 테이블 영역',
      type: 'table',
      role: 'body',
      flow: 'continue',
      repeat: 'once',
      baseY: tableElement.y,
      height: tableElement.height,
      gapAfter: 0,
      elementIds: [tableElement.id],
      tableElementId: tableElement.id,
      repeatHeader: true,
      headerHeight: DEFAULT_TABLE_HEADER_HEIGHT,
      rowHeight: DEFAULT_TABLE_ROW_HEIGHT,
    },
  ]

  if (summaryElements.length > 0) {
    const baseY = minY(summaryElements, tableBottom)

    sections.push({
      id: 'report-summary',
      name: '요약 영역',
      type: 'fixed',
      role: 'body',
      flow: 'continue',
      repeat: 'once',
      baseY,
      height: maxBottom(summaryElements, baseY + DEFAULT_SECTION_HEIGHT) - baseY,
      gapAfter: 0,
      elementIds: summaryElements.map((element) => element.id),
    })
  }

  if (footerElements.length > 0) {
    const height = maxBottom(footerElements, footerThreshold + DEFAULT_SECTION_HEIGHT) - minY(footerElements, footerThreshold)

    sections.push({
      id: 'page-footer',
      name: '페이지 반복 영역',
      type: 'fixed',
      role: 'footer',
      flow: 'continue',
      repeat: 'eachPage',
      baseY: Math.max(0, template.page.height - template.page.margin.bottom - height),
      height,
      gapAfter: 0,
      elementIds: footerElements.map((element) => element.id),
    })
  }

  return sections
}

function normalizeSection(
  section: unknown,
  index: number,
  page: ReportPage,
  elementsById: Map<string, ReportElement>,
  assignedIds: Set<string>,
): ReportSection | null {
  if (!isRecord(section)) {
    return null
  }

  const role = isSectionRole(section.role) ? section.role : inferSectionRole(section, index)
  const rawType = section.type
  const type = rawType === 'table' ? 'table' : 'fixed'
  const rawTableElementId = typeof section.tableElementId === 'string' ? section.tableElementId : undefined
  const rawElementIds = dedupeElementIds(section.elementIds, elementsById, assignedIds)
  const tableElementId =
    type === 'table'
      ? rawTableElementId && elementsById.get(rawTableElementId)?.type === 'table'
        ? rawTableElementId
        : rawElementIds.find((id) => elementsById.get(id)?.type === 'table')
      : undefined
  const normalizedType = tableElementId ? 'table' : 'fixed'
  const height = toNumber(section.height, DEFAULT_SECTION_HEIGHT, 1)

  if (normalizedType === 'table' && tableElementId && !rawElementIds.includes(tableElementId)) {
    rawElementIds.unshift(tableElementId)
    assignedIds.add(tableElementId)
  }

  return {
    id: toText(section.id, `section-${index + 1}`),
    name: toText(section.name, normalizedType === 'table' ? '반복 테이블 영역' : '고정 출력 영역'),
    type: normalizedType,
    role,
    flow: role === 'header' || role === 'footer' ? 'continue' : section.flow === 'nextPage' ? 'nextPage' : 'continue',
    repeat: role === 'footer' ? 'eachPage' : normalizedType === 'table' ? 'once' : section.repeat === 'eachPage' ? 'eachPage' : 'once',
    baseY: normalizeSectionBaseY(role, page, height, section.baseY),
    height,
    dataSource: toOptionalText(section.dataSource),
    gapAfter: toNumber(section.gapAfter, 0),
    elementIds: rawElementIds,
    tableElementId,
    repeatHeader: section.repeatHeader !== false,
    headerHeight: toNumber(section.headerHeight, DEFAULT_TABLE_HEADER_HEIGHT, 16),
    rowHeight: toNumber(section.rowHeight, DEFAULT_TABLE_ROW_HEIGHT, 16),
  }
}

function appendUnassignedElements(sections: ReportSection[], template: TemplateShape): ReportSection[] {
  const assignedIds = new Set(sections.flatMap((section) => section.elementIds))
  const nextSections = sections.map((section) => ({
    ...section,
    elementIds: [...section.elementIds],
  }))
  const nextSectionById = new Map(nextSections.map((section) => [section.id, section]))

  template.elements.forEach((element) => {
    if (assignedIds.has(element.id)) {
      return
    }

    const sectionFromElement = element.sectionId ? nextSectionById.get(element.sectionId) : undefined
    const targetSection =
      sectionFromElement ?? getSectionAtElementPosition(nextSections, element) ?? getFallbackSection(nextSections)

    if (!targetSection) {
      return
    }

    appendElementToSection(targetSection, element)
    assignedIds.add(element.id)
  })

  return nextSections
}

function orderLockedSections(sections: ReportSection[]): ReportSection[] {
  const headerSections = sections.filter((section) => section.role === 'header')
  const footerSections = sections.filter((section) => section.role === 'footer')
  const bodySections = sections.filter((section) => section.role !== 'header' && section.role !== 'footer')

  return [...headerSections, ...bodySections, ...footerSections]
}

export function normalizeReportSections(template: TemplateShape): ReportSection[] {
  const elementsById = new Map(template.elements.map((element) => [element.id, element]))
  const rawSections = Array.isArray(template.sections) ? template.sections : null

  if (!rawSections || rawSections.length === 0) {
    return orderLockedSections(createDefaultSections(template))
  }

  const assignedIds = new Set<string>()
  const normalizedSections = rawSections
    .map((section, index) => normalizeSection(section, index, template.page, elementsById, assignedIds))
    .filter((section): section is ReportSection => section != null)

  if (normalizedSections.length === 0) {
    return orderLockedSections(createDefaultSections(template))
  }

  return orderLockedSections(appendUnassignedElements(normalizedSections, template))
}

export function normalizeTemplateSections(template: ReportTemplate): ReportTemplate {
  const sections = normalizeReportSections(template)
  const sectionIdByElementId = new Map<string, string>()

  sections.forEach((section) => {
    section.elementIds.forEach((elementId) => {
      sectionIdByElementId.set(elementId, section.id)
    })
  })

  return {
    ...template,
    sections,
    elements: template.elements.map((element) => {
      const sectionId = sectionIdByElementId.get(element.id)

      return sectionId && element.sectionId !== sectionId
        ? {
            ...element,
            sectionId,
          }
        : element
    }),
  }
}
