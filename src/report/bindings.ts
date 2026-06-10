import type { ReportData } from './types'

export function resolvePath(source: unknown, path: string): unknown {
  if (!path.trim()) {
    return undefined
  }

  return path.split('.').reduce<unknown>((current, key) => {
    if (current == null) {
      return undefined
    }

    if (Array.isArray(current)) {
      const index = Number(key)
      return Number.isInteger(index) ? current[index] : undefined
    }

    if (typeof current === 'object') {
      return (current as Record<string, unknown>)[key]
    }

    return undefined
  }, source)
}

export function formatValue(value: unknown): string {
  if (value == null) {
    return ''
  }

  if (typeof value === 'number') {
    return new Intl.NumberFormat('ko-KR').format(value)
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('ko-KR')
  }

  return String(value)
}

export function interpolateText(template: string | undefined, data: ReportData): string {
  if (!template) {
    return ''
  }

  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, path: string) => {
    return formatValue(resolvePath(data, path.trim()))
  })
}

export function getDataRows(data: ReportData, sourceId: string | undefined): Record<string, unknown>[] {
  const value = sourceId ? resolvePath(data, sourceId) : undefined

  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((row): row is Record<string, unknown> => {
    return row != null && typeof row === 'object' && !Array.isArray(row)
  })
}
