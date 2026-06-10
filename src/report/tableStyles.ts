import type { ReportElement, ReportTableStyle } from './types'

export const defaultTableStyle: Required<ReportTableStyle> = {
  headerBackgroundColor: '#f1f5f9',
  headerColor: '#334155',
  bodyBackgroundColor: '#ffffff',
  alternateRowBackgroundColor: '#f8fafc',
  borderColor: '#d7dde8',
  borderWidth: 1,
  cellPadding: 9,
  rowHeight: 40,
}

export function getResolvedTableStyle(element: Pick<ReportElement, 'tableStyle'>): Required<ReportTableStyle> {
  const tableStyle = element.tableStyle ?? {}

  return {
    headerBackgroundColor: tableStyle.headerBackgroundColor ?? defaultTableStyle.headerBackgroundColor,
    headerColor: tableStyle.headerColor ?? defaultTableStyle.headerColor,
    bodyBackgroundColor: tableStyle.bodyBackgroundColor ?? defaultTableStyle.bodyBackgroundColor,
    alternateRowBackgroundColor: tableStyle.alternateRowBackgroundColor ?? defaultTableStyle.alternateRowBackgroundColor,
    borderColor: tableStyle.borderColor ?? defaultTableStyle.borderColor,
    borderWidth: tableStyle.borderWidth ?? defaultTableStyle.borderWidth,
    cellPadding: tableStyle.cellPadding ?? defaultTableStyle.cellPadding,
    rowHeight: tableStyle.rowHeight ?? defaultTableStyle.rowHeight,
  }
}
