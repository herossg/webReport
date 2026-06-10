import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react'
import { getResolvedTableStyle } from '../../report/tableStyles'
import type {
  ReportColumn,
  ReportDataSource,
  ReportElement,
  ReportSection,
  ReportTableColumnStyle,
  ReportTableRowStyle,
  ReportTableStyle,
  ReportTemplate,
} from '../../report/types'
import { useReportStore } from '../../store/reportStore'

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'color'
}

interface NumericFieldProps {
  label: string
  value: number
  onCommit: (value: number) => void
  disabled?: boolean
  min?: number
  max?: number
  step?: number
}

function clamp(value: number, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY): number {
  return Math.min(Math.max(value, min), max)
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? Number(value.toFixed(2)).toString() : '0'
}

function TextField({ label, value, onChange, type = 'text' }: TextFieldProps) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function NumericField({ label, value, onCommit, disabled = false, min, max, step = 1 }: NumericFieldProps) {
  const commit = (input: HTMLInputElement) => {
    if (disabled) {
      return
    }

    const parsed = Number(input.value)
    const nextValue = Number.isFinite(parsed) ? parsed : value
    const clampedValue = clamp(nextValue, min, max)

    input.value = formatNumber(clampedValue)

    if (clampedValue !== value) {
      onCommit(clampedValue)
    }
  }

  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        key={`${label}-${formatNumber(value)}-${disabled ? 'disabled' : 'enabled'}`}
        type="number"
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        defaultValue={formatNumber(value)}
        onBlur={(event) => commit(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.stopPropagation()
            const input = event.currentTarget

            window.setTimeout(() => {
              commit(input)
            }, 0)
          }
        }}
      />
    </label>
  )
}

function createDefaultColumns(): ReportColumn[] {
  return [
    { id: `customerName-${Date.now()}`, label: '고객명', field: 'customerName' },
    { id: `productName-${Date.now()}`, label: '상품명', field: 'productName' },
    { id: `amount-${Date.now()}`, label: '금액', field: 'amount', align: 'right' },
  ]
}

function updateColumn(
  element: ReportElement,
  index: number,
  patch: Partial<ReportColumn>,
  onChange: (patch: Partial<ReportElement>) => void,
) {
  const columns = element.columns ?? []
  const nextColumns = columns.map((column, columnIndex) =>
    columnIndex === index
      ? {
          ...column,
          ...patch,
        }
      : column,
  )

  onChange({ columns: nextColumns })
}

function getMinimumSize(element: ReportElement) {
  return {
    width: element.type === 'line' ? 24 : 48,
    height: element.type === 'line' ? 2 : 24,
  }
}

function getStaticRowCount(element: ReportElement): number {
  return Math.max(1, Math.round(element.staticRows ?? element.staticCells?.length ?? 4))
}

function getStaticColumnCount(element: ReportElement): number {
  const firstRowLength = element.staticCells?.[0]?.length

  return Math.max(1, Math.round(element.staticColumns ?? firstRowLength ?? 4))
}

function buildStaticCells(element: ReportElement, rows: number, columns: number): string[][] {
  return Array.from({ length: rows }, (_row, rowIndex) =>
    Array.from({ length: columns }, (_column, columnIndex) => {
      return element.staticCells?.[rowIndex]?.[columnIndex] ?? ''
    }),
  )
}

function buildStaticRowStyles(element: ReportElement, rows: number): ReportTableRowStyle[] {
  return Array.from({ length: rows }, (_row, rowIndex) => element.staticRowStyles?.[rowIndex] ?? {})
}

function buildStaticColumnStyles(element: ReportElement, columns: number): ReportTableColumnStyle[] {
  return Array.from({ length: columns }, (_column, columnIndex) => element.staticColumnStyles?.[columnIndex] ?? {})
}

function updateStaticRowStyle(
  element: ReportElement,
  index: number,
  patch: Partial<ReportTableRowStyle>,
  onChange: (patch: Partial<ReportElement>) => void,
) {
  const rowStyles = buildStaticRowStyles(element, getStaticRowCount(element))
  rowStyles[index] = {
    ...rowStyles[index],
    ...patch,
  }

  onChange({ staticRowStyles: rowStyles })
}

function updateStaticColumnStyle(
  element: ReportElement,
  index: number,
  patch: Partial<ReportTableColumnStyle>,
  onChange: (patch: Partial<ReportElement>) => void,
) {
  const columnStyles = buildStaticColumnStyles(element, getStaticColumnCount(element))
  columnStyles[index] = {
    ...columnStyles[index],
    ...patch,
  }

  onChange({ staticColumnStyles: columnStyles })
}

function getStaticTablePatch(element: ReportElement): Partial<ReportElement> {
  const rows = getStaticRowCount(element)
  const columns = getStaticColumnCount(element)

  return {
    tableMode: 'static',
    dataSource: undefined,
    columns: undefined,
    staticRows: rows,
    staticColumns: columns,
    staticCells: buildStaticCells(element, rows, columns),
    staticRowStyles: buildStaticRowStyles(element, rows),
    staticColumnStyles: buildStaticColumnStyles(element, columns),
  }
}

function getDataTablePatch(element: ReportElement): Partial<ReportElement> {
  return {
    tableMode: 'data',
    dataSource: element.dataSource ?? 'orders',
    columns: element.columns?.length ? element.columns : createDefaultColumns(),
    staticRows: undefined,
    staticColumns: undefined,
    staticCells: undefined,
    staticRowStyles: undefined,
    staticColumnStyles: undefined,
  }
}

function isLockedSection(section: ReportSection): boolean {
  return section.role === 'header' || section.role === 'footer'
}

function getSectionBadge(section: ReportSection, tableElement?: ReportElement): string {
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

function DataSourceSelect({
  label,
  value,
  dataSources,
  emptyLabel,
  onChange,
}: {
  label: string
  value?: string
  dataSources: ReportDataSource[]
  emptyLabel: string
  onChange: (value: string | undefined) => void
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)}>
        <option value="">{emptyLabel}</option>
        {dataSources.map((dataSource) => (
          <option key={dataSource.id} value={dataSource.id}>
            {dataSource.label || dataSource.id}
          </option>
        ))}
      </select>
    </label>
  )
}

type ElementLayerDirection = 'front' | 'back' | 'forward' | 'backward'

function LayerControls({
  element,
  section,
  onMove,
}: {
  element: ReportElement
  section?: ReportSection
  onMove: (id: string, direction: ElementLayerDirection) => void
}) {
  const layerIds = section?.elementIds ?? []
  const layerIndex = layerIds.indexOf(element.id)
  const layerCount = layerIds.length
  const hasMultipleLayers = layerCount > 1 && layerIndex >= 0
  const isBack = !hasMultipleLayers || layerIndex === 0
  const isFront = !hasMultipleLayers || layerIndex === layerCount - 1

  return (
    <div className="form-section">
      <span className="section-title">레이어</span>
      <div className="layer-summary">
        {hasMultipleLayers ? `${layerIndex + 1} / ${layerCount}` : '이 영역에 겹칠 수 있는 다른 요소가 없습니다.'}
      </div>
      <div className="layer-button-grid">
        <button
          type="button"
          className="button subtle"
          disabled={isFront}
          onClick={() => onMove(element.id, 'front')}
        >
          <ArrowUp size={16} />
          맨위
        </button>
        <button
          type="button"
          className="button subtle"
          disabled={isFront}
          onClick={() => onMove(element.id, 'forward')}
        >
          <ArrowUp size={16} />
          위로
        </button>
        <button
          type="button"
          className="button subtle"
          disabled={isBack}
          onClick={() => onMove(element.id, 'backward')}
        >
          <ArrowDown size={16} />
          아래로
        </button>
        <button
          type="button"
          className="button subtle"
          disabled={isBack}
          onClick={() => onMove(element.id, 'back')}
        >
          <ArrowDown size={16} />
          맨뒤
        </button>
      </div>
    </div>
  )
}

type AlignValue = NonNullable<ReportColumn['align']>

function AlignField({
  value,
  onChange,
}: {
  value?: AlignValue
  onChange: (value: AlignValue) => void
}) {
  return (
    <label className="form-field">
      <span>정렬</span>
      <select value={value ?? 'left'} onChange={(event) => onChange(event.target.value as AlignValue)}>
        <option value="left">left</option>
        <option value="center">center</option>
        <option value="right">right</option>
      </select>
    </label>
  )
}

function TableStyleEditor({
  tableStyle,
  onChange,
}: {
  tableStyle: Required<ReportTableStyle>
  onChange: (patch: Partial<ReportTableStyle>) => void
}) {
  return (
    <div className="form-section">
      <span className="section-title">표 스타일</span>
      <div className="form-grid">
        <TextField
          label="헤더 배경"
          type="color"
          value={tableStyle.headerBackgroundColor}
          onChange={(value) => onChange({ headerBackgroundColor: value })}
        />
        <TextField
          label="헤더 글자"
          type="color"
          value={tableStyle.headerColor}
          onChange={(value) => onChange({ headerColor: value })}
        />
        <TextField
          label="본문 배경"
          type="color"
          value={tableStyle.bodyBackgroundColor}
          onChange={(value) => onChange({ bodyBackgroundColor: value })}
        />
        <TextField
          label="짝수 행 배경"
          type="color"
          value={tableStyle.alternateRowBackgroundColor}
          onChange={(value) => onChange({ alternateRowBackgroundColor: value })}
        />
        <TextField
          label="테두리 색"
          type="color"
          value={tableStyle.borderColor}
          onChange={(value) => onChange({ borderColor: value })}
        />
        <NumericField
          label="테두리 두께"
          value={tableStyle.borderWidth}
          min={0}
          onCommit={(value) => onChange({ borderWidth: value })}
        />
        <NumericField
          label="셀 여백"
          value={tableStyle.cellPadding}
          min={0}
          onCommit={(value) => onChange({ cellPadding: value })}
        />
        <NumericField
          label="기본 행 높이"
          value={tableStyle.rowHeight}
          min={16}
          onCommit={(value) => onChange({ rowHeight: value })}
        />
      </div>
    </div>
  )
}

function DataColumnCard({
  element,
  column,
  index,
  tableStyle,
  onChange,
}: {
  element: ReportElement
  column: ReportColumn
  index: number
  tableStyle: Required<ReportTableStyle>
  onChange: (patch: Partial<ReportElement>) => void
}) {
  const columnCount = Math.max(1, element.columns?.length ?? 1)
  const fallbackWidth = column.width ?? Math.max(32, Math.round(element.width / columnCount))

  return (
    <div className="column-card">
      <div className="column-row">
        <input
          aria-label="컬럼 라벨"
          value={column.label}
          onChange={(event) => updateColumn(element, index, { label: event.target.value }, onChange)}
        />
        <input
          aria-label="필드명"
          value={column.field}
          onChange={(event) => updateColumn(element, index, { field: event.target.value }, onChange)}
        />
        <button
          type="button"
          aria-label="컬럼 삭제"
          onClick={() =>
            onChange({
              columns: (element.columns ?? []).filter((_column, columnIndex) => columnIndex !== index),
            })
          }
        >
          삭제
        </button>
      </div>

      <div className="form-grid">
        <AlignField
          value={column.align}
          onChange={(value) => updateColumn(element, index, { align: value }, onChange)}
        />
        <NumericField
          label="너비"
          value={fallbackWidth}
          min={24}
          onCommit={(value) => updateColumn(element, index, { width: value }, onChange)}
        />
        <TextField
          label="배경"
          type="color"
          value={column.backgroundColor ?? tableStyle.bodyBackgroundColor}
          onChange={(value) => updateColumn(element, index, { backgroundColor: value }, onChange)}
        />
        <TextField
          label="글자색"
          type="color"
          value={column.color ?? element.style.color}
          onChange={(value) => updateColumn(element, index, { color: value }, onChange)}
        />
        <TextField
          label="테두리 색"
          type="color"
          value={column.borderColor ?? tableStyle.borderColor}
          onChange={(value) => updateColumn(element, index, { borderColor: value }, onChange)}
        />
        <NumericField
          label="테두리 두께"
          value={column.borderWidth ?? tableStyle.borderWidth}
          min={0}
          onCommit={(value) => updateColumn(element, index, { borderWidth: value }, onChange)}
        />
      </div>
    </div>
  )
}

function StaticRowStyleCard({
  element,
  rowIndex,
  tableStyle,
  onChange,
}: {
  element: ReportElement
  rowIndex: number
  tableStyle: Required<ReportTableStyle>
  onChange: (patch: Partial<ReportElement>) => void
}) {
  const rowStyle = element.staticRowStyles?.[rowIndex] ?? {}
  const rowBackground =
    rowIndex % 2 === 1 ? tableStyle.alternateRowBackgroundColor : tableStyle.bodyBackgroundColor

  return (
    <div className="style-card">
      <strong>{rowIndex + 1}행</strong>
      <div className="form-grid">
        <TextField
          label="배경"
          type="color"
          value={rowStyle.backgroundColor ?? rowBackground}
          onChange={(value) => updateStaticRowStyle(element, rowIndex, { backgroundColor: value }, onChange)}
        />
        <TextField
          label="글자색"
          type="color"
          value={rowStyle.color ?? element.style.color}
          onChange={(value) => updateStaticRowStyle(element, rowIndex, { color: value }, onChange)}
        />
        <TextField
          label="테두리 색"
          type="color"
          value={rowStyle.borderColor ?? tableStyle.borderColor}
          onChange={(value) => updateStaticRowStyle(element, rowIndex, { borderColor: value }, onChange)}
        />
        <NumericField
          label="테두리 두께"
          value={rowStyle.borderWidth ?? tableStyle.borderWidth}
          min={0}
          onCommit={(value) => updateStaticRowStyle(element, rowIndex, { borderWidth: value }, onChange)}
        />
        <NumericField
          label="높이"
          value={rowStyle.height ?? tableStyle.rowHeight}
          min={16}
          onCommit={(value) => updateStaticRowStyle(element, rowIndex, { height: value }, onChange)}
        />
      </div>
    </div>
  )
}

function StaticColumnStyleCard({
  element,
  columnIndex,
  tableStyle,
  onChange,
}: {
  element: ReportElement
  columnIndex: number
  tableStyle: Required<ReportTableStyle>
  onChange: (patch: Partial<ReportElement>) => void
}) {
  const columnStyle = element.staticColumnStyles?.[columnIndex] ?? {}
  const staticColumns = getStaticColumnCount(element)
  const fallbackWidth = columnStyle.width ?? Math.max(32, Math.round(element.width / staticColumns))

  return (
    <div className="style-card">
      <strong>{columnIndex + 1}열</strong>
      <div className="form-grid">
        <AlignField
          value={columnStyle.align}
          onChange={(value) => updateStaticColumnStyle(element, columnIndex, { align: value }, onChange)}
        />
        <NumericField
          label="너비"
          value={fallbackWidth}
          min={24}
          onCommit={(value) => updateStaticColumnStyle(element, columnIndex, { width: value }, onChange)}
        />
        <TextField
          label="배경"
          type="color"
          value={columnStyle.backgroundColor ?? tableStyle.bodyBackgroundColor}
          onChange={(value) => updateStaticColumnStyle(element, columnIndex, { backgroundColor: value }, onChange)}
        />
        <TextField
          label="글자색"
          type="color"
          value={columnStyle.color ?? element.style.color}
          onChange={(value) => updateStaticColumnStyle(element, columnIndex, { color: value }, onChange)}
        />
        <TextField
          label="테두리 색"
          type="color"
          value={columnStyle.borderColor ?? tableStyle.borderColor}
          onChange={(value) => updateStaticColumnStyle(element, columnIndex, { borderColor: value }, onChange)}
        />
        <NumericField
          label="테두리 두께"
          value={columnStyle.borderWidth ?? tableStyle.borderWidth}
          min={0}
          onCommit={(value) => updateStaticColumnStyle(element, columnIndex, { borderWidth: value }, onChange)}
        />
      </div>
    </div>
  )
}

function TableProperties({
  element,
  section,
  dataSources,
  onChange,
  onSectionChange,
}: {
  element: ReportElement
  section?: ReportSection
  dataSources: ReportDataSource[]
  onChange: (patch: Partial<ReportElement>) => void
  onSectionChange?: (id: string, patch: Partial<ReportSection>) => void
}) {
  const tableMode = element.tableMode ?? 'data'
  const staticRows = getStaticRowCount(element)
  const staticColumns = getStaticColumnCount(element)
  const staticCells = buildStaticCells(element, staticRows, staticColumns)
  const tableStyle = getResolvedTableStyle(element)
  const changeTableStyle = (patch: Partial<ReportTableStyle>) => {
    onChange({
      tableStyle: {
        ...tableStyle,
        ...patch,
      },
    })

    if (typeof patch.rowHeight === 'number' && tableMode === 'data' && section?.type === 'table') {
      onSectionChange?.(section.id, { rowHeight: patch.rowHeight })
    }
  }

  return (
    <div className="table-editor">
      <label className="form-field">
        <span>테이블 방식</span>
        <select
          value={tableMode}
          onChange={(event) =>
            onChange(event.target.value === 'static' ? getStaticTablePatch(element) : getDataTablePatch(element))
          }
        >
          <option value="data">데이터 반복</option>
          <option value="static">고정폼 테이블</option>
        </select>
      </label>

      <TableStyleEditor tableStyle={tableStyle} onChange={changeTableStyle} />

      {tableMode === 'static' ? (
        <>
          <div className="form-grid">
            <NumericField
              label="행 수"
              value={staticRows}
              min={1}
              step={1}
              onCommit={(value) => {
                const nextRows = Math.max(1, Math.round(value))

                onChange({
                  staticRows: nextRows,
                  staticCells: buildStaticCells(element, nextRows, staticColumns),
                  staticRowStyles: buildStaticRowStyles(element, nextRows),
                })
              }}
            />
            <NumericField
              label="열 수"
              value={staticColumns}
              min={1}
              step={1}
              onCommit={(value) => {
                const nextColumns = Math.max(1, Math.round(value))

                onChange({
                  staticColumns: nextColumns,
                  staticCells: buildStaticCells(element, staticRows, nextColumns),
                  staticColumnStyles: buildStaticColumnStyles(element, nextColumns),
                })
              }}
            />
          </div>

          <div
            className="static-cell-grid"
            style={{
              gridTemplateColumns: `repeat(${staticColumns}, minmax(72px, 1fr))`,
            }}
          >
            {staticCells.map((row, rowIndex) =>
              row.map((cell, columnIndex) => (
                <input
                  key={`${rowIndex}-${columnIndex}`}
                  aria-label={`${rowIndex + 1}행 ${columnIndex + 1}열`}
                  value={cell}
                  onChange={(event) => {
                    const nextCells = buildStaticCells(element, staticRows, staticColumns)
                    nextCells[rowIndex][columnIndex] = event.target.value

                    onChange({ staticCells: nextCells })
                  }}
                />
              )),
            )}
          </div>

          <div className="form-section">
            <span className="section-title">행 스타일</span>
            <div className="style-card-list">
              {Array.from({ length: staticRows }, (_row, rowIndex) => (
                <StaticRowStyleCard
                  key={`${element.id}-row-style-${rowIndex}`}
                  element={element}
                  rowIndex={rowIndex}
                  tableStyle={tableStyle}
                  onChange={onChange}
                />
              ))}
            </div>
          </div>

          <div className="form-section">
            <span className="section-title">열 스타일</span>
            <div className="style-card-list">
              {Array.from({ length: staticColumns }, (_column, columnIndex) => (
                <StaticColumnStyleCard
                  key={`${element.id}-column-style-${columnIndex}`}
                  element={element}
                  columnIndex={columnIndex}
                  tableStyle={tableStyle}
                  onChange={onChange}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <DataSourceSelect
            label="데이터 소스"
            value={element.dataSource ?? ''}
            dataSources={dataSources}
            emptyLabel={section?.dataSource ? `부모 영역 사용 (${section.dataSource})` : '부모 영역/기본 데이터 사용'}
            onChange={(value) => onChange({ dataSource: value })}
          />
          <div className="column-list">
            {(element.columns ?? []).map((column, index) => (
              <DataColumnCard
                key={column.id}
                element={element}
                column={column}
                index={index}
                tableStyle={tableStyle}
                onChange={onChange}
              />
            ))}
          </div>
          <button
            type="button"
            className="button subtle"
            onClick={() =>
              onChange({
                columns: [
                  ...(element.columns ?? []),
                  {
                    id: `column-${Date.now()}`,
                    label: '새 컬럼',
                    field: 'field',
                  },
                ],
              })
            }
          >
            컬럼 추가
          </button>
        </>
      )}
    </div>
  )
}

function SectionProperties({
  section,
  template,
  onRemove,
  onSectionChange,
  onSectionResize,
  onElementChange,
}: {
  section: ReportSection
  template: ReportTemplate
  onRemove: (id: string) => void
  onSectionChange: (id: string, patch: Partial<ReportSection>) => void
  onSectionResize: (id: string, height: number) => void
  onElementChange: (id: string, patch: Partial<ReportElement>) => void
}) {
  const locked = isLockedSection(section)
  const tableElement = section.tableElementId
    ? template.elements.find((element) => element.id === section.tableElementId)
    : undefined

  return (
    <aside className="panel properties app-chrome">
      <div className="panel-header">
        <span>영역 속성</span>
        <strong>{getSectionBadge(section, tableElement)}</strong>
      </div>

      <div className="form-stack">
        <TextField label="영역 이름" value={section.name} onChange={(value) => onSectionChange(section.id, { name: value })} />

        <div className="page-size-summary">
          <strong>{section.id}</strong>
          <span>{section.elementIds.length}개 요소가 이 영역에 속해 있습니다.</span>
        </div>

        <DataSourceSelect
          label="영역 데이터소스"
          value={section.dataSource}
          dataSources={template.dataSources}
          emptyLabel="기본/root 데이터 사용"
          onChange={(value) => onSectionChange(section.id, { dataSource: value })}
        />

        <div className="form-grid">
          <NumericField
            label="시작 Y"
            value={section.baseY}
            disabled={locked}
            onCommit={(value) => onSectionChange(section.id, { baseY: value })}
          />
          <NumericField
            label="영역 높이"
            value={section.height}
            min={1}
            onCommit={(value) => onSectionResize(section.id, value)}
          />
          <NumericField
            label="뒤 여백"
            value={section.gapAfter ?? 0}
            min={0}
            onCommit={(value) => onSectionChange(section.id, { gapAfter: value })}
          />
          <label className="form-field">
            <span>역할</span>
            <select value={section.role ?? 'body'} disabled>
              <option value="header">HEAD</option>
              <option value="body">BODY</option>
              <option value="footer">FOOT</option>
            </select>
          </label>
        </div>

        <label className="form-field">
          <span>출력 흐름</span>
          <select
            value={section.flow}
            disabled={locked}
            onChange={(event) =>
              onSectionChange(section.id, {
                flow: event.target.value === 'nextPage' ? 'nextPage' : 'continue',
              })
            }
          >
            <option value="continue">이전 영역과 연결</option>
            <option value="nextPage">새 페이지에서 시작</option>
          </select>
        </label>

        {section.type === 'fixed' ? (
          <label className="form-field">
            <span>반복</span>
            <select
              value={section.repeat}
              disabled={locked}
              onChange={(event) =>
                onSectionChange(section.id, {
                  repeat: event.target.value === 'eachPage' ? 'eachPage' : 'once',
                })
              }
            >
              <option value="once">한 번 출력</option>
              <option value="eachPage">매 페이지 출력</option>
            </select>
          </label>
        ) : null}

        {section.type === 'table' && tableElement ? (
          <div className="form-section">
            <span className="section-title">테이블 영역</span>
            <label className="form-field">
              <span>테이블 방식</span>
              <select
                value={tableElement.tableMode ?? 'data'}
                onChange={(event) =>
                  onElementChange(
                    tableElement.id,
                    event.target.value === 'static' ? getStaticTablePatch(tableElement) : getDataTablePatch(tableElement),
                  )
                }
              >
                <option value="data">데이터 반복</option>
                <option value="static">고정폼 테이블</option>
              </select>
            </label>

            {tableElement.tableMode === 'static' ? null : (
              <div className="form-grid">
                <NumericField
                  label="헤더 높이"
                  value={section.headerHeight ?? 40}
                  min={16}
                  onCommit={(value) => onSectionChange(section.id, { headerHeight: value })}
                />
                <NumericField
                  label="행 높이"
                  value={section.rowHeight ?? 40}
                  min={16}
                  onCommit={(value) => {
                    onSectionChange(section.id, { rowHeight: value })
                    onElementChange(tableElement.id, {
                      tableStyle: {
                        ...getResolvedTableStyle(tableElement),
                        rowHeight: value,
                      },
                    })
                  }}
                />
              </div>
            )}
          </div>
        ) : null}

        <button type="button" className="button danger" disabled={locked} onClick={() => onRemove(section.id)}>
          <Trash2 size={16} />
          영역 삭제
        </button>
      </div>
    </aside>
  )
}

export function PropertiesPanel() {
  const template = useReportStore((state) => state.template)
  const selectedElementId = useReportStore((state) => state.selectedElementId)
  const selectedSectionId = useReportStore((state) => state.selectedSectionId)
  const assignElementToSection = useReportStore((state) => state.assignElementToSection)
  const updateSection = useReportStore((state) => state.updateSection)
  const resizeSection = useReportStore((state) => state.resizeSection)
  const updateElement = useReportStore((state) => state.updateElement)
  const moveElementLayer = useReportStore((state) => state.moveElementLayer)
  const removeSection = useReportStore((state) => state.removeSection)
  const removeElement = useReportStore((state) => state.removeElement)
  const duplicateElement = useReportStore((state) => state.duplicateElement)
  const element = template.elements.find((item) => item.id === selectedElementId)
  const selectedSection = selectedSectionId
    ? template.sections.find((section) => section.id === selectedSectionId)
    : undefined

  if (!element && selectedSection) {
    return (
      <SectionProperties
        section={selectedSection}
        template={template}
        onRemove={removeSection}
        onSectionChange={updateSection}
        onSectionResize={resizeSection}
        onElementChange={updateElement}
      />
    )
  }

  if (!element) {
    return (
      <aside className="panel properties app-chrome">
        <div className="panel-header">
          <span>속성</span>
        </div>
        <p className="empty-state">캔버스에서 영역이나 요소를 선택하면 오른쪽에서 속성을 수정할 수 있습니다.</p>
      </aside>
    )
  }

  const minimumSize = getMinimumSize(element)
  const elementSection = element.sectionId
    ? template.sections.find((section) => section.id === element.sectionId)
    : undefined
  const maxX = Math.max(0, template.page.width - element.width)
  const maxY = Math.max(0, template.page.height - element.height)
  const maxWidth = Math.max(minimumSize.width, template.page.width - element.x)
  const maxHeight = Math.max(minimumSize.height, template.page.height - element.y)

  const change = (patch: Partial<ReportElement>) => updateElement(element.id, patch)
  const changeStyle = (patch: Partial<ReportElement['style']>) =>
    change({
      style: {
        ...element.style,
        ...patch,
      },
    })

  return (
    <aside className="panel properties app-chrome">
      <div className="panel-header">
        <span>요소 속성</span>
        <strong>{element.type}</strong>
      </div>

      <div className="form-stack">
        <TextField label="이름" value={element.name} onChange={(value) => change({ name: value })} />

        <label className="form-field">
          <span>부모 영역</span>
          <select
            value={element.sectionId ?? ''}
            onChange={(event) => assignElementToSection(element.id, event.target.value)}
          >
            {template.sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </label>

        <LayerControls element={element} section={elementSection} onMove={moveElementLayer} />

        <div className="form-grid">
          <NumericField label="X" value={element.x} min={0} max={maxX} onCommit={(value) => change({ x: value })} />
          <NumericField label="Y" value={element.y} min={0} max={maxY} onCommit={(value) => change({ y: value })} />
          <NumericField
            label="Width"
            value={element.width}
            min={minimumSize.width}
            max={maxWidth}
            onCommit={(value) => change({ width: value })}
          />
          <NumericField
            label="Height"
            value={element.height}
            min={minimumSize.height}
            max={maxHeight}
            onCommit={(value) => change({ height: value })}
          />
        </div>

        {element.type === 'text' ? (
          <label className="form-field">
            <span>텍스트</span>
            <textarea value={element.value ?? ''} onChange={(event) => change({ value: event.target.value })} />
          </label>
        ) : null}

        {element.type === 'field' ? (
          <TextField label="데이터 경로" value={element.binding ?? ''} onChange={(value) => change({ binding: value })} />
        ) : null}

        {element.type === 'image' ? (
          <>
            <TextField label="이미지 URL" value={element.src ?? ''} onChange={(value) => change({ src: value })} />
            <TextField label="대체 텍스트" value={element.alt ?? ''} onChange={(value) => change({ alt: value })} />
          </>
        ) : null}

        {element.type === 'table' ? (
          <TableProperties
            element={element}
            section={elementSection}
            dataSources={template.dataSources}
            onChange={change}
            onSectionChange={updateSection}
          />
        ) : null}

        <div className="form-section">
          <span className="section-title">스타일</span>
          <div className="form-grid">
            <NumericField
              label="글자 크기"
              value={element.style.fontSize}
              min={1}
              onCommit={(value) => changeStyle({ fontSize: value })}
            />
            <label className="form-field">
              <span>정렬</span>
              <select
                value={element.style.textAlign}
                onChange={(event) =>
                  changeStyle({ textAlign: event.target.value as ReportElement['style']['textAlign'] })
                }
              >
                <option value="left">left</option>
                <option value="center">center</option>
                <option value="right">right</option>
              </select>
            </label>
            <TextField
              label="글자색"
              type="color"
              value={element.style.color}
              onChange={(value) => changeStyle({ color: value })}
            />
            <TextField
              label="배경색"
              type="color"
              value={element.style.backgroundColor}
              onChange={(value) => changeStyle({ backgroundColor: value })}
            />
            <NumericField
              label="테두리"
              value={element.style.borderWidth}
              min={0}
              onCommit={(value) => changeStyle({ borderWidth: value })}
            />
            <NumericField
              label="패딩"
              value={element.style.padding}
              min={0}
              onCommit={(value) => changeStyle({ padding: value })}
            />
          </div>
        </div>

        <div className="button-row">
          <button type="button" className="button subtle" onClick={() => duplicateElement(element.id)}>
            <Copy size={16} />
            복제
          </button>
          <button type="button" className="button danger" onClick={() => removeElement(element.id)}>
            <Trash2 size={16} />
            삭제
          </button>
        </div>
      </div>
    </aside>
  )
}
