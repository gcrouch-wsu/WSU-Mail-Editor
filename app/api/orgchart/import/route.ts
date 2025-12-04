import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Input validation constants
const MAX_NODE_ID_LENGTH = 50
const MAX_NODE_NAME_LENGTH = 100
const MAX_NODE_TITLE_LENGTH = 200
const MAX_NODES_COUNT = 1000
const MAX_HTML_INPUT_LENGTH = 500 * 1024 // 500KB

function validateNode(node: any): string[] {
  const errors: string[] = []

  if (!node || typeof node !== 'object') {
    return ['Node must be an object']
  }

  // Validate ID
  const nodeId = node.id || ''
  if (!nodeId || typeof nodeId !== 'string') {
    errors.push('Node ID is required and must be a string')
  } else if (nodeId.length > MAX_NODE_ID_LENGTH) {
    errors.push(`Node ID must be ${MAX_NODE_ID_LENGTH} characters or less`)
  } else if (!/^[a-zA-Z0-9_-]+$/.test(nodeId)) {
    errors.push('Node ID must contain only letters, numbers, hyphens, and underscores')
  }

  // Validate name
  const name = node.name || ''
  if (name && typeof name !== 'string') {
    errors.push('Node name must be a string')
  } else if (typeof name === 'string' && name.length > MAX_NODE_NAME_LENGTH) {
    errors.push(`Node name must be ${MAX_NODE_NAME_LENGTH} characters or less`)
  }

  // Validate title
  const title = node.title || ''
  if (title && typeof title !== 'string') {
    errors.push('Node title must be a string')
  } else if (typeof title === 'string' && title.length > MAX_NODE_TITLE_LENGTH) {
    errors.push(`Node title must be ${MAX_NODE_TITLE_LENGTH} characters or less`)
  }

  // Validate parent
  const parent = node.parent
  if (parent !== null && parent !== undefined && typeof parent !== 'string') {
    errors.push('Node parent must be a string or null')
  }

  // Validate side
  const side = node.side
  if (side !== null && side !== undefined && side !== '' && side !== 'L' && side !== 'R') {
    errors.push("Node side must be 'L', 'R', or empty")
  }

  return errors
}

function sanitizeHtmlInput(htmlString: string): string {
  if (!htmlString || typeof htmlString !== 'string') {
    return ''
  }

  if (htmlString.length > MAX_HTML_INPUT_LENGTH) {
    throw new Error(`Input exceeds maximum length of ${MAX_HTML_INPUT_LENGTH} characters`)
  }

  // Remove script tags except our data script
  let cleaned = htmlString.replace(
    /<script(?![^>]*id=["']wsu-org-data["'])[^>]*>.*?<\/script>/gis,
    ''
  )

  // Remove event handlers
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')

  return cleaned
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const raw = body.raw || ''

    if (!raw) {
      return NextResponse.json({ ok: false, error: 'No input provided' }, { status: 400 })
    }

    if (typeof raw !== 'string') {
      return NextResponse.json({ ok: false, error: 'Input must be a string' }, { status: 400 })
    }

    // Sanitize HTML input
    let sanitized: string
    try {
      sanitized = sanitizeHtmlInput(raw)
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
    }

    // Find the JSON data script
    const scriptMatch = sanitized.match(
      /<script[^>]+id=["']wsu-org-data["'][^>]*>(.*?)<\/script>/is
    )

    if (!scriptMatch) {
      return NextResponse.json(
        { ok: false, error: "Could not find <script id='wsu-org-data'> JSON block" },
        { status: 400 }
      )
    }

    // Parse JSON
    const jsonText = scriptMatch[1].trim()
    if (jsonText.length > MAX_HTML_INPUT_LENGTH) {
      return NextResponse.json({ ok: false, error: 'JSON data too large' }, { status: 400 })
    }

    let nodes: any[]
    try {
      nodes = JSON.parse(jsonText)
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: `JSON parse error: ${e.message}` }, { status: 400 })
    }

    if (!Array.isArray(nodes)) {
      return NextResponse.json(
        { ok: false, error: 'JSON payload must be a bare array ([])' },
        { status: 400 }
      )
    }

    // Validate node count
    if (nodes.length > MAX_NODES_COUNT) {
      return NextResponse.json(
        { ok: false, error: `Too many nodes. Maximum allowed: ${MAX_NODES_COUNT}` },
        { status: 400 }
      )
    }

    // Validate each node
    const allErrors: string[] = []
    for (let i = 0; i < nodes.length; i++) {
      const nodeErrors = validateNode(nodes[i])
      if (nodeErrors.length > 0) {
        allErrors.push(`Node ${i} (${nodes[i]?.id || 'unknown'}): ${nodeErrors.join(', ')}`)
      }
    }

    if (allErrors.length > 0) {
      return NextResponse.json(
        { ok: false, error: 'Validation errors: ' + allErrors.slice(0, 5).join('; ') },
        { status: 400 }
      )
    }

    // Extract layout attributes from container div
    const hostMatch = sanitized.match(/<div[^>]+id=["']wsu-orgchart["'][^>]*>/i)
    const layout: any = {}

    function extractAttr(name: string, cast?: 'float' | 'int', defaultValue?: any): any {
      if (!hostMatch) return defaultValue
      const attrMatch = hostMatch[0].match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`))
      if (!attrMatch) return defaultValue
      const val = attrMatch[1]

      if (cast === 'float') {
        try {
          const result = parseFloat(val)
          if (!(-1000 <= result && result <= 1000)) return defaultValue
          return result
        } catch {
          return defaultValue
        }
      }
      if (cast === 'int') {
        try {
          const result = parseInt(val, 10)
          if (!(-10000 <= result && result <= 10000)) return defaultValue
          return result
        } catch {
          return defaultValue
        }
      }

      if (typeof val === 'string' && val.length > 100) return defaultValue
      return val
    }

    // Extract responsive scale attributes
    layout.scaleDesktop = extractAttr('data-scale-desktop', 'float', null)
    layout.scaleTablet = extractAttr('data-scale-tablet', 'float', null)
    layout.scalePhone = extractAttr('data-scale-phone', 'float', null)
    layout.scale = extractAttr('data-scale', 'float', null)

    // Extract centered layout attributes
    layout.hgaps = extractAttr('data-hgaps', undefined, null)
    layout.stubs = extractAttr('data-stubs', undefined, null)
    layout.cardw = extractAttr('data-cardw', 'int', null)
    layout.l1stub = extractAttr('data-l1stub', 'int', null)
    layout.center = extractAttr('data-center', 'int', null)
    layout.openDepthDesktop = extractAttr('data-open-depth-desktop', 'int', null)
    layout.openDepthTablet = extractAttr('data-open-depth-tablet', 'int', null)
    layout.openDepthPhone = extractAttr('data-open-depth-phone', 'int', null)
    layout.connectorAlign = extractAttr('data-c-connector-align', 'int', null)

    // Extract vertical layout attributes
    layout.hgap = extractAttr('data-hgap', 'int', null)
    layout.vgap = extractAttr('data-vgap', 'int', null)

    // Extract horizontal layout attributes
    layout.mode = extractAttr('data-mode', undefined, null)
    layout.breakpoint = extractAttr('data-breakpoint', 'int', null)
    layout.toggle = extractAttr('data-toggle', 'int', null)

    return NextResponse.json({ ok: true, nodes, layout })
  } catch (e: any) {
    console.error('Import error:', e)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}

