import { NextRequest, NextResponse } from 'next/server'
import { generateRecommendations } from '@/lib/recommendations'
import { buildRulesSummary, getDefaultRules, normalizeRules } from '@/lib/rules'
import { getSession, setSession } from '@/lib/session-store'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = String(body.sessionId || '').trim()
    const rulesJson = String(body.rules_json || '').trim()
    const source = String(body.source || 'rules editor').trim()
    const action = String(body.action || 'apply').trim()

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: 'Missing session ID' },
        { status: 400 }
      )
    }

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or expired session' },
        { status: 400 }
      )
    }

    if (!rulesJson && action !== 'reload') {
      return NextResponse.json(
        { ok: false, error: 'Rules JSON is empty' },
        { status: 400 }
      )
    }

    let rulesStatus = ''
    let rulesError = ''
    let rules = session.rules

    if (action === 'reload') {
      rules = getDefaultRules()
      rulesStatus = 'Reloaded default rules'
      rulesError = ''
    } else {
      try {
        const payload = JSON.parse(rulesJson)
        const [normalized, errors] = normalizeRules(payload)
        rules = normalized
        rulesStatus = `Applied rules from ${source}`
        rulesError = errors.join('; ')
      } catch (err) {
        rulesStatus = session.rulesStatus
        rulesError = err instanceof Error ? err.message : 'Rules JSON error'
        return NextResponse.json(
          { ok: false, error: rulesError },
          { status: 400 }
        )
      }
    }

    const [entries, needsEditCount] = generateRecommendations(
      session.factsheets,
      session.baseAdminUrl,
      rules
    )

    const nextSession = {
      ...session,
      entries,
      rules,
      rulesJson: JSON.stringify(rules, null, 2),
      rulesStatus: rulesStatus || session.rulesStatus,
      rulesError,
    }

    await setSession(sessionId, nextSession)

    return NextResponse.json({
      ok: true,
      entries,
      counts: {
        total: entries.length,
        needs_edit: needsEditCount,
      },
      rules_json: nextSession.rulesJson,
      rules_status: nextSession.rulesStatus,
      rules_error: nextSession.rulesError,
      rules_summary: buildRulesSummary(rules),
    })
  } catch (error) {
    console.error('Rules update error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update rules' },
      { status: 500 }
    )
  }
}
