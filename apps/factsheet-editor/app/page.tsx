'use client'

import { useMemo, useRef, useState } from 'react'
import { Download } from 'lucide-react'

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

interface EntryOverride {
  name?: string
  shortname?: string
  program_name?: string
  degree_types?: string[]
  rules_ok?: boolean
}

export default function FactsheetEditorPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
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
  const [overrides, setOverrides] = useState<Record<string, EntryOverride>>({})
  const [filter, setFilter] = useState<'needs' | 'all'>('needs')
  const [rulesJson, setRulesJson] = useState('')
  const [rulesStatus, setRulesStatus] = useState('')
  const [rulesError, setRulesError] = useState('')
  const [rulesSummary, setRulesSummary] = useState({
    degree_type_count: 0,
    classification_count: 0,
    badge_count: 0,
    filter_count: 0,
  })
  const updateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [overrides, setOverrides] = useState<Record<string, EntryOverride>>({})
  const [filter, setFilter] = useState<'needs' | 'all'>('needs')
  const updateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log('handleUpload called')
    setError('')
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const wxrFile = formData.get('wxr_file') as File | null
      const baseAdminUrlInput = formData.get('base_admin_url') as string || ''

      if (!wxrFile) {
        setError('Please choose a WXR export file.')
        setLoading(false)
        return
      }

      const uploadFormData = new FormData()
      uploadFormData.append('wxr_file', wxrFile)
      uploadFormData.append('base_admin_url', baseAdminUrlInput)

      const response = await fetch('/api/factsheet/process', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!response.ok) {
        let errorMessage = 'Upload failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const newSessionId = data.sessionId
      setSessionId(newSessionId)
      setEntries(data.entries)
      setSourceName(data.source_name)
      setBaseAdminUrl(data.base_admin_url || '')
      setOverrides({})
      setRulesJson(data.rules_json || '')
      setRulesStatus(data.rules_status || '')
      setRulesError(data.rules_error || '')
      if (data.rules_summary) {
        setRulesSummary(data.rules_summary)
      }
      
      // Use HTML from response if available (generated in same request)
      if (data.html) {
        setHtmlOutput(data.html)
        setHtmlMeta({
          groups: String(data.html_meta?.groups || 0),
          processed: String(data.html_meta?.processed || 0),
          skipped: String(data.html_meta?.skipped || 0),
          size: data.html_meta?.size || '0',
        })
        console.log('Using HTML from process response')
      } else {
        // Fallback: try to refresh HTML (may fail due to serverless session issues)
        setTimeout(() => {
          refreshHtml(newSessionId)
        }, 100)
      }
    } catch (err: unknown) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed. Please check the console for details.')
    } finally {
      setLoading(false)
    }
  }

  const refreshHtml = async (sessionIdToUse?: string) => {
    const id = sessionIdToUse || sessionId
    if (!id) {
      console.warn('refreshHtml called without sessionId')
      return
    }

    try {
      console.log('Refreshing HTML for session:', id)
      const response = await fetch(
        `/api/factsheet/html?sessionId=${id}`
      )
      
      if (!response.ok) {
        let errorMessage = `Failed to generate HTML: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          const errorText = await response.text()
          errorMessage = `${errorMessage} - ${errorText}`
        }
        console.error('HTML refresh failed:', errorMessage)
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      console.log('HTML refresh successful:', {
        groups: data.groups,
        processed: data.processed,
        skipped: data.skipped,
        size: data.data_size,
      })
      
      setHtmlOutput(data.html)
      setHtmlMeta({
        groups: String(data.groups),
        processed: String(data.processed),
        skipped: String(data.skipped),
        size: data.data_size,
      })
      setError('') // Clear any previous errors
    } catch (err) {
      console.error('HTML refresh error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate HTML'
      setError(errorMsg)
    }
  }

  const degreeTypeOptions = useMemo(() => {
    const options = new Set<string>()
    entries.forEach((entry) => {
      entry.degree_types.forEach((type) => options.add(type))
    })
    return Array.from(options).sort()
  }, [entries])

  const isNeedsEdit = (entry: Entry) => {
    return entry.needs_edit && !overrides[entry.id]?.rules_ok
  }

  const filteredEntries = useMemo(() => {
    if (filter === 'needs') {
      return entries.filter((entry) => isNeedsEdit(entry))
    }
    return entries
  }, [entries, filter, overrides])

  const computedCounts = useMemo(() => {
    return {
      total: entries.length,
      needs_edit: entries.filter((entry) => isNeedsEdit(entry)).length,
    }
  }, [entries, overrides])

  const scheduleUpdate = (
    entryId: string,
    payload: Record<string, string | string[] | boolean>
  ) => {
    if (updateTimers.current[entryId]) {
      clearTimeout(updateTimers.current[entryId])
    }
    updateTimers.current[entryId] = setTimeout(() => {
      handleEntryUpdate(entryId, payload)
    }, 200)
  }

  const handleEntryUpdate = async (
    entryId: string,
    payload: Record<string, string | string[] | boolean>
  ) => {
    if (!sessionId) return
    try {
      const res = await fetch('/api/factsheet/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          id: entryId,
          ...payload,
        }),
      })
      if (!res.ok) {
        throw new Error('Update failed')
      }
      await res.json()
      refreshHtml(sessionId)
    } catch (err) {
      setError('Failed to update entry. Please try again.')
    }
  }

  const updateOverrideField = (
    entryId: string,
    field: keyof EntryOverride,
    value: string | string[]
  ) => {
    setOverrides((prev) => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        [field]: value,
      },
    }))
  }

  const handleRulesSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
    action: 'apply' | 'reload'
  ) => {
    event.preventDefault()
    if (!sessionId) return

    const form = event.currentTarget
    const formData = new FormData(form)
    const rulesFile = formData.get('rules_file') as File | null
    const rulesText = String(formData.get('rules_json') || '')

    let payload: Record<string, string> = {
      sessionId,
      action,
      rules_json: rulesText,
      source: 'rules editor',
    }

    if (rulesFile && rulesFile.size) {
      payload = {
        sessionId,
        action,
        rules_json: await rulesFile.text(),
        source: rulesFile.name || 'rules file',
      }
    }

    try {
      const res = await fetch('/api/factsheet/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        const message = data.error || 'Failed to apply rules'
        setRulesError(message)
        setError(message)
        return
      }
      setEntries(data.entries || [])
      setRulesJson(data.rules_json || '')
      setRulesStatus(data.rules_status || '')
      setRulesError(data.rules_error || '')
      if (data.rules_summary) {
        setRulesSummary(data.rules_summary)
      }
      setError('')
      refreshHtml(sessionId)
    } catch (err) {
      setError('Failed to apply rules. Please try again.')
    }
  }


  const entriesContainerClass =
    filter === 'all'
      ? 'space-y-4'
      : 'space-y-4 max-h-[600px] overflow-y-auto'


  const handleDownloadHtml = () => {
    if (!sessionId) return
    window.open(`/api/factsheet/download/html?sessionId=${sessionId}`, '_blank')
  }

  const handleDownloadJs = () => {
    window.open('/api/factsheet/download/js', '_blank')
  }

  const handleDeleteSession = async () => {
    if (!sessionId) return

    try {
      const res = await fetch('/api/factsheet/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) {
        throw new Error('Delete failed')
      }
      setSessionId(null)
      setEntries([])
      setCounts({ total: 0, needs_edit: 0 })
      setHtmlOutput('')
      setHtmlMeta({ groups: '-', processed: '-', skipped: '-', size: '-' })
      setOverrides({})
      setRulesJson('')
      setRulesStatus('')
      setRulesError('')
      setRulesSummary({
        degree_type_count: 0,
        classification_count: 0,
        badge_count: 0,
        filter_count: 0,
      })
      setError('')
    } catch (err) {
      setError('Failed to delete session. Please try again.')
    }
  }

  // handleUpdateEntry is reserved for future edit functionality
  // const handleUpdateEntry = async (
  //   entryId: string,
  //   field: string,
  //   value: string | string[]
  // ) => {
  //   if (!sessionId) return
  //
  //   const payload: Record<string, unknown> = {
  //     sessionId,
  //     id: entryId,
  //   }
  //   if (field === 'name') payload.name = value
  //   if (field === 'shortname') payload.shortname = value
  //   if (field === 'program_name') payload.program_name = value
  //   if (field === 'degree_types') payload.degree_types = value
  //
  //   try {
  //     await fetch('/api/factsheet/update', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(payload),
  //     })
  //     refreshHtml()
  //   } catch (err) {
  //     console.error('Update error:', err)
  //   }
  // }

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
          <p className="text-sm text-wsu-text-muted mb-4">
            Upload a WordPress WXR export file (.xml) to process and generate HTML blocks.
            The factsheet.js file will be available for download after processing.
          </p>

          <form onSubmit={handleUpload} className="space-y-4" noValidate>
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
              onClick={() => {
                console.log('Load Export button clicked')
                // Form submission will be handled by onSubmit
              }}
              className="bg-wsu-crimson text-white px-6 py-3 rounded font-semibold hover:bg-wsu-crimson-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    Total: {computedCounts.total} | Needs Edit: {computedCounts.needs_edit}
                  </p>
                  <p className="text-wsu-text-muted text-sm">
                    Source: {sourceName || '?'} | Base admin URL: {baseAdminUrl || '?'}
                  </p>
                </div>
                <div className="flex gap-4 flex-wrap">
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
                  <button
                    onClick={handleDeleteSession}
                    className="bg-white text-wsu-crimson px-4 py-2 rounded font-semibold border border-wsu-crimson hover:bg-wsu-crimson hover:text-white transition-colors"
                  >
                    Delete session
                  </button>
                </div>
                <div className="text-sm text-wsu-text-muted mt-2">
                  factsheet.js link:{' '}
                  <a
                    className="text-wsu-crimson underline"
                    href="/api/factsheet/runtime.js"
                    target="_blank"
                    rel="noreferrer"
                  >
                    /api/factsheet/runtime.js
                  </a>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="font-semibold text-wsu-text-dark mb-2">Rules JSON</div>
                <p className="text-sm text-wsu-text-muted">
                  Update rules to control program normalization, degree types, and UI filters.
                </p>
                <div className="text-sm text-wsu-text-muted mt-2">
                  Status: {rulesStatus || '?'}
                </div>
                {rulesError ? (
                  <div className="text-sm text-red-600 mt-2">{rulesError}</div>
                ) : null}
                <div className="text-sm text-wsu-text-muted mt-2">
                  Degree types: {rulesSummary.degree_type_count} | Classifications: {rulesSummary.classification_count} | Badges: {rulesSummary.badge_count} | Filters: {rulesSummary.filter_count}
                </div>
                <form
                  className="mt-3 space-y-3"
                  onSubmit={(event) => handleRulesSubmit(event, 'apply')}
                >
                  <input
                    type="file"
                    name="rules_file"
                    accept=".json"
                    className="block"
                  />
                  <textarea
                    name="rules_json"
                    value={rulesJson}
                    onChange={(event) => setRulesJson(event.target.value)}
                    className="w-full h-56 p-3 border border-gray-300 rounded-lg font-mono text-xs"
                  />
                  <div className="flex gap-3 flex-wrap">
                    <button
                      type="submit"
                      className="bg-wsu-crimson text-white px-4 py-2 rounded font-semibold hover:bg-wsu-crimson-dark transition-colors"
                    >
                      Apply rules
                    </button>
                  </div>
                </form>
              </div>

              <div className="flex gap-3 mb-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFilter('needs')}
                  className={`px-3 py-1 rounded border ${filter === 'needs' ? 'bg-wsu-crimson text-white border-wsu-crimson' : 'bg-white text-wsu-crimson border-wsu-crimson'}`}
                >
                  Needs edits only
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded border ${filter === 'all' ? 'bg-wsu-crimson text-white border-wsu-crimson' : 'bg-white text-wsu-crimson border-wsu-crimson'}`}
                >
                  Show all
                </button>
              </div>

              <div className={entriesContainerClass}>
                {filteredEntries.map((entry) => {
                  const entryOverride = overrides[entry.id] || {}
                  const selectedDegreeTypes =
                    entryOverride.degree_types ?? entry.degree_types
                  const needsEdit = isNeedsEdit(entry)
                  const rulesOk = entryOverride.rules_ok === true

                  return (
                    <div
                      key={entry.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-wsu-text-dark">
                          {entry.title}
                        </h3>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${needsEdit ? 'bg-wsu-crimson text-white' : 'bg-gray-200 text-gray-700'}`}
                          >
                            {needsEdit ? 'Needs edit' : 'OK'}
                          </span>
                          {entry.needs_edit && (
                            <label className="flex items-center gap-2 text-xs text-wsu-text-muted">
                              <input
                                type="checkbox"
                                checked={rulesOk}
                                onChange={(event) => {
                                  const checked = event.target.checked
                                  setOverrides((prev) => {
                                    const next = { ...prev }
                                    const existing = next[entry.id] || {}
                                    if (checked) {
                                      next[entry.id] = { ...existing, rules_ok: true }
                                    } else {
                                      const { rules_ok, ...rest } = existing
                                      next[entry.id] = rest
                                      if (Object.keys(next[entry.id]).length == 0) {
                                        delete next[entry.id]
                                      }
                                    }
                                    return next
                                  })
                                  scheduleUpdate(entry.id, { rules_ok: checked })
                                }}
                              />
                              Mark OK
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-wsu-text-muted font-semibold">Current</p>
                          <p>Shortname: {entry.shortname_raw || '(empty)'}</p>
                          <p>Program: {entry.program_name_raw || '(missing)'}</p>
                          <p>
                            Degree Types:{' '}
                            {entry.degree_types.join(', ') || '(missing)'}
                          </p>
                          {entry.edit_link ? (
                            <p className="mt-2">
                              <a
                                className="text-wsu-crimson underline"
                                href={entry.edit_link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Edit in WordPress
                              </a>
                            </p>
                          ) : (
                            <p className="mt-2 text-xs text-wsu-text-muted">
                              Edit link unavailable (missing base admin URL)
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-wsu-text-muted font-semibold">Suggested</p>
                          <p>Name: {entry.suggested['Post Title'] || 'no change'}</p>
                          <p>Shortname: {entry.suggested.Shortname || 'no change'}</p>
                          <p>Program: {entry.suggested['Program Name'] || 'no change'}</p>
                          <p>
                            Degree Types:{' '}
                            {entry.suggested['Degree Types'] || 'no change'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-wsu-text-muted font-semibold mb-2">Edit overrides</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-wsu-text-dark mb-1">Name</label>
                            <input
                              type="text"
                              value={entryOverride.name ?? ''}
                              placeholder={entry.suggested['Post Title'] || entry.title}
                              onChange={(event) => {
                                const value = event.target.value
                                updateOverrideField(entry.id, 'name', value)
                                scheduleUpdate(entry.id, { name: value })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-wsu-text-dark mb-1">Short name</label>
                            <input
                              type="text"
                              value={entryOverride.shortname ?? ''}
                              placeholder={entry.suggested.Shortname || entry.shortname_raw || ''}
                              onChange={(event) => {
                                const value = event.target.value
                                updateOverrideField(entry.id, 'shortname', value)
                                scheduleUpdate(entry.id, { shortname: value })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-wsu-text-dark mb-1">Program name</label>
                            <input
                              type="text"
                              value={entryOverride.program_name ?? ''}
                              placeholder={entry.suggested['Program Name'] || entry.program_name_raw || ''}
                              onChange={(event) => {
                                const value = event.target.value
                                updateOverrideField(entry.id, 'program_name', value)
                                scheduleUpdate(entry.id, { program_name: value })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-wsu-text-dark mb-1">Degree types</label>
                            {degreeTypeOptions.length ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {degreeTypeOptions.map((type) => (
                                  <label key={type} className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={selectedDegreeTypes.includes(type)}
                                      onChange={(event) => {
                                        const isChecked = event.target.checked
                                        const next = isChecked
                                          ? Array.from(new Set([...selectedDegreeTypes, type]))
                                          : selectedDegreeTypes.filter((entryType) => entryType !== type)
                                        updateOverrideField(entry.id, 'degree_types', next)
                                        scheduleUpdate(entry.id, { degree_types: next })
                                      }}
                                    />
                                    {type}
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={selectedDegreeTypes.join(', ')}
                                placeholder="Comma-separated degree types"
                                onChange={(event) => {
                                  const value = event.target.value
                                  const next = value
                                    .split(',')
                                    .map((item) => item.trim())
                                    .filter(Boolean)
                                  updateOverrideField(entry.id, 'degree_types', next)
                                  scheduleUpdate(entry.id, { degree_types: next })
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-wsu-text-muted mt-2">
                          Leave a field blank to keep the current value.
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* HTML Output Section */}
            <section className="bg-white rounded-lg shadow-md p-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-wsu-crimson">
                  HTML Output
                </h2>
                <button
                  onClick={() => refreshHtml()}
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
