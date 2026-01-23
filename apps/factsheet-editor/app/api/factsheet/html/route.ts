import { NextRequest, NextResponse } from 'next/server'
import { buildEffectiveFactsheets } from '@/lib/program-builder'
import { buildProgramsFromFactsheets } from '@/lib/program-builder'
import { generateHtmlBlock } from '@/lib/html-generator'
import { getDefaultRules } from '@/lib/rules'
import { getSession, hasSession } from '@/lib/session-store'
import type { Program } from '@/lib/types'

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
      overridesCount: session.overrides ? Object.keys(session.overrides).length : 0,
    })

    if (!session.factsheets || session.factsheets.length === 0) {
      console.error('HTML route: Session has no factsheets')
      return NextResponse.json(
        {
          error: 'No factsheets found in session. Please reload your export file.',
        },
        { status: 400 }
      )
    }

    // Log sample factsheet data for debugging
    if (session.factsheets.length > 0) {
      const sample = session.factsheets[0]
      console.log('HTML route: Sample factsheet:', {
        id: sample.id,
        status: sample.status,
        include_in_programs: sample.include_in_programs,
        degree_types_count: sample.degree_types?.length || 0,
        has_title: !!sample.title,
      })
    }

    const rules = getDefaultRules()

    const effective = buildEffectiveFactsheets(
      session.factsheets,
      session.overrides,
      rules
    )

    console.log('HTML route: Effective factsheets:', {
      count: effective.length,
      sample_status: effective[0]?.status,
      sample_include: effective[0]?.include_in_programs,
      sample_degree_types: effective[0]?.degree_types?.length || 0,
    })
    
    if (effective.length === 0) {
      const diagnosticInfo = {
        originalCount: session.factsheets.length,
        overridesCount: session.overrides ? Object.keys(session.overrides).length : 0,
        sampleFactsheet: session.factsheets[0] ? {
          id: session.factsheets[0].id,
          status: session.factsheets[0].status,
          include_in_programs: session.factsheets[0].include_in_programs,
          degree_types: session.factsheets[0].degree_types?.length || 0,
        } : null,
      }
      console.error('HTML route: No effective factsheets after applying overrides', diagnosticInfo)
      
      let errorMessage = 'No factsheets available after processing. '
      if (session.factsheets.length === 0) {
        errorMessage += 'The session contains no factsheets. This may indicate the session was lost (serverless limitation) or the export file was empty.'
      } else {
        errorMessage += `Found ${session.factsheets.length} factsheets but none passed processing. `
        errorMessage += 'Check that your export contains factsheets with status="publish" and include_in_programs="1".'
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    let programs: Program[]
    let processedCount: number
    let skippedCount: number
    
    try {
      [programs, processedCount, skippedCount] =
        buildProgramsFromFactsheets(effective, rules)
      
      console.log('HTML route: Programs built:', {
        programsCount: programs.length,
        processed: processedCount,
        skipped: skippedCount,
      })
    } catch (buildError) {
      console.error('HTML route: Error building programs:', buildError)
      const errorMsg = buildError instanceof Error 
        ? buildError.message 
        : 'Failed to build programs from factsheets'
      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      )
    }

    let htmlBlock: string
    let dataSize: number
    
    try {
      [htmlBlock, dataSize] = generateHtmlBlock(
        programs,
        session.sourceName,
        rules
      )
      
      console.log('HTML route: HTML generated, size:', dataSize)
    } catch (htmlError) {
      console.error('HTML route: Error generating HTML:', htmlError)
      const errorMsg = htmlError instanceof Error 
        ? htmlError.message 
        : 'Failed to generate HTML block'
      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      )
    }

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
