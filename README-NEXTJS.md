# WSU Newsletter Editor - Next.js Version

A Next.js-based web editor for composing email-safe HTML newsletters (Friday Focus and Graduate School Briefing). Built with TypeScript, Tailwind CSS, and Lucide React icons.

## Features

- Friday Focus (FF) and Graduate School Briefing templates
- Sections and cards with rich text, events, resources, and CTA cards
- Live preview
- Export HTML with embedded Base64 newsletter data
- Import from exported HTML
- Accessibility validation
- Content statistics
- Auto-save to localStorage
- Undo/redo functionality
- WSU brand colors throughout

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open http://localhost:3000

## Project Structure

```
wsu-mail-editor/
├── app/
│   ├── page.tsx              # Homepage: "WSU Graduate School Tools"
│   ├── editor/
│   │   ├── page.tsx          # Editor page
│   │   └── hooks/            # Custom hooks
│   ├── api/                  # API routes
│   └── layout.tsx            # Root layout
├── components/
│   ├── editor/               # Editor components
│   └── homepage/             # Homepage components
├── lib/
│   ├── config.ts             # Configuration
│   ├── defaults.ts           # Default models
│   ├── email-templates.ts    # HTML generation
│   ├── styles.ts             # Email styles
│   └── utils.ts              # Utility functions
└── types/
    └── newsletter.ts         # TypeScript types
```

## Development

- Format code: `npm run format`
- Check formatting: `npm run checkfmt`
- Lint: `npm run lint`
- Build: `npm run build`
- Start production: `npm start`

## Deployment

This Next.js app is ready for deployment on Vercel:

1. Push to GitHub
2. Import project in Vercel
3. Deploy

The API routes are automatically handled by Next.js and work on Vercel's serverless functions.

## Key Features

### Editor
- Template switching (FF/Briefing)
- Section and card management
- Live preview
- Export/Import
- Validation and stats
- Auto-save (localStorage)
- Undo/Redo

### API Routes
- `/api/preview` - Generate HTML preview
- `/api/export` - Export HTML file
- `/api/import` - Import from HTML
- `/api/generate-plaintext` - Generate plain text
- `/api/defaults/[type]` - Get default template
- `/api/validate` - Validate newsletter
- `/api/stats` - Get content statistics

## WSU Brand Colors

The application uses official WSU brand colors from brand.wsu.edu:
- Primary Crimson: #A60F2D
- Dark Crimson: #8c0d25
- Gray: #4D4D4D
- Text colors and backgrounds configured in Tailwind

## License

Internal/WSU use.

