import { NextRequest, NextResponse } from 'next/server'
import { parseWxr } from '@/lib/xml-parser'
import { generateRecommendations } from '@/lib/recommendations'
import { buildRulesSummary, getDefaultRules } from '@/lib/rules'
import { cleanupOldSessions, getSession, setSession } from '@/lib/session-store'
import { buildEffectiveFactsheets, buildProgramsFromFactsheets } from '@/lib/program-builder'
import { generateHtmlBlock } from '@/lib/html-generator'
import type { Factsheet, Override } from '@/lib/types'

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
    const rulesStatus = 'Loaded default rules'
    const rulesError = ''
    const xmlBytes = Buffer.from(await wxrFile.arrayBuffer())

    let factsheets: Factsheet[]
    try {
      factsheets = await parseWxr(xmlBytes, rules)
      console.log('Process route: Parsed factsheets:', {
        total: factsheets.length,
        withStatus: factsheets.filter(f => f.status).length,
        published: factsheets.filter(f => f.status === 'publish').length,
        draft: factsheets.filter(f => f.status === 'draft').length,
        included: factsheets.filter(f => f.include_in_programs === '1').length,
        withDegreeTypes: factsheets.filter(f => f.degree_types.length > 0).length,
      })
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const editsData = JSON.parse(editsText) as any
            overrides = editsData.overrides || {}
      } catch (error) {
        console.error('Failed to parse edits JSON:', error)
      }
    }

    if (factsheets.length === 0) {
      console.error('Process route: No factsheets parsed from XML')
      return NextResponse.json(
        {
          error: 'No factsheets found in the export file. Make sure the file contains posts with post_type="gs-factsheet".',
        },
        { status: 400 }
      )
    }

    const sessionId = crypto.randomUUID()
    const sessionData = {
      factsheets,
      entries,
      overrides,
      sourceName: wxrFile.name,
      baseAdminUrl,
      rules,
      rulesJson: JSON.stringify(rules, null, 2),
      rulesStatus,
      rulesError,
    }
    
    await setSession(sessionId, sessionData)
    cleanupOldSessions().catch((error) => {
      console.warn('Process route: Session cleanup failed', error)
    })
    
    // Verify session was saved
    const verifySession = await getSession(sessionId)
    if (!verifySession || verifySession.factsheets.length === 0) {
      console.error('Process route: Session verification failed', {
        sessionExists: !!verifySession,
        factsheetsInSession: verifySession?.factsheets?.length || 0,
      })
      return NextResponse.json(
        {
          error: 'Failed to save session data. This may be a serverless limitation.',
        },
        { status: 500 }
      )
    }
    
    console.log('Process route: Session created and verified:', {
      sessionId,
      factsheetsCount: factsheets.length,
      entriesCount: entries.length,
      verifiedFactsheetsCount: verifySession.factsheets.length,
    })

    // Generate HTML immediately in the same request to avoid session persistence issues
    let htmlBlock = ''
    let htmlMeta = {
      groups: 0,
      processed: 0,
      skipped: 0,
      size: '0',
    }

    try {
      const effective = buildEffectiveFactsheets(factsheets, overrides)
      if (effective.length > 0) {
        const [programs, processedCount, skippedCount] = buildProgramsFromFactsheets(effective, rules)
        const [html, dataSize] = generateHtmlBlock(programs, wxrFile.name, rules)
        htmlBlock = html
        htmlMeta = {
          groups: programs.length,
          processed: processedCount,
          skipped: skippedCount,
          size: dataSize.toLocaleString(),
        }
        console.log('Process route: HTML generated immediately', htmlMeta)
      } else {
        console.warn('Process route: No effective factsheets to generate HTML')
      }
    } catch (htmlError) {
      console.error('Process route: Error generating HTML (non-fatal):', htmlError)
      // Don't fail the request if HTML generation fails - user can still see entries
    }

    return NextResponse.json({
      sessionId,
      entries,
      counts: {
        total: entries.length,
        needs_edit: needsEditCount,
      },
      source_name: wxrFile.name,
      base_admin_url: baseAdminUrl,
      rules_json: sessionData.rulesJson,
      rules_status: sessionData.rulesStatus,
      rules_error: sessionData.rulesError,
      rules_summary: buildRulesSummary(rules),
      html: htmlBlock, // Include HTML in response
      html_meta: htmlMeta, // Include HTML metadata
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
  const { getSession } = await import('@/lib/session-store')
  
  if (!sessionId) {
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 400 }
    )
  }

  const session = await getSession(sessionId)
  if (!session) {
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 400 }
    )
  }
  return NextResponse.json({
    entries: session.entries,
    counts: {
      total: session.entries.length,
      needs_edit: session.entries.filter((e) => e.needs_edit).length,
    },
    source_name: session.sourceName,
    base_admin_url: session.baseAdminUrl,
    rules_json: session.rulesJson,
    rules_status: session.rulesStatus,
    rules_error: session.rulesError,
    rules_summary: buildRulesSummary(session.rules),
  })
}
