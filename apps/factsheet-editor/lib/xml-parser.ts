import { parseString } from 'xml2js'
import type { Factsheet, Rules } from './types'
import {
  normalizeProgramName,
  inferProgramNameFromShortname,
} from './rules'

// XML namespaces for WordPress WXR format
// const NAMESPACE = {
//   content: 'http://purl.org/rss/1.0/modules/content/',
//   wp: 'http://wordpress.org/export/1.2/',
//   dc: 'http://purl.org/dc/elements/1.1/',
// }

export async function parseWxr(
  xmlBytes: Buffer,
  rules: Rules
): Promise<Factsheet[]> {
  const getText = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (Array.isArray(value)) {
      return getText(value[0])
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value)
    }
    if (typeof value === 'object') {
      const obj = value as { _: unknown; '#text'?: unknown; value?: unknown }
      if (obj._ !== undefined) return String(obj._)
      if (obj['#text'] !== undefined) return String(obj['#text'])
      if (obj.value !== undefined) return String(obj.value)
    }
    return ''
  }

  return new Promise((resolve, reject) => {
    parseString(
      xmlBytes.toString('utf-8'),
      {
        explicitArray: false,
        mergeAttrs: false,
        explicitCharkey: false,
        trim: true,
        xmlns: true,
        tagNameProcessors: [],
        attrNameProcessors: [],
      },
      (err, result) => {
        if (err) {
          reject(new Error(`Invalid WordPress export format: ${err.message}`))
          return
        }

        try {
          const channel = result?.rss?.channel
          if (!channel) {
            reject(
              new Error('Invalid WordPress export format (no channel element found)')
            )
            return
          }

          const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : []
          const factsheets: Factsheet[] = []
          
          console.log('XML parser: Total items found:', items.length)
          if (items.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sampleItem = items[0] as any
            console.log('XML parser: Sample item keys:', Object.keys(sampleItem || {}))
            console.log('XML parser: Sample item wp:post_type:', sampleItem?.['wp:post_type'])
            console.log('XML parser: Sample item post_type:', sampleItem?.post_type)
          }

          for (const item of items) {
            if (!item) continue

            // Handle namespaced elements - xml2js with xmlns:true may use different structures
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const itemObj = item as any
            
            // Try multiple ways to access post_type
            // xml2js with xmlns:true might use: item['wp:post_type'], item['$']['wp:post_type'], or nested structure
            const actualPostType = getText(
              itemObj['wp:post_type'] ||
                itemObj.post_type ||
                itemObj.$?.['wp:post_type'] ||
                itemObj.$?.post_type ||
                itemObj['http://wordpress.org/export/1.2/']?.post_type ||
                ''
            )

            if (actualPostType !== 'gs-factsheet') {
              if (items.length <= 5) {
                // Log first few items for debugging
                console.log('XML parser: Skipping item with post_type:', actualPostType || '(empty)')
              }
              continue
            }
            
            console.log('XML parser: Found gs-factsheet item')

            const postId = getText(itemObj['wp:post_id'] || itemObj.post_id || '')
            const status = getText(itemObj['wp:status'] || itemObj.status || '')
            const title = getText(itemObj.title || '')
            const link = getText(itemObj.link || '')

            let includeInPrograms = ''
            let shortnameRaw = ''

            const postmeta = Array.isArray(itemObj['wp:postmeta']) 
              ? itemObj['wp:postmeta'] 
              : itemObj['wp:postmeta'] 
              ? [itemObj['wp:postmeta']] 
              : itemObj.postmeta
              ? (Array.isArray(itemObj.postmeta) ? itemObj.postmeta : [itemObj.postmeta])
              : []

            for (const meta of postmeta) {
              if (!meta) continue
              const metaObj = meta as any
              const key = getText(
                metaObj['wp:meta_key'] || metaObj.meta_key || ''
              )
              const value = getText(
                metaObj['wp:meta_value'] || metaObj.meta_value || ''
              )
              
              if (!key) continue

              if (key === 'gsdp_include_in_programs') {
                includeInPrograms = value || ''
              } else if (key === 'gsdp_degree_shortname') {
                shortnameRaw = value || ''
              }
            }

            const shortname = shortnameRaw || title

            let programNameRaw = ''
            const programNames: string[] = []
            const degreeTypes: string[] = []

            const categories = Array.isArray(itemObj.category)
              ? itemObj.category
              : itemObj.category
              ? [itemObj.category]
              : []

            for (const category of categories) {
              if (!category) continue
              const catObj = category as any
              const domain = getText(catObj.$?.domain || catObj.domain || '')
              const text = getText(catObj._ || catObj || '')

              if (domain === 'gs-program-name') {
                if (text) {
                  programNames.push(text)
                }
                if (!programNameRaw) {
                  programNameRaw = text || ''
                }
              } else if (domain === 'gs-degree-type') {
                if (text) {
                  degreeTypes.push(text)
                }
              }
            }

            let programName = normalizeProgramName(programNameRaw, rules)

            if (!programName) {
              programName = inferProgramNameFromShortname(shortname, rules)
            }

            factsheets.push({
              id: postId || `row-${factsheets.length + 1}`,
              post_id: postId,
              title: title,
              link: link,
              shortname_raw: shortnameRaw,
              shortname: shortname,
              program_name_raw: programNameRaw,
              program_names: programNames,
              program_name: programName,
              degree_types: degreeTypes,
              status: status,
              include_in_programs: includeInPrograms,
            })
          }

          resolve(factsheets)
        } catch (error) {
          reject(
            error instanceof Error
              ? error
              : new Error('Failed to parse XML structure')
          )
        }
      }
    )
  })
}
