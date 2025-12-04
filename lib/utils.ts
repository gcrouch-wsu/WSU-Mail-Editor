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
 * Preserves line-height from TiptapEditor's spacing control
 */
export function processListStyles(html: string): string {
  if (!html || typeof html !== 'string') return html

  // Process <ul> and <ol> elements
  let processed = html.replace(
    /<ul([^>]*)>/gi,
    (match, attrs) => {
      // Extract existing style if present
      let existingStyle = ''
      let lineHeight = ''
      if (attrs && attrs.includes('style=')) {
        const styleMatch = attrs.match(/style="([^"]*)"/i)
        if (styleMatch) {
          existingStyle = styleMatch[1]
          // Extract line-height if it exists (from TiptapEditor spacing control)
          // Match: line-height: VALUE; or line-height:VALUE (with or without semicolon)
          const lineHeightMatch = existingStyle.match(/line-height\s*:\s*([^;]+?)(;|$)/i)
          if (lineHeightMatch) {
            // Preserve the exact value from the editor
            lineHeight = `line-height: ${lineHeightMatch[1].trim()};`
          }
        }
      }

      // Default email-safe styles (only add if not already present)
      const defaultStyles = 'margin: 0.5em 0; padding-left: 1.5em;'
      const finalLineHeight = lineHeight || 'line-height: 1.6;' // default if not set

      if (existingStyle) {
        // If line-height exists, preserve it and just ensure defaults are present
        if (lineHeight) {
          // Remove old line-height from existing style
          const cleanedStyle = existingStyle.replace(/line-height\s*:\s*[^;]+;?/gi, '').trim()
          // Merge: defaults first, then preserved line-height, then rest
          const mergedStyle = `${defaultStyles} ${finalLineHeight} ${cleanedStyle}`.trim()
          return match.replace(/style="[^"]*"/i, `style="${mergedStyle}"`)
        } else {
          // No line-height in existing style, add defaults and default line-height
          const mergedStyle = `${existingStyle} ${defaultStyles} ${finalLineHeight}`.trim()
          return match.replace(/style="[^"]*"/i, `style="${mergedStyle}"`)
        }
      } else {
        // Add new style attribute with defaults
        const trimmedAttrs = attrs.trim()
        const newAttrs = trimmedAttrs ? ` ${trimmedAttrs}` : ''
        return `<ul${newAttrs} style="${defaultStyles} ${finalLineHeight}">`
      }
    }
  )

  processed = processed.replace(
    /<ol([^>]*)>/gi,
    (match, attrs) => {
      // Extract existing style if present
      let existingStyle = ''
      let lineHeight = ''
      if (attrs && attrs.includes('style=')) {
        const styleMatch = attrs.match(/style="([^"]*)"/i)
        if (styleMatch) {
          existingStyle = styleMatch[1]
          // Extract line-height if it exists (from TiptapEditor spacing control)
          // Match: line-height: VALUE; or line-height:VALUE (with or without semicolon)
          const lineHeightMatch = existingStyle.match(/line-height\s*:\s*([^;]+?)(;|$)/i)
          if (lineHeightMatch) {
            // Preserve the exact value from the editor
            lineHeight = `line-height: ${lineHeightMatch[1].trim()};`
          }
        }
      }

      // Default email-safe styles (only add if not already present)
      const defaultStyles = 'margin: 0.5em 0; padding-left: 1.5em;'
      const finalLineHeight = lineHeight || 'line-height: 1.6;' // default if not set

      if (existingStyle) {
        // If line-height exists, preserve it and just ensure defaults are present
        if (lineHeight) {
          // Remove old line-height from existing style
          const cleanedStyle = existingStyle.replace(/line-height\s*:\s*[^;]+;?/gi, '').trim()
          // Merge: defaults first, then preserved line-height, then rest
          const mergedStyle = `${defaultStyles} ${finalLineHeight} ${cleanedStyle}`.trim()
          return match.replace(/style="[^"]*"/i, `style="${mergedStyle}"`)
        } else {
          // No line-height in existing style, add defaults and default line-height
          const mergedStyle = `${existingStyle} ${defaultStyles} ${finalLineHeight}`.trim()
          return match.replace(/style="[^"]*"/i, `style="${mergedStyle}"`)
        }
      } else {
        // Add new style attribute with defaults
        const trimmedAttrs = attrs.trim()
        const newAttrs = trimmedAttrs ? ` ${trimmedAttrs}` : ''
        return `<ol${newAttrs} style="${defaultStyles} ${finalLineHeight}">`
      }
    }
  )

  // Process <li> elements - use inherit so they respect parent ul/ol line-height
  processed = processed.replace(
    /<li([^>]*)>/gi,
    (match, attrs) => {
      if (attrs && attrs.includes('style=')) {
        return match.replace(
          /style="([^"]*)"/i,
          (styleMatch, existingStyles) => {
            // Remove any existing line-height and use inherit to respect parent
            const cleanedStyles = existingStyles.replace(/line-height\s*:\s*[^;]+;?/gi, '').trim()
            const itemStyles = 'margin:0; padding:0; line-height:inherit;'
            const mergedStyles = `${cleanedStyles} ${itemStyles}`.trim()
            return `style="${mergedStyles}"`
          }
        )
      } else {
        return `<li${attrs} style="margin:0; padding:0; line-height:inherit;">`
      }
    }
  )

  return processed
}

