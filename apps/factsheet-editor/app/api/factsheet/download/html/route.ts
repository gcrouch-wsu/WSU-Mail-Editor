import { NextRequest, NextResponse } from 'next/server'
import { buildEffectiveFactsheets } from '@/lib/program-builder'
import { buildProgramsFromFactsheets } from '@/lib/program-builder'
import { generateHtmlBlock } from '@/lib/html-generator'
import { getDefaultRules } from '@/lib/rules'
import { getSession } from '@/lib/session-store'

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json(
      { error: 'No HTML available.' },
      { status: 400 }
    )
  }

  try {
    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'No HTML available.' },
        { status: 400 }
      )
    }
    const rules = getDefaultRules()

    const effective = buildEffectiveFactsheets(
      session.factsheets,
      session.overrides,
      rules
    )

    const [programs] = buildProgramsFromFactsheets(effective, rules)
    const [htmlBlock] = generateHtmlBlock(programs, session.sourceName, rules)

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .slice(0, 15)
      .replace('T', '_')
    const filename = `Factsheet_${timestamp}.html`

    return new NextResponse(htmlBlock, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Download HTML error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Download failed',
      },
      { status: 500 }
    )
  }
}
