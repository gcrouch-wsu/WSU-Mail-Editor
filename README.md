# WSU Graduate School Tools

A Next.js-based monorepo for managing WSU Graduate School tools, including newsletter editing, organizational charts, and translation table processing.

## Features

- **Next.js 14** with App Router and TypeScript
- **Tailwind CSS** for styling with official WSU brand colors
- **Lucide React** for icons
- **Monorepo structure** with separate apps for each tool
- **Independent deployment** - each app can be deployed separately

## Requirements

- Node.js 18+ (recommended: 20+)
- npm or yarn

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/gcrouch-wsu/WSU-Mail-Editor.git
   cd WSU-Mail-Editor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development servers:**
   ```bash
   # From root directory - runs platform (homepage) on port 3000
   npm run dev
   
  # Or run individual apps:
  npm run dev:platform      # Homepage (port 3000)
  npm run dev:newsletter    # Newsletter Editor (port 3001)
  npm run dev:orgchart      # Org Chart Editor (port 3002)
  npm run dev:translation   # Translation Tables (port 3003)
  npm run dev:factsheet     # Factsheet Editor (port 3004)
   ```

4. **Open your browser:**
  - **Homepage:** http://localhost:3000
  - **Newsletter Editor:** http://localhost:3001
  - **Org Chart Editor:** http://localhost:3002
  - **Translation Tables:** http://localhost:3003
  - **Factsheet Editor:** http://localhost:3004

## Project Structure

This is a monorepo structure with separate apps for each tool:

```
wsu-gradschool-tools/
├── apps/
│   ├── platform/                   # Homepage/landing page (port 3000)
│   │   ├── app/
│   │   │   ├── page.tsx            # Homepage with tool tiles
│   │   │   ├── layout.tsx          # Root layout
│   │   │   └── globals.css         # Tailwind CSS directives
│   │   └── components/
│   │       └── ToolTile.tsx        # Tool tile component
│   │
│   ├── newsletter-editor/          # Newsletter Editor app (port 3001)
│   │   ├── app/
│   │   │   ├── page.tsx            # Newsletter editor page
│   │   │   ├── hooks/              # React hooks
│   │   │   └── api/                # API routes
│   │   ├── components/             # Newsletter editor components
│   │   ├── lib/                    # Newsletter-specific utilities
│   │   └── types/                   # Newsletter type definitions
│   │
│   ├── org-chart-editor/           # Org Chart Editor app (port 3002)
│   │   ├── app/
│   │   │   ├── page.tsx            # Org chart editor page
│   │   │   └── api/                # API routes
│   │   ├── components/             # Org chart components
│   │   └── public/                 # Static assets
│   │
│   ├── translation-tables/         # Translation Tables app (port 3003)
│   │   ├── app/
│   │   │   ├── page.tsx            # Translation tables page
│   │   │   └── api/                # API routes
│   │   └── components/             # Translation table components
│   │
│   └── factsheet-editor/           # Factsheet Editor app (port 3004)
│       ├── app/
│       │   ├── page.tsx            # Factsheet editor page
│       │   └── api/                # API routes
│       ├── lib/                    # Core processing logic
│       ├── components/             # Factsheet editor components
│       └── public/                 # Static assets (factsheet.js)
│
├── packages/                       # Shared packages (for future use)
│   └── shared/                     # Shared utilities/components
├── package.json                    # Root workspace configuration
└── README.md                       # This file
```

## Available Scripts

Run from the root directory:

**Development:**
- `npm run dev` - Start platform (homepage) on port 3000
- `npm run dev:platform` - Start platform app
- `npm run dev:newsletter` - Start newsletter editor (port 3001)
- `npm run dev:orgchart` - Start org chart editor (port 3002)
- `npm run dev:translation` - Start translation tables (port 3003)
- `npm run dev:factsheet` - Start factsheet editor (port 3004)

**Build:**
- `npm run build` - Build all apps
- `npm run build:platform` - Build platform app
- `npm run build:newsletter` - Build newsletter editor
- `npm run build:orgchart` - Build org chart editor
- `npm run build:translation` - Build translation tables
- `npm run build:factsheet` - Build factsheet editor

**Other:**
- `npm run start` - Start production server (platform)
- `npm run lint` - Run ESLint on all apps
- `npm run format` - Format code with Prettier
- `npm run checkfmt` - Check code formatting

## Deployment

This Next.js app is ready for deployment on Vercel:

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **Import projects in Vercel:**
   - Connect your GitHub repository
   - **For each app, create a separate Vercel project:**
     - **Platform:** Set Root Directory to `apps/platform`
     - **Newsletter Editor:** Set Root Directory to `apps/newsletter-editor`
     - **Org Chart Editor:** Set Root Directory to `apps/org-chart-editor`
     - **Translation Tables:** Set Root Directory to `apps/translation-tables`
     - **Factsheet Editor:** Set Root Directory to `apps/factsheet-editor`
   - Vercel will detect Next.js automatically
   - Configure environment variables if needed

3. **Deploy:**
   - Each app can be deployed independently
   - API routes work as serverless functions
   - Update homepage links to point to deployed URLs

### Environment Variables

No environment variables are required for basic functionality. All configuration is in each app's respective configuration files.

---

## Applications

<details>
<summary><h2>Platform (Homepage)</h2></summary>

The platform app serves as the homepage/landing page for all WSU Graduate School tools.

### Features

- **Tool tile navigation** - Links to all available tools
- **WSU brand styling** - Consistent with official brand colors
- **Responsive design** - Works on all screen sizes

### Local Development

```bash
npm run dev:platform
# or
cd apps/platform
npm run dev
```

Access at: http://localhost:3000

### Deployment

- **Root Directory:** `apps/platform`
- **Port:** 3000 (development)

</details>

<details>
<summary><h2>Newsletter Editor</h2></summary>

Email-safe HTML newsletter editor for Friday Focus, Graduate School Briefing, and Slate Campaign newsletters.

### Features

- **Three Templates:**
  - Friday Focus (FF) - Student newsletter
  - Graduate School Briefing - Faculty/Staff newsletter
  - Graduate School Slate Campaign - Campaign template

- **Rich Content Editing:**
  - Sections and cards with rich text, events, resources, and CTA cards
  - List controls (line height, item spacing, indent/outdent)
  - Customizable card spacing, border radius, accent bar, and shadows

- **Live Preview** with real-time updates

- **Export/Import:**
  - Export HTML with embedded Base64 newsletter data
  - Import from exported HTML files (round-trip editing)
  - Filenames include template name and timestamp (e.g., `Briefing_2025-12-05_14-30.html`)

- **Accessibility validation** and content statistics

- **Auto-save** to localStorage (30-second intervals) with template-aware restore

- **Undo/redo** functionality

- **Generic submit section** key `submit_request` (blank title) for all templates
  - FF CTA links to https://gradschool.wsu.edu/request-for-ff-promotion/
  - Briefing CTA links to https://gradschool.wsu.edu/listserv/ and includes a link to current/archived updates

### ADA Compliance

The HTML Newsletter Editor generates **fully ADA-compliant** email HTML that meets:

- ✅ **WCAG 2.1 Level AA** standards
- ✅ **Section 508** requirements
- ✅ **ADA Title III** compliance

**Accessibility Features:**
- **Semantic HTML**: Proper heading hierarchy (H2 for sections, H3 for cards), language attributes, and valid structure
- **Image Alt Text**: All images require descriptive alt text (validated and enforced)
- **Table Accessibility**: Layout tables marked with `role="presentation"` to prevent screen reader confusion
- **Link Accessibility**: All links require descriptive labels (validated and enforced)
- **Color Contrast**: WSU brand colors meet WCAG AA contrast ratios
- **Screen Reader Compatible**: Decorative elements (shadows, borders) are properly marked and do not interfere with screen readers
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Built-in Validation**: Real-time accessibility checking with error reporting and fix suggestions

The validation system (`/api/validate`) enforces accessibility requirements before export, ensuring compliance with federal and institutional accessibility standards.

### Using Exported HTML in Slate

After exporting your newsletter HTML:

1. **Export Newsletter**: Click "Export HTML" to download your newsletter file (e.g., `Friday_Focus_2025-12-06_14-30.html`)
2. **Open Slate**: Navigate to your Slate message editor
3. **Switch to Code View**: In Slate's message editor, click the "Source" or "Code" button to view HTML
4. **Copy HTML**: Open the exported `.html` file in a text editor, select all content, and copy
5. **Paste into Slate**: Paste the complete HTML into Slate's code editor
6. **Save**: Save your Slate message - the newsletter will render correctly with all styling intact

**Note**: The exported HTML includes inline styles and is optimized for email clients. All Slate variables (unsubscribe links, view in browser) are preserved in the output.

### Key Concepts

**Sections:**
- `deadlines` - Deadlines and Important Information (FF only)
- `events` - Upcoming Events (FF only)
- `resources` - Resources with icons (FF only)
- `updates` - Updates from the Graduate School (Briefing only)
- `fiscal` - Fiscal Processor Updates (Briefing only)
- `closures` - Graduate School Closures (Briefing only)
- `assistance` - Need Assistance? (Briefing only)
- `submit_request` - Generic submit section (blank title) for both templates

**Cards:**
- `standard` - Standard text card with title, body, and links
- `event` - Event card with date, time, and location
- `resource` - Resource card with icon
- `cta` - Call-to-action card with button

**CTA Alignment:**
Text (title/body) alignment is independent from button alignment in CTA cards.

### API Routes

- **POST `/api/preview`** - Generate HTML preview from newsletter data
- **POST `/api/export`** - Export HTML file with embedded data
- **POST `/api/import`** - Import newsletter data from exported HTML
- **POST `/api/generate-plaintext`** - Generate plain text version
- **GET `/api/defaults/[type]`** - Get default template data (types: `ff`, `briefing`, `slate`)
- **POST `/api/validate`** - Validate newsletter for accessibility
- **POST `/api/stats`** - Get content statistics

### Local Development

```bash
npm run dev:newsletter
# or
cd apps/newsletter-editor
npm run dev
```

Access at:
- Friday Focus: http://localhost:3001
- Graduate School Briefing: http://localhost:3001?type=briefing
- Slate Campaign: http://localhost:3001?type=slate

### Deployment

- **Root Directory:** `apps/newsletter-editor`
- **Port:** 3001 (development)

</details>

<details>
<summary><h2>Org Chart Editor</h2></summary>

Visual organizational chart editor for WordPress integration.

### Features

- **Visual node editing** with drag-and-drop interface
- **Multiple layout types:**
  - Centered layout
  - Vertical layout
  - Horizontal layout
- **Import from HTML** to continue editing existing charts
- **Export WordPress-compatible HTML** with runtime JavaScript/CSS
- **Download runtime files** (Wordpress.js and Wordpress.css) for WordPress integration
- **Live preview** of the organizational chart

### API Routes

- **POST `/api/orgchart/import`** - Import org chart from HTML
- **GET `/api/orgchart/sample`** - Get sample HTML templates
- **GET `/api/orgchart/runtime.js`** - Serve Wordpress.js runtime file
- **GET `/api/orgchart/runtime.css`** - Serve Wordpress.css runtime file
- **GET `/api/orgchart/download/js`** - Download Wordpress.js
- **GET `/api/orgchart/download/css`** - Download Wordpress.css

### Local Development

```bash
npm run dev:orgchart
# or
cd apps/org-chart-editor
npm run dev
```

Access at: http://localhost:3002

### Deployment

- **Root Directory:** `apps/org-chart-editor`
- **Port:** 3002 (development)

</details>

<details>
<summary><h2>Translation Tables</h2></summary>

Export and process Outcomes Translation Table data to Excel or text format.

### Features

- **Text parsing** - Paste Outcomes Translation Table data and automatically extract Input/Output pairs
- **Editable table** - Edit cells and select/deselect rows before export
- **Preview selection** - Review your final data before downloading
- **Multiple export formats:**
  - Excel (.xlsx) - Standard spreadsheet format
  - Text (.txt) - Tab-delimited text file
- **WSU brand styling** - Consistent with official brand colors

### Workflow

1. Navigate to the **Outcomes Translation Table** (Settings > Import/Export)
2. Select the table content and copy it (Ctrl + C)
3. Paste the content into the app
4. Edit cells and uncheck rows to exclude as needed
5. Click **Preview Selection** to review your final list
6. Download as Excel or Text

### API Routes

- **POST `/api/process`** - Parse pasted text content and extract Input/Output pairs
- **POST `/api/download`** - Download processed data as Excel or Text file

### Local Development

```bash
npm run dev:translation
# or
cd apps/translation-tables
npm run dev
```

Access at: http://localhost:3003

### Deployment

- **Root Directory:** `apps/translation-tables`
- **Port:** 3003 (development)
- **Deployed URL:** https://outcomes-translation-tables.vercel.app/

</details>

<details>
<summary><h2>Factsheet Editor</h2></summary>

Process WordPress WXR exports and generate HTML blocks for graduate program listings.

### Features

- **WXR XML parsing** - Upload WordPress export files and extract factsheet data
- **Rules engine** - Configurable rules for program name normalization, degree type classifications, and UI customization
- **Edit recommendations** - Automatic suggestions for improving factsheet metadata
- **HTML generation** - Generate WordPress-ready HTML blocks with embedded data
- **factsheet.js integration** - Download and serve the runtime JavaScript file
- **Review interface** - View and edit factsheet entries before generating output
- **Rules editor** - Upload or paste rules JSON to control normalization and filters
- **Overrides + OK flag** - Apply per-entry overrides or mark a recommendation as OK
- **Session storage** - Sessions stored in Vercel Blob for serverless compatibility

### Workflow

1. Upload a WordPress WXR export file (.xml)
2. Review edit recommendations for factsheet entries
3. Optionally update rules JSON to refine recommendations
4. Optionally edit entries to override suggestions or mark items OK
4. Generate and download HTML block
5. Download factsheet.js for WordPress integration
6. Paste HTML into WordPress Custom HTML block
7. Load factsheet.js via Code Snippets (footer)

### API Routes

- **POST `/api/factsheet/process`** - Upload and process WXR export file
- **GET `/api/factsheet/html`** - Generate HTML block from current data
- **GET `/api/factsheet/download/html`** - Download HTML file
- **GET `/api/factsheet/download/js`** - Download factsheet.js
- **GET `/api/factsheet/runtime.js`** - Serve factsheet.js
- **POST `/api/factsheet/update`** - Update entry overrides
- **POST `/api/factsheet/delete`** - Delete a session by ID
- **POST `/api/factsheet/rules`** - Apply rules JSON to the current session

### Environment Variables

- `BLOB_READ_WRITE_TOKEN` - Required for Vercel Blob session storage.

### Local Development

```bash
npm run dev:factsheet
# or
cd apps/factsheet-editor
npm run dev
```

Access at: http://localhost:3004

### Deployment

- **Root Directory:** `apps/factsheet-editor`
- **Port:** 3004 (development)

</details>

---

## Configuration

### WSU Brand Colors

The application uses official WSU brand colors from [brand.wsu.edu](https://brand.wsu.edu/colors/):

- **Primary Crimson**: `#A60F2D`
- **Dark Crimson**: `#8c0d25`
- **Gray**: `#4D4D4D`
- **Text Colors**: Dark, Body, Muted
- **Backgrounds**: Light, Card, White
- **Borders**: Light, Medium

Colors are configured in each app's `tailwind.config.ts` and used throughout the application.

## License

Internal/WSU use. All rights reserved.

## Version

Current version: **8.0** (Next.js/TypeScript)
