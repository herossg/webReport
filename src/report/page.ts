import type { ReportOrientation, ReportPage, ReportPageMargin, ReportPageSize, ReportTemplate } from './types'

export const PX_PER_MM = 96 / 25.4

export const pageSizeOptions: Array<{
  value: ReportPageSize
  label: string
  widthMm?: number
  heightMm?: number
}> = [
  { value: 'A3', label: 'A3', widthMm: 297, heightMm: 420 },
  { value: 'A4', label: 'A4', widthMm: 210, heightMm: 297 },
  { value: 'A5', label: 'A5', widthMm: 148, heightMm: 210 },
  { value: 'B4', label: 'B4', widthMm: 257, heightMm: 364 },
  { value: 'B5', label: 'B5', widthMm: 182, heightMm: 257 },
  { value: 'LETTER', label: 'Letter', widthMm: 216, heightMm: 279 },
  { value: 'custom', label: '사용자 지정' },
]

export interface PageSettingsPatch {
  size?: ReportPageSize
  orientation?: ReportOrientation
  widthMm?: number
  heightMm?: number
  margin?: Partial<ReportPageMargin>
}

export function mmToPx(value: number): number {
  return Math.round(value * PX_PER_MM)
}

export function pxToMm(value: number): number {
  return value / PX_PER_MM
}

function clampPositive(value: unknown, fallback: number): number {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return fallback
  }

  return numberValue
}

function clampMargin(value: unknown, fallback = 48): number {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return fallback
  }

  return numberValue
}

function getPreset(size: ReportPageSize) {
  return pageSizeOptions.find((option) => option.value === size && option.widthMm && option.heightMm)
}

function getPresetDimensions(size: ReportPageSize, orientation: ReportOrientation) {
  const preset = getPreset(size) ?? getPreset('A4')
  const widthMm = preset?.widthMm ?? 210
  const heightMm = preset?.heightMm ?? 297

  if (orientation === 'landscape') {
    return {
      widthMm: heightMm,
      heightMm: widthMm,
    }
  }

  return {
    widthMm,
    heightMm,
  }
}

function normalizeMargins(margin: unknown): ReportPageMargin {
  if (typeof margin === 'number') {
    const value = clampMargin(margin)

    return {
      top: value,
      right: value,
      bottom: value,
      left: value,
    }
  }

  if (margin && typeof margin === 'object') {
    const candidate = margin as Partial<ReportPageMargin>

    return {
      top: clampMargin(candidate.top),
      right: clampMargin(candidate.right),
      bottom: clampMargin(candidate.bottom),
      left: clampMargin(candidate.left),
    }
  }

  return {
    top: 48,
    right: 48,
    bottom: 48,
    left: 48,
  }
}

export function createReportPage(size: ReportPageSize = 'A4', orientation: ReportOrientation = 'portrait'): ReportPage {
  const dimensions = getPresetDimensions(size, orientation)

  return {
    size,
    orientation,
    width: mmToPx(dimensions.widthMm),
    height: mmToPx(dimensions.heightMm),
    widthMm: dimensions.widthMm,
    heightMm: dimensions.heightMm,
    margin: {
      top: 48,
      right: 48,
      bottom: 48,
      left: 48,
    },
    unit: 'px',
  }
}

export function normalizeReportPage(page: unknown): ReportPage {
  if (!page || typeof page !== 'object') {
    return createReportPage()
  }

  const candidate = page as Partial<ReportPage>
  const size = candidate.size ?? 'A4'
  const orientation = candidate.orientation ?? 'portrait'

  if (size !== 'custom') {
    const presetPage = createReportPage(size, orientation)

    return {
      ...presetPage,
      margin: normalizeMargins(candidate.margin),
    }
  }

  const widthMm = clampPositive(candidate.widthMm, pxToMm(clampPositive(candidate.width, 794)))
  const heightMm = clampPositive(candidate.heightMm, pxToMm(clampPositive(candidate.height, 1123)))

  return {
    size,
    orientation,
    width: mmToPx(widthMm),
    height: mmToPx(heightMm),
    widthMm,
    heightMm,
    margin: normalizeMargins(candidate.margin),
    unit: 'px',
  }
}

export function updateReportPage(page: ReportPage, patch: PageSettingsPatch): ReportPage {
  const current = normalizeReportPage(page)
  const size = patch.size ?? current.size
  const orientation = patch.orientation ?? current.orientation

  let widthMm = current.widthMm
  let heightMm = current.heightMm

  if (size !== 'custom') {
    const dimensions = getPresetDimensions(size, orientation)
    widthMm = dimensions.widthMm
    heightMm = dimensions.heightMm
  } else if (patch.orientation && patch.orientation !== current.orientation && !patch.widthMm && !patch.heightMm) {
    widthMm = current.heightMm
    heightMm = current.widthMm
  } else {
    widthMm = clampPositive(patch.widthMm, widthMm)
    heightMm = clampPositive(patch.heightMm, heightMm)
  }

  return {
    size,
    orientation,
    width: mmToPx(widthMm),
    height: mmToPx(heightMm),
    widthMm,
    heightMm,
    margin: normalizeMargins({
      ...current.margin,
      ...patch.margin,
    }),
    unit: 'px',
  }
}

export function normalizeReportTemplate(template: ReportTemplate): ReportTemplate {
  return {
    ...template,
    page: normalizeReportPage(template.page),
  }
}
