# AI Handoff Document - WSU Graduate School Tools

**Last Updated:** December 7, 2025 (Latest: Fixed card editor sticky header z-index issue)
**Project Version:** 8.0 (Next.js/TypeScript)
**Repository:** https://github.com/gcrouch-wsu/WSU-Mail-Editor.git

---

## Table of Contents

1. [Project Purpose & Intent](#project-purpose--intent)
2. [Technical Architecture](#technical-architecture)
3. [Development Workflow & Best Practices](#development-workflow--best-practices)
4. [Current Feature Status](#current-feature-status)
5. [Known Issues & Limitations](#known-issues--limitations)
6. [Code Structure & Key Files](#code-structure--key-files)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Project Purpose & Intent

### What This Application Does

This Next.js web application provides **two primary tools** for the WSU Graduate School:

1. **HTML Newsletter Editor** (`/editor`)
   - Creates email-safe HTML newsletters for WSU Graduate School communications
   - Supports three templates: Friday Focus, Graduate School Briefing, and Graduate School Slate Campaign
   - Generates HTML that works reliably across email clients (Gmail, Outlook, Apple Mail, etc.)
   - Uses table-based layouts and inline styles for maximum email client compatibility

2. **Org Chart Editor** (`/orgchart`)
   - Creates organizational charts for WordPress integration
   - Supports multiple layout types: centered, vertical, and horizontal
   - Exports WordPress-compatible HTML with runtime JavaScript/CSS

### Why This Exists

- **Email Compatibility:** Email clients have inconsistent CSS support. This tool generates HTML that works across all major email clients.
- **Ease of Use:** Non-technical staff can create professional newsletters without writing HTML.
- **Consistency:** Ensures all newsletters follow WSU brand guidelines and formatting standards.
- **Round-Trip Editing:** Exported HTML can be re-imported to continue editing (via embedded Base64 JSON).

### Key Design Principles

1. **Email-Safe HTML:** All HTML uses table-based layouts and inline styles (no external CSS in emails)
2. **Accessibility:** Built-in validation for alt text, ARIA labels, and semantic HTML
3. **State Persistence:** Auto-saves to localStorage and supports import/export for backup
4. **User-Friendly:** Rich text editor with live preview, drag-and-drop sections, and intuitive controls

---

## Technical Architecture

### Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **UI Library:** React 18
- **Styling:** Tailwind CSS with WSU brand colors
- **Rich Text Editor:** Tiptap (ProseMirror-based)
- **Drag & Drop:** @dnd-kit
- **Deployment:** Vercel (serverless functions)
- **Icons:** Lucide React

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                    │
├─────────────────────────────────────────────────────────┤
│  Client Components (React)                               │
│  ├── Editor UI (Tiptap, drag-drop, forms)               │
│  └── Preview Panel (iframe with generated HTML)         │
├─────────────────────────────────────────────────────────┤
│  API Routes (Serverless Functions)                       │
│  ├── /api/preview - Generate HTML preview               │
│  ├── /api/export - Export HTML file                      │
│  ├── /api/import - Import from HTML                      │
│  └── /api/orgchart/* - Org chart operations             │
├─────────────────────────────────────────────────────────┤
│  Core Libraries                                          │
│  ├── email-templates.ts - HTML generation               │
│  ├── utils.ts - List processing, validation             │
│  └── config.ts - Defaults and constants                 │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User edits content** → React state updates
2. **State changes** → Debounced preview update
3. **Preview request** → `/api/preview` route
4. **Server generates HTML** → `renderFullEmail()` function
5. **HTML returned** → Displayed in preview iframe
6. **User exports** → `/api/export` generates downloadable HTML

### Email HTML Generation Strategy

**Critical:** Email clients strip out `<style>` tags and don't support modern CSS. Therefore:

- ✅ **Use:** Table-based layouts (`<table>`, `<tr>`, `<td>`)
- ✅ **Use:** Inline styles (`style="..."`)
- ✅ **Use:** Email-safe CSS properties only
- ❌ **Avoid:** Flexbox, Grid, external CSS, JavaScript
- ❌ **Avoid:** Complex selectors or pseudo-elements

**Example:**
```html
<!-- GOOD: Table-based card with inline styles -->
<table cellpadding="0" cellspacing="0" style="width:100%;">
  <tr>
    <td style="padding:20px; background-color:#ffffff;">
      Content here
    </td>
  </tr>
</table>

<!-- BAD: Modern CSS that won't work in email -->
<div style="display:flex; gap:10px;">
  Content here
</div>
```

### Key Technical Decisions

1. **Tiptap Editor:** Chosen for ProseMirror's robust content model and extensibility
2. **Table-based HTML:** Required for email client compatibility (Gmail, Outlook, etc.)
3. **Base64 JSON in HTML:** Allows round-trip editing without separate database
4. **Serverless Functions:** Vercel automatically scales API routes
5. **Iframe Preview:** Isolates preview HTML from editor CSS, showing true email rendering

---

## Development Workflow & Best Practices

### ⚠️ CRITICAL: Testing Before Commits

**ALWAYS test locally before committing code changes.**

1. **Start dev server:**
   ```bash
   npm run dev
   ```
   - Server starts on http://localhost:3000
   - Browser opens automatically

2. **Test your changes:**
   - Test the specific feature you modified
   - Test related features that might be affected
   - Test both Newsletter Editor and Org Chart Editor if applicable
   - Check browser console for errors
   - Verify preview renders correctly

3. **Build test:**
   ```bash
   npm run build
   ```
   - Ensures TypeScript compiles without errors
   - Catches build-time issues before deployment

4. **Lint and format:**
   ```bash
   npm run lint
   npm run format
   ```

5. **Only then commit:**
   ```bash
   git add .
   git commit -m "Clear description of changes"
   git push
   ```

### ⚠️ CRITICAL: Port Management

**ALWAYS kill dev server processes after testing to free up ports.**

**Problem:** If ports aren't released, Next.js tries the next port (3001, 3002, etc.), creating multiple instances and confusion.

**Solution:**

1. **Check which ports are in use:**
   ```bash
   netstat -ano | findstr ":300"
   ```

2. **Kill specific process:**
   ```bash
   taskkill /F /PID [PID_NUMBER]
   ```

3. **Kill all Node processes (use with caution):**
   ```bash
   taskkill /F /IM node.exe
   ```

4. **Verify ports are free before starting:**
   ```bash
   netstat -ano | findstr ":300"
   ```
   Should return nothing if all ports are free.

**Best Practice:** Always kill dev servers before ending a coding session.

### Standard Development Commands

```bash
# Development
npm run dev              # Start dev server (opens browser automatically)
npm run dev:no-open     # Start dev server without opening browser

# Testing & Quality
npm run build           # Build for production (test before commit!)
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npm run checkfmt        # Check code formatting

# Production
npm run start           # Start production server (local testing)
```

### Git Workflow

1. **Before starting work:**
   ```bash
   git pull origin main
   ```

2. **Create feature branch (optional):**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes and test locally**

4. **Commit with clear messages:**
   ```bash
   git add .
   git commit -m "Brief description of what changed and why"
   ```

5. **Push to GitHub:**
   ```bash
   git push origin main  # or your branch name
   ```

6. **Vercel auto-deploys** from `main` branch

### Code Style Guidelines

- **TypeScript:** Strict mode enabled - fix all type errors
- **Formatting:** Prettier (run `npm run format` before commit)
- **Linting:** ESLint with Next.js config (fix all warnings)
- **Naming:**
  - Components: PascalCase (`EditorPanel.tsx`)
  - Files: kebab-case for routes, camelCase for utilities
  - Functions: camelCase
  - Constants: UPPER_SNAKE_CASE
- **Comments:** Write clear, concise comments explaining **why**, not **what**
- **Imports:** Organize imports (external → internal → types)

### AI Assistant Guidelines

When making changes as an AI assistant:

1. ✅ **Test locally first** - Never commit without testing
2. ✅ **Run build** - Ensure TypeScript compiles
3. ✅ **Update handoff doc** - Document architectural changes
4. ✅ **Write clear commits** - Describe what and why
5. ✅ **Check both editors** - Newsletter and Org Chart
6. ✅ **Kill ports** - Clean up dev servers after testing
7. ❌ **Don't skip testing** - Even for "small" changes
8. ❌ **Don't commit broken code** - Fix errors first
9. ❌ **Don't ignore TypeScript errors** - Fix type issues

---

## Current Feature Status

### ✅ Fully Working Features

- **Newsletter Editor:**
  - ✅ Rich text editing (bold, italic, headings, lists, links, tables)
  - ✅ List controls (line height, item gap, indent/outdent)
  - ✅ Live preview with real-time updates
  - ✅ Export/Import HTML with round-trip editing
    - Export filenames include template name and timestamp (e.g., `Briefing_2025-12-05_14-30.html`)
  - ✅ Auto-save to localStorage with template-aware restore
    - Restore automatically opens correct template based on backup content
  - ✅ Undo/redo functionality
  - ✅ Template switching (Friday Focus, Briefing, Slate Campaign)
    - Template selection persists and is used for export filenames
  - ✅ Card spacing control
  - ✅ Divider line controls (color, spacing)
  - ✅ **Accent bar controls** (Standard & Event cards)
    - Enable/disable, width, color, shadow (blur, spread, offset, opacity)
  - ✅ **Card shadow controls** (All card types)
    - Global shadow with full customization (color, blur, spread, offset, opacity)
  - ✅ Section drag-and-drop reordering
  - ✅ Accessibility validation
  - ✅ Content statistics

- **Org Chart Editor:**
  - ✅ Visual node editing
  - ✅ Multiple layout types (centered, vertical, horizontal)
  - ✅ Import from HTML
  - ✅ Export WordPress-compatible HTML
  - ✅ Download runtime files
  - ✅ Live preview

### ❌ Not Implemented / Known Limitations

- **Accent Bar Horizontal Wrap:** Accent bar cannot extend horizontally along top edge of cards
  - Status: Feature attempted but abandoned due to email HTML limitations
  - Vertical accent bar with full customization (width, color, shadow) is implemented
  - See "Known Issues" section for technical details on why horizontal wrap is not feasible

---

## Recent Fixes (December 2025)

### Card Spacing & Border Radius Fix (December 6, 2025)

**Issue:** Global card spacing and card border radius settings were not being applied to rendered cards. The controls existed in the UI but had no effect on the output.

**Root Cause:**
- Global settings `card_spacing` and `card_border_radius` were defined in types and SettingsEditor
- However, `getCardStyle()` function in `email-templates.ts` only used per-card overrides
- Global defaults were never consulted when rendering cards
- Result: UI controls appeared broken, users couldn't set global card styling

**Solution Implemented:**
1. **Updated `getCardStyle()` function** (`lib/email-templates.ts:465-498`)
   - Added logic to use global `settings.card_spacing` as default for `spacing_bottom`
   - Added logic to use global `settings.card_border_radius` as default for `border_radius`
   - Per-card overrides still work and take precedence over global settings
   - Proper cascading: Global default → Per-card override

2. **Added Border Radius Toggle** (`components/editor/SettingsEditor.tsx:252-305`)
   - Added enable/disable checkbox for rounded corners
   - When enabled, defaults to 8px radius
   - Shows value input only when enabled
   - Prevents accidental 1px radius (minimum is 1px when enabled)
   - Improved UX with recommended values (4-12px)

**Code Changes:**
```typescript
// Before (lib/email-templates.ts)
const spacingBottom = card.spacing_bottom || 20
const borderRadius = card.border_radius || 0

// After (lib/email-templates.ts)
const globalSpacing = settings?.card_spacing !== undefined ? settings.card_spacing : 20
const spacingBottom = card.spacing_bottom !== undefined ? card.spacing_bottom : globalSpacing

const globalRadius = settings?.card_border_radius || 0
const borderRadius = card.border_radius !== undefined ? card.border_radius : globalRadius
```

**Features Now Working:**
- ✅ Global card spacing affects all cards (0-100px)
- ✅ Global card border radius with enable/disable toggle
- ✅ Per-card overrides still function correctly
- ✅ Proper cascading from global to per-card settings
- ✅ Real-time preview updates

**Code Locations:**
- `lib/email-templates.ts:465-498` - getCardStyle() with global defaults
- `components/editor/SettingsEditor.tsx:226-305` - Card styling controls with toggle

**Result:** Card spacing and border radius global settings now work as expected. Users can set defaults globally and override per-card when needed.

---

### Card Editor Sticky Header Z-Index Fix (December 7, 2025)

**Issue:** When editing cards with long content, users had to scroll back to the top to access the Save/Cancel/Delete buttons. Text artifacts appeared during scrolling, and the sticky header behavior was inconsistent.

**Root Cause:**
- The sticky header in CardEditor and ClosureEditor lacked explicit z-index layering
- Without z-index, the browser's compositor sometimes rendered scrolling content (especially TiptapEditor) on top of or behind the sticky header
- This caused visual issues:
  - Save button appearing "hidden" (painted behind content)
  - Text artifacts during scrolling (layer compositing errors)
  - Inconsistent behavior based on content complexity

**Solution Implemented:**
1. **Added z-index to sticky header** (`components/editor/CardEditor.tsx:107`)
   - Added `z-10` class to ensure header stays above all scrolling content
   - Added `shadow-sm` class for subtle visual separation when scrolling

2. **Applied same fix to ClosureEditor** (`components/editor/ClosureEditor.tsx:31`)
   - Ensures consistency across all modal editors

**Code Changes:**
```tsx
// Before
<div className="sticky top-0 bg-white border-b border-wsu-border-light p-4 flex items-center justify-between">

// After
<div className="sticky top-0 z-10 bg-white border-b border-wsu-border-light p-4 flex items-center justify-between shadow-sm">
```

**Features Now Working:**
- ✅ Save/Cancel/Delete buttons always visible at top when scrolling
- ✅ No more text artifacts during scroll
- ✅ Consistent behavior regardless of content length or card type
- ✅ Better visual feedback with subtle shadow indicating persistent header

**Code Locations:**
- `components/editor/CardEditor.tsx:107` - Card editor sticky header
- `components/editor/ClosureEditor.tsx:31` - Closure editor sticky header

**Result:** The sticky header now maintains proper layering above all scrolling content, eliminating the need to scroll back to the top to save changes.

---

### Accent Bar & Shadow Controls Restoration (December 6, 2025)

**Issue:** Accent bar color picker, accent bar shadow controls, and card shadow controls were missing from the Global Settings panel.

**Root Cause:**
- Controls were removed in commit 236fb98 ("Fix list item gap control for values below 16px and improve port cleanup")
- Commit removed 381 lines of shadow/accent control UI code
- Removed Shadow interface from types
- Removed all shadow-related settings properties
- Removal was unintentional collateral damage during a cleanup

**Solution Implemented:**
1. **Restored Shadow interface** (`types/newsletter.ts`)
   - Added full Shadow type with enabled, color, blur, spread, offset_x, offset_y, opacity
2. **Updated Settings interface** to include:
   - `accent_bar_enabled` - Show/hide toggle
   - `accent_bar_color` - Color picker for accent bar
   - `accent_bar_shadow` - Shadow configuration for accent bar
   - `card_shadow` - Global shadow for all cards
3. **Restored UI controls** in SettingsEditor with proper grouping:
   - Accent Bar section with enable, width, color, and shadow controls
   - Card Shadow section with full customization sliders
4. **Implemented dynamic rendering**:
   - Created `getAccentBarStyle()` function to apply settings dynamically
   - Updated `getCardStyle()` to apply card shadows
   - Modified `renderStandardCard()` and `renderEventCard()` to use dynamic accent bar
5. **Added defaults** for all templates (shadows disabled by default)

**Features Restored:**
- ✅ Accent bar enable/disable toggle
- ✅ Accent bar width control (0-50px)
- ✅ Accent bar color picker (any color)
- ✅ Accent bar shadow (color, blur, spread, offset X/Y, opacity)
- ✅ Card shadow (color, blur, spread, offset X/Y, opacity)
- ✅ All controls work across all three templates
- ✅ Real-time preview updates
- ✅ Email-safe CSS using inline `box-shadow` styles

**Code Locations:**
- `types/newsletter.ts:14-22, 52-56` - Type definitions
- `components/editor/SettingsEditor.tsx:20-66, 368-642` - UI controls
- `lib/email-templates.ts:66-112, 465-491, 560-691` - Rendering logic
- `lib/defaults.ts:244-263` - Default values

**Result:** All accent bar and shadow controls fully restored and working.

### Template Restore Logic Fix

**Issue:** When restoring from backup, the editor always defaulted to Friday Focus template, even if the backup was for Briefing or Slate Campaign.

**Root Cause:** 
- Editor always initialized with `templateType = 'ff'` regardless of backup content
- Backup restore didn't sync `templateType` state with backup's template property
- If user declined restore, defaults were loaded for FF instead of the backup's template

**Solution Implemented:**
1. **Check backup template first** (before setting defaults)
2. **Set `templateType` to match backup template** before showing restore modal
3. **Show correct template name in restore message** (e.g., "Found an auto-saved Briefing draft...")
4. **If user declines restore:** Load defaults for the backup's template (not always FF)
5. **Priority order:** URL param (`?type=briefing`) > Backup template > Default FF

**Code Locations:**
- `app/editor/page.tsx:76-173` - Initial data loading with backup check
- `app/editor/page.tsx:610-633` - Backup restore confirm modal handlers

**Result:** Editor now automatically opens with the correct template based on what you were working on.

### Export Filename Fix

**Issue:** Export filenames always showed "Friday_Focus" regardless of selected template, and timestamp was in UTC with seconds.

**Root Cause:**
- Export used `state.template` which could be stale or incorrect
- Timestamp used UTC (`toISOString()`) instead of local time
- Timestamp included seconds (HH-MM-SS) instead of just hour and minute

**Solution Implemented:**
1. **Use `templateType` as source of truth** - Always use the template currently selected in the editor UI
2. **Local time timestamp** - Use `getHours()` and `getMinutes()` instead of UTC
3. **HH-MM format only** - Removed seconds from timestamp

**Export Filename Format:**
- `Friday_Focus_YYYY-MM-DD_HH-MM.html` (e.g., `Friday_Focus_2025-12-05_14-30.html`)
- `Briefing_YYYY-MM-DD_HH-MM.html` (e.g., `Briefing_2025-12-05_14-30.html`)
- `Slate_Campaign_YYYY-MM-DD_HH-MM.html` (e.g., `Slate_Campaign_2025-12-05_14-30.html`)

**Code Locations:**
- `app/editor/page.tsx:238-303` - Export handler (uses `templateType`)
- `app/api/export/route.ts:52-65` - Filename generation (reads template from data, formats timestamp)

**Result:** Export filenames now correctly reflect the selected template and use local time with hour and minute only.

---

## Known Issues & Limitations

### Accent Bar & Shadow Controls - RESTORED (December 6, 2025)

**Status:** ✅ FULLY IMPLEMENTED - All controls working across all templates

**Features Restored:**

1. **Accent Bar Controls** (Standard & Event Cards):
   - Enable/disable toggle - Show or hide accent bar
   - Width control (0-50px) - Adjustable width, default 4px
   - Color picker - Any color, defaults to WSU Crimson (#A60F2D)
   - Shadow controls - Full customization with color, blur, spread, offset, and opacity

2. **Card Shadow Controls** (All Card Types):
   - Enable/disable toggle - Apply shadow to all cards
   - Color picker - Shadow color selection
   - Blur, spread, offset X/Y, and opacity sliders
   - Email-safe implementation using inline `box-shadow` CSS

**Code Locations:**
- `types/newsletter.ts:14-22` - Shadow interface definition
- `types/newsletter.ts:52-56` - Settings interface with shadow properties
- `components/editor/SettingsEditor.tsx:20-66` - Shadow helper functions
- `components/editor/SettingsEditor.tsx:368-642` - UI controls for accent bar and shadows
- `lib/email-templates.ts:66-112` - Shadow CSS generation and accent bar styling
- `lib/email-templates.ts:465-491` - Card shadow application in getCardStyle()
- `lib/email-templates.ts:560-619` - renderStandardCard() with dynamic accent bar
- `lib/email-templates.ts:624-691` - renderEventCard() with dynamic accent bar
- `lib/defaults.ts:244-263` - Default shadow settings (disabled by default)

**Why Previously Removed:** Controls were removed in commit 236fb98 during a "cleanup" that removed 381 lines of shadow/accent controls. This was a mistake as the features were functional and useful.

**Restoration Details:**
- Restored Shadow interface with full properties (enabled, color, blur, spread, offset_x, offset_y, opacity)
- Added accent_bar_enabled, accent_bar_color, accent_bar_shadow, and card_shadow to Settings
- All controls work across all three templates (Friday Focus, Briefing, Slate Campaign)
- Real-time preview updates
- Email-safe CSS using inline styles

**Accent Bar Wrap (Horizontal Extension):** NOT IMPLEMENTED
- Would require extending accent bar horizontally along top edge of cards
- Email HTML limitations make corner wrapping difficult with table-based layouts
- Multiple implementation attempts failed due to alignment issues
- Feature remains unimplemented - vertical-only accent bar is current behavior

### List Item Gap Control - FIXED (December 2025)

**Issue:** Item Gap values below 16px were ignored.

**Root Cause:** TipTap wraps list item content in `<p>` tags with `margin: 1em 0` (~16px). CSS margin collapse between `<li>` and `<p>` margins caused the larger value to win.

**Solution Applied:**
1. Removed paragraph margins inside list items (editor + preview CSS)
2. Removed `!important` from CSS reset to allow inline style override
3. Always apply styles (not just when different) to handle timing issues
4. Enhanced ListItem extension to preserve styles through operations

**Status:** ✅ FIXED - Works for all values 0-50px

**Code Locations:**
- `components/editor/TiptapEditor.tsx:70-94` (ListItem extension)
- `components/editor/TiptapEditor.tsx:214-261` (updateListItemStyles)
- `app/globals.css:111-113` (paragraph margin fix)
- `lib/styles.ts:89-92` (preview paragraph margin fix)

**Lesson Learned:** Always check for margin collapse when dealing with nested block elements.

---

## Code Structure & Key Files

### Project Structure

```
wsu-mail-editor/
├── app/
│   ├── page.tsx                    # Homepage with tool tiles
│   ├── editor/
│   │   ├── page.tsx                # Newsletter editor page
│   │   └── hooks/
│   │       ├── useNewsletterState.ts  # State management with undo/redo
│   │       └── usePreview.ts          # Preview generation hook
│   ├── orgchart/
│   │   └── page.tsx                # Org chart editor page
│   ├── api/                        # Next.js API routes (serverless functions)
│   │   ├── preview/route.ts        # Generate HTML preview
│   │   ├── export/route.ts         # Export HTML file
│   │   ├── import/route.ts         # Import from HTML
│   │   └── orgchart/               # Org chart API routes
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Global styles + Tiptap editor styles
├── components/
│   ├── editor/                     # Newsletter editor components
│   │   ├── TiptapEditor.tsx        # Rich text editor (Tiptap)
│   │   ├── EditorPanel.tsx         # Main editor panel
│   │   ├── PreviewPanel.tsx        # Live preview panel
│   │   ├── SettingsEditor.tsx       # Global settings editor
│   │   └── ...
│   └── orgchart/
│       └── OrgChartEditor.tsx      # Org chart editor wrapper (iframe)
├── lib/
│   ├── email-templates.ts          # HTML generation for newsletters
│   ├── utils.ts                    # Utility functions (list processing, etc.)
│   ├── config.ts                   # Configuration and defaults
│   ├── defaults.ts                 # Default newsletter data models
│   ├── styles.ts                   # Email-safe inline styles
│   └── orgchart-utils.ts           # Org chart validation utilities
├── types/
│   └── newsletter.ts               # TypeScript type definitions
└── public/
    ├── orgchart-admin.html         # Org chart admin interface
    └── Wordpress.js/css            # Org chart runtime files
```

### Critical Files for Understanding

#### `lib/email-templates.ts`
**Purpose:** Generates email-safe HTML from newsletter data.

**Key Functions:**
- `renderFullEmail()` - Main entry point, generates complete email HTML
- `renderMasthead()` - Newsletter header with logo/title
- `renderSection()` - Section wrapper with cards
- `renderStandardCard()` / `renderEventCard()` / etc. - Individual card types
- `processBodyHtmlForEmail()` - Processes rich text HTML for email compatibility

**Important:** All HTML uses table-based layouts and inline styles for email compatibility.

#### `components/editor/TiptapEditor.tsx`
**Purpose:** Rich text editor component using Tiptap/ProseMirror.

**Key Features:**
- Custom ListItem extension with inline style support
- List controls (line height, item gap, indent/outdent)
- Table editing with modal
- Code view toggle for direct HTML editing

**Critical Implementation:**
- ListItem extension preserves `style` attribute through all operations
- `updateListItemStyles()` applies inline styles with `!important` to override CSS

#### `app/editor/hooks/useNewsletterState.ts`
**Purpose:** State management with undo/redo and auto-save.

**Features:**
- History stack for undo/redo
- Auto-save to localStorage (30-second intervals)
- State persistence across page reloads

#### `app/api/preview/route.ts`
**Purpose:** Serverless function that generates HTML preview.

**Flow:**
1. Receives newsletter data (JSON)
2. Calls `renderFullEmail()` from `email-templates.ts`
3. Returns HTML string
4. Client displays in preview iframe

### API Routes

**Newsletter Routes:**
- `POST /api/preview` - Generate HTML preview
- `POST /api/export` - Export HTML file (download)
  - Filename includes template name, date, and timestamp (HH-MM format, local time)
  - Format: `{TemplateName}_YYYY-MM-DD_HH-MM.html` (e.g., `Briefing_2025-12-05_14-30.html`)
- `POST /api/import` - Import from HTML (restores editor state)
- `POST /api/validate` - Validate for accessibility
- `POST /api/stats` - Get content statistics
- `GET /api/defaults/[type]` - Get default template data

**Org Chart Routes:**
- `POST /api/orgchart/import` - Import org chart from HTML
- `GET /api/orgchart/sample` - Get sample HTML templates
- `GET /api/orgchart/runtime.js` - Serve Wordpress.js
- `GET /api/orgchart/runtime.css` - Serve Wordpress.css
- `GET /api/orgchart/download/js` - Download Wordpress.js
- `GET /api/orgchart/download/css` - Download Wordpress.css

---

## Deployment

### Vercel Deployment (Automatic)

**Setup:**
- Vercel connected to GitHub: `https://github.com/gcrouch-wsu/WSU-Mail-Editor.git`
- Automatic deployments enabled for `main` branch
- Each push to `main` triggers new deployment

**Deployment Process:**
1. Push to GitHub: `git push origin main`
2. Vercel detects push via GitHub webhook
3. Builds application: `npm install` → `npm run build`
4. Deploys to production
5. API routes become serverless functions automatically

**Verifying Deployments:**
- Check Vercel dashboard → Deployments tab
- Verify commit hash matches GitHub
- Green checkmark = successful, Red X = failed

**Common Issues:**
- **Build fails:** Always test locally with `npm run build` first
- **Old commit deployed:** Create empty commit to trigger rebuild
- **TypeScript errors:** Fix all type errors before pushing

**Configuration:**
- Framework: Next.js (auto-detected)
- Build Command: `npm run build`
- Output Directory: `.next`
- Node.js Version: 18.x

---

## Troubleshooting

### Development Issues

**Port already in use:**
- Kill existing Node processes: `taskkill /F /IM node.exe`
- Check ports: `netstat -ano | findstr ":300"`
- Kill specific PID: `taskkill /F /PID [PID_NUMBER]`

**Preview not updating:**
- Check browser console for errors
- Verify `/api/preview` route is responding
- Check network tab for failed requests

**TypeScript errors:**
- Run `npm run build` to see all errors
- Fix type issues before committing
- Check `tsconfig.json` for strict mode settings

### Editor Issues

**List controls not working:**
- Check browser console for errors
- Verify ListItem extension is loaded
- Check if inline styles are being applied (inspect `<li>` elements)

**Import/Export not working:**
- Check Base64 encoding/decoding
- Verify HTML structure matches expected format
- Check browser console for parsing errors

**State not persisting:**
- Check localStorage in browser DevTools
- Verify auto-save is enabled
- Check for localStorage quota exceeded errors

### Deployment Issues

**Build failing on Vercel:**
- Test locally: `npm run build`
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compiles without errors

**API routes not working:**
- Check Vercel function logs
- Verify route files are in `app/api/` directory
- Check for runtime errors in function logs

---

## Additional Resources

### Key Dependencies

```json
{
  "next": "^14.0.0",
  "react": "^18.2.0",
  "typescript": "^5.3.3",
  "@tiptap/react": "^3.10.6",
  "@dnd-kit/core": "^6.3.1",
  "tailwindcss": "^3.4.0",
  "lucide-react": "^0.300.0"
}
```

### WSU Brand Colors

Defined in `tailwind.config.ts`:
- Primary Crimson: `#A60F2D`
- Dark Crimson: `#8c0d25`
- Gray: `#4D4D4D`
- Text colors: Dark, Body, Muted
- Backgrounds: Light, Card, White
- Borders: Light, Medium

### Default URLs

Defined in `lib/config.ts`:
- FF Submit Form: `https://gradschool.wsu.edu/request-for-ff-promotion/`
- Briefing Submit Form: `https://gradschool.wsu.edu/listserv/`
- Updates Archive: `https://gradschool.wsu.edu/faculty-and-staff-updates/`

---

## Future Enhancement Opportunities

This section outlines editor enhancements that could improve the creation of professional and accessible HTML emails. The focus is on look, feel, and content creation capabilities. Analytics, tracking, and CRM features are handled by Slate and are not included here.

### Visual Design & Styling

**Color Management**
- Color palette library with WSU brand colors
- Recent colors picker
- Custom color swatches
- Color harmony suggestions for accessibility

**Typography Controls**
- Font pairing suggestions (email-safe fonts only)
- Line height and letter spacing presets
- Text shadow options (with email client compatibility warnings)
- Drop cap and pull quote styles

**Layout Options**
- Multi-column card layouts (2-column, 3-column)
- Sidebar layouts with main content area
- Image positioning options (left/right wrap, full-width, gallery)
- Spacing presets (compact, comfortable, spacious)

**Background & Border Enhancements**
- Gradient backgrounds (with fallback solid colors for unsupported clients)
- Border style library (dashed, dotted, double)
- Corner radius presets (subtle, moderate, pill)
- Background image support with overlay options

### Content Management & Productivity

**Image Management System**
- Upload images directly to the editor (currently requires external hosting)
- Image library with search and organization
- Automatic image optimization and resizing for email
- Alt text suggestions for accessibility
- Image cropping and basic editing tools

**Reusable Content Blocks**
- Save commonly used sections as templates (e.g., signature blocks, headers, footers)
- Content snippet library for frequently used text
- Shared snippets across newsletters
- Quick insert from library

**Advanced Templates**
- Pre-built layout templates beyond the three current templates
- Seasonal/event-specific templates (graduation, holidays, conferences)
- Template versioning and management
- Clone/duplicate newsletters from previous editions

**Content Components**
- Button builder with style presets
- Divider line styles library (solid, dashed, decorative)
- Spacer component for precise vertical spacing
- Icon library (email-safe icon fonts or inline SVG)

### Collaboration & Workflow

**Version History**
- Track all changes with timestamps and user info
- Compare versions side-by-side
- Restore previous versions
- Annotate changes with notes

**Collaborative Editing**
- Multiple users editing simultaneously
- Role-based permissions (editor, reviewer, publisher)
- Comments and suggestions on specific sections
- Approval workflow before export

**Content Review Tools**
- Spell check and grammar checking
- Readability score (Flesch-Kincaid, etc.)
- Broken link detection
- Duplicate content warnings

### Testing & Quality Assurance

**Email Client Preview**
- Preview across multiple email clients (Gmail, Outlook, Apple Mail, Yahoo, etc.)
- Device preview (desktop, mobile, tablet)
- Dark mode rendering preview
- Email client compatibility warnings for specific CSS features

**Test Email Functionality**
- Send test emails to specific addresses
- Preview with sample data
- Test links before distribution
- Verify rendering before export

### Accessibility & Compliance

**Enhanced Accessibility Tools**
- Automated accessibility audit (WCAG 2.1 AA/AAA)
- Color contrast checker with real-time feedback
- Screen reader preview mode
- Alternative text validator with AI suggestions
- Heading hierarchy checker
- Focus order visualization

**Compliance Features**
- CAN-SPAM compliance checker
- Required footer elements checker
- Language attribute validator
- Semantic HTML structure checker

### Editor Experience Enhancements

**Rich Text Editor Improvements**
- Emoji picker integrated into editor
- Special character library
- Find and replace functionality
- Character count and word count
- Formatting painter (copy/paste styles)

**Smart Editing Features**
- Auto-save with cloud sync (currently localStorage only)
- Undo/redo with branching history
- Keyboard shortcuts customization
- Drag-and-drop image insertion
- Paste from Word with formatting cleanup

**Visual Feedback**
- Real-time email client compatibility warnings
- Accessibility score indicator
- File size indicator
- Image size warnings (too large for email)

### Import/Export Enhancements

**Import Capabilities**
- Import from Word/Google Docs with formatting preservation
- Import HTML from other email editors
- Bulk import of content from CSV/spreadsheet for event listings
- Import images with automatic optimization

**Export Options**
- Export to PDF for archival
- Export plain text version for accessibility
- Export with embedded images (Base64) option
- Export template as reusable starting point

### Mobile & Responsive Design

**Mobile Optimization**
- Mobile preview during editing
- Touch-optimized editor interface
- Responsive breakpoint testing
- Mobile-specific font size recommendations
- Stack/unstack columns preview for mobile

**Progressive Web App (PWA)**
- Offline editing capability
- Install as desktop/mobile app
- Background sync when connection restored

### Implementation Considerations

When considering these enhancements, prioritize based on:
1. **Email compatibility** - Ensure features work across email clients (many advanced features don't)
2. **User need** - Survey Graduate School staff for most-requested features
3. **Accessibility impact** - Prioritize features that improve WCAG compliance
4. **Development effort** - Balance value vs. implementation complexity
5. **Maintenance burden** - Consider ongoing support and updates

**Critical Constraint:** This editor is for creating professional, accessible HTML emails only. Email clients have severe limitations compared to modern web browsers. Always prioritize email compatibility over visual sophistication. Features like animations, complex JavaScript, modern CSS Grid/Flexbox, and external stylesheets will not work in most email clients.

---

## Next Steps for New Developers

1. **Read this document** - Understand project purpose and architecture
2. **Set up development environment** - `npm install` → `npm run dev`
3. **Explore the codebase** - Start with `lib/email-templates.ts` and `components/editor/TiptapEditor.tsx`
4. **Test both editors** - Newsletter Editor and Org Chart Editor
5. **Check GitHub Issues** - Review known problems and feature requests
6. **Follow development practices** - Test before commit, kill ports after testing

---

**Remember:** This application generates HTML for email clients, which have limited CSS support. Always prioritize email compatibility over modern web features.
