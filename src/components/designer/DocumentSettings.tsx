import { Settings } from 'lucide-react'
import { mmToPx, pageSizeOptions, pxToMm } from '../../report/page'
import type { ReportPageSize } from '../../report/types'
import { useReportStore } from '../../store/reportStore'

type MarginSide = 'top' | 'right' | 'bottom' | 'left'

interface MmInputProps {
  label: string
  min: number
  resetKey: string
  value: number
  disabled?: boolean
  onCommit: (value: number) => void
}

function displayMm(value: number): string {
  return Number(value.toFixed(1)).toString()
}

function normalizeMmInput(value: string, fallback: number, min: number): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.max(parsed, min)
}

function MmInput({ label, min, resetKey, value, disabled = false, onCommit }: MmInputProps) {
  const commit = (rawValue: string) => {
    onCommit(normalizeMmInput(rawValue, value, min))
  }

  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        key={resetKey}
        type="number"
        min={min}
        step="0.1"
        inputMode="decimal"
        disabled={disabled}
        defaultValue={displayMm(value)}
        onBlur={(event) => commit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
      />
    </label>
  )
}

export function DocumentSettings() {
  const page = useReportStore((state) => state.template.page)
  const updatePage = useReportStore((state) => state.updatePage)
  const isCustom = page.size === 'custom'

  const updateMargin = (side: MarginSide, valueMm: number) => {
    updatePage({
      margin: {
        [side]: mmToPx(valueMm),
      },
    })
  }

  return (
    <section className="panel document-settings app-chrome">
      <div className="panel-header">
        <span>문서 설정</span>
        <Settings size={16} />
      </div>

      <div className="form-stack">
        <label className="form-field">
          <span>용지</span>
          <select value={page.size} onChange={(event) => updatePage({ size: event.target.value as ReportPageSize })}>
            {pageSizeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.widthMm && option.heightMm
                  ? `${option.label} (${option.widthMm} x ${option.heightMm}mm)`
                  : option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="segmented orientation-toggle" aria-label="용지 방향">
          <button
            type="button"
            className={page.orientation === 'portrait' ? 'active' : ''}
            onClick={() => updatePage({ orientation: 'portrait' })}
          >
            세로
          </button>
          <button
            type="button"
            className={page.orientation === 'landscape' ? 'active' : ''}
            onClick={() => updatePage({ orientation: 'landscape' })}
          >
            가로
          </button>
        </div>

        <div className="form-grid">
          <MmInput
            label="너비(mm)"
            min={1}
            resetKey={`width-${page.size}-${page.orientation}-${page.widthMm}`}
            value={page.widthMm}
            disabled={!isCustom}
            onCommit={(value) => updatePage({ widthMm: value })}
          />
          <MmInput
            label="높이(mm)"
            min={1}
            resetKey={`height-${page.size}-${page.orientation}-${page.heightMm}`}
            value={page.heightMm}
            disabled={!isCustom}
            onCommit={(value) => updatePage({ heightMm: value })}
          />
        </div>

        <div className="page-size-summary">
          <strong>
            {page.width} x {page.height}px
          </strong>
          <span>
            {displayMm(page.widthMm)} x {displayMm(page.heightMm)}mm
          </span>
        </div>

        <div className="form-section">
          <span className="section-title">여백(mm)</span>
          <div className="form-grid">
            <MmInput
              label="상"
              min={0}
              resetKey={`margin-top-${page.margin.top}`}
              value={pxToMm(page.margin.top)}
              onCommit={(value) => updateMargin('top', value)}
            />
            <MmInput
              label="우"
              min={0}
              resetKey={`margin-right-${page.margin.right}`}
              value={pxToMm(page.margin.right)}
              onCommit={(value) => updateMargin('right', value)}
            />
            <MmInput
              label="하"
              min={0}
              resetKey={`margin-bottom-${page.margin.bottom}`}
              value={pxToMm(page.margin.bottom)}
              onCommit={(value) => updateMargin('bottom', value)}
            />
            <MmInput
              label="좌"
              min={0}
              resetKey={`margin-left-${page.margin.left}`}
              value={pxToMm(page.margin.left)}
              onCommit={(value) => updateMargin('left', value)}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
