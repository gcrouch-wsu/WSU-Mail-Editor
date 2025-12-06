# AI Handoff Document - WSU Graduate School Tools

**Last Updated:** December 2025 (Latest: Template restore logic fix, export filename with template name and timestamp)  
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

- **Accent Bar Wrap:** Vertical accent bar cannot extend horizontally along top edge
  - Status: Feature attempted but reverted due to email HTML limitations
  - See "Known Issues" section for details

---

## Recent Fixes (December 2025)

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

### Accent Bar Wrap Control (NOT IMPLEMENTED)

**Intended Feature:** Allow crimson accent bar to extend horizontally along top edge of cards.

**Why Not Implemented:**
- Email HTML limitations make corner wrapping difficult with table-based layouts
- Multiple implementation attempts failed due to alignment and continuity issues
- Feature abandoned in favor of customizable shadow controls

**Current Behavior:** Accent bar is vertical only (left edge, 4px wide by default).

**Code Location:**
- `lib/email-templates.ts:507-510` (`getAccentBarStyle()`)
- Used in `renderStandardCard()` and `renderEventCard()`

**Future Implementation:** Would require significant HTML structure changes and may not work reliably in all email clients.

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

## Next Steps for New Developers

1. **Read this document** - Understand project purpose and architecture
2. **Set up development environment** - `npm install` → `npm run dev`
3. **Explore the codebase** - Start with `lib/email-templates.ts` and `components/editor/TiptapEditor.tsx`
4. **Test both editors** - Newsletter Editor and Org Chart Editor
5. **Check GitHub Issues** - Review known problems and feature requests
6. **Follow development practices** - Test before commit, kill ports after testing

---

**Remember:** This application generates HTML for email clients, which have limited CSS support. Always prioritize email compatibility over modern web features.
