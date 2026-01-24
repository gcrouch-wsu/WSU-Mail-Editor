import type { Program, Rules } from './types'
import { HTML_TEMPLATE } from './html-template'

export function buildBadgeStyles(rules: Rules): string {
  const styles: string[] = []
  const badgeStyles = rules.ui.badge_styles
  for (const [className, gradient] of Object.entries(badgeStyles)) {
    if (className && gradient) {
      styles.push(
        `.wsu-badge.${className} {\n    background: ${gradient};\n}`
      )
    }
  }
  return styles.join('\n\n')
}

export function buildUiConfig(rules: Rules) {
  const filters = rules.ui.filter_definitions.map((entry) => {
    const cleaned: {
      type: string
      label: string
      badge?: string
      badgeClass?: string
    } = {
      type: entry.type,
      label: entry.label,
    }
    if (entry.badge) {
      cleaned.badge = entry.badge
    }
    const badgeClass = entry.badge_class || entry.badgeClass
    if (badgeClass) {
      cleaned.badgeClass = badgeClass
    }
    return cleaned
  })

  return {
    badgeMap: rules.ui.badge_map,
    classificationOrder: rules.classification_order,
    filterDefinitions: filters,
  }
}

export function generateHtmlBlock(
  programs: Program[],
  sourceName: string,
  rules: Rules
): [string, number] {
  const programsJson = JSON.stringify(programs)
  const programsJsonEscaped = escapeHtml(programsJson)
  const configJson = JSON.stringify(buildUiConfig(rules))
  const configJsonEscaped = escapeHtml(configJson)
  const badgeStyles = buildBadgeStyles(rules)

  let htmlFinal = HTML_TEMPLATE
  htmlFinal = htmlFinal.replace('__PROGRAMS_JSON__', programsJsonEscaped)
  htmlFinal = htmlFinal.replace('__CONFIG_JSON__', configJsonEscaped)
  htmlFinal = htmlFinal.replace('__BADGE_STYLES__', badgeStyles)

  if (
    htmlFinal.includes('__PROGRAMS_JSON__') ||
    htmlFinal.includes('__CONFIG_JSON__')
  ) {
    throw new Error('Failed to inject data into HTML template.')
  }

  const generationTime = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const rulesVersion = rules.version || 'unknown'
  const htmlComment = `<!--
=============================================================================
WSU Graduate Programs Factsheet - Generated HTML Block
=============================================================================
Generated: ${generationTime}
Source: ${sourceName}
Programs: ${programs.length} program groups
Data Size: ${programsJson.length.toLocaleString()} characters
Rules Version: ${rulesVersion}

Deployment Instructions:
1. Copy the entire contents of this file
2. Paste into WordPress Custom HTML block
3. Load factsheet.js via Code Snippets (footer)

=============================================================================
-->
`
  htmlFinal = htmlComment + htmlFinal

  return [htmlFinal, programsJson.length]
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
