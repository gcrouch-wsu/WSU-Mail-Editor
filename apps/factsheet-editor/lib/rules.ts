import defaultRules from './default-rules.json'
import type { Rules } from './types'

export function getDefaultRules(): Rules {
  return JSON.parse(JSON.stringify(defaultRules)) as Rules
}

export function cleanStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const cleaned: string[] = []
  for (const item of value) {
    if (typeof item === 'string') {
      const stripped = item.trim()
      if (stripped) {
        cleaned.push(stripped)
      }
    }
  }
  return cleaned
}

export function cleanMapping(
  value: unknown
): Record<string, string> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  const cleaned: Record<string, string> = {}
  for (const [key, val] of Object.entries(value)) {
    if (typeof key === 'string' && typeof val === 'string') {
      const k = key.trim()
      const v = val.trim()
      if (k && v) {
        cleaned[k] = v
      }
    }
  }
  return cleaned
}

export function normalizeRules(data: unknown): [Rules, string[]] {
  const rules = getDefaultRules()
  const errors: string[] = []

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return [rules, ['Rules JSON must be an object.']]
  }

  const dataObj = data as Record<string, unknown>

  const mappings = cleanMapping(dataObj.program_name_normalizations)
  if (mappings !== null) {
    rules.program_name_normalizations = mappings
  }

  const degreeMappings = cleanMapping(dataObj.degree_type_classifications)
  if (degreeMappings !== null) {
    rules.degree_type_classifications = degreeMappings
  }

  const supported = cleanStringList(dataObj.supported_degree_types)
  if (supported && supported.length > 0) {
    rules.supported_degree_types = supported
  } else {
    rules.supported_degree_types = Object.keys(
      rules.degree_type_classifications
    )
  }

  const keywords = cleanStringList(dataObj.degree_keywords)
  if (keywords !== null) {
    rules.degree_keywords = keywords
  }

  const separators = cleanStringList(dataObj.prefix_separators)
  if (separators !== null) {
    rules.prefix_separators = separators
  }

  const order = cleanStringList(dataObj.classification_order)
  if (order && order.length > 0) {
    rules.classification_order = order
  }

  const shortnameRules = dataObj.shortname_rules
  if (typeof shortnameRules === 'object' && shortnameRules !== null) {
    const sr = shortnameRules as Record<string, unknown>
    if ('only_when_grouping' in sr) {
      rules.shortname_rules.only_when_grouping = Boolean(
        sr.only_when_grouping
      )
    }
    const label = sr.graduate_certificate_label
    if (typeof label === 'string' && label.trim()) {
      rules.shortname_rules.graduate_certificate_label = label.trim()
    }
  }

  const titleRules = dataObj.title_rules
  if (typeof titleRules === 'object' && titleRules !== null) {
    const tr = titleRules as Record<string, unknown>
    if ('replace_non_acronym_parentheses_with_dash' in tr) {
      rules.title_rules.replace_non_acronym_parentheses_with_dash = Boolean(
        tr.replace_non_acronym_parentheses_with_dash
      )
    }
    if ('inject_acronym_from_shortname' in tr) {
      rules.title_rules.inject_acronym_from_shortname = Boolean(
        tr.inject_acronym_from_shortname
      )
    }
    if ('verify_title_when_no_degree_keyword' in tr) {
      rules.title_rules.verify_title_when_no_degree_keyword = Boolean(
        tr.verify_title_when_no_degree_keyword
      )
    }
  }

  const fallbacks = dataObj.program_name_fallbacks
  if (Array.isArray(fallbacks)) {
    const cleanedFallbacks: Array<{ delimiter: string; position: 'before' | 'after' }> = []
    for (const entry of fallbacks) {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        continue
      }
      const e = entry as Record<string, unknown>
      const delimiter = e.delimiter
      const position = e.position
      if (
        typeof delimiter !== 'string' ||
        !delimiter.trim() ||
        (position !== 'before' && position !== 'after')
      ) {
        continue
      }
      cleanedFallbacks.push({
        delimiter: delimiter.trim(),
        position: position as 'before' | 'after',
      })
    }
    if (cleanedFallbacks.length > 0) {
      rules.program_name_fallbacks = cleanedFallbacks
    }
  }

  const uiBlock = dataObj.ui
  if (typeof uiBlock === 'object' && uiBlock !== null) {
    const ui = uiBlock as Record<string, unknown>

    const badgeMap = ui.badge_map
    if (typeof badgeMap === 'object' && badgeMap !== null && !Array.isArray(badgeMap)) {
      const cleanedBadgeMap = { ...rules.ui.badge_map }
      for (const [key, val] of Object.entries(badgeMap)) {
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          const v = val as Record<string, unknown>
          const text = v.text
          const badgeClass = v.class
          const label = v.label
          if (
            typeof text === 'string' &&
            typeof badgeClass === 'string' &&
            typeof label === 'string'
          ) {
            cleanedBadgeMap[key.trim()] = {
              text: text.trim(),
              class: badgeClass.trim(),
              label: label.trim(),
            }
          }
        }
      }
      rules.ui.badge_map = cleanedBadgeMap
    }

    const badgeStyles = ui.badge_styles
    if (typeof badgeStyles === 'object' && badgeStyles !== null && !Array.isArray(badgeStyles)) {
      const cleanedStyles = { ...rules.ui.badge_styles }
      for (const [key, val] of Object.entries(badgeStyles)) {
        if (typeof key === 'string' && typeof val === 'string') {
          const k = key.trim()
          const v = val.trim()
          if (k && v) {
            cleanedStyles[k] = v
          }
        }
      }
      rules.ui.badge_styles = cleanedStyles
    }

    const filters = ui.filter_definitions
    if (Array.isArray(filters)) {
      const cleanedFilters: Array<{
        type: string
        label: string
        badge?: string
        badge_class?: string
      }> = []
      for (const entry of filters) {
        if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
          continue
        }
        const e = entry as Record<string, unknown>
        const fType = e.type
        const label = e.label
        if (typeof fType !== 'string' || typeof label !== 'string') {
          continue
        }
        const filterItem: {
          type: string
          label: string
          badge?: string
          badge_class?: string
        } = {
          type: fType.trim(),
          label: label.trim(),
        }
        const badge = e.badge
        const badgeClass = (e.badge_class || e.badgeClass) as string | undefined
        if (typeof badge === 'string' && badge.trim()) {
          filterItem.badge = badge.trim()
        }
        if (typeof badgeClass === 'string' && badgeClass.trim()) {
          filterItem.badge_class = badgeClass.trim()
        }
        cleanedFilters.push(filterItem)
      }
      if (cleanedFilters.length > 0) {
        rules.ui.filter_definitions = cleanedFilters
      }
    }
  }

  const mappingValues = Array.from(
    new Set(Object.values(rules.degree_type_classifications))
  ).sort()
  for (const value of mappingValues) {
    if (!rules.classification_order.includes(value)) {
      rules.classification_order.push(value)
    }
  }

  if (rules.classification_order.length === 0) {
    rules.classification_order = mappingValues
  }

  return [rules, errors]
}

export function getDegreeClassification(
  degreeType: string,
  rules: Rules
): string {
  return rules.degree_type_classifications[degreeType] || 'other'
}

export function normalizeProgramName(
  programName: string,
  rules: Rules
): string {
  if (!programName) {
    return programName
  }
  return rules.program_name_normalizations[programName] || programName
}

export function sortClassifications(
  classifications: string[],
  rules: Rules
): string[] {
  const order = rules.classification_order
  return [...classifications].sort((a, b) => {
    const aIndex = order.indexOf(a)
    const bIndex = order.indexOf(b)
    const aRank = aIndex === -1 ? 999 : aIndex
    const bRank = bIndex === -1 ? 999 : bIndex
    return aRank - bRank
  })
}

export function getClassificationRank(
  classifications: string[],
  rules: Rules
): number {
  const order = rules.classification_order
  if (classifications.length === 0) {
    return order.length
  }
  const ranks = classifications
    .map((c) => order.indexOf(c))
    .filter((r) => r !== -1)
  return ranks.length > 0 ? Math.min(...ranks) : order.length
}

export function hasDegreeKeyword(text: string, rules: Rules): boolean {
  const textLower = (text || '').toLowerCase()
  return rules.degree_keywords.some((k) => textLower.includes(k.toLowerCase()))
}

export function splitPrefix(
  text: string,
  rules: Rules
): [string, string, string] | [null, null, null] {
  for (const sep of rules.prefix_separators) {
    if (text.includes(sep)) {
      const [left, right] = text.split(sep, 2)
      return [left.trim(), right.trim(), sep]
    }
  }
  return [null, null, null]
}

export function inferProgramNameFromShortname(
  shortname: string,
  rules: Rules
): string {
  if (!shortname) {
    return shortname
  }
  for (const entry of rules.program_name_fallbacks) {
    const delimiter = entry.delimiter
    if (!shortname.includes(delimiter)) {
      continue
    }
    const [left, right] = shortname.split(delimiter, 2)
    if (entry.position === 'before') {
      return left.trim()
    }
    if (entry.position === 'after') {
      return right.trim()
    }
  }
  return shortname
}

export function extractAcronyms(text: string): string[] {
  const acronyms: string[] = []
  const tokens = text.match(/\b[\w.]+\b/g) || []
  for (const token of tokens) {
    const stripped = token.replace(/\./g, '').trim()
    if (!stripped || /^\d+$/.test(stripped)) {
      continue
    }
    const upperCount = (stripped.match(/[A-Z]/g) || []).length
    if (upperCount >= 2 && stripped.length >= 2 && stripped.length <= 8) {
      acronyms.push(token)
    }
  }
  return acronyms
}

export function isAcronym(text: string): boolean {
  if (!text) {
    return false
  }
  const stripped = text.replace(/\./g, '').trim()
  if (!stripped) {
    return false
  }
  const upperCount = (stripped.match(/[A-Z]/g) || []).length
  return upperCount >= 2 && stripped.length <= 8
}

export function normalizeToken(text: string): string {
  return (text || '').toLowerCase().replace(/\W+/g, '')
}

export function buildEditLink(baseUrl: string, postId: string): string {
  if (!baseUrl || !postId) {
    return ''
  }
  const base = baseUrl.replace(/\/+$/, '') + '/'
  return `${base}wp-admin/post.php?post=${postId}&action=edit`
}

export function buildRulesSummary(rules: Rules) {
  return {
    degree_type_count: rules.supported_degree_types.length,
    classification_count: rules.classification_order.length,
    badge_count: Object.keys(rules.ui.badge_map).length,
    filter_count: rules.ui.filter_definitions.length,
  }
}
