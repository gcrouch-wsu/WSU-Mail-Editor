// email-templates.ts - HTML generation for WSU newsletters

import {
  STYLE_TABLE,
  STYLE_IMAGE,
  STYLE_LINK,
  STYLE_H2,
  STYLE_H3,
  STYLE_BODY_TEXT,
  STYLE_META,
  STYLE_LOCATION_LABEL,
  STYLE_CARD_ACCENT,
  STYLE_CARD_BODY,
  STYLE_RESET,
  STYLE_SOCIAL_ICON_CELL,
  EMAIL_CSS,
  CRIMSON,
  TEXT_MUTED,
  TEXT_DARK,
  TEXT_BODY,
  BG_LIGHT,
  BG_CARD,
  BG_WHITE,
  BORDER_LIGHT,
  BORDER_MEDIUM,
} from './styles'
import { SLATE_VARIABLES } from './config'
import { processListStyles } from './utils'
import type {
  NewsletterData,
  Masthead,
  Section,
  SectionLayout,
  Card,
  Footer,
  Settings,
  Padding,
  StandardCard,
  EventCard,
  ResourceCard,
  CTACard,
  LetterCard,
  Closure,
} from '@/types/newsletter'

/**
 * Safe HTML escaping
 */
function esc(text: string | null | undefined): string {
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
 * Process body HTML to add email-compatible table styles
 * Email clients require inline styles on table elements
 */
function processBodyHtmlForEmail(
  html: string,
  tableOptions?: {
    borderStyle?: 'none' | 'light' | 'medium' | 'bold'
    borderColor?: string
    fontSize?: number
    headerBgColor?: string
    headerUnderline?: number
    headerUnderlineColor?: string
  }
): string {
  if (!html) {
    return html
  }

  // Always process list styles for email compatibility
  let processed = processListStyles(html)

  // Only process tables if they exist
  if (!processed.includes('<table')) {
    return processed
  }

  // Default values
  const borderStyle = tableOptions?.borderStyle || 'light'
  const borderColor = tableOptions?.borderColor || BORDER_MEDIUM
  const fontSize = tableOptions?.fontSize || 16
  const headerBgColor = tableOptions?.headerBgColor || BG_LIGHT
  const headerUnderline = tableOptions?.headerUnderline || 0
  const headerUnderlineColor = tableOptions?.headerUnderlineColor || borderColor

  // Calculate border width based on style
  const borderWidth =
    borderStyle === 'none'
      ? 0
      : borderStyle === 'light'
        ? 1
        : borderStyle === 'medium'
          ? 2
          : 3

  // Add styles to tables, table rows, and table cells
  // (processed already has list styles applied above)

  // Style tables: add border-collapse, width, and email-safe attributes
  const tableBorderStyle =
    borderWidth > 0 ? `border:${borderWidth}px solid ${borderColor};` : ''
  processed = processed.replace(
    /<table([^>]*)>/gi,
    (match, attrs) => {
      // Check if style already exists
      if (attrs.includes('style=')) {
        // Add to existing style
        return match.replace(
          /style="([^"]*)"/i,
          (styleMatch, existingStyle) => {
            const newStyle = `${existingStyle}; ${STYLE_TABLE} ${tableBorderStyle} width:100%; max-width:100%;`
            return `style="${newStyle}"`
          }
        )
      } else {
        // Add new style attribute
        const newStyle = `${STYLE_TABLE} ${tableBorderStyle} width:100%; max-width:100%;`
        return `<table style="${newStyle}"${attrs}>`
      }
    }
  )

  // Style table cells (td): add padding and borders with font size
  const cellBorderStyle =
    borderWidth > 0 ? `border:${borderWidth}px solid ${borderColor};` : ''
  const cellStyle = `${cellBorderStyle} padding:8px; vertical-align:top; font-size:${fontSize}px;`
  processed = processed.replace(
    /<td([^>]*)>/gi,
    (match, attrs) => {
      if (attrs.includes('style=')) {
        // Add to existing style
        return match.replace(
          /style="([^"]*)"/i,
          (styleMatch, existingStyle) => {
            const newStyle = `${existingStyle}; ${cellStyle}`
            return `style="${newStyle}"`
          }
        )
      } else {
        // Add new style attribute
        return `<td style="${cellStyle}"${attrs}>`
      }
    }
  )

  // Style table headers (th): add padding, borders, background color, and underline
  // Also add scope attribute for accessibility (default to "col" if not specified)
  const headerBorderStyle =
    borderWidth > 0 ? `border:${borderWidth}px solid ${borderColor};` : ''
  const headerUnderlineStyle =
    headerUnderline > 0
      ? `border-bottom:${headerUnderline}px solid ${headerUnderlineColor};`
      : ''
  const headerStyle = `${headerBorderStyle} padding:8px; vertical-align:top; background-color:${headerBgColor}; font-weight:bold; font-size:${fontSize}px; ${headerUnderlineStyle}`
  processed = processed.replace(
    /<th([^>]*)>/gi,
    (match, attrs) => {
      // Check if scope attribute already exists
      let scopeAttr = ''
      if (!attrs.includes('scope=')) {
        // Default to "col" for column headers (most common case)
        scopeAttr = ' scope="col"'
      }
      
      if (attrs.includes('style=')) {
        // Add to existing style
        return match.replace(
          /style="([^"]*)"/i,
          (styleMatch, existingStyle) => {
            const newStyle = `${existingStyle}; ${headerStyle}`
            return `style="${newStyle}"${scopeAttr}`
          }
        )
      } else {
        // Add new style attribute
        return `<th style="${headerStyle}"${scopeAttr}${attrs}>`
      }
    }
  )

  return processed
}

/**
 * Hidden preheader text for email clients
 */
export function renderPreheader(text: string): string {
  return `<div style="display:none; font-size:1px; color:#ffffff; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
${esc(text)}
</div>`
}

/**
 * Fixed 'View in Browser' link (Slate variable)
 */
export function renderViewInBrowser(): string {
  const href = SLATE_VARIABLES.view_in_browser || 'browser'
  return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${STYLE_TABLE} background-color:${BG_LIGHT};">
  <tr>
    <td align="center" style="padding:12px 0; background-color:${BG_LIGHT};">
      <table cellpadding="0" cellspacing="0" role="presentation" width="600" class="container" style="${STYLE_TABLE}">
        <tr>
          <td style="text-align:center; font-size:13px; color:${TEXT_MUTED};">
            <a href="${href}" style="${STYLE_LINK}">View in Browser</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

/**
 * Newsletter masthead with banner, title, tagline, optional hero link
 */
export function renderMasthead(data: Masthead, containerWidth = 640): string {
  const bannerUrl = data.banner_url || ''
  // Provide default alt text for accessibility if empty
  const bannerAlt = data.banner_alt || 'Washington State University Graduate School'
  const bannerAlign = data.banner_align || 'center'
  const bannerPadding = data.banner_padding || {
    top: 20,
    right: 0,
    bottom: 0,
    left: 0,
  }
  const paddingStr = `${bannerPadding.top}px ${bannerPadding.right}px ${bannerPadding.bottom}px ${bannerPadding.left}px`
  const title = data.title || ''
  const tagline = data.tagline || ''
  const heroShow = data.hero_show !== false
  const heroLink = data.hero_link || ''

  // Build banner HTML
  let bannerHtml = ''
  if (heroShow && bannerUrl) {
    const imgTag = `<img src="${esc(bannerUrl)}" alt="${esc(bannerAlt)}" width="450" style="${STYLE_IMAGE} width:100%; max-width:450px; display:inline-block;" />`

    if (heroLink) {
      bannerHtml = `<a href="${esc(heroLink)}">${imgTag}</a>`
    } else {
      bannerHtml = imgTag
    }
  }

  return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${STYLE_TABLE} background-color:${BG_LIGHT};">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" role="presentation" width="${containerWidth}" class="container" style="${STYLE_TABLE} background-color:${BG_WHITE}; border-left:1px solid ${BORDER_MEDIUM}; border-right:1px solid ${BORDER_MEDIUM}; border-top:1px solid ${BORDER_MEDIUM};">
        <tr>
          <td style="padding:${paddingStr}; text-align:${bannerAlign}; background-color:${BG_WHITE};">
            ${bannerHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px 4px; font-size:13px; line-height:1.2; color:${TEXT_MUTED}; text-transform:uppercase; letter-spacing:0.35em; text-align:center;">
            ${esc(title)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 12px; font-size:14px; line-height:1.5; color:${TEXT_MUTED}; text-align:center;">
            <em>${esc(tagline)}</em>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

/**
 * Section wrapper with heading - V7: ADDED TITLE ALIGNMENT
 */
export function renderSectionStart(
  title: string,
  layout: SectionLayout | null = null,
  showBorder = true,
  isLast = false,
  settings: Settings | null = null
): string {
  if (!layout) {
    layout = {
      padding_top: 18,
      padding_bottom: 28,
      background_color: '',
      border_radius: 0,
      divider_enabled: true,
      divider_thickness: 2,
      // Don't set divider_color here - let it fall back to global settings
      divider_spacing: 24,
      title_align: 'left',
    }
  }

  const spacing = layout.divider_spacing || 24
  let titleAlign = layout.title_align || 'left'
  const paddingTop = layout.padding_top || 18
  const paddingBottom = layout.padding_bottom || 28
  const bgColor = layout.background_color || ''
  const borderRadius = layout.border_radius || 0
  const dividerEnabled = layout.divider_enabled !== false
  const dividerThickness = layout.divider_thickness || 2
  // Use section-level divider color if set, otherwise global settings, otherwise default
  // Use section-level divider color if explicitly set, otherwise global settings, otherwise default
  const dividerColor = layout.divider_color !== undefined 
    ? layout.divider_color 
    : (settings?.divider_color !== undefined ? settings.divider_color : BORDER_LIGHT)
  // Get divider margins - use section-level if set, otherwise global settings, otherwise 0
  const dividerMarginTop = layout.divider_margin_top !== undefined 
    ? layout.divider_margin_top 
    : (settings?.divider_margin_top !== undefined ? settings.divider_margin_top : 0)
  const dividerMarginBottom = layout.divider_margin_bottom !== undefined 
    ? layout.divider_margin_bottom 
    : (settings?.divider_margin_bottom !== undefined ? settings.divider_margin_bottom : 0)

  // Validate title_align
  if (!['left', 'center', 'right'].includes(titleAlign)) {
    titleAlign = 'left'
  }

  // Hide border on last section
  // Adjust padding to account for divider margins
  let border = ''
  let adjustedPaddingBottom = paddingBottom
  
  // paddingTop is already adjusted in renderSection to account for margin below previous divider
  // So we use it directly here
  
  if (showBorder && dividerEnabled && !isLast) {
    // Add margin above divider (space before the line) - increase bottom padding
    adjustedPaddingBottom = paddingBottom + dividerMarginTop
    // Add margin below divider (space after the line) - this will be added to next section's padding-top
    // Note: dividerMarginBottom is applied to the next section's padding-top in renderSection
    border = `border-bottom:${dividerThickness}px solid ${dividerColor};`
  } else {
    // Even if no divider, we might still want to apply margin if it was set
    // But this is less common, so we'll only apply it when there's a divider
  }

  // Build container style (table style without padding - padding goes on td)
  let containerStyle = `${STYLE_TABLE}`
  if (bgColor) {
    containerStyle += ` background-color:${bgColor};`
  }
  if (borderRadius > 0) {
    containerStyle += ` border-radius:${borderRadius}px;`
  }
  
  // Build td style with padding and border
  let tdStyle = `padding-top:${paddingTop}px; padding-bottom:${adjustedPaddingBottom}px;`
  if (border) {
    tdStyle += ` ${border}`
  }

  // If title is empty, don't render H2
  if (!title || !title.trim()) {
    return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${containerStyle}">
  <tr>
    <td style="${tdStyle}">`
  }

  // H2 style with spacing and alignment
  const h2Style = `${STYLE_H2} margin-top:${spacing}px; text-align:${titleAlign};`

  return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${containerStyle}">
  <tr>
    <td style="${tdStyle}">
      <h2 style="${h2Style}">${esc(title)}</h2>`
}

/**
 * Close section wrapper
 */
export function renderSectionEnd(): string {
  return `    </td>
  </tr>
</table>`
}

/**
 * Render location/date/time meta block (only if data exists)
 */
function renderCardMeta(card: Card): string {
  const metaItems: string[] = []

  if ('location' in card && card.location) {
    metaItems.push(`<strong>Location:</strong> ${esc(card.location)}`)
  }

  if ('date' in card && card.date) {
    metaItems.push(`<strong>Date:</strong> ${esc(card.date)}`)
  }

  if ('time' in card && card.time) {
    metaItems.push(`<strong>Time:</strong> ${esc(card.time)}`)
  }

  if (metaItems.length === 0) {
    return ''
  }

  return `<p style="${STYLE_META}">${metaItems.join('<br />')}</p>`
}

/**
 * Render multiple links - bullets if 2+, pipes if 1
 */
function renderCardLinks(card: Card): string {
  const links = card.links || []
  if (links.length === 0) {
    return ''
  }

  const linkHtml: string[] = []
  for (const link of links) {
    const label = (link.label || '').trim()
    const url = (link.url || '').trim()
    // Only render links with both label and valid URL (not just "#")
    if (label && url && url !== '#') {
      linkHtml.push(
        `<a href="${esc(url)}" style="${STYLE_LINK}">${esc(label)}</a>`
      )
    }
  }

  if (linkHtml.length === 0) {
    return ''
  }

  // Use bullets if 2+ links, otherwise pipes
  if (linkHtml.length >= 2) {
    const items = linkHtml.map((link) => `<li>${link}</li>`).join('')
    return `<ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">${items}</ul>`
  } else {
    return linkHtml.join(' | ')
  }
}

/**
 * Build card style with per-card customization
 * Uses global card_border_radius from settings as default, but allows per-card override
 */
function getCardStyle(card: Card, settings: Settings | null = null): string {
  const bgColor = card.background_color || '#f9f9f9'
  // Use card-level spacing_bottom if set, otherwise global card_spacing, otherwise default 20
  const spacingBottom = card.spacing_bottom !== undefined 
    ? card.spacing_bottom 
    : (settings?.card_spacing !== undefined ? settings.card_spacing : 20)
  const borderWidth = card.border_width || 0
  const borderColor = card.border_color || '#e0e0e0'
  // Use per-card border_radius if set, otherwise fall back to global setting, otherwise 0
  const borderRadius = card.border_radius !== undefined 
    ? card.border_radius 
    : (settings?.card_border_radius || 0)

  // For border-radius to work in email clients, we need border-collapse:separate
  // Otherwise use the standard border-collapse:collapse
  const tableCollapse = borderRadius > 0 
    ? 'border-collapse:separate; border-spacing:0;' 
    : 'border-collapse:collapse;'
  
  // Don't include margin-bottom in cardStyle - spacing is handled by spacer elements between cards
  let style = `${tableCollapse} mso-table-lspace:0pt; mso-table-rspace:0pt; background-color:${bgColor};`

  if (borderWidth > 0) {
    style += ` border:${borderWidth}px solid ${borderColor};`
  }

  if (borderRadius > 0) {
    style += ` border-radius:${borderRadius}px; overflow:hidden;`
  }

  return style
}

/**
 * Get border-radius style for corner cells to ensure proper rendering in email clients
 */
function getCornerCellStyle(
  borderRadius: number,
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
): string {
  if (borderRadius <= 0) return ''
  
  const radiusMap: Record<string, string> = {
    'top-left': `border-top-left-radius:${borderRadius}px;`,
    'top-right': `border-top-right-radius:${borderRadius}px;`,
    'bottom-left': `border-bottom-left-radius:${borderRadius}px;`,
    'bottom-right': `border-bottom-right-radius:${borderRadius}px;`,
  }
  
  return radiusMap[position] || ''
}

/**
 * Get accent bar style with border-radius support
 */
function getAccentBarStyle(borderRadius: number, accentBarWidth: number = 4): string {
  // Use the specified width or default to 4px
  const width = accentBarWidth > 0 ? accentBarWidth : 4
  const baseStyle = `width:${width}px; background-color:${CRIMSON};`
  
  if (borderRadius <= 0) return baseStyle
  
  // Apply border-radius to top-left and bottom-left corners of accent bar
  const cornerStyles = `${getCornerCellStyle(borderRadius, 'top-left')} ${getCornerCellStyle(borderRadius, 'bottom-left')}`
  // Add overflow hidden to ensure rounded corners are visible
  return `${baseStyle} ${cornerStyles} overflow:hidden;`
}

/**
 * Get card padding with proper cascading - ALWAYS returns complete dict
 */
function getCardPadding(
  card: Card,
  section: Section | null = null,
  settings: Settings | null = null
): Padding {
  // Default fallback - ALWAYS has all 4 keys
  const defaultPadding: Padding = { top: 20, right: 20, bottom: 20, left: 20 }

  // Start with defaults, then override with more specific values
  const result: Padding = { ...defaultPadding }

  // 1. Apply global settings first (text or image depending on card type)
  if (card.type === 'resource' && 'show_icon' in card && card.show_icon) {
    // Resource cards with icons use padding_image
    if (settings?.padding_image) {
      Object.assign(result, settings.padding_image)
    }
  } else {
    // All other cards use padding_text
    if (settings?.padding_text) {
      Object.assign(result, settings.padding_text)
    }
  }

  // 2. Apply section-level overrides (if set)
  if (section) {
    let sectionPadding: Partial<Padding> = {}
    if (
      card.type === 'resource' &&
      'show_icon' in card &&
      card.show_icon &&
      section.layout.padding_image
    ) {
      sectionPadding = section.layout.padding_image
    } else if (section.layout.padding_text) {
      sectionPadding = section.layout.padding_text
    }

    if (sectionPadding) {
      Object.assign(result, sectionPadding)
    }
  }

  // 3. Apply card-level overrides (highest priority)
  if (card.padding) {
    Object.assign(result, card.padding)
  }

  // Ensure all values are integers
  for (const key of ['top', 'right', 'bottom', 'left'] as const) {
    if (key in result) {
      const value = result[key]
      result[key] = typeof value === 'number' ? value : 0
    } else {
      result[key] = 0
    }
  }

  return result
}

/**
 * Standard card with accent bar, title, body, meta, links
 */
function renderStandardCard(
  card: StandardCard,
  section: Section | null = null,
  settings: Settings | null = null
): string {
  const title = card.title || ''
  const bodyHtml = card.body_html || ''

  // Get card style and padding
  const cardStyle = getCardStyle(card, settings)
  const padding = getCardPadding(card, section, settings)
  const paddingStyle = `padding:${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;`

  // Build card content
  const contentParts: string[] = []

  // Title
  if (title) {
    contentParts.push(`<h3 style="${STYLE_H3}">${esc(title)}</h3>`)
  }

  // Body (allow raw HTML from rich text editor)
  if (bodyHtml) {
    const processedBody = processBodyHtmlForEmail(bodyHtml, {
      borderStyle: card.table_border_style,
      borderColor: card.table_border_color,
      fontSize: card.table_font_size,
      headerBgColor: card.table_header_bg_color,
      headerUnderline: card.table_header_underline,
      headerUnderlineColor: card.table_header_underline_color,
    })
    contentParts.push(`<div style="${STYLE_BODY_TEXT}">${processedBody}</div>`)
  }

  // Meta (location/date/time)
  const meta = renderCardMeta(card)
  if (meta) {
    contentParts.push(meta)
  }

  // Links
  const links = renderCardLinks(card)
  if (links) {
    contentParts.push(links)
  }

  const content = contentParts.join('\n')
  
  // Get border radius for corner cell styling
  const borderRadius = card.border_radius !== undefined 
    ? card.border_radius 
    : (settings?.card_border_radius || 0)
  // Get accent bar width from global settings (default 4px)
  const accentBarWidth = settings?.accent_bar_width || 4
  const accentCellStyle = getAccentBarStyle(borderRadius, accentBarWidth)
  const contentCellStyle = `${paddingStyle} ${getCornerCellStyle(borderRadius, 'top-right')} ${getCornerCellStyle(borderRadius, 'bottom-right')}`

  return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${cardStyle}">
  <tr>
    <td style="${accentCellStyle}"></td>
    <td style="${contentCellStyle}">
      ${content}
    </td>
  </tr>
</table>`
}

/**
 * Event card with location label at top
 */
function renderEventCard(
  card: EventCard,
  section: Section | null = null,
  settings: Settings | null = null
): string {
  const title = card.title || ''
  const bodyHtml = card.body_html || ''
  const location = card.location || ''

  // Get card style and padding
  const cardStyle = getCardStyle(card, settings)
  const padding = getCardPadding(card, section, settings)
  const paddingStyle = `padding:${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;`

  const contentParts: string[] = []

  // Location label (prominent at top for events)
  if (location) {
    contentParts.push(
      `<p style="${STYLE_LOCATION_LABEL}">${esc(location)}</p>`
    )
  }

  // Title
  if (title) {
    contentParts.push(`<h3 style="${STYLE_H3}">${esc(title)}</h3>`)
  }

  // Body
  if (bodyHtml) {
    contentParts.push(`<div style="${STYLE_BODY_TEXT}">${bodyHtml}</div>`)
  }

  // Date/Time meta (without location since it's already shown)
  const metaItems: string[] = []
  if (card.date) {
    metaItems.push(esc(card.date))
  }
  if (card.time) {
    metaItems.push(esc(card.time))
  }

  if (metaItems.length > 0) {
    contentParts.push(
      `<p style="${STYLE_META}">${metaItems.join('<br />')}</p>`
    )
  }

  // Links
  const links = renderCardLinks(card)
  if (links) {
    contentParts.push(links)
  }

  const content = contentParts.join('\n')
  
  // Get border radius for corner cell styling
  const borderRadius = card.border_radius !== undefined 
    ? card.border_radius 
    : (settings?.card_border_radius || 0)
  // Get accent bar width from global settings (default 4px)
  const accentBarWidth = settings?.accent_bar_width || 4
  const accentCellStyle = getAccentBarStyle(borderRadius, accentBarWidth)
  const contentCellStyle = `${paddingStyle} ${getCornerCellStyle(borderRadius, 'top-right')} ${getCornerCellStyle(borderRadius, 'bottom-right')}`

  return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${cardStyle}">
  <tr>
    <td style="${accentCellStyle}"></td>
    <td style="${contentCellStyle}">
      ${content}
    </td>
  </tr>
</table>`
}

/**
 * Resource card with optional icon
 */
function renderResourceCard(
  card: ResourceCard,
  section: Section | null = null,
  settings: Settings | null = null
): string {
  const title = card.title || ''
  const bodyHtml = card.body_html || ''
  const showIcon = card.show_icon || false
  const iconUrl = card.icon_url || ''
  // Provide default alt text for accessibility if empty
  const iconAlt = card.icon_alt || (title ? `${title} icon` : 'Resource icon')
  const iconSize = card.icon_size || 80

  // Get card style and padding
  const cardStyle = getCardStyle(card, settings)
  const padding = getCardPadding(card, section, settings)

  // Build text content
  const textParts: string[] = []
  if (title) {
    textParts.push(`<h3 style="${STYLE_H3}">${esc(title)}</h3>`)
  }
  if (bodyHtml) {
    textParts.push(`<div style="${STYLE_BODY_TEXT}">${bodyHtml}</div>`)
  }

  const meta = renderCardMeta(card)
  if (meta) {
    textParts.push(meta)
  }

  const links = renderCardLinks(card)
  if (links) {
    textParts.push(links)
  }

  const textContent = textParts.join('\n')

  // If icon enabled and URL provided
  if (showIcon && iconUrl) {
    // Apply padding once to outer cell only
    const paddingStyle = `padding:${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;`

    const iconStyle = `width:${iconSize}px; height:${iconSize}px; border-radius:6px; ${STYLE_IMAGE}`

    // Icon cell: fixed width, right spacing for gap
    const iconCellStyle = `width:${iconSize}px; padding-right:15px; vertical-align:middle; text-align:center;`

    // Text cell: just vertical alignment, no padding (outer cell handles it)
    const textCellStyle = 'vertical-align:middle;'

    const iconHtml = `<img src="${esc(iconUrl)}" alt="${esc(iconAlt)}" width="${iconSize}" height="${iconSize}" style="${iconStyle}" />`

    // Get border radius for corner cell styling
    const borderRadius = card.border_radius !== undefined 
      ? card.border_radius 
      : (settings?.card_border_radius || 0)
    const outerCellStyle = `${paddingStyle} ${getCornerCellStyle(borderRadius, 'top-left')} ${getCornerCellStyle(borderRadius, 'top-right')} ${getCornerCellStyle(borderRadius, 'bottom-left')} ${getCornerCellStyle(borderRadius, 'bottom-right')}`
    
    return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${cardStyle}">
  <tr>
    <td style="${outerCellStyle}">
      <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${STYLE_TABLE}">
        <tr>
          <td style="${iconCellStyle}">
            ${iconHtml}
          </td>
          <td style="${textCellStyle}">
            ${textContent}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
  } else {
    // No icon, render as standard card without accent bar
    const paddingStyleNoIcon = `padding:${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;`
    // Get border radius for corner cell styling
    const borderRadius = card.border_radius !== undefined 
      ? card.border_radius 
      : (settings?.card_border_radius || 0)
    const singleCellStyle = `${paddingStyleNoIcon} ${getCornerCellStyle(borderRadius, 'top-left')} ${getCornerCellStyle(borderRadius, 'top-right')} ${getCornerCellStyle(borderRadius, 'bottom-left')} ${getCornerCellStyle(borderRadius, 'bottom-right')}`
    
    return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${cardStyle}">
  <tr>
    <td style="${singleCellStyle}">
      ${textContent}
    </td>
  </tr>
</table>`
  }
}

/**
 * Letter-style card for presidential updates
 */
function renderLetterCard(
  card: LetterCard,
  section: Section | null = null,
  settings: Settings | null = null
): string {
  const greeting = (card.greeting || '').trim()
  const bodyHtml = card.body_html || ''
  const closing = (card.closing || '').trim()
  const signatureName = (card.signature_name || '').trim()
  const signatureLines = card.signature_lines || []
  const signatureImageUrl = (card.signature_image_url || '').trim()
  const signatureImageAlt = (card.signature_image_alt || 'Signature').trim()
  const signatureImageWidth = card.signature_image_width || 220

  const cardStyle = getCardStyle(card, settings)
  const padding = getCardPadding(card, section, settings)
  const paddingStyle = `padding:${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;`

  const contentParts: string[] = []

  if (greeting) {
    contentParts.push(
      `<p style="${STYLE_BODY_TEXT} margin:0 0 18px 0; font-weight:normal;">${esc(greeting)}</p>`
    )
  }

  if (bodyHtml) {
    const processedBody = processBodyHtmlForEmail(bodyHtml, {
      borderStyle: card.table_border_style,
      borderColor: card.table_border_color,
      fontSize: card.table_font_size,
      headerBgColor: card.table_header_bg_color,
      headerUnderline: card.table_header_underline,
      headerUnderlineColor: card.table_header_underline_color,
    })
    contentParts.push(
      `<div style="font-size:16px; line-height:1.6; color:${TEXT_BODY}; margin:0 0 18px 0;">${processedBody}</div>`
    )
  }

  if (closing) {
    contentParts.push(
      `<p style="${STYLE_BODY_TEXT} margin:24px 0 8px 0; font-weight:normal;">${esc(closing)}</p>`
    )
  }

  if (signatureImageUrl) {
    contentParts.push(
      `<p style="margin:0 0 12px 0;">
        <img src="${esc(signatureImageUrl)}" alt="${esc(signatureImageAlt)}" width="${signatureImageWidth}" 
        style="${STYLE_IMAGE} width:${signatureImageWidth}px; max-width:100%; height:auto; display:block;" />
      </p>`
    )
  }

  if (signatureName) {
    contentParts.push(
      `<p style="${STYLE_BODY_TEXT} margin:0 0 4px 0; font-weight:bold;">${esc(signatureName)}</p>`
    )
  }

  for (const line of signatureLines) {
    if (line.trim()) {
      contentParts.push(
        `<p style="${STYLE_BODY_TEXT} margin:0 0 4px 0; font-weight:normal;">${esc(line)}</p>`
      )
    }
  }

  const linksHtml = renderCardLinks(card)
  if (linksHtml) {
    contentParts.push(
      `<div style="margin-top:18px; font-size:14px; line-height:1.6;">${linksHtml}</div>`
    )
  }

  const content = contentParts.join('\n')
  
  // Get border radius for corner cell styling
  const borderRadius = card.border_radius !== undefined 
    ? card.border_radius 
    : (settings?.card_border_radius || 0)
  const singleCellStyle = `${paddingStyle} ${getCornerCellStyle(borderRadius, 'top-left')} ${getCornerCellStyle(borderRadius, 'top-right')} ${getCornerCellStyle(borderRadius, 'bottom-left')} ${getCornerCellStyle(borderRadius, 'bottom-right')}`

  return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${cardStyle}">
  <tr>
    <td style="${singleCellStyle}">
      ${content}
    </td>
  </tr>
</table>`
}

/**
 * Special closures list format
 */
function renderClosuresSection(closures: Closure[]): string {
  if (!closures || closures.length === 0) {
    return ''
  }

  const items: string[] = []
  for (const closure of closures) {
    const date = (closure.date || '').trim()
    const reason = (closure.reason || '').trim()
    if (date || reason) {
      items.push(`<li>${esc(date)} – ${esc(reason)}</li>`)
    }
  }

  if (items.length === 0) {
    return ''
  }

  const ulContent = items.join('\n')

  return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${STYLE_TABLE} background-color:${BG_CARD}; margin-bottom:20px;">
  <tr>
    <td style="${STYLE_CARD_BODY}">
      <ul style="margin:10px 0 0 0; padding:0 0 0 20px; color:${TEXT_BODY}; font-size:16px; line-height:1.6;">
        ${ulContent}
      </ul>
    </td>
  </tr>
</table>`
}

/**
 * Call-to-action box with fully customizable button AND padding
 */
function renderCTABox(
  title: string,
  bodyHtml: string,
  buttonLabel: string,
  buttonUrl: string,
  buttonBgColor = '#A60F2D',
  buttonTextColor = '#ffffff',
  buttonPaddingVertical = 12,
  buttonPaddingHorizontal = 32,
  buttonBorderWidth = 0,
  buttonBorderColor = '#8c0d25',
  buttonBorderRadius = 10,
  buttonAlignment: 'left' | 'center' | 'right' = 'center',
  buttonFullWidth = false,
  card: CTACard | null = null,
  section: Section | null = null,
  settings: Settings | null = null
): string {
  // Get dynamic card style and padding (like other card types)
  let cardStyle: string
  let padding: Padding
  if (card) {
    cardStyle = getCardStyle(card, settings)
    padding = getCardPadding(card, section, settings)
  } else {
    // Fallback for direct calls without card object
    cardStyle = `${STYLE_TABLE} background-color:${BG_CARD}; margin-bottom:20px; border:2px solid ${BORDER_LIGHT}; border-radius:4px;`
    padding = { top: 30, right: 20, bottom: 30, left: 20 }
  }

  const paddingStyle = `padding:${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;`

  // Build dynamic button style
  const paddingBtn = `${buttonPaddingVertical}px ${buttonPaddingHorizontal}px`
  const border =
    buttonBorderWidth > 0
      ? `${buttonBorderWidth}px solid ${buttonBorderColor}`
      : 'none'
  const width = buttonFullWidth ? '100%' : 'auto'
  const display = buttonFullWidth ? 'block' : 'inline-block'

  // Text alignment (separate from button alignment)
  let textAlignment: 'left' | 'center' | 'right' = 'left'
  if (card && 'text_alignment' in card && card.text_alignment) {
    textAlignment = card.text_alignment
  }
  if (!['left', 'center', 'right'].includes(textAlignment)) {
    textAlignment = 'left'
  }

  // Button alignment wrapper style
  let buttonWrapperStyle = ''
  if (buttonAlignment === 'left') {
    buttonWrapperStyle = 'text-align: left;'
  } else if (buttonAlignment === 'right') {
    buttonWrapperStyle = 'text-align: right;'
  } else {
    buttonWrapperStyle = 'text-align: center;'
  }

  const buttonStyle = `background-color:${buttonBgColor} !important; border-radius:${buttonBorderRadius}px; border:${border}; color:${buttonTextColor} !important; display:${display}; font-weight:bold; font-size:16px; line-height:20px; text-align:center; text-decoration:none; padding:${paddingBtn}; margin-top:24px; margin-bottom:8px; width:${width};`

  const processedBody = processBodyHtmlForEmail(bodyHtml, card
    ? {
        borderStyle: card.table_border_style,
        borderColor: card.table_border_color,
        fontSize: card.table_font_size,
        headerBgColor: card.table_header_bg_color,
        headerUnderline: card.table_header_underline,
        headerUnderlineColor: card.table_header_underline_color,
      }
    : undefined)
  // Get border radius for corner cell styling
  const borderRadius = card && card.border_radius !== undefined 
    ? card.border_radius 
    : (settings?.card_border_radius || 0)
  const ctaCellStyle = `${paddingStyle} ${getCornerCellStyle(borderRadius, 'top-left')} ${getCornerCellStyle(borderRadius, 'top-right')} ${getCornerCellStyle(borderRadius, 'bottom-left')} ${getCornerCellStyle(borderRadius, 'bottom-right')}`
  
  return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${cardStyle}">
  <tr>
    <td style="${ctaCellStyle}">
      <h2 style="${STYLE_H2} margin:0 0 16px 0; text-align:${textAlignment};">${esc(title)}</h2>
      <div style="${STYLE_BODY_TEXT} margin:0 0 8px 0; text-align:${textAlignment};">${processedBody}</div>
      <div style="${buttonWrapperStyle}">
        <a href="${esc(buttonUrl)}" data-role="cta" style="${buttonStyle}" aria-label="${esc(buttonLabel || 'Call to action button')}">${esc(buttonLabel || 'Learn more')}</a>
      </div>
    </td>
  </tr>
</table>`
}

/**
 * V7: Footer with array-based social links and configurable spacing
 */
export function renderFooter(data: Footer, templateType?: 'ff' | 'briefing' | 'letter'): string {
  const addressLines = data.address_lines || []
  const social = data.social || []

  // Colors (with defaults)
  const bgColor = data.background_color || '#2A3033'
  const textColor = data.text_color || '#cccccc'
  const linkColor = data.link_color || '#ffffff'

  // For letter template, use white background and black text
  const isLetterTemplate = templateType === 'letter' || bgColor === '#FFFFFF' || bgColor === '#ffffff'
  const finalBgColor = isLetterTemplate ? '#ffffff' : bgColor
  const finalTextColor = isLetterTemplate ? '#000000' : textColor
  const finalLinkColor = isLetterTemplate ? '#000000' : linkColor

  // Spacing controls (with defaults)
  const paddingTop = data.padding_top ?? 60
  const paddingBottom = data.padding_bottom ?? 30
  const socialMarginTop = data.social_margin_top ?? 40
  const socialMarginBottom = data.social_margin_bottom ?? 20

  // V7: Get social links array and build icons dynamically
  const socialLinks = Array.isArray(social) ? social : []

  // Build social icons HTML dynamically
  let socialIconsHtml = ''
  for (const link of socialLinks) {
    const url = (link.url || '').trim()
    const icon = (link.icon || '').trim()
    let alt = (link.alt || link.platform || 'Social Media').trim()

    // Ensure alt text always exists for accessibility
    if (!alt || alt === '') {
      alt = 'Social Media Link'
    }

    // Only render if both URL and icon exist
    if (url && icon) {
      socialIconsHtml += `
          <td style="${STYLE_SOCIAL_ICON_CELL}">
            <a href="${esc(url)}" title="${esc(alt)}">
              <img src="${esc(icon)}" alt="${esc(alt)}" width="28" height="28" style="${STYLE_IMAGE}" />
            </a>
          </td>`
    }
  }

  // Build social table (only if we have icons)
  let socialTableHtml = ''
  if (socialIconsHtml) {
    socialTableHtml = `
      <!-- Social Icons -->
      <table cellpadding="0" cellspacing="0" role="presentation" style="${STYLE_TABLE} margin:${socialMarginTop}px auto ${socialMarginBottom}px auto;">
        <tr>
          ${socialIconsHtml}
        </tr>
      </table>`
  } else {
    // No social links configured
    socialTableHtml = '<!-- No social links configured -->'
  }

  // Address formatting
  let addressHtml = ''
  if (addressLines.length > 0) {
    const firstLine =
      addressLines[0] ? `<strong>${esc(addressLines[0])}</strong>` : ''
    const otherLines = addressLines
      .slice(1)
      .map((line) => esc(line))
      .join('<br />')
    addressHtml = otherLines ? `${firstLine}<br />${otherLines}` : firstLine
  }

  // Split styles - padding must be on TD, not TABLE
  const tableStyle = `${STYLE_TABLE} background-color:${finalBgColor};`
  const tdStyle = `color:${finalTextColor}; text-align:center; padding:${paddingTop}px 20px ${paddingBottom}px 20px;`
  const linkStyle = `color:${finalLinkColor} !important; text-decoration:underline;`

  // For letter template, render simplified footer (no website link, no copyright)
  if (isLetterTemplate) {
    return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${tableStyle}">
  <tr>
    <td align="center" style="${tdStyle}">
      ${socialTableHtml}
      
      <!-- Address -->
      <p style="color:${finalTextColor}; font-size:14px; line-height:1.6; margin:0 0 8px 0;">
        ${addressHtml}
      </p>
      
      <!-- Divider -->
      <div style="height:1px; background-color:#000000; margin:20px auto; max-width:400px;"></div>
    </td>
  </tr>
</table>`
  }

  // Standard footer for other templates
  return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${tableStyle}">
  <tr>
    <td align="center" style="${tdStyle}">
      ${socialTableHtml}
      
      <!-- Address -->
      <p style="color:${finalTextColor}; font-size:14px; line-height:1.6; margin:0 0 8px 0;">
        ${addressHtml}
      </p>
      
      <!-- Divider -->
      <div style="height:1px; background-color:#444444; margin:20px auto; max-width:400px;"></div>
      
      <!-- Links (Unsubscribe handled by Slate) -->
      <p style="color:${finalTextColor}; font-size:13px; line-height:1.6; margin:15px 0;">
        <a href="https://gradschool.wsu.edu" data-role="footer-link" style="${linkStyle}">Graduate School website</a>
      </p>
      
      <!-- Copyright -->
      <p style="color:#999999; font-size:12px; line-height:1.6; margin:15px 0 0 0;">
        © 2025 Washington State University. All rights reserved.
      </p>
    </td>
  </tr>
</table>`
}

/**
 * Render a complete section with all its cards
 */
function renderSection(
  section: Section,
  spacing = 24,
  showBorder = true,
  settings: Settings | null = null,
  isLast = false,
  dividerMarginBelowPrevious: number = 0
): string {
  const title = section.title || ''
  const key = section.key || ''
  // Create layout with defaults, but don't set divider_color if not in section layout
  // This allows global settings.divider_color to be used
  const sectionLayout = section.layout || {}
  const layout = {
    padding_top: sectionLayout.padding_top || 18,
    padding_bottom: sectionLayout.padding_bottom || 28,
    background_color: sectionLayout.background_color || '',
    border_radius: sectionLayout.border_radius || 0,
    divider_enabled: sectionLayout.divider_enabled !== undefined ? sectionLayout.divider_enabled : true,
    divider_thickness: sectionLayout.divider_thickness || 2,
    divider_color: sectionLayout.divider_color, // Only use if explicitly set in section
    divider_spacing: sectionLayout.divider_spacing || 24,
    title_align: sectionLayout.title_align || 'left',
    divider_margin_top: sectionLayout.divider_margin_top,
    divider_margin_bottom: sectionLayout.divider_margin_bottom,
  }

  // Override global spacing with section-specific if present
  if (!layout.divider_spacing) {
    layout.divider_spacing = spacing
  }
  
  // Get divider margins - use section-level if set, otherwise global settings, otherwise 0
  const dividerMarginTop = layout.divider_margin_top !== undefined 
    ? layout.divider_margin_top 
    : (settings?.divider_margin_top !== undefined ? settings.divider_margin_top : 0)
  const dividerMarginBottom = layout.divider_margin_bottom !== undefined 
    ? layout.divider_margin_bottom 
    : (settings?.divider_margin_bottom !== undefined ? settings.divider_margin_bottom : 0)
  
  // Adjust padding-top to account for margin below previous section's divider
  const adjustedPaddingTop = (layout.padding_top || 18) + dividerMarginBelowPrevious

  // Special handling for closures
  if (key === 'closures') {
    const closures = section.closures || []
    // Create modified layout with adjusted padding-top and margins from settings
    // This ensures renderSectionStart can access the margins
    const modifiedLayout = {
      ...layout,
      padding_top: adjustedPaddingTop,
      divider_margin_top: dividerMarginTop,
      divider_margin_bottom: dividerMarginBottom,
    }
    return (
      renderSectionStart(title, modifiedLayout, showBorder, isLast, settings) +
      '\n' +
      renderClosuresSection(closures) +
      '\n' +
      renderSectionEnd()
    )
  }

  // Regular sections with cards
  const cards = section.cards || []
  const cardHtml: string[] = []

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    const isLastCard = i === cards.length - 1
    
    // Get spacing for this card
    // Use card-level spacing_bottom if explicitly set, otherwise global card_spacing, otherwise default 20
    let spacingBottom = 20 // default
    if (card.spacing_bottom !== undefined) {
      spacingBottom = card.spacing_bottom
    } else if (settings?.card_spacing !== undefined) {
      spacingBottom = settings.card_spacing
    }
    if (card.type === 'cta') {
      // CTA box with full button customization AND padding support
      const ctaTitle = card.title || ''
      const ctaBody = card.body_html || ''
      const links = card.links || []
      const ctaButtonLabel =
        links.length > 0 && links[0].label ? links[0].label : 'Learn more'
      const ctaButtonUrl =
        links.length > 0 && links[0].url ? links[0].url : '#'

      cardHtml.push(
        renderCTABox(
          ctaTitle,
          ctaBody,
          ctaButtonLabel,
          ctaButtonUrl,
          card.button_bg_color || '#A60F2D',
          card.button_text_color || '#ffffff',
          card.button_padding_vertical || 12,
          card.button_padding_horizontal || 32,
          card.button_border_width || 0,
          card.button_border_color || '#8c0d25',
          card.button_border_radius || 10,
          card.button_alignment || 'center',
          card.button_full_width || false,
          card,
          section,
          settings
        )
      )
    } else if (card.type === 'event') {
      cardHtml.push(renderEventCard(card, section, settings))
    } else if (card.type === 'resource') {
      cardHtml.push(renderResourceCard(card, section, settings))
    } else if (card.type === 'letter') {
      cardHtml.push(renderLetterCard(card, section, settings))
    } else {
      cardHtml.push(renderStandardCard(card, section, settings))
    }
    
    // Add spacing after card (except for last card) using a spacer table
    // This is more reliable than margin-bottom on tables in email HTML
    if (!isLastCard && spacingBottom > 0) {
      // Use a spacer table with explicit height for email client compatibility
      cardHtml.push(`<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;"><tr><td style="height:${spacingBottom}px; line-height:${spacingBottom}px; font-size:1px; mso-line-height-rule:exactly;">&nbsp;</td></tr></table>`)
    }
  }

  // Create modified layout with adjusted padding-top and margins from settings
  // This ensures renderSectionStart can access the margins
  const modifiedLayout = {
    ...layout,
    padding_top: adjustedPaddingTop,
    divider_margin_top: dividerMarginTop,
    divider_margin_bottom: dividerMarginBottom,
  }
  
  return (
    renderSectionStart(title, modifiedLayout, showBorder, isLast, settings) +
    '\n' +
    cardHtml.join('\n') +
    '\n' +
    renderSectionEnd()
  )
}

/**
 * Generate complete email HTML with container width support
 */
export function renderFullEmail(data: NewsletterData): string {
  const masthead = data.masthead || {}
  const sections = data.sections || []
  const footer = data.footer || {}
  const settings = data.settings || {
    container_width: 640,
    section_spacing: 24,
    show_section_borders: true,
    padding_text: { top: 20, right: 20, bottom: 20, left: 20 },
    padding_image: { top: 20, right: 15, bottom: 20, left: 0 },
    typography: {
      font_family: 'Arial, Helvetica, sans-serif',
      h2_size: 22,
      h3_size: 18,
      body_size: 16,
    },
    colors: {
      primary: CRIMSON,
      text_dark: TEXT_DARK,
      text_body: TEXT_BODY,
      text_muted: TEXT_MUTED,
    },
  }
  const preheaderText = masthead.preheader || ''

  // Get container width from settings
  const containerWidth = settings.container_width || 640

  // Get section spacing and border settings
  const sectionSpacing = settings.section_spacing || 24
  const showSectionBorders = settings.show_section_borders !== false

  // Build sections HTML with is_last parameter
  // Also pass divider margin from previous section to adjust padding-top
  const sectionsHtml: string[] = []
  for (let i = 0; i < sections.length; i++) {
    const isLast = i === sections.length - 1
    const section = sections[i]
    
    // Calculate margin below previous section's divider
    let dividerMarginBelowPrevious = 0
    if (i > 0 && showSectionBorders) {
      const prevSection = sections[i - 1]
      const prevLayout = prevSection.layout || {}
      dividerMarginBelowPrevious = prevLayout.divider_margin_bottom !== undefined 
        ? prevLayout.divider_margin_bottom 
        : (settings?.divider_margin_bottom !== undefined ? settings.divider_margin_bottom : 0)
    }
    
    sectionsHtml.push(
      renderSection(
        section,
        sectionSpacing,
        showSectionBorders,
        settings,
        isLast,
        dividerMarginBelowPrevious
      )
    )
  }

  // Assemble complete email
  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>WSU Graduate School Newsletter</title>
  <meta name="description" content="${esc(preheaderText || 'Washington State University Graduate School Newsletter')}" />
  <style type="text/css">
    ${EMAIL_CSS}
  </style>
</head>
<body style="${STYLE_RESET} background-color:${BG_LIGHT};">
  ${renderPreheader(preheaderText)}
  
  <!-- View in Browser -->
  ${renderViewInBrowser()}
  
  <!-- Masthead -->
  ${renderMasthead(masthead, containerWidth)}
  
  <!-- Main Content Container -->
  <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="${STYLE_TABLE} background-color:${BG_LIGHT};">
    <tr>
      <td align="center" style="background-color:${BG_LIGHT};">
        <table cellpadding="0" cellspacing="0" role="presentation" width="${containerWidth}" class="container" style="${STYLE_TABLE} background-color:${BG_WHITE}; border-left:1px solid ${BORDER_MEDIUM}; border-right:1px solid ${BORDER_MEDIUM}; border-bottom:1px solid ${BORDER_MEDIUM};">
          <tr>
            <td class="content" style="padding:18px 25px 28px; background-color:${BG_WHITE};">
              
              ${sectionsHtml.join('\n')}
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:${BG_WHITE}; padding:0;">
              ${renderFooter(footer, data.template)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return html
}

/**
 * Generate plain-text version of newsletter
 */
export function generatePlainText(data: NewsletterData): string {
  const parts: string[] = []
  const mast = data.masthead || {}
  if (mast.title) {
    parts.push(mast.title.toUpperCase())
  }
  if (mast.tagline) {
    parts.push(mast.tagline)
  }
  if (mast.preheader) {
    parts.push(mast.preheader)
  }
  parts.push('\n' + '='.repeat(60) + '\n')

  for (const section of data.sections || []) {
    const title = section.title || ''
    if (title) {
      parts.push(`\n${title.toUpperCase()}\n${'-'.repeat(title.length)}\n`)
    }
    if (section.key === 'closures') {
      for (const closure of section.closures || []) {
        const date = (closure.date || '').trim()
        const reason = (closure.reason || '').trim()
        if (date || reason) {
          parts.push(`• ${date} - ${reason}`)
        }
      }
      continue
    }
    for (const card of section.cards || []) {
      if (card.type === 'letter') {
        const greeting = (card.greeting || '').trim()
        if (greeting) {
          parts.push(greeting)
        }
        const bodyHtml = card.body_html || ''
        if (bodyHtml) {
          // Strip HTML tags
          const text = bodyHtml.replace(/<[^>]+>/g, '')
          parts.push(text)
        }
        const closing = (card.closing || '').trim()
        if (closing) {
          parts.push(closing)
        }
        const signatureName = (card.signature_name || '').trim()
        if (signatureName) {
          parts.push(signatureName)
        }
        const signatureLines = card.signature_lines || []
        for (const line of signatureLines) {
          if (line.trim()) {
            parts.push(line.trim())
          }
        }
        for (const link of card.links || []) {
          const label = (link.label || '').trim()
          const url = (link.url || '').trim()
          if (label && url && url !== '#') {
            parts.push(`${label}: ${url}`)
          }
        }
        parts.push('')
        continue
      }

      const ctitle = card.title || ''
      if (ctitle) {
        parts.push(`\n${ctitle}`)
      }
      const bodyHtml = card.body_html || ''
      if (bodyHtml) {
        // Strip HTML tags
        const text = bodyHtml.replace(/<[^>]+>/g, '')
        parts.push(text)
      }
      if ('location' in card && card.location) {
        parts.push(`Location: ${card.location}`)
      }
      if ('date' in card && card.date) {
        parts.push(`Date: ${card.date}`)
      }
      if ('time' in card && card.time) {
        parts.push(`Time: ${card.time}`)
      }
      for (const link of card.links || []) {
        const label = (link.label || '').trim()
        const url = (link.url || '').trim()
        if (label && url && url !== '#') {
          parts.push(`${label}: ${url}`)
        }
      }
      parts.push('')
    }
  }
  parts.push('\n' + '='.repeat(60) + '\n')
  const footer = data.footer || {}
  for (const line of footer.address_lines || []) {
    parts.push(line)
  }

  // V7: Handle array-based social links
  const social = footer.social || []
  if (Array.isArray(social)) {
    for (const link of social) {
      const platform = link.platform || 'Social'
      const url = link.url || ''
      if (url) {
        parts.push(`${platform}: ${url}`)
      }
    }
  }

  parts.push('\nGraduate School website: https://gradschool.wsu.edu')
  return parts.join('\n')
}

