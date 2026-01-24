import OrgChartEditor from '@/components/OrgChartEditor'

export default function OrgChartPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <OrgChartEditor />
      </div>
      <footer className="border-t border-wsu-border-light bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-sm text-wsu-text-muted text-center">
            Graduate School | Washington State University
          </p>
        </div>
      </footer>
    </div>
  )
}

