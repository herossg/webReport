import type { ReportData } from './types'

const baseSampleReportData: ReportData = {
  company: {
    name: 'Acme Korea',
    registrationNo: '110-81-12345',
    address: '서울특별시 강남구 테헤란로 152',
  },
  report: {
    title: '월별 매출 리포트',
    period: '2026년 5월',
    generatedAt: '2026-06-07',
    manager: '김리포트',
  },
  ordersSummary: {
    orderCount: 6,
    totalAmount: 39740000,
  },
  orders: [
    {
      orderNo: 'SO-2026-0501',
      customerName: '한빛상사',
      productName: 'Enterprise License',
      quantity: 3,
      unitPrice: 3200000,
      amount: 9600000,
    },
    {
      orderNo: 'SO-2026-0507',
      customerName: '동서물류',
      productName: 'Report Designer',
      quantity: 5,
      unitPrice: 1450000,
      amount: 7250000,
    },
    {
      orderNo: 'SO-2026-0511',
      customerName: '서진테크',
      productName: 'Viewer Runtime',
      quantity: 10,
      unitPrice: 680000,
      amount: 6800000,
    },
    {
      orderNo: 'SO-2026-0517',
      customerName: '에코푸드',
      productName: 'PDF Export Pack',
      quantity: 2,
      unitPrice: 2350000,
      amount: 4700000,
    },
    {
      orderNo: 'SO-2026-0522',
      customerName: '마루건설',
      productName: 'Audit Module',
      quantity: 4,
      unitPrice: 1680000,
      amount: 6720000,
    },
    {
      orderNo: 'SO-2026-0528',
      customerName: '네오교육',
      productName: 'Template Support',
      quantity: 3,
      unitPrice: 1550000,
      amount: 4670000,
    },
  ],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

const baseOrders = Array.isArray(baseSampleReportData.orders) ? baseSampleReportData.orders.filter(isRecord) : []
const demoOrders = Array.from({ length: 42 }, (_, index) => {
  const baseOrder = baseOrders[index % baseOrders.length] ?? {}
  const sequence = String(index + 1).padStart(2, '0')

  return {
    ...baseOrder,
    orderNo: `${String(baseOrder.orderNo ?? 'SO-2026-05')}-${sequence}`,
  }
})

const demoOrdersSummary = {
  orderCount: demoOrders.length,
  totalAmount: demoOrders.reduce((total, order) => {
    const amount = Number((order as Record<string, unknown>).amount)

    return Number.isFinite(amount) ? total + amount : total
  }, 0),
}

export const sampleReportData: ReportData = {
  ...baseSampleReportData,
  orders: demoOrders,
  ordersSummary: demoOrdersSummary,
}
