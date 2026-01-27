'use client'

import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

interface TableData {
  name: string
  headers: string[]
  rows: Record<string, string>[]
}

type MatchType = 'key' | 'name' | 'manual' | 'unmatched'

interface MatchRow {
  outcomesIndex: number
  outcomesKey: string
  outcomesName: string
  myWsuIndex?: number
  myWsuKey?: string
  myWsuName?: string
  matchType: MatchType
  confidence?: number
}

const normalizeValue = (value: string) => value.trim().toLowerCase()

const detectDelimiter = (line: string) => {
  const tabs = (line.match(/\t/g) || []).length
  const commas = (line.match(/,/g) || []).length
  return tabs >= commas ? '\t' : ','
}

const parseDelimitedLine = (line: string, delimiter: string) => {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i++
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

const parseDelimitedText = (text: string, name: string): TableData | null => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return null
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = parseDelimitedLine(lines[0], delimiter)
  if (headers.length === 0) {
    return null
  }

  const rows = lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    return row
  })

  return { name, headers, rows }
}

const parseXlsxFile = async (file: File): Promise<TableData | null> => {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    return null
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][]
  if (rows.length === 0) {
    return null
  }

  const headers = rows[0].map((header) => String(header).trim())
  if (headers.length === 0) {
    return null
  }

  const dataRows = rows.slice(1).map((row) => {
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = String(row[index] ?? '').trim()
    })
    return record
  })

  return { name: file.name, headers, rows: dataRows }
}

const buildBigrams = (value: string) => {
  const normalized = normalizeValue(value).replace(/[^a-z0-9]+/g, ' ')
  const text = ` ${normalized} `
  const bigrams: string[] = []
  for (let i = 0; i < text.length - 1; i++) {
    bigrams.push(text.slice(i, i + 2))
  }
  return bigrams
}

const diceSimilarity = (a: string, b: string) => {
  if (!a || !b) return 0
  const bigramsA = buildBigrams(a)
  const bigramsB = buildBigrams(b)
  const map = new Map<string, number>()
  bigramsA.forEach((gram) => map.set(gram, (map.get(gram) || 0) + 1))
  let matches = 0
  bigramsB.forEach((gram) => {
    const count = map.get(gram) || 0
    if (count > 0) {
      matches += 1
      map.set(gram, count - 1)
    }
  })
  return (2 * matches) / (bigramsA.length + bigramsB.length)
}

const getRowValue = (row: Record<string, string>, column: string) =>
  row[column] ?? ''

export default function TranslationTablesPage() {
  const [errorMessage, setErrorMessage] = useState('')
  const [outcomesText, setOutcomesText] = useState('')
  const [myWsuText, setMyWsuText] = useState('')
  const [outcomesTable, setOutcomesTable] = useState<TableData | null>(null)
  const [myWsuTable, setMyWsuTable] = useState<TableData | null>(null)
  const [outcomesKeyColumn, setOutcomesKeyColumn] = useState('')
  const [myWsuKeyColumn, setMyWsuKeyColumn] = useState('')
  const [useNameMatch, setUseNameMatch] = useState(false)
  const [outcomesNameColumn, setOutcomesNameColumn] = useState('')
  const [myWsuNameColumn, setMyWsuNameColumn] = useState('')
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [activeOutcome, setActiveOutcome] = useState<number | null>(null)
  const [includeUnmatched, setIncludeUnmatched] = useState(true)

  const canMatch =
    outcomesTable &&
    myWsuTable &&
    outcomesKeyColumn &&
    myWsuKeyColumn &&
    (!useNameMatch || (outcomesNameColumn && myWsuNameColumn))

  const handleLoadFromText = (text: string, name: string, side: 'outcomes' | 'mywsu') => {
    const parsed = parseDelimitedText(text, name)
    if (!parsed) {
      setErrorMessage('Unable to parse the pasted data. Check headers and formatting.')
      return
    }

    setErrorMessage('')
    if (side === 'outcomes') {
      setOutcomesTable(parsed)
      setOutcomesKeyColumn('')
      setOutcomesNameColumn('')
    } else {
      setMyWsuTable(parsed)
      setMyWsuKeyColumn('')
      setMyWsuNameColumn('')
    }
  }

  const handleFileLoad = async (file: File, side: 'outcomes' | 'mywsu') => {
    try {
      let parsed: TableData | null = null
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        parsed = await parseXlsxFile(file)
      } else {
        const text = await file.text()
        parsed = parseDelimitedText(text, file.name)
      }

      if (!parsed) {
        setErrorMessage('Unable to parse the uploaded file. Check headers and formatting.')
        return
      }

      setErrorMessage('')
      if (side === 'outcomes') {
        setOutcomesTable(parsed)
        setOutcomesKeyColumn('')
        setOutcomesNameColumn('')
      } else {
        setMyWsuTable(parsed)
        setMyWsuKeyColumn('')
        setMyWsuNameColumn('')
      }
    } catch (error) {
      console.error(error)
      setErrorMessage('Failed to read the uploaded file.')
    }
  }

  const generateMatches = () => {
    if (!outcomesTable || !myWsuTable) {
      return
    }

    const myWsuKeyMap = new Map<string, number>()
    myWsuTable.rows.forEach((row, index) => {
      const key = normalizeValue(getRowValue(row, myWsuKeyColumn))
      if (key && !myWsuKeyMap.has(key)) {
        myWsuKeyMap.set(key, index)
      }
    })

    const nameCandidates = useNameMatch
      ? myWsuTable.rows.map((row, index) => ({
          index,
          name: getRowValue(row, myWsuNameColumn),
        }))
      : []

    const nextMatches: MatchRow[] = outcomesTable.rows.map((row, index) => {
      const outcomesKey = getRowValue(row, outcomesKeyColumn)
      const outcomesName = outcomesNameColumn ? getRowValue(row, outcomesNameColumn) : ''
      const normalizedKey = normalizeValue(outcomesKey)

      const directIndex = normalizedKey ? myWsuKeyMap.get(normalizedKey) : undefined
      if (directIndex !== undefined) {
        const myWsuRow = myWsuTable.rows[directIndex]
        return {
          outcomesIndex: index,
          outcomesKey,
          outcomesName,
          myWsuIndex: directIndex,
          myWsuKey: getRowValue(myWsuRow, myWsuKeyColumn),
          myWsuName: myWsuNameColumn ? getRowValue(myWsuRow, myWsuNameColumn) : '',
          matchType: 'key',
          confidence: 1,
        }
      }

      if (useNameMatch && outcomesName) {
        let bestScore = 0
        let bestIndex: number | undefined
        nameCandidates.forEach((candidate) => {
          const score = diceSimilarity(outcomesName, candidate.name)
          if (score > bestScore) {
            bestScore = score
            bestIndex = candidate.index
          }
        })

        if (bestIndex !== undefined && bestScore >= 0.85) {
          const myWsuRow = myWsuTable.rows[bestIndex]
          return {
            outcomesIndex: index,
            outcomesKey,
            outcomesName,
            myWsuIndex: bestIndex,
            myWsuKey: getRowValue(myWsuRow, myWsuKeyColumn),
            myWsuName: myWsuNameColumn ? getRowValue(myWsuRow, myWsuNameColumn) : '',
            matchType: 'name',
            confidence: Number(bestScore.toFixed(3)),
          }
        }
      }

      return {
        outcomesIndex: index,
        outcomesKey,
        outcomesName,
        matchType: 'unmatched',
      }
    })

    setMatches(nextMatches)
    setActiveOutcome(null)
  }

  const assignManualMatch = (outcomesIndex: number, myWsuIndex: number) => {
    if (!outcomesTable || !myWsuTable) return

    const myWsuRow = myWsuTable.rows[myWsuIndex]
    setMatches((prev) =>
      prev.map((row) => {
        if (row.outcomesIndex !== outcomesIndex) return row
        return {
          ...row,
          myWsuIndex,
          myWsuKey: getRowValue(myWsuRow, myWsuKeyColumn),
          myWsuName: myWsuNameColumn ? getRowValue(myWsuRow, myWsuNameColumn) : '',
          matchType: 'manual',
          confidence: undefined,
        }
      })
    )
  }

  const clearMatch = (outcomesIndex: number) => {
    setMatches((prev) =>
      prev.map((row) =>
        row.outcomesIndex === outcomesIndex
          ? {
              ...row,
              myWsuIndex: undefined,
              myWsuKey: undefined,
              myWsuName: undefined,
              matchType: 'unmatched',
              confidence: undefined,
            }
          : row
      )
    )
  }

  const exportRows = useMemo(() => {
    return matches
      .filter((row) => includeUnmatched || row.myWsuKey)
      .map((row) => ({
        OutcomesKey: row.outcomesKey,
        OutcomesName: row.outcomesName,
        MyWSUKey: row.myWsuKey ?? '',
        MyWSUName: row.myWsuName ?? '',
        MatchType: row.matchType,
        Confidence: row.confidence ?? '',
      }))
  }, [includeUnmatched, matches])

  const handleDownload = async (format: 'xlsx' | 'txt') => {
    if (exportRows.length === 0) {
      alert('No data to download.')
      return
    }

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: exportRows,
          format: format,
          filename: 'translation-matches',
        }),
      })

      if (!response.ok) {
        throw new Error('Download failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      const ext = format === 'xlsx' ? 'xlsx' : 'txt'
      a.download = `translation_matches.${ext}`

      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Download failed'
      alert(message)
    }
  }

  return (
    <div className="min-h-screen bg-wsu-bg-light flex flex-col">
      <header className="bg-wsu-crimson text-white py-6 px-8 shadow-md">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wide">
            Washington State University
          </h1>
          <h2 className="text-xl mt-1 opacity-90">
            Outcomes Translation Table Matcher
          </h2>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 w-full">
        <section className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h3 className="text-2xl font-semibold text-wsu-crimson mb-4">
            Load Outcomes and myWSU Data
          </h3>

          <div className="mb-6 p-4 bg-gray-50 border-l-4 border-wsu-crimson rounded">
            <ol className="list-decimal list-inside space-y-2 text-wsu-text-body">
              <li>Upload or paste the Outcomes translation table (with headers).</li>
              <li>Upload or paste the myWSU export (with headers).</li>
              <li>
                Choose the Outcomes key column and the myWSU key column that should
                match.
              </li>
              <li>
                Optional: enable name matching and choose name columns on both sides.
              </li>
              <li>
                Click an Outcomes row, then click the matching myWSU row to adjust
                any matches.
              </li>
              <li>Download the matched list as Excel or Text.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-wsu-crimson mb-3">
                Outcomes Translation Table
              </h4>
              <input
                type="file"
                accept=".csv,.xlsx,.txt"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    handleFileLoad(file, 'outcomes')
                  }
                }}
                className="mb-3"
              />
              <textarea
                value={outcomesText}
                onChange={(event) => setOutcomesText(event.target.value)}
                placeholder="Paste Outcomes translation table (CSV or TSV)..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono resize-y focus:border-wsu-crimson focus:outline-none"
              />
              <button
                onClick={() =>
                  handleLoadFromText(outcomesText, 'outcomes_paste', 'outcomes')
                }
                className="w-full mt-3 bg-wsu-crimson text-white px-4 py-2 rounded font-semibold hover:bg-wsu-crimson-dark transition-colors"
              >
                Load Outcomes Data
              </button>
              {outcomesTable && (
                <p className="text-sm text-wsu-text-muted mt-2">
                  Loaded {outcomesTable.rows.length} rows from {outcomesTable.name}
                </p>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-wsu-crimson mb-3">
                myWSU Export
              </h4>
              <input
                type="file"
                accept=".csv,.xlsx,.txt"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    handleFileLoad(file, 'mywsu')
                  }
                }}
                className="mb-3"
              />
              <textarea
                value={myWsuText}
                onChange={(event) => setMyWsuText(event.target.value)}
                placeholder="Paste myWSU export (CSV or TSV)..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono resize-y focus:border-wsu-crimson focus:outline-none"
              />
              <button
                onClick={() => handleLoadFromText(myWsuText, 'mywsu_paste', 'mywsu')}
                className="w-full mt-3 bg-wsu-crimson text-white px-4 py-2 rounded font-semibold hover:bg-wsu-crimson-dark transition-colors"
              >
                Load myWSU Data
              </button>
              {myWsuTable && (
                <p className="text-sm text-wsu-text-muted mt-2">
                  Loaded {myWsuTable.rows.length} rows from {myWsuTable.name}
                </p>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="text-red-600 font-semibold mt-4">{errorMessage}</div>
          )}
        </section>

        {outcomesTable && myWsuTable && (
          <section className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h3 className="text-2xl font-semibold text-wsu-crimson mb-4">
              Choose Matching Columns
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block font-semibold text-wsu-text-body mb-2">
                  Outcomes Key Column (Translation Table)
                </label>
                <select
                  value={outcomesKeyColumn}
                  onChange={(event) => setOutcomesKeyColumn(event.target.value)}
                  className="w-full border border-gray-300 rounded p-2 focus:border-wsu-crimson focus:outline-none"
                >
                  <option value="">Select a column</option>
                  {outcomesTable.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-wsu-text-body mb-2">
                  myWSU Key Column
                </label>
                <select
                  value={myWsuKeyColumn}
                  onChange={(event) => setMyWsuKeyColumn(event.target.value)}
                  className="w-full border border-gray-300 rounded p-2 focus:border-wsu-crimson focus:outline-none"
                >
                  <option value="">Select a column</option>
                  {myWsuTable.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <input
                id="useNameMatch"
                type="checkbox"
                checked={useNameMatch}
                onChange={(event) => setUseNameMatch(event.target.checked)}
                className="cursor-pointer"
              />
              <label htmlFor="useNameMatch" className="font-semibold">
                Use name matching (optional)
              </label>
            </div>

            {useNameMatch && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block font-semibold text-wsu-text-body mb-2">
                    Outcomes Name Column
                  </label>
                  <select
                    value={outcomesNameColumn}
                    onChange={(event) => setOutcomesNameColumn(event.target.value)}
                    className="w-full border border-gray-300 rounded p-2 focus:border-wsu-crimson focus:outline-none"
                  >
                    <option value="">Select a column</option>
                    {outcomesTable.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-wsu-text-body mb-2">
                    myWSU Name Column
                  </label>
                  <select
                    value={myWsuNameColumn}
                    onChange={(event) => setMyWsuNameColumn(event.target.value)}
                    className="w-full border border-gray-300 rounded p-2 focus:border-wsu-crimson focus:outline-none"
                  >
                    <option value="">Select a column</option>
                    {myWsuTable.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              onClick={generateMatches}
              disabled={!canMatch}
              className={`w-full py-3 rounded font-semibold transition-colors ${
                canMatch
                  ? 'bg-wsu-crimson text-white hover:bg-wsu-crimson-dark'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Generate Matches
            </button>
          </section>
        )}

        {matches.length > 0 && outcomesTable && myWsuTable && (
          <section className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h3 className="text-2xl font-semibold text-wsu-crimson mb-4">
              Review and Adjust Matches
            </h3>
            <p className="text-wsu-text-muted mb-4">
              Click an Outcomes row, then click a myWSU row to create or override
              a match. Use &quot;Clear&quot; to remove a match.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="border border-gray-200 rounded">
                <div className="bg-wsu-gray-light text-white px-3 py-2 font-semibold">
                  Outcomes
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-gray-100 text-gray-700">
                      <tr>
                        <th className="p-2 text-left">Key</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((row) => (
                        <tr
                          key={row.outcomesIndex}
                          onClick={() => setActiveOutcome(row.outcomesIndex)}
                          className={`cursor-pointer ${
                            activeOutcome === row.outcomesIndex
                              ? 'bg-red-50'
                              : row.outcomesIndex % 2 === 0
                              ? 'bg-white'
                              : 'bg-gray-50'
                          }`}
                        >
                          <td className="p-2">{row.outcomesKey}</td>
                          <td className="p-2">{row.outcomesName}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <span>
                                {row.myWsuKey || 'Unmatched'}
                                {row.matchType !== 'unmatched' && row.matchType !== 'manual'
                                  ? ` (${row.matchType})`
                                  : ''}
                              </span>
                              {row.confidence ? (
                                <span className="text-xs text-gray-500">
                                  {row.confidence}
                                </span>
                              ) : null}
                              {row.matchType !== 'unmatched' && (
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    clearMatch(row.outcomesIndex)
                                  }}
                                  className="text-xs text-wsu-crimson underline"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border border-gray-200 rounded">
                <div className="bg-wsu-gray-light text-white px-3 py-2 font-semibold">
                  myWSU
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-gray-100 text-gray-700">
                      <tr>
                        <th className="p-2 text-left">Key</th>
                        <th className="p-2 text-left">Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myWsuTable.rows.map((row, index) => (
                        <tr
                          key={index}
                          onClick={() => {
                            if (activeOutcome !== null) {
                              assignManualMatch(activeOutcome, index)
                            }
                          }}
                          className={`cursor-pointer ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <td className="p-2">{getRowValue(row, myWsuKeyColumn)}</td>
                          <td className="p-2">
                            {myWsuNameColumn ? getRowValue(row, myWsuNameColumn) : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 text-sm text-wsu-text-body">
                <input
                  type="checkbox"
                  checked={includeUnmatched}
                  onChange={(event) => setIncludeUnmatched(event.target.checked)}
                />
                Include unmatched rows in export
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload('xlsx')}
                  className="bg-wsu-crimson text-white px-6 py-2 rounded font-semibold hover:bg-wsu-crimson-dark transition-colors"
                >
                  Download Excel
                </button>
                <button
                  onClick={() => handleDownload('txt')}
                  className="bg-wsu-crimson text-white px-6 py-2 rounded font-semibold hover:bg-wsu-crimson-dark transition-colors"
                >
                  Download Text
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-wsu-border-light bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <p className="text-sm text-wsu-text-muted text-center">
            Graduate School | Washington State University
          </p>
        </div>
      </footer>
    </div>
  )
}


