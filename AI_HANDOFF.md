# AI Handoff Document - WSU Graduate School Tools

**Last Updated:** December 3, 2025  
**Project Version:** 8.0 (Next.js/TypeScript)  
**Repository:** https://github.com/gcrouch-wsu/WSU-Mail-Editor.git

## Project Overview

This is a Next.js 14 web application that provides tools for the WSU Graduate School, including:

1. **HTML Newsletter Editor** - Create and edit email-safe HTML newsletters (Friday Focus and Graduate School Briefing)
2. **Org Chart Editor** - Create and edit organizational charts with multiple layout options

The application is built with TypeScript, React, Tailwind CSS, and uses Next.js App Router with API routes.

## Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **UI Library:** React 18
- **Styling:** Tailwind CSS with WSU brand colors
- **Icons:** Lucide React
- **Rich Text Editor:** Tiptap (for newsletter editor)
- **Drag & Drop:** @dnd-kit (for newsletter sections)
- **Deployment:** Vercel (serverless functions)

## Project Structure

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
│   ├── api/
│   │   ├── preview/route.ts        # Generate HTML preview
│   │   ├── export/route.ts         # Export HTML file
│   │   ├── import/route.ts         # Import from HTML
│   │   ├── generate-plaintext/route.ts
│   │   ├── defaults/[type]/route.ts
│   │   ├── validate/route.ts
│   │   ├── stats/route.ts
│   │   └── orgchart/               # Org chart API routes
│   │       ├── import/route.ts     # Import org chart from HTML
│   │       ├── sample/route.ts     # Get sample HTML templates
│   │       ├── runtime.js/route.ts # Serve Wordpress.js
│   │       ├── runtime.css/route.ts # Serve Wordpress.css
│   │       └── download/
│   │           ├── js/route.ts     # Download Wordpress.js
│   │           └── css/route.ts    # Download Wordpress.css
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Tailwind CSS directives
├── components/
│   ├── editor/                     # Newsletter editor components
│   │   ├── EditorPanel.tsx
│   │   ├── PreviewPanel.tsx
│   │   ├── MastheadEditor.tsx
│   │   ├── SectionsEditor.tsx
│   │   ├── CardEditor.tsx
│   │   ├── FooterEditor.tsx
│   │   ├── SettingsEditor.tsx
│   │   ├── TiptapEditor.tsx
│   │   └── ...
│   ├── homepage/
│   │   └── ToolTile.tsx            # Homepage tool tile component
│   └── orgchart/
│       └── OrgChartEditor.tsx      # Org chart editor wrapper (iframe)
├── lib/
│   ├── config.ts                   # Configuration and defaults
│   ├── defaults.ts                 # Default newsletter data models
│   ├── email-templates.ts          # HTML generation functions
│   ├── styles.ts                   # Email-safe inline styles
│   ├── utils.ts                    # Utility functions
│   └── orgchart-utils.ts           # Org chart validation utilities
├── types/
│   └── newsletter.ts               # TypeScript type definitions
├── public/
│   ├── admin.js                    # Org chart admin JavaScript
│   ├── orgchart-admin.html         # Org chart admin interface
│   ├── orgchart-center.html        # Sample centered layout
│   ├── orgchart-vertical.html      # Sample vertical layout
│   ├── orgchart-horizontal.html    # Sample horizontal layout
│   ├── Wordpress.js                # Org chart runtime JavaScript
│   └── Wordpress.css               # Org chart runtime CSS
└── Org Chart 6/                    # Original source files (reference)
```

## Recent Changes (December 2025)

### Org Chart Integration
- **Added:** Complete org chart editor integration into the Next.js app
- **Location:** `/orgchart` route
- **Implementation:**
  - Embedded `orgchart-admin.html` in an iframe via `OrgChartEditor.tsx`
  - Created Next.js API routes to replace Flask backend:
    - `/api/orgchart/import` - Import org chart data from HTML
    - `/api/orgchart/sample` - Get sample HTML templates
    - `/api/orgchart/runtime.js` - Serve Wordpress.js
    - `/api/orgchart/runtime.css` - Serve Wordpress.css
    - `/api/orgchart/download/js` - Download Wordpress.js
    - `/api/orgchart/download/css` - Download Wordpress.css
  - Fixed JavaScript errors:
    - Wrapped variable declarations in existence checks to prevent redeclaration errors
    - Fixed `$`, `log`, `toast`, `uid`, `NODES`, `SELECTED_ID`, etc.
  - **Layout Fix:** Converted from CSS Grid to Flexbox for proper card stacking
    - Cards now stack naturally without extra whitespace
    - Import & People and Styling align at the top
    - Inspector stacks below Import & People
    - Layout stacks below Styling
    - Preview remains in right column with sticky positioning

### Layout Architecture
- **Main Layout:** Flexbox with 3 columns
  - Column 1 (380px): Import & People, Inspector (stacked)
  - Column 2 (420px): Styling, Layout (stacked)
  - Column 3 (flex:1): Live Preview (sticky, scrollable)
- **Key Files:**
  - `public/orgchart-admin.html` - Main admin interface (Flexbox layout)
  - `components/orgchart/OrgChartEditor.tsx` - React wrapper component

## Key Features

### Newsletter Editor (`/editor`)
- **Templates:** Friday Focus (FF) and Graduate School Briefing
- **Sections:** Configurable sections with cards
- **Card Types:** Standard, Event, Resource, CTA
- **Features:**
  - Live preview with real-time updates
  - Export HTML with embedded Base64 data
  - Import from exported HTML
  - Auto-save to localStorage (30-second intervals)
  - Undo/redo functionality
  - Accessibility validation
  - Content statistics
  - Rich text editing with Tiptap
  - Table editing capabilities

### Org Chart Editor (`/orgchart`)
- **Layouts:** Centered, Vertical, Horizontal
- **Features:**
  - Import from HTML or Excel
  - Visual node editing
  - Styling controls (colors, fonts, spacing)
  - Layout configuration
  - Live preview
  - Export WordPress-compatible HTML
  - Download runtime files (Wordpress.js, Wordpress.css)

## API Routes

### Newsletter API Routes
- `POST /api/preview` - Generate HTML preview
- `POST /api/export` - Export HTML file
- `POST /api/import` - Import from HTML
- `POST /api/generate-plaintext` - Generate plain text version
- `GET /api/defaults/[type]` - Get default template (ff/briefing)
- `POST /api/validate` - Validate for accessibility
- `POST /api/stats` - Get content statistics

### Org Chart API Routes
- `POST /api/orgchart/import` - Import org chart data from HTML
  - Validates node structure
  - Extracts layout attributes
  - Returns `{ ok: boolean, nodes: Node[], layout: LayoutConfig }`
- `GET /api/orgchart/sample?type=centered|vertical|vertical_horizontal` - Get sample HTML
- `GET /api/orgchart/runtime.js` - Serve Wordpress.js (no-cache headers)
- `GET /api/orgchart/runtime.css` - Serve Wordpress.css (no-cache headers)
- `GET /api/orgchart/download/js` - Download Wordpress.js (attachment)
- `GET /api/orgchart/download/css` - Download Wordpress.css (attachment)

## Configuration

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
- Current/Archived Updates: `https://gradschool.wsu.edu/faculty-and-staff-updates/`

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Homepage: http://localhost:3000
   - Newsletter Editor: http://localhost:3000/editor
   - Org Chart Editor: http://localhost:3000/orgchart

4. **Available scripts:**
   - `npm run dev` - Start development server
   - `npm run build` - Build for production
   - `npm run start` - Start production server
   - `npm run lint` - Run ESLint
   - `npm run format` - Format code with Prettier
   - `npm run checkfmt` - Check code formatting

## Important Implementation Details

### Org Chart Admin JavaScript
- **File:** `public/admin.js`
- **Key Fixes:**
  - All global variables wrapped in existence checks: `if (typeof VAR === 'undefined') { var VAR = ... }`
  - Event listeners wrapped in `wireControls()` function with DOM ready checks
  - API endpoints updated to use Next.js routes (e.g., `/api/orgchart/import`)

### Org Chart Admin HTML
- **File:** `public/orgchart-admin.html`
- **Layout:** Flexbox with 3 columns
- **Structure:**
  ```html
  <main> <!-- display: flex -->
    <div class="col-1"> <!-- width: 380px, flex-direction: column -->
      <section id="import-card">...</section>
      <section id="inspector-card">...</section>
    </div>
    <div class="col-2"> <!-- width: 420px, flex-direction: column -->
      <section id="styling-card">...</section>
      <section id="layout-card">...</section>
    </div>
    <div class="col-3"> <!-- flex: 1 -->
      <section id="preview-card">...</section> <!-- sticky, scrollable -->
    </div>
  </main>
  ```

### Newsletter Editor State Management
- **Hook:** `app/editor/hooks/useNewsletterState.ts`
- **Features:**
  - Undo/redo with history stack
  - Auto-save to localStorage
  - State persistence across page reloads

### Email Template Generation
- **File:** `lib/email-templates.ts`
- **Functions:**
  - `renderMasthead()` - Generate masthead HTML
  - `renderSection()` - Generate section HTML
  - `renderCard()` - Generate card HTML (standard, event, resource, cta)
  - `renderFooter()` - Generate footer HTML
  - All functions use email-safe inline styles

## Known Issues & TODOs

### Current State
- ✅ Org chart integration complete
- ✅ Layout fixed with Flexbox
- ✅ JavaScript errors resolved
- ✅ Download functionality working

### Potential Improvements
- [ ] Add error boundaries for better error handling
- [ ] Add loading states for API calls
- [ ] Improve mobile responsiveness for org chart editor
- [ ] Add unit tests for API routes
- [ ] Add E2E tests for critical workflows
- [ ] Consider adding authentication/authorization
- [ ] Add analytics tracking

## Deployment

### Vercel Deployment
1. Push to GitHub: `git push origin main`
2. Import project in Vercel
3. Vercel auto-detects Next.js
4. API routes work as serverless functions
5. No additional configuration needed

### Environment Variables
Currently none required. All configuration is in `lib/config.ts`.

## Troubleshooting

### Org Chart Editor Issues
- **Iframe not loading:** Check that `public/orgchart-admin.html` exists
- **API errors:** Check browser console and network tab
- **Layout issues:** Verify Flexbox CSS in `orgchart-admin.html`
- **JavaScript errors:** Check that all variables are properly wrapped in existence checks

### Newsletter Editor Issues
- **Preview not updating:** Check browser console, verify `/api/preview` route
- **Import/Export issues:** Check Base64 encoding/decoding
- **State not persisting:** Check localStorage in browser DevTools

## Code Style & Conventions

- **TypeScript:** Strict mode enabled
- **Formatting:** Prettier (run `npm run format`)
- **Linting:** ESLint with Next.js config
- **Naming:**
  - Components: PascalCase (e.g., `EditorPanel.tsx`)
  - Files: kebab-case for routes, camelCase for utilities
  - Functions: camelCase
  - Constants: UPPER_SNAKE_CASE

## Key Dependencies

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

## Contact & Support

- **Repository:** https://github.com/gcrouch-wsu/WSU-Mail-Editor.git
- **Issues:** Use GitHub Issues for bug reports and feature requests

## Next Steps for Development

1. **Review current state:** Check recent commits and current branch
2. **Understand the architecture:** Read this document and key files
3. **Test locally:** Run `npm run dev` and test both editors
4. **Check for TODOs:** Search codebase for TODO comments
5. **Review open issues:** Check GitHub Issues for known problems
6. **Follow code style:** Use Prettier and ESLint before committing

---

**Note for AI Assistants:** When making changes, always:
1. Test locally before committing
2. Run `npm run format` and `npm run lint`
3. Update this document if architecture changes
4. Write clear commit messages
5. Verify both editors still work after changes

