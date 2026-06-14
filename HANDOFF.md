# WebReport Handoff

Last updated: 2026-06-14

This file is a handoff note for continuing the project from another PC or another Codex session.

## Repository

- GitHub: https://github.com/herossg/webReport.git
- Main branch: `main`
- Latest known commit before this handoff: `7f4ead2 Add report data sources and viewer loading`

## How To Continue On Another PC

Clone the repository:

```bash
git clone https://github.com/herossg/webReport.git
cd webReport
npm install
npm run dev
```

On Windows PowerShell, if `npm` is blocked by script policy, use:

```bash
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:5173
```

Sample URL viewer:

```text
http://127.0.0.1:5173/viewer?template=/reports/monthly-sales.report.json
```

## Current Project Direction

The goal is to build a JavaScript/React web reporting tool similar in spirit to JasperReport:

- A web-based report designer.
- A JSON report template format.
- A viewer page that loads a report JSON and renders it.
- Multiple data sources per template.
- Section-based report layout with fixed sections, repeated table sections, summary sections, header, and footer.
- Pagination behavior for repeated table data.

## Implemented Features

- React + Vite + TypeScript app.
- Report designer canvas.
- Paper settings:
  - A3, A4, A5, B4, B5, Letter, custom size.
  - Portrait/landscape.
  - Margins.
- Report sections:
  - Header and footer are locked at top/bottom.
  - Body sections can be added and reordered.
  - Sections can be fixed or table sections.
  - Section gap, flow, repeat, height, table row/header settings.
  - Section height can be resized by mouse.
  - Lower sections move down when an upper section is resized.
- Report elements:
  - Text, field, table, image, line.
  - Elements belong to parent sections.
  - Element position, size, style editing.
  - Element dragging/resizing updates X/Y/width/height properties.
  - Layer controls: bring to front, send to back, move up, move down.
- Table support:
  - Data table mode for repeated arrays.
  - Static table mode for fixed N x N forms.
  - Column width, alignment, border/background style.
  - Row/column style controls for static tables.
- Designer panels:
  - Document settings, data sources, report sections, and toolbox.
  - Left panels can be collapsed/expanded.
  - Right properties panel has its own scroll area.
- JSON support:
  - Copy/apply report JSON.
  - Save/load report JSON file.
  - JSON download.
- URL viewer:
  - Loads report template from `template=` URL parameter.
  - Can load data from `template.dataSources[].url`.
  - `data=` remains optional for root data.
  - Supports `embed=1`.

## Data Source Model

Report templates contain `dataSources`.

Example:

```json
{
  "dataSources": [
    {
      "id": "header",
      "label": "헤더 데이터",
      "url": "/report-data/monthly-sales.json",
      "path": ""
    },
    {
      "id": "orders",
      "label": "주문 목록",
      "url": "/report-data/monthly-sales.json",
      "path": "orders"
    }
  ]
}
```

Sections can select a data source:

```json
{
  "id": "report-header",
  "dataSource": "header"
}
```

Tables can inherit the parent section data source or override it:

```json
{
  "id": "orders-table",
  "type": "table",
  "dataSource": "orders"
}
```

The viewer fetches each `dataSources[].url`, applies `path` if present, and stores the result under the data source ID.

## Sample Files

- `public/reports/monthly-sales.report.json`
- `public/report-data/monthly-sales.json`

The sample viewer URL uses only the template parameter:

```text
http://127.0.0.1:5173/viewer?template=/reports/monthly-sales.report.json
```

## Important Files

- `src/report/types.ts`: Report template/data model types.
- `src/report/template.ts`: Initial sample template.
- `src/report/bindings.ts`: Binding, path, and data source resolution helpers.
- `src/report/pagination.ts`: Pagination and repeated table layout.
- `src/store/reportStore.ts`: Main Zustand store and designer actions.
- `src/components/designer/DesignerPage.tsx`: Designer layout.
- `src/components/designer/DocumentSettings.tsx`: Paper/document settings.
- `src/components/designer/DataSourceSettings.tsx`: Data source editor.
- `src/components/designer/SectionSettings.tsx`: Section list and section add/reorder/delete.
- `src/components/designer/ReportCanvas.tsx`: Designer canvas.
- `src/components/designer/PropertiesPanel.tsx`: Element/section properties.
- `src/components/viewer/ViewerPage.tsx`: URL-based template/data loader.
- `src/components/viewer/ReportPreview.tsx`: Paginated preview renderer.
- `src/components/ReportElementRenderer.tsx`: Element rendering.

## Commands Used For Verification

```bash
npm.cmd run build
npm.cmd run lint
```

Both passed after the latest feature work.

## Notes For Future Work

Likely next steps:

- Add a backend API server for database-backed data sources.
- Keep DB credentials and SQL on the server side, not in report JSON or browser code.
- Consider a data source type model:

```json
{
  "id": "orders",
  "label": "주문 목록",
  "type": "api",
  "url": "/api/reports/monthly-sales/orders",
  "path": "rows"
}
```

Or server-managed query IDs:

```json
{
  "id": "orders",
  "label": "주문 목록",
  "type": "query",
  "queryId": "monthlySalesOrders",
  "path": "rows"
}
```

Recommended architecture for DB:

```text
React Designer / Viewer
        -> HTTP API
Backend API Server
        -> MySQL / PostgreSQL / MSSQL / Oracle
```

Do not expose DB connection strings, usernames, passwords, or raw privileged SQL in browser-side code or report JSON.

