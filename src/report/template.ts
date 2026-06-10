import type { ReportElement, ReportElementStyle, ReportTemplate } from './types'
import { createReportPage } from './page'

export const defaultElementStyle: ReportElementStyle = {
  fontSize: 14,
  fontWeight: '400',
  color: '#18212f',
  backgroundColor: '#ffffff',
  borderColor: '#d7dde8',
  borderWidth: 1,
  borderRadius: 4,
  padding: 8,
  textAlign: 'left',
}

const headingStyle: ReportElementStyle = {
  ...defaultElementStyle,
  fontSize: 28,
  fontWeight: '700',
  borderWidth: 0,
  padding: 0,
}

const quietStyle: ReportElementStyle = {
  ...defaultElementStyle,
  fontSize: 13,
  color: '#5f6b7a',
  borderWidth: 0,
  padding: 0,
}

const totalStyle: ReportElementStyle = {
  ...defaultElementStyle,
  fontSize: 16,
  fontWeight: '700',
  color: '#0f766e',
  backgroundColor: '#eefaf8',
  borderColor: '#9fd8cf',
  textAlign: 'right',
}

export const initialReportTemplate: ReportTemplate = {
  id: 'sales-monthly',
  name: '월별 매출 리포트',
  description: 'JSON 템플릿과 샘플 데이터를 결합해 PDF 출력까지 확인하는 기본 리포트입니다.',
  version: 1,
  updatedAt: '2026-06-07',
  page: createReportPage('A4', 'portrait'),
  dataSources: [
    {
      id: 'orders',
      label: '주문 목록',
      description: '상세 밴드나 테이블에서 반복 출력할 주문 데이터입니다.',
    },
  ],
  sections: [
    {
      id: 'report-header',
      name: '고정 출력 영역',
      type: 'fixed',
      role: 'header',
      flow: 'continue',
      repeat: 'once',
      baseY: 0,
      height: 156,
      gapAfter: 0,
      elementIds: ['title', 'company-name', 'report-period'],
    },
    {
      id: 'detail-table',
      name: '반복 테이블 영역',
      type: 'table',
      role: 'body',
      flow: 'continue',
      repeat: 'once',
      baseY: 156,
      height: 354,
      gapAfter: 0,
      elementIds: ['orders-table'],
      tableElementId: 'orders-table',
      repeatHeader: true,
      headerHeight: 40,
      rowHeight: 40,
    },
    {
      id: 'report-summary',
      name: '요약 영역',
      type: 'fixed',
      role: 'body',
      flow: 'continue',
      repeat: 'once',
      baseY: 510,
      height: 88,
      gapAfter: 0,
      elementIds: ['total-amount'],
    },
    {
      id: 'page-footer',
      name: '페이지 반복 영역',
      type: 'fixed',
      role: 'footer',
      flow: 'continue',
      repeat: 'eachPage',
      baseY: 1018,
      height: 56,
      gapAfter: 0,
      elementIds: ['manager'],
    },
  ],
  elements: [
    {
      id: 'title',
      type: 'text',
      name: '리포트 제목',
      x: 48,
      y: 44,
      width: 420,
      height: 42,
      sectionId: 'report-header',
      value: '{{report.title}}',
      style: headingStyle,
    },
    {
      id: 'company-name',
      type: 'text',
      name: '회사명',
      x: 48,
      y: 96,
      width: 340,
      height: 24,
      sectionId: 'report-header',
      value: '회사: {{company.name}}',
      style: quietStyle,
    },
    {
      id: 'report-period',
      type: 'text',
      name: '조회 기간',
      x: 508,
      y: 54,
      width: 238,
      height: 28,
      sectionId: 'report-header',
      value: '기간: {{report.period}}',
      style: {
        ...quietStyle,
        textAlign: 'right',
      },
    },
    {
      id: 'orders-table',
      type: 'table',
      name: '주문 테이블',
      x: 48,
      y: 156,
      width: 698,
      height: 354,
      sectionId: 'detail-table',
      tableMode: 'data',
      dataSource: 'orders',
      columns: [
        { id: 'orderNo', label: '주문번호', field: 'orderNo', width: 130 },
        { id: 'customerName', label: '고객명', field: 'customerName', width: 120 },
        { id: 'productName', label: '상품명', field: 'productName', width: 210 },
        { id: 'quantity', label: '수량', field: 'quantity', width: 70, align: 'right' },
        { id: 'amount', label: '금액', field: 'amount', width: 120, align: 'right' },
      ],
      style: {
        ...defaultElementStyle,
        padding: 0,
      },
    },
    {
      id: 'total-amount',
      type: 'text',
      name: '합계 금액',
      x: 498,
      y: 532,
      width: 248,
      height: 44,
      sectionId: 'report-summary',
      value: '합계: {{ordersSummary.totalAmount}}원',
      style: totalStyle,
    },
    {
      id: 'manager',
      type: 'field',
      name: '담당자',
      x: 48,
      y: 1030,
      width: 220,
      height: 28,
      sectionId: 'page-footer',
      binding: 'report.manager',
      style: quietStyle,
    },
  ],
}

export function createReportElement(type: ReportElement['type'], index: number): ReportElement {
  const id = `${type}-${Date.now()}-${index}`
  const base = {
    id,
    type,
    name: `${type} 요소`,
    x: 72 + index * 8,
    y: 120 + index * 8,
    width: 220,
    height: 48,
    style: defaultElementStyle,
  }

  if (type === 'text') {
    return {
      ...base,
      name: '텍스트',
      value: '새 텍스트 {{company.name}}',
    }
  }

  if (type === 'field') {
    return {
      ...base,
      name: '필드',
      binding: 'company.name',
      style: {
        ...defaultElementStyle,
        backgroundColor: '#f8fafc',
      },
    }
  }

  if (type === 'table') {
    return {
      ...base,
      name: '테이블',
      width: 520,
      height: 220,
      tableMode: 'data',
      dataSource: 'orders',
      columns: [
        { id: 'customerName', label: '고객명', field: 'customerName' },
        { id: 'productName', label: '상품명', field: 'productName' },
        { id: 'amount', label: '금액', field: 'amount', align: 'right' },
      ],
      style: {
        ...defaultElementStyle,
        padding: 0,
      },
    }
  }

  if (type === 'image') {
    return {
      ...base,
      name: '이미지',
      width: 160,
      height: 90,
      src: '',
      alt: '리포트 이미지',
      style: {
        ...defaultElementStyle,
        backgroundColor: '#f8fafc',
      },
    }
  }

  return {
    ...base,
    name: '라인',
    width: 320,
    height: 2,
    style: {
      ...defaultElementStyle,
      backgroundColor: '#9aa7b5',
      borderWidth: 0,
      padding: 0,
    },
  }
}

export function cloneInitialTemplate(): ReportTemplate {
  return structuredClone(initialReportTemplate)
}
