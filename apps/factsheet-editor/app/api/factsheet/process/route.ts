import { NextRequest, NextResponse } from 'next/server'
import { parseWxr } from '@/lib/xml-parser'
import { generateRecommendations } from '@/lib/recommendations'
import { getDefaultRules } from '@/lib/rules'
import { setSession } from '@/lib/session-store'
import type { Override } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const wxrFile = formData.get('wxr_file') as File | null
    const baseAdminUrl = (formData.get('base_admin_url') as string) || ''
    const editsFile = formData.get('edits_file') as File | null

    if (!wxrFile) {
      return NextResponse.json(
        { error: 'Please choose a WXR export file.' },
        { status: 400 }
      )
    }

    const rules = getDefaultRules()
    const xmlBytes = Buffer.from(await wxrFile.arrayBuffer())

    let factsheets: Factsheet[]
    try {
      factsheets = await parseWxr(xmlBytes, rules)
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `XML parse error: ${error.message}`
              : 'Invalid XML file',
        },
        { status: 400 }
      )
    }

    const [entries, needsEditCount] = generateRecommendations(
      factsheets,
      baseAdminUrl,
      rules
    )

    let overrides: Record<string, Override> = {}
    if (editsFile) {
      try {
        const editsText = await editsFile.text()
        const editsData = JSON.parse(editsText)
        overrides = editsData.overrides || {}
      } catch (error) {
        console.error('Failed to parse edits JSON:', error)
      }
    }

    const sessionId = crypto.randomUUID()
    sessions.set(sessionId, {
      factsheets,
      entries,
      overrides,
      sourceName: wxrFile.name,
      baseAdminUrl,
    })

    return NextResponse.json({
      sessionId,
      entries,
      counts: {
        total: entries.length,
        needs_edit: needsEditCount,
      },
      source_name: wxrFile.name,
      base_admin_url: baseAdminUrl,
    })
  } catch (error) {
    console.error('Process error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Processing failed',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  const { getSession, hasSession } = await import('@/lib/session-store')
  
  if (!sessionId || !hasSession(sessionId)) {
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 400 }
    )
  }

  const session = getSession(sessionId)!
  return NextResponse.json({
    entries: session.entries,
    counts: {
      total: session.entries.length,
      needs_edit: session.entries.filter((e: any) => e.needs_edit).length,
    },
    source_name: session.sourceName,
    base_admin_url: session.baseAdminUrl,
  })
}
