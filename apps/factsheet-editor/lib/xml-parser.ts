import { parseString } from 'xml2js'
import type { Factsheet, Rules } from './types'
import {
  normalizeProgramName,
  inferProgramNameFromShortname,
} from './rules'

const NAMESPACE = {
  content: 'http://purl.org/rss/1.0/modules/content/',
  wp: 'http://wordpress.org/export/1.2/',
  dc: 'http://purl.org/dc/elements/1.1/',
}

export async function parseWxr(
  xmlBytes: Buffer,
  rules: Rules
): Promise<Factsheet[]> {
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

          for (const item of items) {
            if (!item) continue

            // Handle namespaced elements - xml2js uses $ for attributes and _ for text
            const wpNamespace = 'http://wordpress.org/export/1.2/'
            const postType = item[`${wpNamespace}post_type`] || 
                           (item.$ && item.$['xmlns:wp'] && item['wp:post_type']) ||
                           (typeof item === 'object' && 'post_type' in item ? (item as any).post_type : null)
            
            // Try multiple ways to access post_type
            let actualPostType = ''
            if (typeof item === 'object' && item !== null) {
              const itemObj = item as any
              actualPostType = itemObj['wp:post_type'] || 
                             itemObj.post_type || 
                             (itemObj.$ && itemObj.$['xmlns:wp'] ? itemObj['wp:post_type'] : '') ||
                             ''
            }

            if (actualPostType !== 'gs-factsheet') {
              continue
            }

            const itemObj = item as any
            const postId = itemObj['wp:post_id'] || itemObj.post_id || ''
            const status = itemObj['wp:status'] || itemObj.status || ''
            const title = (typeof itemObj.title === 'string' ? itemObj.title : itemObj.title?._ || itemObj.title?.[0] || '') || ''
            const link = (typeof itemObj.link === 'string' ? itemObj.link : itemObj.link?._ || itemObj.link?.[0] || '') || ''

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
              const key = metaObj['wp:meta_key']?._ || metaObj['wp:meta_key'] || metaObj.meta_key?._ || metaObj.meta_key || ''
              const value = metaObj['wp:meta_value']?._ || metaObj['wp:meta_value'] || metaObj.meta_value?._ || metaObj.meta_value || ''
              
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
              const domain = catObj.$.domain || catObj.domain || ''
              const text = catObj._ || catObj.$?._ || (typeof catObj === 'string' ? catObj : '') || ''

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
