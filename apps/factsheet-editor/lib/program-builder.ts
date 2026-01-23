import type {
  Factsheet,
  Program,
  ProgramEntry,
  Rules,
  Override,
} from './types'
import {
  getDegreeClassification,
  normalizeProgramName,
  sortClassifications,
  getClassificationRank,
} from './rules'

export function buildProgramsFromFactsheets(
  factsheets: Factsheet[],
  rules: Rules,
  includeMissingDegreeTypes = false
): [Program[], number, number] {
  const factsheetsByKey = new Map<
    string,
    {
      title: string
      url: string
      shortname: string
      program_name: string
      classifications: string[]
    }
  >()

  let processedCount = 0
  let skippedCount = 0
  let skippedDraft = 0
  let skippedNotIncluded = 0
  let skippedNoDegreeTypes = 0

  for (const factsheet of factsheets) {
    if (factsheet.status === 'draft') {
      skippedDraft++
      skippedCount++
      continue
    }
    
    if (factsheet.include_in_programs !== '1') {
      skippedNotIncluded++
      skippedCount++
      continue
    }

    const degreeTypes = factsheet.degree_types
    if (!degreeTypes.length && !includeMissingDegreeTypes) {
      skippedNoDegreeTypes++
      skippedCount++
      continue
    }

    const titleText = factsheet.title
    const linkText = factsheet.link
    const shortname = factsheet.shortname || titleText
    const programName =
      normalizeProgramName(factsheet.program_name, rules) || shortname

    const factsheetKey = `${titleText}|${linkText}`

    if (!factsheetsByKey.has(factsheetKey)) {
      factsheetsByKey.set(factsheetKey, {
        title: titleText,
        url: linkText,
        shortname: shortname,
        program_name: programName,
        classifications: [],
      })
    }

    const entry = factsheetsByKey.get(factsheetKey)!
    for (const degreeType of degreeTypes) {
      const classification = getDegreeClassification(degreeType, rules)
      if (!entry.classifications.includes(classification)) {
        entry.classifications.push(classification)
      }
    }

    processedCount++
  }

  if (factsheetsByKey.size === 0) {
    const totalFactsheets = factsheets.length
    const diagnosticInfo = {
      totalFactsheets,
      skippedDraft,
      skippedNotIncluded,
      skippedNoDegreeTypes,
      totalSkipped: skippedCount,
    }
    console.error('No factsheets passed filters:', diagnosticInfo)
    throw new Error(
      `No factsheets were found in the export. ` +
      `Total factsheets: ${totalFactsheets}, ` +
      `Skipped (draft: ${skippedDraft}, not included: ${skippedNotIncluded}, no degree types: ${skippedNoDegreeTypes}). ` +
      `Check that factsheets have status='publish', include_in_programs='1', and at least one degree type.`
    )
  }

  const factsheetsByProgramAndShortname = new Map<
    string,
    Map<string, ProgramEntry[]>
  >()

  for (const factsheetData of factsheetsByKey.values()) {
    const programName = factsheetData.program_name
    const shortname = factsheetData.shortname

    if (!factsheetsByProgramAndShortname.has(programName)) {
      factsheetsByProgramAndShortname.set(programName, new Map())
    }

    const shortnameMap = factsheetsByProgramAndShortname.get(programName)!
    if (!shortnameMap.has(shortname)) {
      shortnameMap.set(shortname, [])
    }

    shortnameMap.get(shortname)!.push({
      title: factsheetData.title,
      url: factsheetData.url,
      shortname: shortname,
      classifications: factsheetData.classifications,
    })
  }

  const sortedProgramNames = Array.from(
    factsheetsByProgramAndShortname.keys()
  ).sort()

  const programs: Program[] = []

  for (const programName of sortedProgramNames) {
    const shortnameGroups = factsheetsByProgramAndShortname.get(programName)!
    const sortedShortnames = Array.from(shortnameGroups.keys()).sort()

    for (const shortname of sortedShortnames) {
      const entries = shortnameGroups.get(shortname)!
      const sortedEntries = [...entries].sort((a, b) => {
        const aRank = getClassificationRank(a.classifications, rules)
        const bRank = getClassificationRank(b.classifications, rules)
        if (aRank !== bRank) {
          return aRank - bRank
        }
        return (a.title || '').toLowerCase().localeCompare(
          (b.title || '').toLowerCase()
        )
      })

      let firstLetter = programName[0]?.toUpperCase() || 'A'
      if (!/[A-Z]/.test(firstLetter)) {
        firstLetter = 'A'
      }

      const allClassifications: string[] = []
      for (const entry of sortedEntries) {
        for (const classification of entry.classifications) {
          if (!allClassifications.includes(classification)) {
            allClassifications.push(classification)
          }
        }
      }

      const sortedClassifications = sortClassifications(allClassifications, rules)
      const primaryClassification =
        sortedClassifications[0] || 'other'

      programs.push({
        name: programName,
        shortname: shortname,
        entries: sortedEntries,
        classification: primaryClassification,
        classifications: sortedClassifications,
        letter: firstLetter,
      })
    }
  }

  return [programs, processedCount, skippedCount]
}

export function buildEffectiveFactsheets(
  factsheets: Factsheet[],
  overrides: Record<string, Override>,
  _rules: Rules
): Factsheet[] {
  if (!factsheets || factsheets.length === 0) {
    console.warn('buildEffectiveFactsheets: No factsheets provided')
    return []
  }

  const effective: Factsheet[] = []

  for (const factsheet of factsheets) {
    if (!factsheet) {
      console.warn('buildEffectiveFactsheets: Skipping null/undefined factsheet')
      continue
    }

    const override = overrides[factsheet.id] || {}
    const effectiveFactsheet = { ...factsheet }

    if (override.name) {
      effectiveFactsheet.title = override.name
    }
    if (override.shortname) {
      effectiveFactsheet.shortname = override.shortname
    }
    if (override.program_name) {
      effectiveFactsheet.program_name = override.program_name
    }
    if (override.degree_types) {
      effectiveFactsheet.degree_types = override.degree_types
    }

    effective.push(effectiveFactsheet)
  }

  if (effective.length === 0 && factsheets.length > 0) {
    console.error('buildEffectiveFactsheets: All factsheets were filtered out', {
      inputCount: factsheets.length,
      overridesCount: Object.keys(overrides).length,
    })
  }

  return effective
}
