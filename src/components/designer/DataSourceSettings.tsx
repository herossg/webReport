import { ChevronDown, ChevronRight, Database, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ReportDataSource } from '../../report/types'
import { useReportStore } from '../../store/reportStore'

interface DataSourceFieldProps {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}

function DataSourceField({ label, value, placeholder, onChange }: DataSourceFieldProps) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function getDataSourceUrl(dataSource: ReportDataSource): string {
  return dataSource.url ?? ''
}

function getDataSourcePath(dataSource: ReportDataSource): string {
  return dataSource.path ?? ''
}

export function DataSourceSettings() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const dataSources = useReportStore((state) => state.template.dataSources)
  const addDataSource = useReportStore((state) => state.addDataSource)
  const updateDataSource = useReportStore((state) => state.updateDataSource)
  const removeDataSource = useReportStore((state) => state.removeDataSource)
  const ToggleIcon = isCollapsed ? ChevronRight : ChevronDown

  return (
    <section className={`panel data-source-settings app-chrome ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <span>데이터소스</span>
        <div className="panel-header-actions">
          <small>{dataSources.length}개</small>
          <button
            type="button"
            className="icon-button"
            aria-label={isCollapsed ? '데이터소스 펼치기' : '데이터소스 접기'}
            onClick={() => setIsCollapsed((value) => !value)}
          >
            <ToggleIcon size={16} />
          </button>
        </div>
      </div>

      {isCollapsed ? null : (
        <>
          <div className="data-source-actions">
            <button type="button" className="button subtle" onClick={addDataSource}>
              <Plus size={14} />
              데이터소스 추가
            </button>
          </div>

          <div className="data-source-list">
            {dataSources.length === 0 ? (
              <p className="empty-state">데이터소스를 추가한 뒤 영역이나 테이블에서 선택할 수 있습니다.</p>
            ) : null}

            {dataSources.map((dataSource) => (
              <article className="data-source-card" key={dataSource.id}>
                <div className="data-source-card-header">
                  <Database size={16} />
                  <strong>{dataSource.label || dataSource.id}</strong>
                  <button
                    type="button"
                    className="section-delete-button"
                    aria-label={`${dataSource.label || dataSource.id} 데이터소스 삭제`}
                    onClick={() => removeDataSource(dataSource.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <DataSourceField
                  label="ID"
                  value={dataSource.id}
                  placeholder="orders"
                  onChange={(value) => updateDataSource(dataSource.id, { id: value })}
                />
                <DataSourceField
                  label="이름"
                  value={dataSource.label}
                  placeholder="주문 목록"
                  onChange={(value) => updateDataSource(dataSource.id, { label: value })}
                />
                <DataSourceField
                  label="URL"
                  value={getDataSourceUrl(dataSource)}
                  placeholder="/api/report/orders"
                  onChange={(value) => updateDataSource(dataSource.id, { url: value })}
                />
                <DataSourceField
                  label="응답 경로"
                  value={getDataSourcePath(dataSource)}
                  placeholder="orders 또는 비워두기"
                  onChange={(value) => updateDataSource(dataSource.id, { path: value })}
                />
                <DataSourceField
                  label="설명"
                  value={dataSource.description}
                  placeholder="이 데이터소스를 어디에 쓰는지 메모"
                  onChange={(value) => updateDataSource(dataSource.id, { description: value })}
                />
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
