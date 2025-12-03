// app/api/export/route.ts - Export final HTML for Slate

import { NextRequest, NextResponse } from 'next/server'
import { renderFullEmail } from '@/lib/email-templates'
import type { NewsletterData, ExportOptions, TemplateType } from '@/types/newsletter'
import { EXPORT_DEFAULTS } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const exportOptions: ExportOptions = body.export_options || {}

    // Extract export options
    const minify = exportOptions.minify ?? EXPORT_DEFAULTS.minify
    const stripJson = exportOptions.strip_json ?? EXPORT_DEFAULTS.strip_json

    // Remove export_options from data before rendering
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { export_options: _exportOptions, ...newsletterData } = body

    // Generate HTML
    let htmlOutput = renderFullEmail(newsletterData as NewsletterData)

    // IMPROVED MINIFICATION: More conservative approach
    if (minify) {
      // Only remove whitespace between tags, preserve all other whitespace
      htmlOutput = htmlOutput.replace(/>\s+</g, '><')
    }

    // SAFE JSON EMBEDDING: Use Base64 encoding to prevent HTML comment issues
    if (!stripJson) {
      // Convert to JSON string
      const jsonStr = JSON.stringify(newsletterData, null, 0)

      // Encode as Base64 to prevent HTML comment conflicts
      const jsonB64 = Buffer.from(jsonStr, 'utf-8').toString('base64')

      // Embed as safe HTML comment - breaks into chunks to avoid line length issues
      const chunkSize = 100
      const chunks: string[] = []
      for (let i = 0; i < jsonB64.length; i += chunkSize) {
        chunks.push(jsonB64.slice(i, i + chunkSize))
      }

      let embeddedComment = '<!-- WSU_NEWSLETTER_DATA_B64\n'
      embeddedComment += chunks.join('\n')
      embeddedComment += '\n-->\n'

      htmlOutput = htmlOutput.replace('</body>', embeddedComment + '</body>')
    }

    // Generate filename
    const templateType: TemplateType =
      newsletterData.template === 'briefing'
        ? 'briefing'
        : newsletterData.template === 'letter'
        ? 'letter'
        : 'ff'
    const prefix =
      EXPORT_DEFAULTS.filename_prefix[templateType] || 'Newsletter_'
    const suffix = stripJson ? '_PRODUCTION' : ''
    const date = new Date().toISOString().slice(0, 10)
    const filename = `${prefix}${date}${suffix}.html`

    // Create response with explicit encoding
    return new NextResponse(htmlOutput, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      },
      { status: 500 }
    )
  }
}

