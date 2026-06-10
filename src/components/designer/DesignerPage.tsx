import { JsonPanel } from '../JsonPanel'
import { DocumentSettings } from './DocumentSettings'
import { PropertiesPanel } from './PropertiesPanel'
import { ReportCanvas } from './ReportCanvas'
import { SectionSettings } from './SectionSettings'
import { Toolbox } from './Toolbox'

export function DesignerPage() {
  return (
    <div className="designer-grid">
      <div className="left-column">
        <DocumentSettings />
        <SectionSettings />
        <Toolbox />
      </div>
      <div className="center-column">
        <ReportCanvas />
        <JsonPanel />
      </div>
      <PropertiesPanel />
    </div>
  )
}
