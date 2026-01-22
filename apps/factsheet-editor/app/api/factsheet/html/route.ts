import { NextRequest, NextResponse } from 'next/server'
import { buildEffectiveFactsheets } from '@/lib/program-builder'
import { buildProgramsFromFactsheets } from '@/lib/program-builder'
import { generateHtmlBlock } from '@/lib/html-generator'
import { getDefaultRules } from '@/lib/rules'
import { getSession, hasSession } from '@/lib/session-store'

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  
  if (!sessionId) {
    console.error('HTML route: No sessionId provided')
    return NextResponse.json(
      { error: 'No session ID provided.' },
      { status: 400 }
    )
  }

  if (!hasSession(sessionId)) {
    console.error('HTML route: Session not found:', sessionId)
    return NextResponse.json(
      { error: 'Session not found. Please reload your export file.' },
      { status: 400 }
    )
  }

  try {
    const session = getSession(sessionId)
    if (!session) {
      console.error('HTML route: Session is null for ID:', sessionId)
      return NextResponse.json(
        { error: 'Session data is missing.' },
        { status: 400 }
      )
    }

    console.log('HTML route: Processing session:', {
      sessionId,
      factsheetsCount: session.factsheets?.length || 0,
      entriesCount: session.entries?.length || 0,
      hasOverrides: !!session.overrides,
    })

    const rules = getDefaultRules()

    const effective = buildEffectiveFactsheets(
      session.factsheets,
      session.overrides,
      rules
    )

    console.log('HTML route: Effective factsheets:', effective.length)

    const [programs, processedCount, skippedCount] =
      buildProgramsFromFactsheets(effective, rules)

    console.log('HTML route: Programs built:', {
      programsCount: programs.length,
      processed: processedCount,
      skipped: skippedCount,
    })

    const [htmlBlock, dataSize] = generateHtmlBlock(
      programs,
      session.sourceName,
      rules
    )

    console.log('HTML route: HTML generated, size:', dataSize)

    return NextResponse.json({
      html: htmlBlock,
      data_size: dataSize.toLocaleString(),
      processed: processedCount,
      skipped: skippedCount,
      groups: programs.length,
    })
  } catch (error) {
    console.error('HTML generation error:', error)
    const errorMessage = error instanceof Error 
      ? `${error.message}${error.stack ? `\n${error.stack}` : ''}`
      : 'HTML generation failed'
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
