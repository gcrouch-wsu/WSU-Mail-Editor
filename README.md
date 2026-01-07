# WSU Graduate School Tools

A Next.js-based web application for managing WSU Graduate School tools, including:

1. **HTML Newsletter Editor** - Email-safe HTML newsletter editor for Friday Focus, Graduate School Briefing, and Slate Campaign newsletters
2. **Org Chart Editor** - Visual organizational chart editor for WordPress integration

## Features

- **Next.js 14** with App Router and TypeScript
- **Tailwind CSS** for styling with official WSU brand colors
- **Lucide React** for icons
- **Homepage** with tool tile navigation

### HTML Newsletter Editor (`/editor`)

Create email-safe HTML newsletters for WSU Graduate School communications:

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

#### ADA Compliance

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

#### Using Exported HTML in Slate

After exporting your newsletter HTML:

1. **Export Newsletter**: Click "Export HTML" to download your newsletter file (e.g., `Friday_Focus_2025-12-06_14-30.html`)
2. **Open Slate**: Navigate to your Slate message editor
3. **Switch to Code View**: In Slate's message editor, click the "Source" or "Code" button to view HTML
4. **Copy HTML**: Open the exported `.html` file in a text editor, select all content, and copy
5. **Paste into Slate**: Paste the complete HTML into Slate's code editor
6. **Save**: Save your Slate message - the newsletter will render correctly with all styling intact

**Note**: The exported HTML includes inline styles and is optimized for email clients. All Slate variables (unsubscribe links, view in browser) are preserved in the output.

### Org Chart Editor (`/orgchart`)

Create organizational charts for WordPress integration:

- **Visual node editing** with drag-and-drop interface
- **Multiple layout types:**
  - Centered layout
  - Vertical layout
  - Horizontal layout
- **Import from HTML** to continue editing existing charts
- **Export WordPress-compatible HTML** with runtime JavaScript/CSS
- **Download runtime files** (Wordpress.js and Wordpress.css) for WordPress integration
- **Live preview** of the organizational chart

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
   
   # Or from individual app directories:
   cd apps/platform
   npm run dev
   ```

4. **Open your browser:**
   - **Homepage:** http://localhost:3000 (links to both tools)
   - **Newsletter Editor:** http://localhost:3001
     - Friday Focus: http://localhost:3001
     - Graduate School Briefing: http://localhost:3001?type=briefing
     - Slate Campaign: http://localhost:3001?type=slate
   - **Org Chart Editor:** http://localhost:3002

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
│   │   │   │   ├── useNewsletterState.ts  # State management
│   │   │   │   └── usePreview.ts          # Preview generation
│   │   │   └── api/                # API routes
│   │   │       ├── preview/route.ts
│   │   │       ├── export/route.ts
│   │   │       ├── import/route.ts
│   │   │       ├── generate-plaintext/route.ts
│   │   │       ├── defaults/[type]/route.ts
│   │   │       ├── validate/route.ts
│   │   │       └── stats/route.ts
│   │   ├── components/             # Newsletter editor components
│   │   ├── lib/                    # Newsletter-specific utilities
│   │   └── types/                  # Newsletter type definitions
│   │
│   └── org-chart-editor/           # Org Chart Editor app (port 3002)
│       ├── app/
│       │   ├── page.tsx            # Org chart editor page
│       │   └── api/                # API routes
│       │       └── orgchart/
│       │           ├── import/route.ts
│       │           ├── sample/route.ts
│       │           ├── runtime.js/route.ts
│       │           ├── runtime.css/route.ts
│       │           └── download/
│       │               ├── js/route.ts
│       │               └── css/route.ts
│       ├── components/             # Org chart components
│       └── public/                 # Static assets
│
├── packages/                       # Shared packages (for future use)
│   └── shared/                     # Shared utilities/components
├── package.json                    # Root workspace configuration
├── vercel.json                     # Vercel deployment configuration
└── README.md                       # This file
```

## Development

### Available Scripts

Run from the root directory:

**Development:**
- `npm run dev` - Start platform (homepage) on port 3000
- `npm run dev:platform` - Start platform app
- `npm run dev:newsletter` - Start newsletter editor (port 3001)
- `npm run dev:orgchart` - Start org chart editor (port 3002)

**Build:**
- `npm run build` - Build all apps
- `npm run build:platform` - Build platform app
- `npm run build:newsletter` - Build newsletter editor
- `npm run build:orgchart` - Build org chart editor

**Other:**
- `npm run start` - Start production server (platform)
- `npm run lint` - Run ESLint on all apps
- `npm run format` - Format code with Prettier
- `npm run checkfmt` - Check code formatting

Or run commands directly from individual app directories.

### Development Workflow

1. Make changes to components, API routes, or utilities
2. The development server will automatically reload
3. Check the browser console for any errors
4. Test the editor functionality:
   - **Newsletter Editor:**
     - Switch between templates (FF, Briefing, Slate)
     - Edit content, sections, and cards
     - Preview changes
     - Export/Import
     - Validate accessibility
     - Check statistics
   - **Org Chart Editor:**
     - Create and edit organizational charts
     - Switch between layout types
     - Import from HTML
     - Export WordPress-compatible HTML
     - Download runtime files

## Key Concepts

### Sections

- `deadlines` - Deadlines and Important Information (FF only)
- `events` - Upcoming Events (FF only)
- `resources` - Resources with icons (FF only)
- `updates` - Updates from the Graduate School (Briefing only)
- `fiscal` - Fiscal Processor Updates (Briefing only)
- `closures` - Graduate School Closures (Briefing only)
- `assistance` - Need Assistance? (Briefing only)
- `submit_request` - Generic submit section (blank title) for both templates

### Cards

- `standard` - Standard text card with title, body, and links
- `event` - Event card with date, time, and location
- `resource` - Resource card with icon
- `cta` - Call-to-action card with button

### CTA Alignment

Text (title/body) alignment is independent from button alignment in CTA cards.

## API Routes

All API routes are located in `app/api/` and use Next.js API routes:

### Newsletter Editor Routes

- **POST `/api/preview`** - Generate HTML preview from newsletter data
  - Request: `{ NewsletterData }`
  - Response: `{ html: string, success: boolean }`

- **POST `/api/export`** - Export HTML file with embedded data
  - Request: `{ NewsletterData, export_options?: { minify?: boolean, strip_json?: boolean } }`
  - Response: HTML file download
  - Filename format: `{TemplateName}_YYYY-MM-DD_HH-MM.html` (e.g., `Briefing_2025-12-05_14-30.html`)

- **POST `/api/import`** - Import newsletter data from exported HTML
  - Request: `{ html: string }`
  - Response: `{ success: boolean, data?: NewsletterData, error?: string }`

- **POST `/api/generate-plaintext`** - Generate plain text version
  - Request: `{ NewsletterData }`
  - Response: `{ text: string, success: boolean }`

- **GET `/api/defaults/[type]`** - Get default template data
  - Types: `ff`, `briefing`, or `slate`
  - Response: `NewsletterData`

- **POST `/api/validate`** - Validate newsletter for accessibility
  - Request: `{ NewsletterData }`
  - Response: `{ success: boolean, issues: ValidationIssue[], total: number, errors: number, warnings: number }`

- **POST `/api/stats`** - Get content statistics
  - Request: `{ NewsletterData }`
  - Response: `{ success: boolean, stats: { word_count, read_time_minutes, image_count, link_count, card_count, section_count, social_links } }`

### Org Chart Editor Routes

- **POST `/api/orgchart/import`** - Import org chart from HTML
  - Request: `{ html: string }`
  - Response: `{ success: boolean, data?: OrgChartData, error?: string }`

- **GET `/api/orgchart/sample`** - Get sample HTML templates
  - Response: `{ html: string }`

- **GET `/api/orgchart/runtime.js`** - Serve Wordpress.js runtime file
  - Response: JavaScript file

- **GET `/api/orgchart/runtime.css`** - Serve Wordpress.css runtime file
  - Response: CSS file

- **GET `/api/orgchart/download/js`** - Download Wordpress.js
  - Response: JavaScript file download

- **GET `/api/orgchart/download/css`** - Download Wordpress.css
  - Response: CSS file download

## Configuration

### WSU Brand Colors

The application uses official WSU brand colors from [brand.wsu.edu](https://brand.wsu.edu/colors/):

- **Primary Crimson**: `#A60F2D`
- **Dark Crimson**: `#8c0d25`
- **Gray**: `#4D4D4D`
- **Text Colors**: Dark, Body, Muted
- **Backgrounds**: Light, Card, White
- **Borders**: Light, Medium

Colors are configured in `tailwind.config.ts` and used throughout the application.

### Default Values

Edit `lib/config.ts` to change defaults:
- CTA button styles
- Layout settings
- Footer configuration
- Resource links
- Social media links
- Organization information

## Import/Export

### Export

The export feature generates an HTML file with:
- Complete email HTML with inline styles
- Embedded Base64-encoded newsletter data (for re-import)
- Optional minification
- Optional JSON stripping (for production)

### Import

The import feature:
- Reads exported HTML files
- Extracts embedded Base64-encoded data
- Supports both Base64 and legacy JSON formats
- Automatically migrates old formats to current version
- Validates imported data

## Auto-Save

The editor automatically saves drafts to localStorage:
- Saves every 30 seconds when there are unsaved changes
- Prompts to restore on page load (if backup is less than 24 hours old)
- Prevents data loss during editing

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
   - Vercel will detect Next.js automatically
   - Configure environment variables if needed

3. **Deploy:**
   - Each app can be deployed independently
   - API routes work as serverless functions
   - Update homepage links to point to deployed URLs

### Environment Variables

No environment variables are required for basic functionality. All configuration is in `lib/config.ts`.

## License

Internal/WSU use. All rights reserved.

## Version

Current version: **8.0** (Next.js/TypeScript)
