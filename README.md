# WebReport Studio

React + TypeScript + Vite로 만든 웹 리포팅 툴 MVP입니다. JasperReports의 `.jrxml`처럼 리포트 구조를 JSON 템플릿으로 저장하고, 다른 화면의 Viewer가 그 JSON과 데이터를 결합해 출력하는 구조를 확인할 수 있습니다.

## 실행

```bash
npm.cmd install
npm.cmd run dev
```

PowerShell 실행 정책 때문에 `npm`이 막히면 위처럼 `npm.cmd`를 사용하면 됩니다.

## 포함된 기능

- Designer: 텍스트, 필드, 테이블, 이미지, 라인 요소 추가
- Document Settings: A3, A4, A5, B4, B5, Letter, 사용자 지정 용지와 세로/가로 방향, 상하좌우 여백 설정
- Canvas: `react-rnd` 기반 드래그/리사이즈
- Properties: 위치, 크기, 데이터 바인딩, 컬럼, 스타일 편집
- JSON Panel: 템플릿 JSON 확인, 복사, 직접 수정 후 적용
- Viewer: 저장된 JSON 템플릿과 샘플 데이터를 결합해 리포트 렌더링
- PDF 출력: 브라우저 인쇄 기능을 통한 PDF 저장

## 기본 구조

```txt
src/report
  types.ts        리포트 템플릿 타입
  page.ts         용지 프리셋, mm/px 변환, 문서 설정 유틸
  template.ts     기본 템플릿과 요소 생성 로직
  sampleData.ts   샘플 데이터
  bindings.ts     {{path}} 데이터 바인딩 유틸

src/store
  reportStore.ts  Zustand 기반 편집 상태

src/components
  designer        편집기 화면
  viewer          조회/출력 화면
  JsonPanel.tsx   템플릿 JSON 확인 및 적용
```

## 다음 확장 포인트

실제 제품으로 발전시키려면 다음 순서가 좋습니다.

1. 템플릿 저장 API와 DB 테이블 추가
2. 데이터 소스 매핑 UI 추가
3. 밴드 구조 추가: title, pageHeader, detail, summary
4. 서버 PDF 출력 추가: Playwright 또는 Puppeteer
5. Excel 출력 추가: exceljs
6. 템플릿 JSON Schema와 validation 추가
