export interface Rules {
  version: number
  program_name_normalizations: Record<string, string>
  degree_type_classifications: Record<string, string>
  classification_order: string[]
  supported_degree_types: string[]
  degree_keywords: string[]
  prefix_separators: string[]
  program_name_fallbacks: Array<{
    delimiter: string
    position: 'before' | 'after'
  }>
  shortname_rules: {
    only_when_grouping: boolean
    graduate_certificate_label: string
  }
  title_rules: {
    replace_non_acronym_parentheses_with_dash: boolean
    inject_acronym_from_shortname: boolean
    verify_title_when_no_degree_keyword: boolean
  }
  ui: {
    badge_map: Record<
      string,
      {
        text: string
        class: string
        label: string
      }
    >
    badge_styles: Record<string, string>
    filter_definitions: Array<{
      type: string
      label: string
      badge?: string
      badge_class?: string
      badgeClass?: string
    }>
  }
}

export interface Factsheet {
  id: string
  post_id: string
  title: string
  link: string
  shortname_raw: string
  shortname: string
  program_name_raw: string
  program_names: string[]
  program_name: string
  degree_types: string[]
  status: string
  include_in_programs: string
}

export interface ProgramEntry {
  title: string
  url: string
  shortname: string
  classifications: string[]
}

export interface Program {
  name: string
  shortname: string
  entries: ProgramEntry[]
  classification: string
  classifications: string[]
  letter: string
}

export interface RecommendationEntry {
  id: string
  post_id: string
  title: string
  shortname_raw: string
  program_name_raw: string
  program_name: string
  degree_types: string[]
  edit_link: string
  suggested: {
    'Post Title': string | null
    Shortname: string | null
    'Program Name': string | null
    'Degree Types': string | null
  }
  needs_edit: boolean
}

export interface Override {
  name?: string
  shortname?: string
  program_name?: string
  degree_types?: string[]
  rules_ok?: boolean
}
