# AI Handoff Document - WSU Graduate School Tools

**Last Updated:** December 2025 (Latest: Vercel deployment documentation, GitHub integration)  
**Project Version:** 8.0 (Next.js/TypeScript)  
**Repository:** https://github.com/gcrouch-wsu/WSU-Mail-Editor.git

## Project Overview

This is a Next.js 14 web application that provides tools for the WSU Graduate School, including:

1. **HTML Newsletter Editor** - Create and edit email-safe HTML newsletters (Friday Focus, Graduate School Briefing, and Graduate School Slate Campaign)
2. **Org Chart Editor** - Create and edit organizational charts with multiple layout options (centered, vertical, horizontal)

The application is built with TypeScript, React, Tailwind CSS, and uses Next.js App Router with API routes. Both tools are accessible from a unified homepage and share the same deployment infrastructure.

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
- **Purpose:** Create and edit email-safe HTML newsletters for WSU Graduate School communications
- **Templates:** 
  - **Friday Focus (FF):** Weekly newsletter template with updates, fiscal information, closures, resources, and submit request section
  - **Graduate School Briefing:** Briefing template with similar structure but different default content and CTA URLs
  - **Graduate School Slate Campaign:** Letter-style template with greeting, body, closing, and signature image support
- **Sections:** 
  - Configurable sections with titles and layout settings
  - Each section can contain multiple cards or closures (for closures section)
  - Section layout includes: padding (top/bottom), background color, border radius, divider settings (enabled, thickness, color, spacing, margins)
  - Sections can be reordered via drag-and-drop
- **Card Types:** 
  - **Standard:** Text content with title and body (rich text). Features crimson accent bar on left edge (4px wide by default)
  - **Event:** Date/time/location metadata with location label. Same accent bar as standard cards
  - **Resource:** Links and resource information with icon support
  - **CTA (Call-to-Action):** Customizable button with title, body text, button styling (colors, padding, border, radius, alignment, full-width option)
  - **Letter:** For letter template with greeting, body, closing, signature name, signature lines (multi-line), and signature image (with alt text and width control)
- **Global Settings:**
  - **Layout:**
    - Container width (560-700px, default 640px)
    - Section spacing (distance from divider to title, default 24px)
    - Show/hide section borders (divider lines)
    - Divider line color (with WSU color palette support)
    - Divider vertical spacing (above/below divider, default 0px)
    - Card spacing (NOT WORKING - see Known Issues, default 20px)
    - Card border radius (global, can be overridden per card, default 0px)
    - Accent bar width (for standard/event cards, default 4px, vertical only - wrap feature NOT IMPLEMENTED)
  - **Padding:**
    - Text padding (top, right, bottom, left, default 20px)
    - Image padding (top, right, bottom, left, default varies)
  - **Typography:**
    - Font family, sizes, colors
    - Heading styles
- **Content Editing:**
  - **Rich Text Editor (Tiptap):**
    - Bold, italic, underline
    - Headings (H1-H6)
    - Lists (bulleted, numbered) with custom spacing control
    - Links
    - Tables (insert, edit, format cells, multi-cell selection)
    - Code view toggle (direct HTML editing)
    - Undo/redo
  - **Table Editor:**
    - Modal for table creation/editing
    - Inline toolbar for quick edits (add/delete rows/columns)
    - Cell formatting (colors, fonts, alignment, scope)
    - Column width control
    - Border styling (style, color, thickness)
    - Header styling (background, underline)
    - Font family selection
    - Multi-cell selection for batch formatting
- **Features:**
  - Live preview with real-time updates (iframe-based)
  - Export HTML with embedded Base64 JSON data for round-trip editing
  - Import from exported HTML (restores full editor state)
  - Auto-save to localStorage (30-second intervals)
  - Undo/redo functionality (history stack)
  - Accessibility validation (alt text, aria-labels, scope attributes, meta descriptions)
  - Content statistics (word count, character count, etc.)
  - Template switching with confirmation dialog
  - File upload/download
  - Validation warnings and errors

### Org Chart Editor (`/orgchart`)
- **Purpose:** Create and edit organizational charts for WordPress integration
- **Layouts:** 
  - **Centered:** Hierarchical tree with root at center
  - **Vertical:** Top-down organizational structure
  - **Horizontal:** Left-to-right organizational structure
- **Data Management:**
  - Import from HTML (parses existing org chart structure)
  - Import from Excel (planned/partial support)
  - Visual node editing with drag-and-drop
  - Node inspector for editing individual node properties
- **Styling Controls:**
  - Node colors (background, text, border)
  - Font family and size
  - Spacing and padding
  - Border styles
- **Layout Configuration:**
  - Orientation settings
  - Spacing between nodes
  - Connection line styles
- **Features:**
  - Live preview with real-time updates
  - Export WordPress-compatible HTML
  - Download runtime files (Wordpress.js, Wordpress.css) for WordPress integration
  - Sample templates for each layout type
  - Self-contained export option
- **Technical Implementation:**
  - Embedded in iframe (`orgchart-admin.html`)
  - Uses existing JavaScript library (`Wordpress.js`)
  - API routes handle data import/export and file serving
  - Flexbox layout for responsive admin interface

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
- **Key Functions:**
  - `renderFullEmail()` - Main function that generates complete email HTML
  - `renderMasthead()` - Generate masthead HTML with logo and title
  - `renderSectionStart()` - Generate section wrapper with title and divider
  - `renderSection()` - Generate complete section with all cards
  - `renderSectionEnd()` - Close section wrapper
  - `renderStandardCard()` - Generate standard card HTML
  - `renderEventCard()` - Generate event card HTML
  - `renderResourceCard()` - Generate resource card HTML
  - `renderCTABox()` - Generate CTA card HTML
  - `renderLetterCard()` - Generate letter card HTML
  - `renderFooter()` - Generate footer HTML
  - `getCardStyle()` - Build card style with border radius, spacing, etc.
  - `getCardPadding()` - Calculate card padding from global/section/card settings
  - All functions use email-safe inline styles
  - Padding applied to `<td>` elements, not `<table>` elements (for email compatibility)

## Recent Editor Features (December 2025)

### Divider Line Controls
- **Added:** Global controls for section divider lines (horizontal lines between sections)
- **Location:** Settings panel → "Show section borders" section
- **Controls:**
  - **Divider Line Color:** Color picker with WSU palette support
  - **Divider Vertical Spacing:**
    - **Space Above:** Adds padding-bottom to section (pushes divider down)
    - **Space Below:** Adds padding-top to next section (creates space after divider)
- **Implementation:**
  - Settings: `divider_color`, `divider_margin_top`, `divider_margin_bottom`
  - Applied in `renderSectionStart()` function
  - Padding moved from `<table>` to `<td>` for email client compatibility
  - ✅ **Status:** Working correctly

### Card Spacing Control (NOT WORKING)
- **Added:** Global control for spacing between cards
- **Location:** Settings panel → "Card Spacing (px)" input
- **Expected Behavior:** Should control vertical spacing (margin-bottom) between cards
- **Implementation Attempt:**
  - Settings: `card_spacing` (default: 20px)
  - Logic in `renderSection()` function (lines 1256-1309)
  - Uses spacer table elements between cards instead of margin-bottom
  - Spacer HTML: `<table><tr><td style="height:${spacingBottom}px;">&nbsp;</td></tr></table>`
- **Current Status:** ❌ **NOT WORKING**
  - Control exists in UI (`components/editor/SettingsEditor.tsx` line 268-287)
  - Value is stored in settings correctly
  - Spacer logic exists in `lib/email-templates.ts` (lines 1304-1309)
  - Spacer is only added if `!isLastCard && spacingBottom > 0`
  - **Issue:** Changes to card spacing value do not appear to affect the preview
  - **Possible Causes:**
    - Settings value not being read correctly
    - Preview not updating when settings change
    - Spacer HTML not rendering correctly in email clients
    - Logic issue with how spacingBottom is calculated
- **Code Location:**
  - Settings UI: `components/editor/SettingsEditor.tsx:268-287`
  - Spacing logic: `lib/email-templates.ts:1256-1309`
  - Default value: `lib/config.ts:133` (20px)
  - Type definition: `types/newsletter.ts:46` (`card_spacing?: number`)

### Section Spacing
- **Control:** "Section Spacing (px)" in Settings panel
- **Function:** Controls distance between horizontal divider line and section title (H2)
- **Implementation:** Sets `margin-top` on section title
- **Default:** 24px
- ✅ **Status:** Working correctly

### Accent Bar Wrap Control (NOT IMPLEMENTED)
- **Intended Feature:** Allow the crimson accent bar on standard and event cards to extend horizontally along the top edge
- **Current Behavior:** Accent bar is a vertical bar on the left side of cards (4px wide by default)
- **Desired Behavior:** 
  - Accent bar starts as a vertical bar on the left edge (as it currently does)
  - User can control how far the accent bar extends horizontally along the top edge
  - Visual: The red accent bar would wrap around the top-left corner and continue horizontally
  - Control would specify the horizontal extension distance (in pixels)
- **Visual Description:**
  - **Default (current):** Red vertical bar on left edge only
  - **With wrap:** Red vertical bar on left edge + red horizontal bar extending from top-left corner along the top edge
  - The horizontal extension would be controlled by a "wrap" or "extension" value
- **Implementation Attempt:**
  - Attempted to add `accent_bar_wrap` property to card types and settings
  - Attempted to modify `getAccentBarHtml()` function to support horizontal extension
  - Changes were reverted due to errors
- **Current Status:** ❌ **NOT IMPLEMENTED**
  - Only vertical accent bar exists (left edge)
  - No horizontal extension capability
  - `accent_bar_width` control exists but only affects vertical bar width
- **Code Location:**
  - Accent bar rendering: `lib/email-templates.ts:507-510` (`getAccentBarStyle()`)
  - Used in: `renderStandardCard()` and `renderEventCard()`
  - Settings: `lib/config.ts:138` (`accent_bar_width: 4`)
- **Future Implementation Notes:**
  - Would need to modify card HTML structure to include a top horizontal bar
  - Would need to handle corner radius if card has rounded corners
  - Would need UI control in Settings or Card Editor for wrap distance
  - Would need to ensure email client compatibility (tables, inline styles)

## Known Issues & TODOs

### Current State
- ✅ Org chart integration complete
- ✅ Layout fixed with Flexbox
- ✅ JavaScript errors resolved
- ✅ Download functionality working
- ✅ Divider line controls working (color, spacing)
- ❌ Card spacing control NOT working (see Critical Issues)
- ❌ Accent bar wrap control NOT implemented (see Critical Issues)

### Critical Issues
- **Card Spacing Control Not Working:**
  - Control exists and updates state correctly
  - Spacer logic is implemented
  - Preview does not reflect changes
  - **Investigation Needed:**
    1. Verify settings are passed correctly to `renderSection()`
    2. Check if preview updates when settings change
    3. Verify spacer HTML is being generated correctly
    4. Test if spacer tables render correctly in email clients
    5. Check browser console for any errors
    6. Verify `settings.card_spacing` is being read correctly (not always undefined)

- **Accent Bar Wrap Control Not Implemented:**
  - Feature was attempted but reverted due to errors
  - Current implementation only supports vertical accent bar (left edge)
  - Desired: Accent bar should be able to extend horizontally along top edge
  - **Implementation Requirements:**
    1. Modify card HTML structure to support horizontal bar element
    2. Add `accent_bar_wrap` or `accent_bar_extension` property to settings/cards
    3. Update `getAccentBarStyle()` or create new function for horizontal bar
    4. Handle corner radius when bar wraps around corner
    5. Add UI control for wrap distance
    6. Ensure email client compatibility

### Potential Improvements
- [ ] Fix card spacing control (see Critical Issues above)
- [ ] Add error boundaries for better error handling
- [ ] Add loading states for API calls
- [ ] Improve mobile responsiveness for org chart editor
- [ ] Add unit tests for API routes
- [ ] Add E2E tests for critical workflows
- [ ] Consider adding authentication/authorization
- [ ] Add analytics tracking

## Deployment

### Vercel Deployment via GitHub

**Setup:**
- Vercel is connected to the GitHub repository: `https://github.com/gcrouch-wsu/WSU-Mail-Editor.git`
- Automatic deployments are enabled for the `main` branch
- Each push to `main` triggers a new deployment automatically

**Deployment Process:**
1. **Push to GitHub:** `git push origin main`
2. **Vercel Auto-Detection:** Vercel automatically detects the push via GitHub webhook
3. **Build Process:**
   - Vercel clones the repository
   - Runs `npm install` to install dependencies
   - Runs `npm run build` to build the Next.js application
   - Deploys the built application
4. **API Routes:** All API routes in `app/api/` are automatically deployed as serverless functions

**Verifying Deployments:**
1. **Check Latest Commit:** 
   - In Vercel dashboard, go to "Deployments" tab
   - Verify the commit hash matches the latest commit on GitHub
   - Use `git log --oneline -1` to see the latest local commit
   - Use `git log --oneline origin/main -1` to see the latest remote commit

2. **If Deployment Uses Old Commit:**
   - Vercel may be building from a cached commit
   - Create an empty commit to force a new deployment:
     ```bash
     git commit --allow-empty -m "Trigger Vercel rebuild"
     git push origin main
     ```
   - Or manually trigger a deployment in Vercel dashboard

3. **Check Build Status:**
   - Green checkmark = successful deployment
   - Red X = build failed (check build logs)
   - Yellow circle = building in progress

**Common Deployment Issues:**

1. **"A more recent Production Deployment has been created"**
   - This means Vercel already detected a newer commit and is building it
   - Check the "Deployments" tab for the latest deployment
   - Don't try to redeploy old deployments

2. **Build Failing with TypeScript Errors:**
   - Always test locally first: `npm run build`
   - Check that all fixes are committed and pushed
   - Verify the deployment is using the latest commit (not an old one)
   - Check build logs in Vercel dashboard for specific errors

3. **Build Using Old Commit:**
   - Verify latest commit is pushed: `git log origin/main -1`
   - Check Vercel deployment commit hash matches GitHub
   - Create empty commit to trigger new build if needed

4. **File System Access in Serverless Functions:**
   - Files in `public/` are served statically
   - API routes can read from `public/` using `process.cwd()`
   - Ensure files are committed to git (not in `.gitignore`)

**Deployment Configuration:**
- **Framework Preset:** Next.js (auto-detected)
- **Root Directory:** `.` (root)
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)
- **Node.js Version:** 18.x (Vercel default)

**Manual Deployment:**
- Go to Vercel dashboard → Project → Deployments
- Click "Deploy" button
- Select branch and commit to deploy
- Or use Vercel CLI: `vercel --prod`

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
- **Card spacing not working:**
  - Control exists in Settings panel
  - Value is stored in `settings.card_spacing`
  - Spacer logic exists in `renderSection()` function
  - **Debug steps:**
    1. Check if `settings.card_spacing` is being read correctly (add console.log)
    2. Verify spacer HTML is being generated (check rendered HTML)
    3. Check if preview updates when settings change
    4. Verify `spacingBottom` variable is calculated correctly
    5. Check if spacer table is being added to `cardHtml` array
    6. Verify spacer HTML renders correctly in email clients

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

