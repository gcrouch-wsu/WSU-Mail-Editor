import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/session-store'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = String(body.sessionId || '').trim()

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: 'Missing session ID' },
        { status: 400 }
      )
    }

    await deleteSession(sessionId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json(
      { ok: false, error: 'Delete failed' },
      { status: 500 }
    )
  }
}
