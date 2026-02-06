# AI Handoff

This document captures recent changes and current state so a new session can resume work quickly.

## Focus Area: `apps/validate-translation-tables`

### Key updates made
- **Create mode UI**:
  - Workflow selector (validate/create) with create-specific layout.
  - Match method selector: **Match by key** vs **Match by name**.
  - Name comparison fields shown only in name mode.
  - Column selection moved to the last card for both modes.
- **Outcomes upload fix**:
  - Outcomes upload card now uses `id="outcomes-upload-card"` (previously mis-labeled as translate).
  - Create mode hides only translation upload, not Outcomes.
- **CSV parsing hardened** (`validation.js`):
  - Robust CSV parser handles quoted commas, escaped quotes, and line breaks.
  - BOM stripped from first header cell.
  - CSV parsing now attempted before SheetJS.
- **Debug & Preview panel**:
  - Optional debug panel shows file name, row count, columns, and preview rows.
  - Toggle to show/hide preview rows.
- **Create mode export updates**:
  - Removed Input/Output columns from export.
  - Clean sheet contains only selected Outcomes + myWSU columns.
  - Error sheet shows missing rows only.
  - Header colors indicate source:
    - Outcomes = green
    - myWSU = orange
    - error-only columns = red
- **Performance**:
  - Moved validation + generation to a **Web Worker** (`worker.js`) to avoid UI freezing.
  - Loading message updated by worker progress events.
- **Name match quality (2026-02-06 update)**:
  - Default name mismatch threshold raised to **0.8** (UI + app + worker + validation fallback).
  - Replaced character-only name similarity with token-aware scoring:
    - diacritic/punctuation normalization
    - abbreviation/alias expansion
    - generic stopword filtering (e.g., university/college/institute)
    - token-overlap weighting and penalties for generic-only similarities
- **Name match assignment strategy (2026-02-06 update)**:
  - Forced name-match generation now uses score-prioritized global assignment (top candidates per source), not row-order greedy matching.
  - Goal: reduce false positives where generic words inflated similarity.
- **Name match disambiguation (2026-02-06 update)**:
  - Added ambiguity guard: if the top two candidates are too close, skip auto-match.
  - Require at least one informative token match when both sides have >=2 informative tokens.
  - Block matches when both sides contain only generic tokens.
  - Expanded alias normalization (e.g., st→saint, mt→mount, poly→polytechnic).
- **Create export visibility (2026-02-06 update)**:
  - Clean export includes a **Similarity %** column (name-match score when available).
  - Ambiguous name matches now appear in `Generation_Errors` with `Missing In = Ambiguous Match`.
- **Validate mode visibility (2026-02-06 update)**:
  - Ambiguous name matches now surface as `Error_Type = Ambiguous_Match` when an alternative is within the ambiguity gap.
- **Name match control (2026-02-06 update)**:
  - Added an Ambiguity gap input to tune how close the top two matches can be before flagging ambiguity.
- **Stability + correctness fixes (2026-02-06 patch)**:
  - Resolved `NAME_MATCH_AMBIGUITY_GAP` redeclaration collisions between `validation.js` and `worker.js`.
  - In keyed+name-fallback generation, ambiguous rows no longer also emit duplicate generic missing rows.
  - Added ambiguity score caching in validation to reduce repeated top-two candidate scans for repeated source names.
  - Removed legacy generation logic from `app.js` (worker is the sole generation path).
  - Added `Ambiguous_Match` border styling in the validation Excel export.
  - Escaped error card table values to avoid HTML injection from uploaded files.
  - Fixed `cc` contradiction detection by treating it as a token, not a substring.
  - CSV parsing now tries UTF-8 first and falls back to latin-1 only if needed.
  - Note: encoding fallback only triggers on parse errors; garbled UTF-8/latin-1 mismatches can still slip through.
- **User-facing encoding selector (2026-02-06)**:
  - Each upload card (Outcomes, Translate, myWSU) now has a dropdown: Auto / UTF-8 / Latin-1 / Windows-1252.
  - `loadFile()` in `validation.js` respects `options.encoding`; non-auto values bypass the fallback chain.
  - Changing the dropdown after a CSV is loaded re-parses immediately (`reparseFile()` in `app.js`), refreshing debug preview, row count, and column selections.
  - Encoding selector only affects CSV files; Excel files are binary and handled by SheetJS.
- **Validation robustness + reporting (2026-02-06 patch)**:
  - Duplicate detection now uses unique source/target key relationships (Set-based), reducing false duplicate errors from repeated identical rows.
  - Validation stats guard against divide-by-zero when there are zero mappings.
  - Error summary now includes `Name_Mismatch` and `Ambiguous_Match` counts, and chart visualization includes both categories.
  - Name threshold input is clamped to `[0, 1]` before validation/generation payloads are sent.

### Files changed
- `apps/validate-translation-tables/index.html`
- `apps/validate-translation-tables/app.js`
- `apps/validate-translation-tables/validation.js`
- `apps/validate-translation-tables/worker.js` (new)
- `AI_HANDOFF.md`

### Current behavior
- Create mode now supports **key match** or **name match**.
- Name matching uses `calculateNameSimilarity()` in `validation.js`:
  - Normalizes case/diacritics/punctuation and expands common aliases.
  - Combines Levenshtein ratio with informative token overlap.
  - Penalizes names that only match on generic institutional words.
  - Guardrails force score to 0 for contradictory term pairs.
  - Threshold is user-selectable.
- Clean sheet **should** include only matches (both sides present). Unmatched rows go to `Generation_Errors`.
- Keyed+name fallback still uses greedy assignment by sorted key order; forced-name uses global score-prioritized assignment.
- Create mode export includes only `Clean_Translation_Table` + `Generation_Errors` sheets (validate export has more sheets).

### Known context from the last review
- A generated file (`Generated_Translation_Table.xlsx`) was reviewed and showed bad matches. 
  - Low similarity matches still appeared in Clean due to earlier logic.
  - This should be fixed after the latest worker-based generation change.

### Suggested next improvements
- Add a toggle to exclude weak matches below threshold from Clean.
- Add optional cell background colors by source (not just header colors).

### Test steps
1. Create mode: upload Outcomes + myWSU.
2. Toggle debug panel, verify Outcomes columns detected.
3. Match by name:
   - Select Outcomes name + myWSU name columns.
   - Generate export.
4. Verify `Clean_Translation_Table` contains only matched rows.
5. Verify `Generation_Errors` contains all unmatched rows.

## New App: `apps/screen-paste-extract`

Static app that parses Canvas “People” copy/paste text and exports CSV.
- `index.html`, `app.js`, `styles.css`, `vercel.json`
- Runs as static Vercel app (Framework: Other, no build command).

## Repo notes
- Root scripts are Next.js focused; static apps are deployed with Vercel “Other”.
- Untracked large files often present locally (`*.xlsx`, `*.csv`); do not commit unless explicitly requested.
# WSU Graduate School Tools - Handoff

## Current Projects

Apps (Vercel URLs):
- Home: https://wsu-slate-editor.vercel.app/
- HTML Editor: https://wsu-mail-editor-newsletter-editor.vercel.app/
- Org Chart Editor: https://wsu-mail-editor-org-chart-editor.vercel.app/
- Export Translation: https://wsu-mail-editor-translation-tables.vercel.app/
- Validate Translation: https://validate-outcomes-translation-table.vercel.app/
- Factsheet Editor: https://wsu-factsheet-editor-q.vercel.app/

App paths:
- apps/platform
- apps/newsletter-editor
- apps/org-chart-editor
- apps/translation-tables
- apps/validate-translation-tables (static HTML/JS/CSS)
- apps/factsheet-editor

## What Didn't Work (Lessons Learned)

- Vercel project Root Directory pointed at the monorepo root, which triggered Next.js builds for all apps and caused unrelated failures. Fix: set Root Directory to the specific app folder.
- Reused a Next.js project for the static validator app, which forced `.next` builds. Fix: create a new project with Framework Preset = Other and blank build settings.
- Duplicate Vercel projects shared the same domain. Fix: delete the extra project and keep the canonical one.
- Vercel Blob configuration errors (missing/incorrect token) caused access denied until the Blob store was reconfigured for the correct project.

## Known Risks and Constraints

- Factsheet sessions are stored in Vercel Blob with public access. Acceptable for non-confidential data but still exposes raw session JSON to anyone with the URL.
- Static validator app uses CDN scripts; no local build step.

## Review Findings (Open Improvements)

1) Update Vercel deployment guidance to match current apps and URLs (see VERCEL_DEPLOYMENT_GUIDE.md).
2) Normalize doc encoding and refresh outdated notes in DEVELOPMENT_GUIDELINES.md.
3) Centralize app URLs so the landing page does not require hardcoded updates.
4) Add minimal smoke tests or a checklist per app to validate core flows.
5) Consider private Blob or signed URLs for factsheet sessions if data sensitivity changes.

## Deployment Notes

Each app is a separate Vercel project with its own Root Directory.

Static validator settings:
- Root Directory: apps/validate-translation-tables
- Framework Preset: Other
- Build Command: blank
- Output Directory: blank
- Install Command: blank

Factsheet Editor requires Vercel Blob env vars.
