import type { CSSProperties } from 'react'
import { formatValue, getDataRows, interpolateText, resolvePath } from '../report/bindings'
import { getResolvedTableStyle } from '../report/tableStyles'
import type {
  ReportColumn,
  ReportData,
  ReportElement,
  ReportTableColumnStyle,
  ReportTableRowStyle,
  ReportTableStyle,
} from '../report/types'

interface ReportElementRendererProps {
  element: ReportElement
  data: ReportData
  mode: 'designer' | 'viewer'
  tableRows?: Record<string, unknown>[]
}

function baseElementStyle(element: ReportElement): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    fontSize: element.style.fontSize,
    fontWeight: element.style.fontWeight,
    color: element.style.color,
    background: element.style.backgroundColor,
    border: `${element.style.borderWidth}px solid ${element.style.borderColor}`,
    borderRadius: element.style.borderRadius,
    padding: element.style.padding,
    textAlign: element.style.textAlign,
  }
}

function FieldElement({ element, data }: Pick<ReportElementRendererProps, 'element' | 'data'>) {
  const value = formatValue(resolvePath(data, element.binding ?? ''))

  return (
    <div className="report-field" style={baseElementStyle(element)}>
      <span className="report-field-label">{element.name}</span>
      <strong>{value || `{{${element.binding ?? 'field'}}}`}</strong>
    </div>
  )
}

function getStaticCells(element: ReportElement): string[][] {
  const rowCount = Math.max(1, Math.round(element.staticRows ?? 4))
  const columnCount = Math.max(1, Math.round(element.staticColumns ?? 4))

  return Array.from({ length: rowCount }, (_row, rowIndex) =>
    Array.from({ length: columnCount }, (_column, columnIndex) => {
      return element.staticCells?.[rowIndex]?.[columnIndex] ?? ''
    }),
  )
}

function getBorderStyle(width: number, color: string): string {
  return width > 0 ? `${width}px solid ${color}` : '0'
}

function getHeaderCellStyle(column: ReportColumn, tableStyle: Required<ReportTableStyle>): CSSProperties {
  const borderWidth = column.borderWidth ?? tableStyle.borderWidth
  const borderColor = column.borderColor ?? tableStyle.borderColor

  return {
    width: column.width,
    height: tableStyle.rowHeight,
    padding: tableStyle.cellPadding,
    color: tableStyle.headerColor,
    background: tableStyle.headerBackgroundColor,
    borderBottom: getBorderStyle(borderWidth, borderColor),
    borderRight: getBorderStyle(borderWidth, borderColor),
    textAlign: column.align ?? 'left',
  }
}

function getDataCellStyle(
  element: ReportElement,
  column: ReportColumn,
  rowIndex: number,
  tableStyle: Required<ReportTableStyle>,
): CSSProperties {
  const borderWidth = column.borderWidth ?? tableStyle.borderWidth
  const borderColor = column.borderColor ?? tableStyle.borderColor
  const rowBackground =
    rowIndex % 2 === 1 ? tableStyle.alternateRowBackgroundColor : tableStyle.bodyBackgroundColor

  return {
    width: column.width,
    height: tableStyle.rowHeight,
    padding: tableStyle.cellPadding,
    color: column.color ?? element.style.color,
    background: column.backgroundColor ?? rowBackground,
    borderBottom: getBorderStyle(borderWidth, borderColor),
    borderRight: getBorderStyle(borderWidth, borderColor),
    textAlign: column.align ?? 'left',
  }
}

function getStaticCellStyle(
  element: ReportElement,
  rowIndex: number,
  columnIndex: number,
  tableStyle: Required<ReportTableStyle>,
): CSSProperties {
  const rowStyle: ReportTableRowStyle = element.staticRowStyles?.[rowIndex] ?? {}
  const columnStyle: ReportTableColumnStyle = element.staticColumnStyles?.[columnIndex] ?? {}
  const borderWidth = columnStyle.borderWidth ?? rowStyle.borderWidth ?? tableStyle.borderWidth
  const borderColor = columnStyle.borderColor ?? rowStyle.borderColor ?? tableStyle.borderColor
  const rowBackground =
    rowIndex % 2 === 1 ? tableStyle.alternateRowBackgroundColor : tableStyle.bodyBackgroundColor

  return {
    width: columnStyle.width,
    height: rowStyle.height ?? tableStyle.rowHeight,
    padding: tableStyle.cellPadding,
    color: columnStyle.color ?? rowStyle.color ?? element.style.color,
    background: columnStyle.backgroundColor ?? rowStyle.backgroundColor ?? rowBackground,
    borderBottom: getBorderStyle(borderWidth, borderColor),
    borderRight: getBorderStyle(borderWidth, borderColor),
    textAlign: columnStyle.align ?? element.style.textAlign,
  }
}

function TableElement({
  element,
  data,
  mode,
  tableRows,
}: Pick<ReportElementRendererProps, 'element' | 'data' | 'mode' | 'tableRows'>) {
  const tableStyle = getResolvedTableStyle(element)

  if (element.tableMode === 'static') {
    const staticCells = getStaticCells(element)

    return (
      <div className="report-table-wrap" style={baseElementStyle(element)}>
        <table className="report-table static-table">
          <tbody>
            {staticCells.map((row, rowIndex) => (
              <tr key={`${element.id}-static-${rowIndex}`}>
                {row.map((cell, columnIndex) => (
                  <td
                    key={`${element.id}-static-${rowIndex}-${columnIndex}`}
                    style={getStaticCellStyle(element, rowIndex, columnIndex, tableStyle)}
                  >
                    {interpolateText(cell, data)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const rows = tableRows ?? getDataRows(data, element.dataSource)
  const visibleRows = mode === 'designer' ? rows.slice(0, 5) : rows

  return (
    <div className="report-table-wrap" style={baseElementStyle(element)}>
      <table className="report-table">
        <thead>
          <tr>
            {(element.columns ?? []).map((column) => (
              <th key={column.id} style={getHeaderCellStyle(column, tableStyle)}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, rowIndex) => (
            <tr key={`${element.id}-${rowIndex}`}>
              {(element.columns ?? []).map((column) => (
                <td key={column.id} style={getDataCellStyle(element, column, rowIndex, tableStyle)}>
                  {formatValue(resolvePath(row, column.field))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {visibleRows.length === 0 ? <div className="empty-table">데이터 없음</div> : null}
    </div>
  )
}

function ImageElement({ element }: Pick<ReportElementRendererProps, 'element'>) {
  if (!element.src) {
    return (
      <div className="image-placeholder" style={baseElementStyle(element)}>
        이미지 URL을 입력하세요
      </div>
    )
  }

  return (
    <div style={baseElementStyle(element)}>
      <img className="report-image" src={element.src} alt={element.alt ?? element.name} />
    </div>
  )
}

export function ReportElementRenderer({ element, data, mode, tableRows }: ReportElementRendererProps) {
  if (element.type === 'line') {
    return (
      <div
        className="report-line"
        style={{
          width: '100%',
          height: '100%',
          background: element.style.backgroundColor || element.style.borderColor,
        }}
      />
    )
  }

  if (element.type === 'field') {
    return <FieldElement element={element} data={data} />
  }

  if (element.type === 'table') {
    return <TableElement element={element} data={data} mode={mode} tableRows={tableRows} />
  }

  if (element.type === 'image') {
    return <ImageElement element={element} />
  }

  return <div style={baseElementStyle(element)}>{interpolateText(element.value, data)}</div>
}
