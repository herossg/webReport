export type ReportElementType = 'text' | 'field' | 'table' | 'image' | 'line'

export type TextAlign = 'left' | 'center' | 'right'

export type FontWeight = '400' | '500' | '600' | '700'

export type ReportPageSize = 'A3' | 'A4' | 'A5' | 'B4' | 'B5' | 'LETTER' | 'custom'

export type ReportOrientation = 'portrait' | 'landscape'

export type ReportSectionType = 'fixed' | 'table'

export type ReportSectionFlow = 'continue' | 'nextPage'

export type ReportSectionRepeat = 'once' | 'eachPage'

export type ReportTableMode = 'data' | 'static'

export type ReportSectionRole = 'header' | 'body' | 'footer'

export interface ReportPageMargin {
  top: number
  right: number
  bottom: number
  left: number
}

export interface ReportColumn {
  id: string
  label: string
  field: string
  width?: number
  align?: TextAlign
  backgroundColor?: string
  color?: string
  borderColor?: string
  borderWidth?: number
}

export interface ReportTableStyle {
  headerBackgroundColor?: string
  headerColor?: string
  bodyBackgroundColor?: string
  alternateRowBackgroundColor?: string
  borderColor?: string
  borderWidth?: number
  cellPadding?: number
  rowHeight?: number
}

export interface ReportTableRowStyle {
  backgroundColor?: string
  color?: string
  borderColor?: string
  borderWidth?: number
  height?: number
}

export interface ReportTableColumnStyle {
  backgroundColor?: string
  color?: string
  borderColor?: string
  borderWidth?: number
  align?: TextAlign
  width?: number
}

export interface ReportElementStyle {
  fontSize: number
  fontWeight: FontWeight
  color: string
  backgroundColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  padding: number
  textAlign: TextAlign
}

export interface ReportElement {
  id: string
  type: ReportElementType
  name: string
  x: number
  y: number
  width: number
  height: number
  sectionId?: string
  value?: string
  binding?: string
  tableMode?: ReportTableMode
  dataSource?: string
  columns?: ReportColumn[]
  tableStyle?: ReportTableStyle
  staticRowStyles?: ReportTableRowStyle[]
  staticColumnStyles?: ReportTableColumnStyle[]
  staticRows?: number
  staticColumns?: number
  staticCells?: string[][]
  src?: string
  alt?: string
  style: ReportElementStyle
}

export interface ReportDataSource {
  id: string
  label: string
  description: string
}

export interface ReportSection {
  id: string
  name: string
  type: ReportSectionType
  role?: ReportSectionRole
  flow: ReportSectionFlow
  repeat: ReportSectionRepeat
  baseY: number
  height: number
  gapAfter?: number
  elementIds: string[]
  tableElementId?: string
  repeatHeader?: boolean
  rowHeight?: number
  headerHeight?: number
}

export interface ReportPage {
  size: ReportPageSize
  orientation: ReportOrientation
  width: number
  height: number
  widthMm: number
  heightMm: number
  margin: ReportPageMargin
  unit: 'px'
}

export interface ReportTemplate {
  id: string
  name: string
  description: string
  version: number
  updatedAt: string
  page: ReportPage
  dataSources: ReportDataSource[]
  sections: ReportSection[]
  elements: ReportElement[]
}

export type ReportData = Record<string, unknown>
