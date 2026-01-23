import type { Factsheet, Override, RecommendationEntry } from './types'

interface Session {
  factsheets: Factsheet[]
  entries: RecommendationEntry[]
  overrides: Record<string, Override>
  sourceName: string
  baseAdminUrl: string
}

const sessions = new Map<string, Session>()

export function getSession(sessionId: string): Session | undefined {
  const session = sessions.get(sessionId)
  if (session) {
    console.log('getSession: Found session', {
      sessionId,
      factsheetsCount: session.factsheets?.length || 0,
      entriesCount: session.entries?.length || 0,
      totalSessions: sessions.size,
    })
  } else {
    console.warn('getSession: Session not found', {
      sessionId,
      totalSessions: sessions.size,
      availableSessionIds: Array.from(sessions.keys()).slice(0, 5),
    })
  }
  return session
}

export function setSession(sessionId: string, session: Session): void {
  if (!session.factsheets || session.factsheets.length === 0) {
    console.error('setSession: Attempting to save session with no factsheets', {
      sessionId,
      entriesCount: session.entries?.length || 0,
    })
  }
  sessions.set(sessionId, session)
  console.log('setSession: Session saved', {
    sessionId,
    factsheetsCount: session.factsheets?.length || 0,
    entriesCount: session.entries?.length || 0,
    totalSessions: sessions.size,
  })
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId)
}

export function hasSession(sessionId: string): boolean {
  return sessions.has(sessionId)
}
