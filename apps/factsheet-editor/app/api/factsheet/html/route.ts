import { NextRequest, NextResponse } from 'next/server'
import { buildEffectiveFactsheets } from '@/lib/program-builder'
import { buildProgramsFromFactsheets } from '@/lib/program-builder'
import { generateHtmlBlock } from '@/lib/html-generator'
import { getDefaultRules } from '@/lib/rules'
import { getSession, hasSession } from '@/lib/session-store'

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId || !hasSession(sessionId)) {
    return NextResponse.json(
      { error: 'No data loaded.' },
      { status: 400 }
    )
  }

  try {
    const session = getSession(sessionId)!
    const rules = getDefaultRules()

    const effective = buildEffectiveFactsheets(
      session.factsheets,
      session.overrides,
      rules
    )

    const [programs, processedCount, skippedCount] =
      buildProgramsFromFactsheets(effective, rules)

    const [htmlBlock, dataSize] = generateHtmlBlock(
      programs,
      session.sourceName,
      rules
    )

    return NextResponse.json({
      html: htmlBlock,
      data_size: dataSize.toLocaleString(),
      processed: processedCount,
      skipped: skippedCount,
      groups: programs.length,
    })
  } catch (error) {
    console.error('HTML generation error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'HTML generation failed',
      },
      { status: 500 }
    )
  }
}
