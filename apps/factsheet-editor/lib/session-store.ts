import type { Factsheet, Override, RecommendationEntry, Rules } from './types'
import { del, list, put } from '@vercel/blob'

interface Session {
  factsheets: Factsheet[]
  entries: RecommendationEntry[]
  overrides: Record<string, Override>
  sourceName: string
  baseAdminUrl: string
  rules: Rules
  rulesJson: string
  rulesStatus: string
  rulesError: string
}

const SESSION_PREFIX = 'factsheet/sessions/'
const SESSION_SUFFIX = '.json'
const SESSION_TTL_SECONDS = 60 * 60 * 6

function sessionPath(sessionId: string): string {
  return `${SESSION_PREFIX}${sessionId}${SESSION_SUFFIX}`
}

async function findSessionBlob(sessionId: string) {
  const pathname = sessionPath(sessionId)
  const result = await list({ prefix: pathname, limit: 20 })
  if (!result.blobs.length) {
    return null
  }
  const match = result.blobs.find((blob) => blob.pathname === pathname)
  return match || null
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const blob = await findSessionBlob(sessionId)
  if (!blob) {
    console.warn('getSession: Session not found', {
      sessionId,
    })
    return null
  }

  const response = await fetch(blob.url)
  if (!response.ok) {
    console.warn('getSession: Failed to fetch session', {
      sessionId,
      status: response.status,
    })
    return null
  }

  const session = (await response.json()) as Session
  if (session) {
    console.log('getSession: Found session', {
      sessionId,
      factsheetsCount: session.factsheets?.length || 0,
      entriesCount: session.entries?.length || 0,
    })
  }
  return session || null
}

export async function setSession(sessionId: string, session: Session): Promise<void> {
  if (!session.factsheets || session.factsheets.length === 0) {
    console.error('setSession: Attempting to save session with no factsheets', {
      sessionId,
      entriesCount: session.entries?.length || 0,
    })
  }
  await put(sessionPath(sessionId), JSON.stringify(session), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  })
  console.log('setSession: Session saved', {
    sessionId,
    factsheetsCount: session.factsheets?.length || 0,
    entriesCount: session.entries?.length || 0,
  })
}

export async function deleteSession(sessionId: string): Promise<void> {
  const blob = await findSessionBlob(sessionId)
  if (blob) {
    await del(blob.url)
  }
}

export async function hasSession(sessionId: string): Promise<boolean> {
  const blob = await findSessionBlob(sessionId)
  return Boolean(blob)
}

export async function cleanupOldSessions(): Promise<number> {
  const cutoff = Date.now() - SESSION_TTL_SECONDS * 1000
  const result = await list({ prefix: SESSION_PREFIX })
  const expired = result.blobs.filter(
    (blob) => blob.uploadedAt && blob.uploadedAt.getTime() < cutoff
  )
  if (!expired.length) {
    return 0
  }
  await del(expired.map((blob) => blob.url))
  return expired.length
}
