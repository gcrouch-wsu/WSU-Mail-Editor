// app/page.tsx - Homepage: WSU Graduate School Tools

import ToolTile from '@/components/ToolTile'
import { FileText, Network, Table2 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-wsu-bg-light flex flex-col">
      {/* Header */}
      <header className="bg-white border-b-2 border-wsu-border-light">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-wsu-crimson mb-2">
            WSU Graduate School Tools
          </h1>
          <p className="text-lg text-wsu-text-muted">
            Tools and resources for WSU Graduate School
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolTile
            title="HTML Editor"
            description="Create and edit email newsletters for Friday Focus and Graduate School Briefing"
            href="https://wsu-mail-editor-newsletter-editor.vercel.app/"
            icon={FileText}
          />
          <ToolTile
            title="Org Chart Editor"
            description="Create and edit organizational charts with multiple layout options"
            href="https://wsu-mail-editor-org-chart-editor.vercel.app/"
            icon={Network}
          />
          <ToolTile
            title="Translation Tables"
            description="Export and process Outcomes Translation Table data to Excel or text format"
            href="https://outcomes-translation-tables.vercel.app/"
            icon={Table2}
          />
          {/* Add more tool tiles here as needed */}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-wsu-border-light bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-sm text-wsu-text-muted text-center">
            © 2025 Greg & Sherry. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

