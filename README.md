# WSU Graduate School Tools

A Next.js-based monorepo for WSU Graduate School tools, with separate apps per tool.

## Applications

### Home
Landing page with links to all tools.  
https://wsu-slate-editor.vercel.app/

### HTML Editor
HTML newsletter editor for Friday Focus, Graduate School Briefing, and Slate Campaign.  
https://wsu-mail-editor-newsletter-editor.vercel.app/

### Org Chart Editor
Org chart builder and exporter.  
https://wsu-mail-editor-org-chart-editor.vercel.app/

### Export Translation
Export and edit Outcomes translation tables from pasted data.  
https://wsu-mail-editor-translation-tables.vercel.app/

### Validate
Validate Outcomes translation mappings against Outcomes and myWSU SIS data.  
https://validate-outcomes-translation-table.vercel.app/

### Factsheet
Process WordPress WXR exports and generate HTML blocks for factsheets.  
https://wsu-factsheet-editor-q.vercel.app/

## Validate App (Technical Overview)

Path: `apps/validate-translation-tables`

This app validates translation mappings between Outcomes and myWSU and produces a reviewer-friendly Excel workbook.
It supports three workflows:

1. `Validate` - audit and repair an existing translation table.
2. `Create` - generate a new translation table from Outcomes + myWSU.
3. `Join Preview` - join a translation table with Outcomes and myWSU source data for visual verification before publish.

### Runtime architecture

- Static app (`index.html`, `app.js`, `styles.css`) with no framework build step.
- Processing is offloaded to Web Workers:
  - `worker.js` handles merge + validation
  - `export-worker.js` builds Excel exports
- Core algorithms live in `validation.js`.
- Shared export constants/rules live in `validation-export-helpers.js`.

### Validate inputs

- Outcomes source file
- Translation table file (`translate_input` -> `translate_output`)
- myWSU source file
- User-selected key columns and optional role mappings (`School`, `City`, `State`, `Country`)
- Optional prior Validate workbook for `Review_Row_ID`-based decision re-import
- Optional campus-family JSON rules for parent-key prefills (for example, campus variants)

### Name matching (technical)

The validator uses a multi-signal matcher, not exact string equality:

- text normalization and alias expansion (`univ -> university`, `cal -> california`, `cc -> community college`, etc.)
- token similarity using Jaro-Winkler
- IDF-weighted token overlap (rare terms contribute more than common terms)
- blended final score from character similarity + token similarity
- rare-token mismatch penalties and truncation-aware boosts
- location/context evidence (city/state/country) for confidence gating
- ambiguity detection based on threshold + ambiguity gap

### Validate Excel output model

Primary reviewer tabs:

1. `Review_Workbench`
2. `Final_Translation_Table`
3. `Translation_Key_Updates`
4. `QA_Checks_Validate`

Technical notes:

- `Review_Workbench` is intentionally unprotected so sort/filter works in Excel.
- `Final_Translation_Table` is built from hidden staging sheets via Excel `FILTER` (compact approved rows).
- Final table is formula-driven; copy/paste values to a new sheet if sorting is needed.
- Hidden diagnostic/staging tabs are included for traceability and QA (scope-dependent in missing-only export mode).

### Validate decision model

- `Keep As-Is`
- `Use Suggestion`
- `Allow One-to-Many`
- `Ignore`

`Use Suggestion` applies `Suggested_Key` according to `Update Side` (`Input`, `Output`, or `Both`).
For risky decisions, reviewers select a controlled `Reason_Code` (manual-key `Use Suggestion`, `Allow One-to-Many`, and `Duplicate_Target + Keep As-Is`).

### Validate reviewer tooling

- Inline C1/C2/C3 options in `Review_Workbench` include city/state/country and score
- Manual key override (`Manual_Suggested_Key`) with valid-key checks
- Optional pre-export bulk edit panel with contextual rows, quick family chips, and bulk Decision/manual key actions on filtered rows
- Pagination controls (100/200/400 page size) are shown above and below the review grid, with synced state
- Review Scope selector supports `All review rows`, `Uploaded Translate rows only`, and `Missing mappings only`
- Review Scope affects both in-app rows and download scope; missing-only exports suppress non-missing diagnostic tabs
- Duplicate-target/source suggestion dropdowns are capped to top 5 location-valid candidates
- `Translation_Key_Updates` serves as the primary "What changed" verification sheet
- Optional re-import summary after export (`applied`, `conflicts`, `newRows`, `orphaned`)

### QA publish gate

`QA_Checks_Validate` enforces blocking checks for unresolved actions, invalid suggestion states, blank finals on publishable rows, formula-cap overflow, no-op `Use Suggestion`, risky decisions without `Reason_Code`, and duplicate final keys/pairs (with a narrow many-to-one exemption on duplicate outputs).

### Key files

- `apps/validate-translation-tables/app.js`
- `apps/validate-translation-tables/worker.js`
- `apps/validate-translation-tables/validation.js`
- `apps/validate-translation-tables/export-worker.js`
- `apps/validate-translation-tables/validation-export-helpers.js`
- `apps/validate-translation-tables/export-test.js`
- `apps/validate-translation-tables/checks.js`
- `apps/validate-translation-tables/USER_GUIDE.md`

## Requirements

- Node.js 18+ (20+ recommended)
- npm

## Quick Start

1) Clone the repository:
```bash
git clone https://github.com/gcrouch-wsu/WSU-Mail-Editor.git
cd WSU-Mail-Editor
```

2) Install dependencies:
```bash
npm install
```

3) Run a development server (from repo root):
```bash
npm run dev:platform
npm run dev:newsletter
npm run dev:orgchart
npm run dev:translation
npm run dev:factsheet
```

Notes on ports:
- Each app defaults to port 3000. If 3000 is in use, Next.js will increment (3001, 3002, etc).
- If you want specific ports, set `PORT` in your shell before running the command.

## Project Structure

```
wsu-gradschool-tools/
|-- apps/
|   |-- platform/                   # Landing page
|   |-- newsletter-editor/          # Newsletter editor
|   |-- org-chart-editor/           # Org chart editor
|   |-- translation-tables/         # Export Outcomes Translation Tables
|   |-- factsheet-editor/           # Factsheet editor
|   |-- validate-translation-tables/ # Static validator (HTML/JS/CSS)
|-- packages/                       # Shared packages (reserved)
|-- package.json                    # Workspace config and scripts
|-- README.md
```

## Available Scripts

From the repo root:

Development:
- `npm run dev` - platform app
- `npm run dev:platform`
- `npm run dev:newsletter`
- `npm run dev:orgchart`
- `npm run dev:translation`
- `npm run dev:factsheet`

Build:
- `npm run build` - build all Next.js apps
- `npm run build:platform`
- `npm run build:newsletter`
- `npm run build:orgchart`
- `npm run build:translation`
- `npm run build:factsheet`

Other:
- `npm run start` - start platform in production mode
- `npm run lint`
- `npm run format`
- `npm run checkfmt`
- `npm run check:validate-translation` - validate app regression checks (`checks.js` + `export-test.js` + `ui-smoke-test.js`)

## Deployment (Vercel)

Each app is deployed as a separate Vercel project with its own Root Directory.

Next.js apps:
- Platform: `apps/platform`
- Newsletter Editor: `apps/newsletter-editor`
- Org Chart Editor: `apps/org-chart-editor`
- Export Outcomes Translation Tables: `apps/translation-tables`
- Factsheet Editor: `apps/factsheet-editor`

Static app (no build step):
- Validate Outcomes Translation Tables: `apps/validate-translation-tables`

Static app settings:
- Framework Preset: Other
- Build Command: (blank)
- Output Directory: (blank)
- Install Command: (blank)

## Live URLs

- Platform: https://wsu-slate-editor.vercel.app/
- Newsletter Editor: https://wsu-mail-editor-newsletter-editor.vercel.app/
- Org Chart Editor: https://wsu-mail-editor-org-chart-editor.vercel.app/
- Export Outcomes Translation Tables: https://wsu-mail-editor-translation-tables.vercel.app/
- Validate Outcomes Translation Tables: https://validate-outcomes-translation-table.vercel.app/
- Factsheet Editor: https://wsu-factsheet-editor-q.vercel.app/

## Environment Variables

Only required where noted by the app (for example, Vercel Blob tokens in factsheet-editor).
