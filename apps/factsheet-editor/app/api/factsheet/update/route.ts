import { NextRequest, NextResponse } from 'next/server'
import type { Override } from '@/lib/types'
import { getSession, setSession } from '@/lib/session-store'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = body.sessionId as string
    const entryId = String(body.id || '').trim()
    const name = (body.name || '').trim()
    const shortname = (body.shortname || '').trim()
    const programName = (body.program_name || '').trim()
    const degreeTypes = (body.degree_types || []) as string[]
    const cleanedDegreeTypes = degreeTypes.filter(
      (t) => typeof t === 'string' && t.trim()
    )

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: 'Invalid session' },
        { status: 400 }
      )
    }

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json(
        { ok: false, error: 'Invalid session' },
        { status: 400 }
      )
    }

    const entryMap = new Map(
      session.entries.map((e) => [e.id, e])
    )

    if (!entryId || !entryMap.has(entryId)) {
      return NextResponse.json(
        { ok: false, error: 'Unknown entry' },
        { status: 400 }
      )
    }

    const override: Override = {}
    if (name) override.name = name
    if (shortname) override.shortname = shortname
    if (programName) override.program_name = programName
    if (cleanedDegreeTypes.length > 0) {
      override.degree_types = cleanedDegreeTypes
    }

    if (Object.keys(override).length > 0) {
      session.overrides[entryId] = override
    } else {
      delete session.overrides[entryId]
    }

    await setSession(sessionId, session)

    const entry = entryMap.get(entryId)!
    const suggested = entry.suggested
    const display = {
      name: override.name || suggested['Post Title'] || 'no change',
      shortname: override.shortname || suggested.Shortname || 'no change',
      program_name:
        override.program_name || suggested['Program Name'] || 'no change',
      degree_types:
        override.degree_types && override.degree_types.length > 0
          ? override.degree_types.join(', ')
          : suggested['Degree Types'] || 'no change',
    }

    return NextResponse.json({ ok: true, display })
  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json(
      { ok: false, error: 'Update failed' },
      { status: 500 }
    )
  }
}
