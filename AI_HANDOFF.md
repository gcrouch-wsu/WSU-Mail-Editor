# AI Handoff Document - WSU Graduate School Tools

**Last Updated:** December 2025 (Latest: Fixed list line-height for Event and Resource cards)
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

### Per-Card Padding Controls (Latest)
- **Added:** Individual padding override controls for each card
- **Location:** Card editor → "Card Styling" section
- **Implementation:**
  - 4-input grid layout (top, right, bottom, left)
  - Empty fields use global padding settings
  - Fixed bug where empty fields would override global settings with `undefined` values
  - Smart padding management: only saves non-empty values, removes entire padding object if all fields cleared
  - Default resource cards now include `padding: { bottom: 20 }` for better spacing below icons/links
- **Use Case:** Improve resource card layout by increasing bottom padding to add breathing room after links/images
- **Files Modified:**
  - `components/editor/CardEditor.tsx` - Added padding override controls with proper undefined handling
  - `lib/defaults.ts` - Set bottom padding to 20px for all default resource cards
- **Data Model:** Already existed in types (`padding?: Padding` on all card types) - just needed UI controls
- ✅ **Status:** Working in editor, preview, and export

### Accent Bar Toggle
- **Added:** Global toggle to enable/disable accent bar on standard and event cards
- **Location:** Settings panel → "Accent Bar" section
- **Implementation:**
  - Checkbox: "Show accent bar on standard/event cards"
  - When disabled: Cards render as single-column table with all corners properly rounded
  - When enabled: Two-column table with accent bar + content (existing behavior)
  - Width and color controls are collapsible (only show when enabled)
  - Default: Enabled (true) for backwards compatibility
- **Files Modified:**
  - `types/newsletter.ts` - Added `accent_bar_enabled?: boolean` to Settings interface
  - `lib/config.ts` - Added default value (true)
  - `components/editor/SettingsEditor.tsx` - Added toggle with collapsible width/color controls
  - `lib/email-templates.ts` - Updated `renderStandardCard()` and `renderEventCard()` to conditionally render accent bar
- ✅ **Status:** Working in editor, preview, and export

### Customizable Shadow Controls
- **Added:** Comprehensive shadow customization system to replace simple on/off toggles
- **Location:** Settings panel → "Shadow Effects" section
- **Implementation:**
  - **Shadow Properties:**
    - **Color** - Full color picker support (hex values)
    - **Blur** - 0-50px range for shadow softness
    - **Spread** - -20 to 50px range for shadow size
    - **Offset X** - -50 to 50px horizontal positioning
    - **Offset Y** - -50 to 50px vertical positioning
    - **Opacity** - 0-1 range for shadow intensity
  - **Two Shadow Types:**
    - **Accent Bar Shadow** - Applied to the crimson accent bar on standard/event cards
    - **Card Shadow** - Applied to the entire card container
  - **UI Design:**
    - Collapsible controls (only show when shadow is enabled)
    - 3-column grid for blur/spread/opacity
    - 2-column grid for offset X/Y
    - Color picker with hex input field
    - Visual indicator (crimson accent border) when expanded
  - **Technical Details:**
    - Created new `Shadow` interface with 7 properties (enabled, color, blur, spread, offset_x, offset_y, opacity)
    - Added `getShadowStyle()` helper function in `lib/email-templates.ts`
    - Backwards compatible with legacy boolean shadow values
    - Converts hex colors to rgba format with opacity
    - Generates proper CSS `box-shadow` property
  - **Use Case:** Create glowing "frame" effects around cards using colored shadows (e.g., crimson glow) as an alternative to the impossible accent bar wrap feature
- **Files Modified:**
  - `types/newsletter.ts` - Added `Shadow` interface, updated `Settings` interface
  - `lib/config.ts` - Updated defaults with Shadow objects (enabled: false, default colors/values)
  - `lib/email-templates.ts` - Added `getShadowStyle()` function, updated `getCardStyle()` and `getAccentBarStyle()`
  - `components/editor/SettingsEditor.tsx` - Complete reorganization with new shadow controls
- ✅ **Status:** Working in editor, preview, and export

### Settings Editor Reorganization
- **Added:** Visual clustering and improved organization of settings panel
- **Implementation:**
  - **Grouped into logical sections** with bordered cards:
    1. **Layout** - Container width, section spacing, card spacing (2-column grid)
    2. **Section Borders** - Toggle, color, vertical spacing (collapsible when disabled)
    3. **Global Padding** - Text padding and image padding (4-column grids)
    4. **Card Styling** - Border radius
    5. **Accent Bar** - Width and color (2-column grid)
    6. **Shadow Effects** - Accent bar shadow and card shadow (collapsible controls)
  - **Visual Design:**
    - Each section has bordered card with header and underline
    - Consistent spacing between sections (space-y-6)
    - Collapsible sub-controls only show when parent feature is enabled
    - Better use of grid layouts to reduce vertical space
    - Reduced excessive help text
  - **Removed Controls:**
    - **Accent Bar Extension** controls removed from UI (feature abandoned - see Known Issues)
    - Extension settings still exist in data model but have no UI controls
- **Files Modified:**
  - `components/editor/SettingsEditor.tsx` - Complete rewrite with new organization
- ✅ **Status:** Working, much cleaner layout with less wasted space

### List Line-Height/Spacing Control
- **Added:** Line-height (spacing) control for lists in the rich text editor
- **Location:** TiptapEditor toolbar (appears when lists are active or present in document)
- **Implementation:**
  - Control appears as "Spacing:" input field (0.5-2.0 range, step 0.1)
  - Applies line-height to `<ul>` and `<ol>` elements as inline styles
  - Preserves line-height values in preview and exported HTML
  - Uses `processListStyles()` function in `lib/utils.ts` to preserve line-height during HTML processing
  - List items (`<li>`) use `line-height:inherit` to respect parent list's line-height
- **Files Modified:**
  - `components/editor/TiptapEditor.tsx` - Added spacing control UI and `handleListSpacingChange()` function
  - `lib/utils.ts` - Updated `processListStyles()` to preserve line-height from editor
  - `lib/email-templates.ts` - Calls `processListStyles()` via `processBodyHtmlForEmail()`
  - `app/globals.css` - Added CSS to support line-height inheritance on list items
- **Tiptap Extensions:** Configured BulletList and OrderedList separately to preserve HTMLAttributes
- ✅ **Status:** Working in editor, preview, and export

### Browser Auto-Open on Dev Server Start
- **Added:** Automatic browser opening when starting development server
- **Implementation:**
  - Created `scripts/dev-with-browser.js` script
  - Uses PowerShell `Start-Process` on Windows to open in external browser (outside Cursor)
  - Cross-platform support (Windows, macOS, Linux)
  - Waits 3 seconds for server to initialize before opening browser
- **Scripts:**
  - `npm run dev` - Starts server and opens browser automatically
  - `npm run dev:no-open` - Starts server without opening browser
- **Files Added:**
  - `scripts/dev-with-browser.js` - Browser opening script
- ✅ **Status:** Working

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
    - Accent bar width (for standard/event cards, default 4px, vertical only)
    - Accent bar color (default WSU crimson #A60F2D)
  - **Shadow Effects:**
    - **Accent Bar Shadow** - Customizable shadow for accent bars (color, blur, spread, offset X/Y, opacity)
    - **Card Shadow** - Customizable shadow for card containers (color, blur, spread, offset X/Y, opacity)
    - Can create glowing "frame" effects using colored shadows (e.g., crimson glow)
    - Email-safe implementation using CSS box-shadow
  - **Padding:**
    - Text padding (top, right, bottom, left, default 20px)
    - Image padding (top, right, bottom, left, default varies)
  - **Typography:**
    - Font family, sizes, colors
    - Heading styles
- **Content Editing:**
  - **Rich Text Editor (Tiptap):**
    - Bold, italic, underline, strikethrough
    - Headings (H1-H3)
    - Lists (bulleted, numbered) with line-height/spacing control (0.5-2.0)
      - Spacing control appears in toolbar when lists are active or present
      - Applies line-height to list containers (`<ul>`/`<ol>`)
      - Preserved in preview and exported HTML
    - Text alignment (left, center, right)
    - Links (insert, remove)
    - Tables (insert, edit, format cells, add/delete rows/columns)
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
   - Automatically opens browser in external window (outside Cursor)
   - Use `npm run dev:no-open` to start without opening browser

3. **Access the application:**
   - Homepage: http://localhost:3000
   - Newsletter Editor: http://localhost:3000/editor
   - Org Chart Editor: http://localhost:3000/orgchart

4. **Available scripts:**
   - `npm run dev` - Start development server and open browser automatically
   - `npm run dev:no-open` - Start development server without opening browser
   - `npm run build` - Build for production
   - `npm run start` - Start production server
   - `npm run lint` - Run ESLint
   - `npm run format` - Format code with Prettier
   - `npm run checkfmt` - Check code formatting

## Design Decisions

### Shadow Effects vs. Accent Bar Wrap (December 2025)

**Problem:** Users wanted a way to create visual "frames" around cards that wrap around the border radius, particularly when using rounded corners. Initial attempts focused on extending the accent bar horizontally to wrap around corners.

**Attempts Made:**
- Multiple table-based approaches tried (2-row, 3-row, nested tables, fixed column widths)
- All failed due to fundamental limitations of email-safe HTML
- Email clients only support tables and inline styles (no modern CSS Grid, Flexbox, or SVG)
- Horizontal and vertical bars rendered in separate table cells couldn't visually connect
- Rounded corners require continuous curves that table-based layouts can't produce

**Decision:** Abandon accent bar wrap feature entirely and implement customizable shadow controls instead

**Rationale:**
1. **Technical Feasibility:** Shadows work reliably across email clients using standard CSS `box-shadow`
2. **Visual Effect:** Colored shadows (e.g., crimson glow) can create a "frame" effect similar to the desired wrapping
3. **Simplicity:** Single CSS property vs. complex nested table structures
4. **Flexibility:** Users can customize color, blur, spread, offsets, and opacity for creative effects
5. **Maintenance:** No complex edge cases or email client compatibility workarounds

**Implementation:**
- Created `Shadow` interface with 7 customizable properties
- Applied to both accent bars and card containers
- Backwards compatible with legacy boolean shadow toggles
- UI controls only show when shadow is enabled (collapsible design)

**Alternative Use Cases:**
- Subtle depth/elevation effects (default: black shadow with low opacity)
- Glowing highlights (crimson shadow with high blur/spread)
- Offset shadows for 3D card effects
- Multiple shadow combinations (accent bar + card shadow together)

**Outcome:** Feature provides the desired visual enhancement without the impossible technical constraints of the wrap approach.

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
  - `getCardStyle()` - Build card style with border radius, spacing, shadows, etc.
  - `getCardPadding()` - Calculate card padding from global/section/card settings
  - `getShadowStyle()` - Generate CSS box-shadow from Shadow object (added December 2025)
  - `getAccentBarStyle()` - Generate accent bar styles with optional shadow support
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

### Accent Bar Wrap Control (FEATURE ABANDONED - UI CONTROLS REMOVED)
- **Intended Feature:** Allow the crimson accent bar on standard and event cards to wrap around the card perimeter (top and bottom edges) when border radius is applied, creating a continuous U-shaped frame
- **Decision (December 2025):** Feature deemed impossible with email-safe HTML/table constraints. UI controls removed from SettingsEditor. Data model properties remain for backwards compatibility but are not exposed to users.
- **Current Behavior:** Accent bar is a vertical bar on the left side of cards (4px wide by default)
- **Desired Behavior:** 
  - Accent bar starts as a vertical bar on the left edge (as it currently does)
  - When border radius > 0 and extension is enabled, horizontal bars wrap around the top and bottom edges
  - User can control:
    - Enable/disable extension (toggle)
    - Top extension distance (pixels)
    - Bottom extension distance (pixels, independent from top)
  - Visual: The red accent bar would wrap around the rounded corners continuously, creating a U-shaped frame
  - Horizontal bars should wrap around the outside of the card, not extend into content area
  - Bars should follow the border radius and be continuous (no gaps)
- **Visual Description:**
  - **Default (current):** Red vertical bar on left edge only
  - **With wrap:** Red vertical bar on left edge + red horizontal bars extending along top and bottom edges, wrapping around rounded corners
  - The horizontal extension creates a U-shaped frame around the card perimeter
- **Implementation Attempts (All Failed):**
  
  **Attempt 1 - Initial Structure:**
  - Added `accent_bar_extension` (single value) to settings
  - Created 2-row table structure (top bar row + card row)
  - Issue: Horizontal bar didn't align properly with vertical bar
  - Issue: Didn't handle bottom extension
  
  **Attempt 2 - U-Shape Structure:**
  - Changed to `accent_bar_extension_top` and `accent_bar_extension_bottom` (separate controls)
  - Created 3-row table structure (top bar + card + bottom bar)
  - Added `getHorizontalAccentBarStyle()` helper function
  - Issue: Horizontal bars were constrained to vertical bar width instead of extending horizontally
  - Issue: Bars didn't wrap around corners continuously
  
  **Attempt 3 - Outer Wrapper Approach:**
  - Created outer wrapper table with horizontal bars outside the card
  - Used nested tables to position bars
  - Issue: Horizontal bars lost their horizontal extension (were constrained)
  - Issue: Structure became too complex with nested tables
  
  **Attempt 4 - Fixed Column Alignment:**
  - Used fixed column widths to align all rows
  - Horizontal bars in separate rows with proper width attributes
  - Issue: Bars appeared but didn't visually connect/wrap around corners
  - Issue: Continuous wrapping around border radius not achieved
  
  **Final Attempt - Simplified Structure:**
  - Horizontal bars in first column, extending horizontally
  - Vertical bar in middle row, first column
  - Issue: Horizontal parts of wrap were lost/not rendering correctly
  - Issue: Failed to create continuous wrap around rounded corners
  
- **What Was Added (All Removed December 2025):**
  - Extension settings were added to data model but have been completely removed
  - Function `getHorizontalAccentBarStyle()` was created but has been removed
  - UI controls were never added (feature abandoned before UI implementation)
  - Shadow support added: `accent_bar_shadow` and `card_shadow` (these work correctly)
  
- **Current Status:** ❌ **FEATURE ABANDONED - COMPLETELY REMOVED**
  - Only vertical accent bar exists (left edge)
  - No horizontal extension capability
  - Extension settings completely removed from data model (December 2025)
  - No UI controls (never implemented)
  - `accent_bar_width` control exists and works (affects vertical bar width)
  - `accent_bar_color` control exists and works
  - **Alternative Solution:** Use customizable shadow controls (added December 2025) to create glowing "frame" effects around cards with colored shadows
  
- **Code Location:**
  - Accent bar rendering: `lib/email-templates.ts` (`getAccentBarStyle()`)
  - Used in: `renderStandardCard()` and `renderEventCard()` (vertical bar only)
  - Extension code: All removed (no longer exists in codebase)
  
- **Why It Failed:**
  - Email HTML limitations: Complex table structures don't render consistently across clients
  - Alignment challenges: Horizontal bars need to align with vertical bar while extending horizontally
  - Corner wrapping: Difficult to create continuous curve around rounded corners with table-based layout
  - Visual continuity: Bars appeared disconnected or didn't wrap smoothly around corners
  - Structure complexity: Multiple nested tables caused rendering issues
  
- **Future Implementation Notes:**
  - Would need a fundamentally different approach - possibly using background images or SVG
  - Email client compatibility is a major constraint (tables, inline styles only)
  - May need to accept that continuous wrapping around corners isn't feasible with email-safe HTML
  - Alternative: Could implement as separate decorative elements rather than continuous wrap
  - Consider if feature is essential or if vertical bar alone is sufficient

- **Implementation Prompt (for future attempts):**
  
  **Goal:** Create a U-shaped accent bar that wraps around the perimeter of newsletter cards with rounded corners, forming a continuous frame that follows the border radius.
  
  **Visual Description:**
  - Cards have a vertical accent bar on the left edge (currently working, 4px wide by default)
  - When border radius > 0 and extension is enabled, horizontal bars should extend from the vertical bar along the top and bottom edges
  - The horizontal bars must wrap around the rounded corners continuously, following the border radius curve
  - Result: A U-shaped frame around the card perimeter (vertical left + horizontal top + horizontal bottom)
  - The bars should wrap around the OUTSIDE of the card, not extend into the content area
  - No text/content space should be lost - horizontal bars are decorative elements outside the card
  
  **Technical Requirements:**
  - Must use email-safe HTML (tables, inline styles only - no CSS Grid, Flexbox, or modern CSS)
  - Must work across major email clients (Gmail, Outlook, Apple Mail, Yahoo)
  - Cards are rendered using table-based layout with `border-collapse:separate` when border radius > 0
  - Current card structure: Single-row table with `<td>` for vertical accent bar and `<td>` for content
  - Border radius is applied using `border-radius` CSS with corner-specific styles via `getCornerCellStyle()`
  
  **User Controls Needed:**
  1. Toggle: Enable/disable horizontal extension (boolean: `accent_bar_extension_enabled`)
  2. Top Extension: Horizontal distance for top bar (number: `accent_bar_extension_top`, 0-200px)
  3. Bottom Extension: Horizontal distance for bottom bar (number: `accent_bar_extension_bottom`, 0-200px, independent from top)
  4. Extension only applies when `card_border_radius > 0` (no wrapping without rounded corners)
  
  **Current Implementation Context:**
  - Vertical accent bar works perfectly (left edge, full height)
  - Settings exist: `accent_bar_width`, `accent_bar_color`, `accent_bar_shadow` (all working)
  - Extension settings have been completely removed from data model (December 2025)
  - No UI controls exist (feature abandoned before UI implementation)
  - Function `getHorizontalAccentBarStyle()` has been removed
  
  **Key Challenges from Previous Attempts:**
  1. **Alignment:** Horizontal bars need to align with vertical bar position while extending horizontally
  2. **Corner Continuity:** Bars must wrap around rounded corners smoothly, following the border radius curve
  3. **Table Structure:** Email HTML requires table-based layout - complex nested structures caused rendering issues
  4. **Visual Connection:** Bars appeared disconnected or didn't create continuous wrap around corners
  5. **Column Widths:** Fixed column widths for alignment conflicted with horizontal extension needs
  
  **What Didn't Work:**
  - 2-row structure (top bar + card) - alignment issues
  - 3-row structure (top bar + card + bottom bar) - bars constrained to vertical bar width
  - Outer wrapper tables - horizontal extension lost
  - Nested tables - too complex, rendering failures
  - Fixed column widths - prevented horizontal extension
  
  **Potential Approaches to Consider:**
  - Background images/SVG for the horizontal bars (email-safe if embedded as data URIs)
  - Single table with carefully calculated cell widths and positioning
  - Overlapping table cells to create visual continuity
  - Using `colspan` strategically to span horizontal bars
  - Accepting that perfect continuity may not be achievable - implement as close approximation
  
  **Success Criteria:**
  - Horizontal bars extend horizontally from vertical bar position
  - Bars wrap around rounded corners following border radius
  - Bars appear continuous (no visible gaps or disconnection)
  - Works in live preview and HTML export
  - Compatible with major email clients
  - Content area remains unchanged (no space loss)
  
  **Files to Modify (if attempting implementation):**
  - `lib/email-templates.ts`: `renderStandardCard()`, `renderEventCard()` (would need to add wrapping logic)
  - `types/newsletter.ts`: Would need to add extension settings back to Settings interface
  - `lib/config.ts`: Would need to add default values
  - `lib/defaults.ts`: Would need to add to default newsletter creation
  - `components/editor/SettingsEditor.tsx`: Would need to add UI controls (toggle + top/bottom inputs)

## Known Issues & TODOs

### Current State
- ✅ Org chart integration complete
- ✅ Layout fixed with Flexbox
- ✅ JavaScript errors resolved
- ✅ Download functionality working
- ✅ Divider line controls working (color, spacing)
- ✅ Customizable shadow controls implemented (December 2025)
- ✅ Settings editor reorganized with better clustering (December 2025)
- ✅ Per-card padding controls added (December 2025)
- ✅ Accent bar toggle implemented (December 2025)
- ❌ Card spacing control NOT working (see Critical Issues)
- ❌ Accent bar wrap control ABANDONED (feature deemed impossible with email HTML constraints)

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

- **Accent Bar Wrap Control - ABANDONED AND REMOVED (December 2025):**
  - Feature attempted multiple times but deemed impossible with email HTML constraints
  - **Reason for Abandonment:**
    - Email HTML (tables + inline styles only) cannot create continuous curved elements
    - Horizontal and vertical bars in separate table cells don't connect smoothly
    - Rounded corners require curves that table-based layouts can't produce
    - Email client compatibility issues with complex nested table structures
  - **Alternative Solution Implemented:**
    - Customizable shadow controls (December 2025) can create glowing "frame" effects
    - Users can set shadow color to crimson, increase blur/spread, and create visual "wrapping"
    - Much simpler implementation with better email client compatibility
  - **Cleanup Status:**
    - Extension settings completely removed from data model (December 2025)
    - No UI controls ever existed (feature abandoned before UI implementation)
    - Unused function `getHorizontalAccentBarStyle()` removed
    - All extension-related code has been cleaned up
  - **No Further Action Needed** - Feature officially abandoned and removed

### Future Development Suggestions

#### Resource Card Layout Enhancements
**Problem:** Resource cards with images can feel cramped, especially when images are followed by links without adequate spacing.

**Current Solution:** Use per-card padding controls (added December 2025) to increase bottom padding on individual resource cards.

**Future Enhancement Options:**

1. **Image-Specific Spacing Controls**
   - **Image Bottom Margin** - Dedicated control for space between image and content
   - **Image Container Padding** - Add breathing room around the image itself
   - **Image Border/Shadow** - Visual separation options (rounded corners, subtle shadows)
   - **Implementation:** Add `image_bottom_margin?: number` to card types and UI controls

2. **Image Style Presets**
   - **Circular Treatment** - Round images with optional colored border
   - **Card Style** - Image with background, padding, and shadow
   - **Minimal** - Current behavior (image as-is)
   - **Implementation:** Add `image_style?: 'default' | 'circular' | 'card'` property

3. **Content Block Spacing**
   - Separate controls for spacing between different content sections:
     - Image → Title spacing
     - Title → Body spacing
     - Body → Links spacing
   - More granular than overall padding controls
   - **Implementation:** Add `content_spacing?: { image_to_title?: number, title_to_body?: number, body_to_links?: number }` to card types

4. **Image Size Controls**
   - Currently only `icon_size` exists for resource cards
   - Add width/height controls for main images
   - Add alignment options (left, center, right)
   - **Implementation:** Extend existing `icon_size` or add separate `image_width/image_height` properties

**Recommendation:** Start with #1 (Image Bottom Margin) as a quick win, then consider #2 (Image Style Presets) for visual polish.

#### Email Client Compatibility Testing
- Add automated testing against major email clients (Litmus or Email on Acid integration)
- Document tested/supported email clients
- Add email client compatibility warnings in UI

#### Performance Optimizations
- Debounce preview updates (currently regenerates on every keystroke)
- Add loading indicators for slow operations
- Optimize image handling (lazy loading, compression)

#### Workflow Enhancements
- **Card Templates** - Save frequently used card configurations as templates
- **Bulk Card Operations** - Apply settings to multiple cards at once
- **Card Duplication** - Quick duplicate button for cards
- **Section Templates** - Save entire sections as reusable templates

#### Accessibility Improvements
- Enhanced validation for WCAG compliance
- Automated alt text suggestions (AI-powered)
- Color contrast checker for custom colors
- Screen reader preview mode

#### Version Control & Collaboration
- Save multiple versions of newsletters
- Compare versions side-by-side
- Collaborative editing (multiple users)
- Comment system for feedback

### Potential Improvements
- [ ] Fix card spacing control (see Critical Issues above)
- [ ] Add image bottom margin control for resource cards (see Future Development Suggestions)
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

**Important - Accent Bar Wrap Feature:**
- DO NOT attempt to implement accent bar wrapping/extension around card corners
- This feature has been attempted multiple times and is impossible with email-safe HTML
- All extension-related code has been removed from the codebase (December 2025)
- If users request this, direct them to use customizable shadow controls instead (crimson glow effect)
- The data model no longer contains any `accent_bar_extension_*` properties

