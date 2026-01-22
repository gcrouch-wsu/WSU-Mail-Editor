import type { Factsheet, RecommendationEntry, Rules } from './types'
import {
  normalizeProgramName,
  splitPrefix,
  hasDegreeKeyword,
  extractAcronyms,
  normalizeToken,
  buildEditLink,
  isAcronym,
} from './rules'

export function generateRecommendations(
  factsheets: Factsheet[],
  baseAdminUrl: string,
  rules: Rules
): [RecommendationEntry[], number] {
  const included = factsheets.filter(
    (f) => f.status !== 'draft' && f.include_in_programs === '1'
  )

  const programCounts = new Map<string, number>()
  for (const f of included) {
    const rawProgram = f.program_name_raw || f.program_name || ''
    const groupKey = normalizeProgramName(rawProgram, rules) || rawProgram
    programCounts.set(groupKey, (programCounts.get(groupKey) || 0) + 1)
  }

  const entries: RecommendationEntry[] = []
  let needsEditCount = 0

  for (const f of included) {
    const title = f.title
    const shortnameRaw = f.shortname_raw
    const programNameRaw = f.program_name_raw
    const programNames = f.program_names || []
    const degreeTypes = f.degree_types

    const rawProgram = programNameRaw || f.program_name || ''
    const groupKey = normalizeProgramName(rawProgram, rules) || rawProgram
    const programTotal = programCounts.get(groupKey) || 0

    const suggested: {
      'Post Title': string | null
      Shortname: string | null
      'Program Name': string | null
      'Degree Types': string | null
    } = {
      'Post Title': null,
      Shortname: null,
      'Program Name': null,
      'Degree Types': null,
    }

    let programSuggest: string | null = null
    if (!programNameRaw) {
      const [inferredProgram] = suggestProgramFromShortname(
        shortnameRaw || f.shortname,
        rules
      )
      if (inferredProgram) {
        programSuggest = inferredProgram
      }
    }
    if (programNameRaw) {
      const normalized = normalizeProgramName(programNameRaw, rules)
      if (normalized !== programNameRaw) {
        programSuggest = normalized
      }
    }
    if (programNames.length > 1) {
      suggested['Program Name'] = 'Multiple Program Names'
    } else if (programSuggest) {
      suggested['Program Name'] = programSuggest
    } else if (!programNameRaw) {
      suggested['Program Name'] = 'assign appropriate gs-program-name term'
    }

    const shortnameRules = rules.shortname_rules
    const onlyWhenGrouping = shortnameRules.only_when_grouping
    const shouldSuggestShortname = !onlyWhenGrouping || programTotal > 1

    if (shouldSuggestShortname && shortnameRaw) {
      const shortened = suggestShortnameFromPrefixHelper(
        shortnameRaw,
        programNameRaw || f.program_name,
        rules
      )
      if (shortened) {
        if (shortened.toLowerCase() === 'graduate certificate') {
          const labelTemplate = shortnameRules.graduate_certificate_label
          if (labelTemplate && (programNameRaw || f.program_name)) {
            const programLabel = programNameRaw || f.program_name
            suggested.Shortname = labelTemplate.replace(
              '{program_name}',
              programLabel
            )
          } else {
            suggested.Shortname = shortened
          }
        } else {
          suggested.Shortname = shortened
        }
      }
    }

    if (degreeTypes.length === 0) {
      suggested['Degree Types'] = 'assign one or more degree types'
    } else {
      const supported = new Set(rules.supported_degree_types)
      const unknown = degreeTypes.filter((d) => !supported.has(d))
      if (unknown.length > 0) {
        suggested['Degree Types'] = `replace ${unknown.join(', ')} with supported labels`
      }
    }

    let titleSuggested = title
    let titleChanged = false

    const titleRules = rules.title_rules

    if (titleRules.replace_non_acronym_parentheses_with_dash) {
      const parenGroups = titleSuggested.match(/\(([^)]+)\)/g) || []
      for (const group of parenGroups) {
        const content = group.replace(/[()]/g, '')
        if (!isAcronym(content)) {
          titleSuggested = titleSuggested.replace(group, `- ${content}`)
          titleChanged = true
          break
        }
      }
    }

    if (titleRules.inject_acronym_from_shortname) {
      const acronyms = extractAcronyms(shortnameRaw || '')
      for (const ac of acronyms) {
        const acNorm = normalizeToken(ac)
        if (!acNorm) continue
        if (!normalizeToken(titleSuggested).includes(acNorm)) {
          if (titleSuggested.includes(' - ')) {
            const [base, remainder] = splitPrefix(titleSuggested, rules)
            if (base && remainder) {
              titleSuggested = `${base} (${ac}) - ${remainder}`
            } else {
              titleSuggested = `${titleSuggested} (${ac})`
            }
          } else {
            titleSuggested = `${titleSuggested} (${ac})`
          }
          titleChanged = true
          break
        }
      }
    }

    if (titleChanged) {
      suggested['Post Title'] = titleSuggested
    } else if (titleRules.verify_title_when_no_degree_keyword) {
      if (
        shortnameRaw &&
        title === shortnameRaw &&
        !hasDegreeKeyword(title, rules)
      ) {
        suggested['Post Title'] = 'verify official degree name'
      }
    }

    const needsEdit = Object.values(suggested).some((v) => v !== null)
    if (needsEdit) {
      needsEditCount++
    }

    entries.push({
      id: f.id,
      post_id: f.post_id,
      title: title,
      shortname_raw: shortnameRaw,
      program_name_raw: programNameRaw,
      program_name: f.program_name,
      degree_types: degreeTypes,
      edit_link: buildEditLink(baseAdminUrl, f.post_id),
      suggested: suggested,
      needs_edit: needsEdit,
    })
  }

  return [entries, needsEditCount]
}

export function suggestProgramFromShortname(
  shortname: string,
  rules: Rules
): [string | null, string | null] {
  if (!shortname) {
    return [null, null]
  }
  const [left, right] = splitPrefix(shortname, rules)
  if (left && right) {
    return [left, right]
  }
  return [null, null]
}

function suggestShortnameFromPrefixHelper(
  shortname: string,
  programName: string,
  rules: Rules
): string | null {
  if (!shortname || !programName) {
    return null
  }
  for (const sep of rules.prefix_separators) {
    const prefix = programName + sep
    if (shortname.startsWith(prefix)) {
      const remainder = shortname.slice(prefix.length).trim()
      return remainder || null
    }
  }
  return null
}
