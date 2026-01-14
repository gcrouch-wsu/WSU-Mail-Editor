'use client'

import { useState } from 'react'

interface TranslationRow {
  Input: string
  Output: string
}

export default function TranslationTablesPage() {
  const [pasteInput, setPasteInput] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [showEditSection, setShowEditSection] = useState(false)
  const [showFinalReview, setShowFinalReview] = useState(false)
  const [tableData, setTableData] = useState<TranslationRow[]>([])
  const [finalData, setFinalData] = useState<TranslationRow[]>([])
  const [currentFilename, setCurrentFilename] = useState('pasted_data.txt')
  const [selectAll, setSelectAll] = useState(true)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  const handleProcess = async () => {
    if (!pasteInput.trim()) {
      setErrorMessage('Please paste some text to process.')
      return
    }

    setErrorMessage('')
    setShowEditSection(false)
    setShowFinalReview(false)

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteInput }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Processing failed')
      }

      const result = await response.json()
      setCurrentFilename(result.filename)
      setTableData(result.data)
      setSelectedRows(new Set(result.data.map((_: any, i: number) => i)))
      setSelectAll(true)
      setShowEditSection(true)
    } catch (error: any) {
      console.error('Error:', error)
      setErrorMessage(error.message || 'An error occurred')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedRows(new Set(tableData.map((_, i) => i)))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleRowToggle = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(index)
    } else {
      newSelected.delete(index)
    }
    setSelectedRows(newSelected)
    setSelectAll(newSelected.size === tableData.length)
  }

  const handleCellEdit = (index: number, field: 'Input' | 'Output', value: string) => {
    const newData = [...tableData]
    newData[index] = { ...newData[index], [field]: value }
    setTableData(newData)
  }

  const handlePreviewSelection = () => {
    const selected = tableData.filter((_, i) => selectedRows.has(i))
    if (selected.length === 0) {
      alert('No rows selected. Please select at least one row.')
      return
    }
    setFinalData(selected)
    setShowEditSection(false)
    setShowFinalReview(true)
  }

  const handleBackToEdit = () => {
    setShowFinalReview(false)
    setShowEditSection(true)
  }

  const handleDownload = async (format: 'xlsx' | 'txt') => {
    if (finalData.length === 0) {
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
          data: finalData,
          format: format,
          filename: currentFilename,
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
      const baseName = currentFilename.replace(/\.[^/.]+$/, '')
      a.download = `${baseName}_processed.${ext}`

      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      alert(error.message || 'Download failed')
    }
  }

  return (
    <div className="min-h-screen bg-wsu-bg-light flex flex-col">
      {/* Header */}
      <header className="bg-wsu-crimson text-white py-6 px-8 shadow-md">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wide">
            Washington State University
          </h1>
          <h2 className="text-xl mt-1 opacity-90">
            Outcomes Translation Table Exporter
          </h2>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 w-full">
        {/* Upload Section */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h3 className="text-2xl font-semibold text-wsu-crimson mb-4">
            Import Data
          </h3>

          <div className="mb-6 p-4 bg-gray-50 border-l-4 border-wsu-crimson rounded">
            <ol className="list-decimal list-inside space-y-2 text-wsu-text-body">
              <li>
                Navigate to the <strong className="text-wsu-crimson">Outcomes Translation Table</strong> (Settings &gt; Import/Export).
              </li>
              <li>
                Select the table content and copy it (<strong className="text-wsu-crimson">Ctrl + C</strong>).
              </li>
              <li>Paste the content into the field below.</li>
              <li>
                In the table below, uncheck rows to exclude and edit cells if needed.
              </li>
              <li>
                Click <strong className="text-wsu-crimson">Preview Selection</strong> to review your final list.
              </li>
              <li>Download the final result as Excel or Text.</li>
            </ol>
          </div>

          <div className="mb-4">
            <textarea
              id="pasteInput"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Paste Outcomes data here..."
              className="w-full h-40 p-3 border border-gray-300 rounded-lg font-mono resize-y focus:border-wsu-crimson focus:outline-none"
            />
            <button
              onClick={handleProcess}
              className="w-full mt-3 bg-wsu-crimson text-white px-6 py-3 rounded font-semibold hover:bg-wsu-crimson-dark transition-colors"
            >
              Process Data
            </button>
          </div>

          {errorMessage && (
            <div className="text-red-600 font-semibold mt-4">{errorMessage}</div>
          )}
        </section>

        {/* Edit & Select Section */}
        {showEditSection && (
          <section className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="mb-4">
              <h3 className="text-2xl font-semibold text-wsu-crimson mb-1">
                Edit & Select Data
              </h3>
              <p className="text-wsu-text-muted">
                Uncheck rows to exclude them. Click cells to edit content.
              </p>
            </div>

            <div className="max-h-[500px] overflow-y-auto border border-gray-300 rounded mb-6">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-wsu-gray-light text-white sticky top-0">
                  <tr>
                    <th className="w-10 text-center p-3">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="p-3 text-left font-semibold">Input</th>
                    <th className="p-3 text-left font-semibold">Output</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center p-4">
                        No valid data found.
                      </td>
                    </tr>
                  ) : (
                    tableData.map((row, index) => (
                      <tr
                        key={index}
                        className={`${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } hover:bg-gray-100`}
                      >
                        <td className="text-center p-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(index)}
                            onChange={(e) =>
                              handleRowToggle(index, e.target.checked)
                            }
                            className="cursor-pointer"
                          />
                        </td>
                        <td
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) =>
                            handleCellEdit(
                              index,
                              'Input',
                              e.currentTarget.textContent || ''
                            )
                          }
                          className="p-3 border border-transparent focus:border-wsu-crimson focus:outline-none focus:bg-red-50"
                        >
                          {row.Input}
                        </td>
                        <td
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) =>
                            handleCellEdit(
                              index,
                              'Output',
                              e.currentTarget.textContent || ''
                            )
                          }
                          className="p-3 border border-transparent focus:border-wsu-crimson focus:outline-none focus:bg-red-50"
                        >
                          {row.Output}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handlePreviewSelection}
                className="bg-wsu-crimson text-white px-6 py-3 rounded font-semibold hover:bg-wsu-crimson-dark transition-colors"
              >
                Preview Selection →
              </button>
            </div>
          </section>
        )}

        {/* Final Review Section */}
        {showFinalReview && (
          <section className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="mb-4">
              <h3 className="text-2xl font-semibold text-wsu-crimson mb-1">
                Final Review
              </h3>
              <p className="text-wsu-text-muted">
                Review the data that will be included in your download.
              </p>
            </div>

            <div className="max-h-[500px] overflow-y-auto border border-gray-300 rounded mb-6">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-wsu-gray-light text-white sticky top-0">
                  <tr>
                    <th className="p-3 text-left font-semibold">Input</th>
                    <th className="p-3 text-left font-semibold">Output</th>
                  </tr>
                </thead>
                <tbody>
                  {finalData.map((row, index) => (
                    <tr
                      key={index}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="p-3">{row.Input}</td>
                      <td className="p-3">{row.Output}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={handleBackToEdit}
                className="bg-wsu-gray-light text-white px-6 py-3 rounded font-semibold hover:bg-wsu-gray transition-colors"
              >
                ← Back to Edit
              </button>
              <button
                onClick={() => handleDownload('xlsx')}
                className="bg-wsu-crimson text-white px-6 py-3 rounded font-semibold hover:bg-wsu-crimson-dark transition-colors"
              >
                Download Excel
              </button>
              <button
                onClick={() => handleDownload('txt')}
                className="bg-wsu-crimson text-white px-6 py-3 rounded font-semibold hover:bg-wsu-crimson-dark transition-colors"
              >
                Download Text
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}


