import type { Factsheet, Override } from './types'

interface Session {
  factsheets: Factsheet[]
  entries: any[]
  overrides: Record<string, Override>
  sourceName: string
  baseAdminUrl: string
}

const sessions = new Map<string, Session>()

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId)
}

export function setSession(sessionId: string, session: Session): void {
  sessions.set(sessionId, session)
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId)
}

export function hasSession(sessionId: string): boolean {
  return sessions.has(sessionId)
}
