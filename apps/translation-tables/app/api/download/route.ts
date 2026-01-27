import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

type ExportRow = Record<string, string | number>

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data: ExportRow[] = body.data || []
    const format: string = body.format || 'xlsx'
    const originalFilename: string = body.filename || 'processed_data'

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No data to download' },
        { status: 400 }
      )
    }

    // Remove extension from original filename
    const baseName = originalFilename.replace(/\.[^/.]+$/, '')

    if (format === 'xlsx') {
      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

      // Generate buffer
      const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      })

      // Return as downloadable file
      return new NextResponse(buffer, {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${baseName}.xlsx"`,
        },
      })
    } else if (format === 'txt') {
      // Convert to tab-delimited text (TSV)
      const headers = Object.keys(data[0] || {})
      const tsvContent =
        headers.join('\t') +
        '\n' +
        data
          .map((row) => headers.map((header) => String(row[header] ?? '')).join('\t'))
          .join('\n')

      return new NextResponse(tsvContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${baseName}.txt"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error downloading file:', error)
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    )
  }
}

