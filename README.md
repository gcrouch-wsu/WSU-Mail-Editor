# WSU Graduate School Tools

A Next.js-based monorepo for WSU Graduate School tools, with separate apps per tool.

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
