'use client'

import { useState } from 'react'
import { Upload, Download, FileText, Settings } from 'lucide-react'

interface Entry {
  id: string
  title: string
  shortname_raw: string
  program_name_raw: string
  degree_types: string[]
  edit_link: string
  suggested: {
    'Post Title': string | null
    Shortname: string | null
    'Program Name': string | null
    'Degree Types': string | null
  }
  needs_edit: boolean
}

export default function FactsheetEditorPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [counts, setCounts] = useState({ total: 0, needs_edit: 0 })
  const [sourceName, setSourceName] = useState('')
  const [baseAdminUrl, setBaseAdminUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [htmlOutput, setHtmlOutput] = useState('')
  const [htmlMeta, setHtmlMeta] = useState({
    groups: '-',
    processed: '-',
    skipped: '-',
    size: '-',
  })

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const wxrFile = formData.get('wxr_file') as File | null

    if (!wxrFile) {
      setError('Please choose a WXR export file.')
      setLoading(false)
      return
    }

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('wxr_file', wxrFile)
      uploadFormData.append('base_admin_url', baseAdminUrl)

      const response = await fetch('/api/factsheet/process', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      setSessionId(data.sessionId)
      setEntries(data.entries)
      setCounts(data.counts)
      setSourceName(data.source_name)
      setBaseAdminUrl(data.base_admin_url || '')
      refreshHtml()
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const refreshHtml = async () => {
    if (!sessionId) return

    try {
      const response = await fetch(
        `/api/factsheet/html?sessionId=${sessionId}`
      )
      if (!response.ok) throw new Error('Failed to generate HTML')
      const data = await response.json()
      setHtmlOutput(data.html)
      setHtmlMeta({
        groups: String(data.groups),
        processed: String(data.processed),
        skipped: String(data.skipped),
        size: data.data_size,
      })
    } catch (err) {
      console.error('HTML refresh error:', err)
    }
  }

  const handleDownloadHtml = () => {
    if (!sessionId) return
    window.open(`/api/factsheet/download/html?sessionId=${sessionId}`, '_blank')
  }

  const handleDownloadJs = () => {
    window.open('/api/factsheet/download/js', '_blank')
  }

  const handleUpdateEntry = async (
    entryId: string,
    field: string,
    value: string | string[]
  ) => {
    if (!sessionId) return

    const payload: any = {
      sessionId,
      id: entryId,
    }
    if (field === 'name') payload.name = value
    if (field === 'shortname') payload.shortname = value
    if (field === 'program_name') payload.program_name = value
    if (field === 'degree_types') payload.degree_types = value

    try {
      await fetch('/api/factsheet/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      refreshHtml()
    } catch (err) {
      console.error('Update error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-wsu-bg-light">
      <header className="bg-wsu-crimson text-white py-6 px-8 shadow-md">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wide">
            Factsheet Editor
          </h1>
          <p className="text-lg mt-1 opacity-90">
            Process WordPress WXR exports and generate HTML blocks
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload Section */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-wsu-crimson mb-4">
            Load Export
          </h2>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-wsu-text-dark mb-2">
                Base Admin URL (optional)
              </label>
              <input
                type="text"
                name="base_admin_url"
                value={baseAdminUrl}
                onChange={(e) => setBaseAdminUrl(e.target.value)}
                placeholder="https://example.com/wp/"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-wsu-crimson focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-wsu-text-dark mb-2">
                WXR Export File (.xml)
              </label>
              <input
                type="file"
                name="wxr_file"
                accept=".xml"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-wsu-crimson focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-wsu-crimson text-white px-6 py-3 rounded font-semibold hover:bg-wsu-crimson-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Load Export'}
            </button>
          </form>

          {error && (
            <div className="mt-4 text-red-600 font-semibold">{error}</div>
          )}
        </section>

        {/* Results Section */}
        {entries.length > 0 && (
          <>
            <section className="bg-white rounded-lg shadow-md p-8 mb-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-wsu-crimson mb-2">
                    Review & Edit
                  </h2>
                  <p className="text-wsu-text-muted">
                    Total: {counts.total} | Needs Edit: {counts.needs_edit}
                  </p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleDownloadJs}
                    className="bg-wsu-gray-light text-white px-4 py-2 rounded font-semibold hover:bg-wsu-gray transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download factsheet.js
                  </button>
                  <button
                    onClick={handleDownloadHtml}
                    className="bg-wsu-crimson text-white px-4 py-2 rounded font-semibold hover:bg-wsu-crimson-dark transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download HTML
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {entries
                  .filter((e) => e.needs_edit)
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <h3 className="font-semibold text-wsu-text-dark mb-2">
                        {entry.title}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-wsu-text-muted">Current:</p>
                          <p>Shortname: {entry.shortname_raw || '(empty)'}</p>
                          <p>
                            Program: {entry.program_name_raw || '(missing)'}
                          </p>
                          <p>
                            Degree Types:{' '}
                            {entry.degree_types.join(', ') || '(missing)'}
                          </p>
                        </div>
                        <div>
                          <p className="text-wsu-text-muted">Suggested:</p>
                          <p>
                            Shortname:{' '}
                            {entry.suggested.Shortname || 'no change'}
                          </p>
                          <p>
                            Program:{' '}
                            {entry.suggested['Program Name'] || 'no change'}
                          </p>
                          <p>
                            Degree Types:{' '}
                            {entry.suggested['Degree Types'] || 'no change'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </section>

            {/* HTML Output Section */}
            <section className="bg-white rounded-lg shadow-md p-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-wsu-crimson">
                  HTML Output
                </h2>
                <button
                  onClick={refreshHtml}
                  className="bg-wsu-gray-light text-white px-4 py-2 rounded font-semibold hover:bg-wsu-gray transition-colors"
                >
                  Refresh
                </button>
              </div>

              <div className="text-sm text-wsu-text-muted mb-4">
                Groups: {htmlMeta.groups} | Processed: {htmlMeta.processed} |
                Skipped: {htmlMeta.skipped} | Size: {htmlMeta.size}
              </div>

              <textarea
                value={htmlOutput}
                readOnly
                className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm"
                placeholder="HTML will appear here after processing..."
              />
            </section>
          </>
        )}
      </main>
    </div>
  )
}
