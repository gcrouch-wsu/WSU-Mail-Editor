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
 */
export function processListStyles(html: string): string {
  if (!html || typeof html !== 'string') return html

  // Process <ul> and <ol> elements
  let processed = html.replace(
    /<ul([^>]*)>/gi,
    (match, attrs) => {
      // Check if style attribute already exists
      if (attrs && attrs.includes('style=')) {
        // Add to existing style
        return match.replace(
          /style="([^"]*)"/i,
          (styleMatch, existingStyles) => {
            const listStyles = 'margin:0.5em 0; padding-left:1.5em;'
            return `style="${existingStyles} ${listStyles}"`
          }
        )
      } else {
        // Add new style attribute
        return `<ul${attrs} style="margin:0.5em 0; padding-left:1.5em;">`
      }
    }
  )

  processed = processed.replace(
    /<ol([^>]*)>/gi,
    (match, attrs) => {
      if (attrs && attrs.includes('style=')) {
        return match.replace(
          /style="([^"]*)"/i,
          (styleMatch, existingStyles) => {
            const listStyles = 'margin:0.5em 0; padding-left:1.5em;'
            return `style="${existingStyles} ${listStyles}"`
          }
        )
      } else {
        return `<ol${attrs} style="margin:0.5em 0; padding-left:1.5em;">`
      }
    }
  )

  // Process <li> elements
  processed = processed.replace(
    /<li([^>]*)>/gi,
    (match, attrs) => {
      if (attrs && attrs.includes('style=')) {
        return match.replace(
          /style="([^"]*)"/i,
          (styleMatch, existingStyles) => {
            const itemStyles = 'margin:0; padding:0; line-height:1.2;'
            return `style="${existingStyles} ${itemStyles}"`
          }
        )
      } else {
        return `<li${attrs} style="margin:0; padding:0; line-height:1.2;">`
      }
    }
  )

  return processed
}

