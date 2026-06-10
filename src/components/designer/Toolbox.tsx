import { ChevronDown, ChevronRight, Image, Minus, RotateCcw, Rows3, SquarePen, Type } from 'lucide-react'
import { useState } from 'react'
import type { ReportElementType } from '../../report/types'
import { useReportStore } from '../../store/reportStore'

const tools: Array<{
  type: ReportElementType
  label: string
  description: string
  icon: typeof Type
}> = [
  {
    type: 'text',
    label: '텍스트',
    description: '고정 문구와 {{binding}} 값을 함께 출력합니다.',
    icon: Type,
  },
  {
    type: 'field',
    label: '필드',
    description: '단일 데이터 경로를 값으로 표시합니다.',
    icon: SquarePen,
  },
  {
    type: 'table',
    label: '테이블',
    description: '배열 반복 또는 고정폼 표로 사용할 수 있습니다.',
    icon: Rows3,
  },
  {
    type: 'image',
    label: '이미지',
    description: 'URL 기반 로고나 사진을 배치합니다.',
    icon: Image,
  },
  {
    type: 'line',
    label: '라인',
    description: '구분선을 배치합니다.',
    icon: Minus,
  },
]

export function Toolbox() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const addElement = useReportStore((state) => state.addElement)
  const resetTemplate = useReportStore((state) => state.resetTemplate)
  const ToggleIcon = isCollapsed ? ChevronRight : ChevronDown

  return (
    <aside className={`panel toolbox app-chrome ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <span>요소 추가</span>
        <button
          type="button"
          className="icon-button"
          aria-label={isCollapsed ? '요소 추가 펼치기' : '요소 추가 접기'}
          onClick={() => setIsCollapsed((value) => !value)}
        >
          <ToggleIcon size={16} />
        </button>
      </div>

      {isCollapsed ? null : (
        <>
          <div className="tool-list">
            {tools.map((tool) => {
              const Icon = tool.icon

              return (
                <button key={tool.type} type="button" className="tool-button" onClick={() => addElement(tool.type)}>
                  <Icon size={18} />
                  <span>
                    <strong>{tool.label}</strong>
                    <small>{tool.description}</small>
                  </span>
                </button>
              )
            })}
          </div>

          <button type="button" className="button subtle reset-button" onClick={resetTemplate}>
            <RotateCcw size={16} />
            샘플 템플릿으로 초기화
          </button>
        </>
      )}
    </aside>
  )
}
