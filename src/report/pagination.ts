import { getDataRows } from './bindings'
import { normalizeReportSections } from './sections'
import type { ReportData, ReportElement, ReportSection, ReportTemplate } from './types'

export interface PaginatedElement {
  element: ReportElement
  x: number
  y: number
  width: number
  height: number
  rows?: Record<string, unknown>[]
}

export interface PaginatedPage {
  pageNumber: number
  elements: PaginatedElement[]
}

function sectionElements(section: ReportSection, elementsById: Map<string, ReportElement>): ReportElement[] {
  return section.elementIds
    .map((id) => elementsById.get(id))
    .filter((element): element is ReportElement => element != null)
}

function hasFlowElements(page: PaginatedPage): boolean {
  return page.elements.length > 0
}

function getRepeatSections(sections: ReportSection[]): ReportSection[] {
  return sections.filter((section) => section.repeat === 'eachPage')
}

function getContentBottom(template: ReportTemplate, repeatSections: ReportSection[]): number {
  const defaultBottom = template.page.height - template.page.margin.bottom
  const footerTop = repeatSections
    .filter((section) => section.baseY > template.page.height * 0.45)
    .reduce((top, section) => Math.min(top, section.baseY - 12), defaultBottom)

  return Math.max(template.page.margin.top, Math.min(defaultBottom, footerTop))
}

function getPageStart(template: ReportTemplate, repeatSections: ReportSection[], pageNumber: number): number {
  const baseStart = pageNumber === 1 ? 0 : template.page.margin.top
  const headerBottom = repeatSections
    .filter((section) => section.baseY <= template.page.height * 0.45)
    .reduce((bottom, section) => Math.max(bottom, section.baseY + section.height + 12), baseStart)

  return headerBottom
}

function createPage(pageNumber: number): PaginatedPage {
  return {
    pageNumber,
    elements: [],
  }
}

function fixedSectionItems(
  section: ReportSection,
  elementsById: Map<string, ReportElement>,
  top: number,
  excludedElementIds = new Set<string>(),
): PaginatedElement[] {
  return sectionElements(section, elementsById)
    .filter((element) => !excludedElementIds.has(element.id))
    .map((element) => ({
      element,
      x: element.x,
      y: top + element.y - section.baseY,
      width: element.width,
      height: element.height,
    }))
}

function repeatedSectionItems(
  section: ReportSection,
  elementsById: Map<string, ReportElement>,
): PaginatedElement[] {
  return sectionElements(section, elementsById).map((element) => ({
    element,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  }))
}

function getSectionGap(section: ReportSection): number {
  return Math.max(0, section.gapAfter ?? 0)
}

export function paginateReport(template: ReportTemplate, data: ReportData): PaginatedPage[] {
  const sections = normalizeReportSections(template)
  const repeatSections = getRepeatSections(sections)
  const flowSections = sections.filter((section) => section.repeat !== 'eachPage')
  const elementsById = new Map(template.elements.map((element) => [element.id, element]))
  const contentBottom = getContentBottom(template, repeatSections)
  const pages: PaginatedPage[] = [createPage(1)]
  let currentPage = pages[0]
  let cursor = getPageStart(template, repeatSections, currentPage.pageNumber)

  const startNewPage = () => {
    currentPage = createPage(pages.length + 1)
    pages.push(currentPage)
    cursor = getPageStart(template, repeatSections, currentPage.pageNumber)
  }

  flowSections.forEach((section) => {
    if (section.flow === 'nextPage' && hasFlowElements(currentPage)) {
      startNewPage()
    }

    if (section.type === 'table') {
      const tableElementId =
        section.tableElementId ?? section.elementIds.find((id) => elementsById.get(id)?.type === 'table')
      const tableElement = tableElementId ? elementsById.get(tableElementId) : undefined

      if (!tableElement) {
        return
      }

      const excludedTableIds = new Set([tableElement.id])
      const tableOffset = Math.max(0, tableElement.y - section.baseY)

      if (tableElement.tableMode === 'static') {
        if (cursor + section.height > contentBottom && hasFlowElements(currentPage)) {
          startNewPage()
        }

        currentPage.elements.push(...fixedSectionItems(section, elementsById, cursor, excludedTableIds))
        currentPage.elements.push({
          element: tableElement,
          x: tableElement.x,
          y: cursor + tableOffset,
          width: tableElement.width,
          height: tableElement.height,
        })
        cursor += section.height + getSectionGap(section)
        return
      }

      const rows = getDataRows(data, tableElement.dataSource)
      const headerHeight = section.repeatHeader === false ? 0 : section.headerHeight ?? 40
      const rowHeight = section.rowHeight ?? 40

      if (rows.length === 0) {
        const emptyTableHeight = Math.max(headerHeight + rowHeight, rowHeight)

        if (cursor + tableOffset + emptyTableHeight > contentBottom && hasFlowElements(currentPage)) {
          startNewPage()
        }

        currentPage.elements.push(...fixedSectionItems(section, elementsById, cursor, excludedTableIds))
        currentPage.elements.push({
          element: tableElement,
          x: tableElement.x,
          y: cursor + tableOffset,
          width: tableElement.width,
          height: emptyTableHeight,
          rows: [],
        })
        cursor += Math.max(section.height, tableOffset + emptyTableHeight) + getSectionGap(section)
        return
      }

      let rowIndex = 0

      while (rowIndex < rows.length) {
        const minimumTableHeight = headerHeight + rowHeight

        if (cursor + tableOffset + minimumTableHeight > contentBottom && hasFlowElements(currentPage)) {
          startNewPage()
        }

        const availableHeight = Math.max(rowHeight, contentBottom - cursor - tableOffset)
        const rowsFit = Math.max(1, Math.floor((availableHeight - headerHeight) / rowHeight))
        const pageRows = rows.slice(rowIndex, rowIndex + rowsFit)
        const tableHeight = headerHeight + pageRows.length * rowHeight

        currentPage.elements.push(...fixedSectionItems(section, elementsById, cursor, excludedTableIds))
        currentPage.elements.push({
          element: tableElement,
          x: tableElement.x,
          y: cursor + tableOffset,
          width: tableElement.width,
          height: tableHeight,
          rows: pageRows,
        })

        cursor += Math.max(section.height, tableOffset + tableHeight)
        rowIndex += pageRows.length

        if (rowIndex < rows.length) {
          startNewPage()
        }
      }

      cursor += getSectionGap(section)
      return
    }

    if (cursor + section.height > contentBottom && hasFlowElements(currentPage)) {
      startNewPage()
    }

    currentPage.elements.push(...fixedSectionItems(section, elementsById, cursor))
    cursor += section.height + getSectionGap(section)
  })

  if (pages.length === 0) {
    pages.push(createPage(1))
  }

  return pages.map((page) => ({
    ...page,
    elements: [
      ...page.elements,
      ...repeatSections.flatMap((section) => repeatedSectionItems(section, elementsById)),
    ],
  }))
}
