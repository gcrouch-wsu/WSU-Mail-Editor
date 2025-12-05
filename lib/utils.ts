// utils.ts - Utility functions

/**
 * Clone an object deeply
 */
export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Debounce function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms = 300
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null
  return function (...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

/**
 * Escape HTML
 */
export function escapeHtml(text: string | null | undefined): string {
  if (text == null) return ''
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return String(text).replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Process HTML to add email-safe inline styles to lists
 * This ensures proper line spacing in email clients
 * Preserves line-height and margin-bottom from TiptapEditor's spacing controls
 * Note: Editor applies styles to <li> elements (line-height for wrapped text, margin-bottom for item spacing)
 */
export function processListStyles(html: string): string {
  if (!html || typeof html !== 'string') return html

  // Process <ul> and <ol> elements - add email-safe container styles only
  // Note: Editor applies line-height and margin-bottom to <li> elements, not containers
  let processed = html.replace(
    /<ul([^>]*)>/gi,
    (match, attrs) => {
      // Default email-safe styles for container
      const defaultStyles = 'margin: 0.5em 0; padding-left: 1.5em;'

      if (attrs && attrs.includes('style=')) {
        const styleMatch = attrs.match(/style="([^"]*)"/i)
        if (styleMatch) {
          const existingStyle = styleMatch[1]
          // Merge defaults with existing styles (don't override)
          const mergedStyle = `${defaultStyles} ${existingStyle}`.trim()
          return match.replace(/style="[^"]*"/i, `style="${mergedStyle}"`)
        }
      }
      
      // Add new style attribute with defaults
      const trimmedAttrs = attrs.trim()
      const newAttrs = trimmedAttrs ? ` ${trimmedAttrs}` : ''
      return `<ul${newAttrs} style="${defaultStyles}">`
    }
  )

  processed = processed.replace(
    /<ol([^>]*)>/gi,
    (match, attrs) => {
      // Default email-safe styles for container
      const defaultStyles = 'margin: 0.5em 0; padding-left: 1.5em;'

      if (attrs && attrs.includes('style=')) {
        const styleMatch = attrs.match(/style="([^"]*)"/i)
        if (styleMatch) {
          const existingStyle = styleMatch[1]
          // Merge defaults with existing styles (don't override)
          const mergedStyle = `${defaultStyles} ${existingStyle}`.trim()
          return match.replace(/style="[^"]*"/i, `style="${mergedStyle}"`)
        }
      }
      
      // Add new style attribute with defaults
      const trimmedAttrs = attrs.trim()
      const newAttrs = trimmedAttrs ? ` ${trimmedAttrs}` : ''
      return `<ol${newAttrs} style="${defaultStyles}">`
    }
  )

  // Process <li> elements - preserve line-height and margin-bottom from editor, add email-safe defaults
  processed = processed.replace(
    /<li([^>]*)>/gi,
    (match, attrs) => {
      if (attrs && attrs.includes('style=')) {
        return match.replace(
          /style="([^"]*)"/i,
          (styleMatch, existingStyles) => {
            // Extract line-height and margin-bottom if they exist (from editor controls)
            let preservedLineHeight = ''
            let preservedMarginBottom = ''
            
            const lineHeightMatch = existingStyles.match(/line-height\s*:\s*([^;]+?)(;|$)/i)
            if (lineHeightMatch) {
              preservedLineHeight = `line-height: ${lineHeightMatch[1].trim()};`
            }
            
            const marginBottomMatch = existingStyles.match(/margin-bottom\s*:\s*([^;]+?)(;|$)/i)
            if (marginBottomMatch) {
              preservedMarginBottom = `margin-bottom: ${marginBottomMatch[1].trim()};`
            }
            
            // Remove line-height and margin-bottom from existing styles (we'll add them back)
            const cleanedStyles = existingStyles
              .replace(/line-height\s*:\s*[^;]+;?/gi, '')
              .replace(/margin-bottom\s*:\s*[^;]+;?/gi, '')
              .trim()
            
            // Build final style: preserved values + email-safe defaults + any other styles
            const itemStyles = 'margin:0; padding:0;'
            const preservedStyles = `${preservedLineHeight} ${preservedMarginBottom}`.trim()
            const mergedStyles = `${itemStyles} ${preservedStyles} ${cleanedStyles}`.trim()
            
            return `style="${mergedStyles}"`
          }
        )
      } else {
        // No existing styles - add email-safe defaults only (editor will add line-height/margin-bottom when user interacts)
        return `<li${attrs} style="margin:0; padding:0;">`
      }
    }
  )

  return processed
}

