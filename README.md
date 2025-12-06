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
  - Customizable card spacing, border radius, and accent bar
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
   git clone <your-repo-url>
   cd wsu-mail-editor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Homepage: http://localhost:3000
   - **HTML Newsletter Editor:**
     - Friday Focus: http://localhost:3000/editor
     - Graduate School Briefing: http://localhost:3000/editor?type=briefing
     - Slate Campaign: http://localhost:3000/editor?type=slate
   - **Org Chart Editor:** http://localhost:3000/orgchart

## Project Structure

```
wsu-mail-editor/
├── app/
│   ├── page.tsx                    # Homepage: "WSU Graduate School Tools"
│   ├── editor/
│   │   ├── page.tsx                # HTML Newsletter Editor page
│   │   └── hooks/                  # React hooks for editor logic
│   │       ├── useNewsletterState.ts  # State management with undo/redo
│   │       └── usePreview.ts          # Preview generation hook
│   ├── orgchart/
│   │   └── page.tsx                # Org Chart Editor page
│   ├── api/                        # Next.js API routes
│   │   ├── preview/route.ts        # Generate HTML preview (newsletter)
│   │   ├── export/route.ts         # Export HTML file (newsletter)
│   │   ├── import/route.ts         # Import from HTML (newsletter)
│   │   ├── generate-plaintext/route.ts  # Generate plain text version (newsletter)
│   │   ├── defaults/[type]/route.ts     # Get default template data (newsletter)
│   │   ├── validate/route.ts       # Validate newsletter for accessibility
│   │   ├── stats/route.ts          # Get content statistics (newsletter)
│   │   └── orgchart/               # Org Chart API routes
│   │       ├── import/route.ts     # Import org chart from HTML
│   │       ├── sample/route.ts     # Get sample HTML templates
│   │       ├── runtime.js/route.ts # Serve Wordpress.js
│   │       ├── runtime.css/route.ts # Serve Wordpress.css
│   │       └── download/           # Download runtime files
│   │           ├── js/route.ts     # Download Wordpress.js
│   │           └── css/route.ts    # Download Wordpress.css
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Tailwind CSS directives
├── components/
│   ├── editor/                     # Newsletter Editor components
│   │   ├── EditorPanel.tsx         # Main editor panel
│   │   ├── PreviewPanel.tsx        # Live preview panel
│   │   ├── MastheadEditor.tsx      # Masthead editor
│   │   ├── SectionsEditor.tsx      # Sections editor
│   │   ├── FooterEditor.tsx        # Footer editor
│   │   ├── SettingsEditor.tsx      # Global settings editor
│   │   └── TiptapEditor.tsx        # Rich text editor component
│   ├── orgchart/                   # Org Chart Editor components
│   │   └── OrgChartEditor.tsx      # Main org chart editor component
│   └── homepage/
│       └── ToolTile.tsx            # Homepage tool tile component
├── lib/
│   ├── config.ts                   # Configuration and defaults
│   ├── defaults.ts                 # Default newsletter data models
│   ├── email-templates.ts          # HTML generation (masthead, sections, cards, footer)
│   ├── styles.ts                   # Email-safe inline styles
│   └── utils.ts                    # Utility functions (escapeHtml, cleanHtml, debounce, clone)
├── types/
│   └── newsletter.ts               # TypeScript type definitions
├── public/                         # Static assets
│   └── orgchart-admin.html         # Org chart admin interface
├── tailwind.config.ts              # Tailwind CSS configuration
├── next.config.js                  # Next.js configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json                    # Dependencies and scripts
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run checkfmt` - Check code formatting

### Development Workflow

1. Make changes to components, API routes, or utilities
2. The development server will automatically reload
3. Check the browser console for any errors
4. Test the editor functionality:
   - Switch between templates
   - Edit content
   - Preview changes
   - Export/Import
   - Validate accessibility
   - Check statistics

## Key Concepts

### Newsletter Templates

- **Friday Focus (FF)**: Student newsletter template
  - Sections: Deadlines, Events, Resources, Submit Request
  - Submit URL: https://gradschool.wsu.edu/request-for-ff-promotion/

- **Graduate School Briefing**: Faculty/Staff newsletter template
  - Sections: Updates, Fiscal, Closures, Submit Request, Assistance
  - Submit URL: https://gradschool.wsu.edu/listserv/
  - Includes Jira and Knowledge Base links

- **Graduate School Slate Campaign**: Campaign template
  - Customizable sections and cards for marketing campaigns

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

### Important URLs

- FF Submit Form: https://gradschool.wsu.edu/request-for-ff-promotion/
- Briefing Submit Form: https://gradschool.wsu.edu/listserv/
- Current/Archived Updates: https://gradschool.wsu.edu/faculty-and-staff-updates/
- Jira Service Desk: https://jira.esg.wsu.edu/servicedesk/customer/portal/121/group/323
- Knowledge Base: https://confluence.esg.wsu.edu/display/GRADSCHOOL

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

2. **Import project in Vercel:**
   - Connect your GitHub repository
   - Vercel will detect Next.js automatically
   - Configure environment variables if needed

3. **Deploy:**
   - Vercel will build and deploy automatically
   - API routes work as serverless functions
   - No additional configuration needed

### Environment Variables

No environment variables are required for basic functionality. All configuration is in `lib/config.ts`.

## Troubleshooting

### Preview Not Updating

- Check the browser console for errors
- Ensure the development server is running
- Try refreshing the preview manually
- Check network requests to `/api/preview`

### Template Switch Not Working

- Check browser console for state updates
- Verify the API route `/api/defaults/[type]` is working
- Check that the state is updating correctly

### Build Errors

- Run `npm run lint` to check for linting errors
- Run `npm run build` to see build errors
- Check TypeScript errors in your IDE
- Ensure all dependencies are installed: `npm install`

### Port Already in Use

- Next.js will automatically suggest another port
- Or specify a port: `PORT=3001 npm run dev`

## Migration from Flask

This project was migrated from Flask to Next.js. Key changes:

- **Backend**: Flask routes → Next.js API routes
- **Frontend**: Jinja2 templates → React components
- **Styling**: Custom CSS → Tailwind CSS
- **Icons**: Emojis → Lucide React
- **Language**: Python → TypeScript
- **State Management**: Vanilla JS → React hooks

All functionality has been preserved and improved with better type safety and modern React patterns.

## License

Internal/WSU use. All rights reserved.

## Version

Current version: **8.0** (Next.js/TypeScript)

## AI Handoff

For detailed information about the project architecture, recent changes, and development guidelines, see **[AI_HANDOFF.md](./AI_HANDOFF.md)**. This document is designed to help AI assistants and new developers quickly understand the codebase and continue development.
