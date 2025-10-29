# email_templates.py - HTML generation for WSU newsletters (v7.0.0)
# CHANGELOG v7.0.0:
# - BREAKING: Array-based social links (unlimited platforms)
# - ADDED: Section title alignment control
# - REMOVED: Dark mode CSS references

from html import escape
from styles import *

def esc(text):
    """Safe HTML escaping"""
    if text is None:
        return ''
    return escape(str(text))

def render_preheader(text):
    """Hidden preheader text for email clients"""
    return f'''<div style="display:none; font-size:1px; color:#ffffff; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
{esc(text)}
</div>'''

def render_view_in_browser():
    """Fixed 'View in Browser' link (Slate variable)"""
    return f'''<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="{STYLE_TABLE}">
  <tr>
    <td align="center" style="padding:12px 0;">
      <table cellpadding="0" cellspacing="0" role="presentation" width="600" class="container" style="{STYLE_TABLE}">
        <tr>
          <td style="text-align:center; font-size:13px; color:{TEXT_MUTED};">
            <a href="browser" style="{STYLE_LINK}">View in Browser</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>'''

def render_masthead(data, container_width=640):
    """Newsletter masthead with banner, title, tagline, optional hero link"""
    banner_url = data.get('banner_url', '')
    banner_alt = data.get('banner_alt', '')
    banner_align = data.get('banner_align', 'center')  # V7.0.3: NEW
    banner_padding = data.get('banner_padding', {'top': 20, 'right': 0, 'bottom': 0, 'left': 0})
    padding_str = f"{banner_padding.get('top', 20)}px {banner_padding.get('right', 0)}px {banner_padding.get('bottom', 0)}px {banner_padding.get('left', 0)}px"
    title = data.get('title', '')
    tagline = data.get('tagline', '')
    hero_show = data.get('hero_show', True)
    hero_link = data.get('hero_link', '')
    
    # Build banner HTML
    banner_html = ""
    if hero_show and banner_url:
        img_tag = f'<img src="{esc(banner_url)}" alt="{esc(banner_alt)}" width="450" style="{STYLE_IMAGE} width:100%; max-width:450px; display:inline-block;" />'
        
        if hero_link:
            banner_html = f'<a href="{esc(hero_link)}">{img_tag}</a>'
        else:
            banner_html = img_tag
    
    return f'''<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="{STYLE_TABLE} background-color:{BG_LIGHT};">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" role="presentation" width="{container_width}" class="container" style="{STYLE_TABLE} background-color:{BG_WHITE}; border-left:1px solid {BORDER_MEDIUM}; border-right:1px solid {BORDER_MEDIUM};">
        <tr>
          <td style="padding:{padding_str}; text-align:{banner_align}; background-color:{BG_WHITE};">
            {banner_html}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px 4px; font-size:13px; line-height:1.2; color:{TEXT_MUTED}; text-transform:uppercase; letter-spacing:0.35em; text-align:center;">
            {esc(title)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 12px; font-size:14px; line-height:1.5; color:{TEXT_MUTED}; text-align:center;">
            <em>{esc(tagline)}</em>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>'''

def render_section_start(title, layout=None, show_border=True, is_last=False):
    """Section wrapper with heading - V7: ADDED TITLE ALIGNMENT"""
    if layout is None:
        layout = {}
    
    spacing = layout.get('divider_spacing', 24)
    title_align = layout.get('title_align', 'left')  # V7: Title alignment
    padding_top = layout.get('padding_top', 18)
    padding_bottom = layout.get('padding_bottom', 28)
    bg_color = layout.get('background_color', '')
    border_radius = layout.get('border_radius', 0)
    divider_enabled = layout.get('divider_enabled', True)
    divider_thickness = layout.get('divider_thickness', 2)
    divider_color = layout.get('divider_color', BORDER_LIGHT)
    
    # Validate title_align
    if title_align not in ['left', 'center', 'right']:
        title_align = 'left'
    
    # Hide border on last section
    border = ''
    if show_border and divider_enabled and not is_last:
        border = f'border-bottom:{divider_thickness}px solid {divider_color};'
    
    # Build container style
    container_style = f"{STYLE_TABLE} padding-top:{padding_top}px; padding-bottom:{padding_bottom}px; {border}"
    if bg_color:
        container_style += f" background-color:{bg_color};"
    if border_radius > 0:
        container_style += f" border-radius:{border_radius}px;"
    
    # If title is empty, don't render H2
    if not title or not title.strip():
        return f'''<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="{container_style}">
  <tr>
    <td>'''
    
    # H2 style with spacing and alignment
    h2_style = f"{STYLE_H2} margin-top:{spacing}px; text-align:{title_align};"
    
    return f'''<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="{container_style}">
  <tr>
    <td>
      <h2 style="{h2_style}">{esc(title)}</h2>'''

def render_section_end():
    """Close section wrapper"""
    return '''    </td>
  </tr>
</table>'''

def render_card_meta(card):
    """Render location/date/time meta block (only if data exists)"""
    meta_items = []
    
    if card.get('location'):
        meta_items.append(f'<strong>Location:</strong> {esc(card["location"])}')
    
    if card.get('date'):
        meta_items.append(f'<strong>Date:</strong> {esc(card["date"])}')
    
    if card.get('time'):
        meta_items.append(f'<strong>Time:</strong> {esc(card["time"])}')
    
    if not meta_items:
        return ''
    
    return f'<p style="{STYLE_META}">' + '<br />'.join(meta_items) + '</p>'

def render_card_links(card):
    """Render multiple links - bullets if 2+, pipes if 1"""
    links = card.get('links', [])
    if not links:
        return ''
    
    link_html = []
    for link in links:
        label = (link.get('label') or '').strip()
        url = (link.get('url') or '').strip()
        if label and url:
            link_html.append(f'<a href="{esc(url)}" style="{STYLE_LINK}">{esc(label)}</a>')
    
    if not link_html:
        return ''
    
    # Use bullets if 2+ links, otherwise pipes
    if len(link_html) >= 2:
        items = ''.join(f'<li>{link}</li>' for link in link_html)
        return f'<ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">{items}</ul>'
    else:
        return ' | '.join(link_html)

def get_card_style(card):
    """Build card style with P3 per-card customization"""
    bg_color = card.get('background_color', '#f9f9f9')
    spacing_bottom = card.get('spacing_bottom', 20)
    border_width = card.get('border_width', 0)
    border_color = card.get('border_color', '#e0e0e0')
    border_radius = card.get('border_radius', 0)
    
    style = f"{STYLE_TABLE} background-color:{bg_color}; margin-bottom:{spacing_bottom}px;"
    
    if border_width > 0:
        style += f" border:{border_width}px solid {border_color};"
    
    if border_radius > 0:
        style += f" border-radius:{border_radius}px;"
    
    return style

def get_card_padding(card, section=None, settings=None):
    """
    Get card padding with proper cascading - ALWAYS returns complete dict
    
    Priority:
    1. Card-level explicit padding (if set)
    2. Section-level padding override (if set)
    3. Global settings padding (padding_text OR padding_image depending on card type)
    4. Hardcoded defaults
    
    CRITICAL: Always returns dict with all 4 keys (top, right, bottom, left)
    """
    # Default fallback - ALWAYS has all 4 keys
    default = {'top': 20, 'right': 20, 'bottom': 20, 'left': 20}
    
    # Start with defaults, then override with more specific values
    result = default.copy()
    
    # 1. Apply global settings first (text or image depending on card type)
    if card.get('type') == 'resource' and card.get('show_icon'):
        # Resource cards with icons use padding_image
        if settings and settings.get('padding_image'):
            global_padding = settings['padding_image']
            if isinstance(global_padding, dict):
                result.update(global_padding)
    else:
        # All other cards use padding_text
        if settings and settings.get('padding_text'):
            global_padding = settings['padding_text']
            if isinstance(global_padding, dict):
                result.update(global_padding)
    
    # 2. Apply section-level overrides (if set)
    if section:
        if card.get('type') == 'resource' and card.get('show_icon'):
            section_padding = section.get('padding_image', {})
        else:
            section_padding = section.get('padding_text', {})
        
        if isinstance(section_padding, dict):
            result.update(section_padding)
    
    # 3. Apply card-level overrides (highest priority)
    if card.get('padding') and isinstance(card.get('padding'), dict):
        result.update(card['padding'])
    
    # Ensure all values are integers
    for key in ['top', 'right', 'bottom', 'left']:
        if key in result:
            try:
                result[key] = int(result[key])
            except (ValueError, TypeError):
                result[key] = 0
        else:
            result[key] = 0
    
    return result

def render_standard_card(card, section=None, settings=None):
    """Standard card with accent bar, title, body, meta, links"""
    title = card.get('title', '')
    body_html = card.get('body_html', '')
    
    # Get card style and padding
    card_style = get_card_style(card)
    padding = get_card_padding(card, section, settings)
    padding_style = f"padding:{padding['top']}px {padding['right']}px {padding['bottom']}px {padding['left']}px;"
    
    # Build card content
    content_parts = []
    
    # Title
    if title:
        content_parts.append(f'<h3 style="{STYLE_H3}">{esc(title)}</h3>')
    
    # Body (allow raw HTML from rich text editor)
    if body_html:
        content_parts.append(f'<div style="{STYLE_BODY_TEXT}">{body_html}</div>')
    
    # Meta (location/date/time)
    meta = render_card_meta(card)
    if meta:
        content_parts.append(meta)
    
    # Links
    links = render_card_links(card)
    if links:
        content_parts.append(links)
    
    content = '\n'.join(content_parts)
    
    return f'''<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="{card_style}">
  <tr>
    <td style="{STYLE_CARD_ACCENT}"></td>
    <td style="{padding_style}">
      {content}
    </td>
  </tr>
</table>'''

def render_event_card(card, section=None, settings=None):
    """Event card with location label at top"""
    title = card.get('title', '')
    body_html = card.get('body_html', '')
    location = card.get('location', '')
    
    # Get card style and padding
    card_style = get_card_style(card)
    padding = get_card_padding(card, section, settings)
    padding_style = f"padding:{padding['top']}px {padding['right']}px {padding['bottom']}px {padding['left']}px;"
    
    content_parts = []
    
    # Location label (prominent at top for events)
    if location:
        content_parts.append(f'<p style="{STYLE_LOCATION_LABEL}">{esc(location)}</p>')
    
    # Title
    if title:
        content_parts.append(f'<h3 style="{STYLE_H3}">{esc(title)}</h3>')
    
    # Body
    if body_html:
        content_parts.append(f'<div style="{STYLE_BODY_TEXT}">{body_html}</div>')
    
    # Date/Time meta (without location since it's already shown)
    meta_items = []
    if card.get('date'):
        meta_items.append(esc(card['date']))
    if card.get('time'):
        meta_items.append(esc(card['time']))
    
    if meta_items:
        content_parts.append(f'<p style="{STYLE_META}">' + '<br />'.join(meta_items) + '</p>')
    
    # Links
    links = render_card_links(card)
    if links:
        content_parts.append(links)
    
    content = '\n'.join(content_parts)
    
    return f'''<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="{card_style}">
  <tr>
    <td style="{STYLE_CARD_ACCENT}"></td>
    <td style="{padding_style}">
      {content}
    </td>
  </tr>
</table>'''

def render_resource_card(card, section=None, settings=None):
    """Resource card with optional icon"""
    title = card.get('title', '')
    body_html = card.get('body_html', '')
    show_icon = card.get('show_icon', False)
    icon_url = card.get('icon_url', '')
    icon_alt = card.get('icon_alt', '')
    icon_size = card.get('icon_size', 80)
    
    # Get card style and padding
    card_style = get_card_style(card)
    padding = get_card_padding(card, section, settings)
    
    # Build text content
    text_parts = []
    if title:
        text_parts.append(f'<h3 style="{STYLE_H3}">{esc(title)}</h3>')
    if body_html:
        text_parts.append(f'<div style="{STYLE_BODY_TEXT}">{body_html}</div>')
    
    meta = render_card_meta(card)
    if meta:
        text_parts.append(meta)
    
    links = render_card_links(card)
    if links:
        text_parts.append(links)
    
    text_content = '\n'.join(text_parts)
    
    # If icon enabled and URL provided
    if show_icon and icon_url:
        # Apply padding once to outer cell only
        padding_style = f"padding:{padding['top']}px {padding['right']}px {padding['bottom']}px {padding['left']}px;"
        
        icon_style = f"width:{icon_size}px; height:{icon_size}px; border-radius:6px; {STYLE_IMAGE}"
        
        # Icon cell: fixed width, right spacing for gap
        icon_cell_style = f"width:{icon_size}px; padding-right:15px; vertical-align:middle; text-align:center;"
        
        # Text cell: just vertical alignment, no padding (outer cell handles it)
        text_cell_style = f"vertical-align:middle;"
        
        icon_html = f'<img src="{esc(icon_url)}" alt="{esc(icon_alt)}" width="{icon_size}" height="{icon_size}" style="{icon_style}" />'
        
        return f'''<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="{card_style}">
  <tr>
    <td style="{padding_style}">
      <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="{STYLE_TABLE}">
        <tr>
          <td style="{icon_cell_style}">
            {icon_html}
          </td>
          <td style="{text_cell_style}">
            {text_content}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>'''
    else:
        # No icon, render as standard card without accent bar
        padding_style = f"padding:{padding['top']}px {padding['right']}px {padding['bottom']}px {padding['left']}px;"
        return f'''<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="{card_style}">
  <tr>
    <td style="{padding_style}">
      {text_content}
    </td>
  </tr>
</table>'''

def render_closures_section(closures):
    """Special closures list format"""
    if not closures:
        return ''
    
    items = []
    for closure in closures:
        date = closure.get('date', '').strip()
        reason = closure.get('reason', '').strip()
        if date or reason:
            items.append(f'<li>{esc(date)} – {esc(reason)}</li>')
    
    if not items:
        return ''
    
    ul_content = '\n'.join(items)
    
    return f'''<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="{STYLE_TABLE} background-color:{BG_CARD}; margin-bottom:20px;">
  <tr>
    <td style="{STYLE_CARD_BODY}">
      <ul style="margin:10px 0 0 0; padding:0 0 0 20px;">
        {ul_content}
      </ul>
    </td>
  </tr>
</table>'''

def render_cta_box(title, body_html, button_label, button_url, 
                   button_bg_color="#A60F2D", 
                   button_text_color="#ffffff",
                   button_padding_vertical=12,
                   button_padding_horizontal=32,
                   button_border_width=0,
                   button_border_color="#8c0d25",
                   button_border_radius=10,
                   button_alignment="center",
                   button_full_width=False,
                   card=None,
                   section=None,
                   settings=None):
    """Call-to-action box with fully customizable button AND padding"""
    from html.parser import HTMLParser
    
    class TextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.text = []
        def handle_data(self, data):
            self.text.append(data)
        def get_text(self):
            return ''.join(self.text)
    
    parser = TextExtractor()
    parser.feed(body_html)
    body_text = parser.get_text()
    
    # Get dynamic card style and padding (like other card types)
    if card:
        card_style = get_card_style(card)
        padding = get_card_padding(card, section, settings)
    else:
        # Fallback for direct calls without card object
        card_style = f"{STYLE_TABLE} background-color:{BG_CARD}; margin-bottom:20px; border:2px solid {BORDER_LIGHT}; border-radius:4px;"
        padding = {'top': 30, 'right': 20, 'bottom': 30, 'left': 20}
    
    padding_style = f"padding:{padding['top']}px {padding['right']}px {padding['bottom']}px {padding['left']}px;"
    
    # Build dynamic button style
    padding_btn = f"{button_padding_vertical}px {button_padding_horizontal}px"
    border = f"{button_border_width}px solid {button_border_color}" if button_border_width > 0 else "none"
    width = "100%" if button_full_width else "auto"
    display = "block" if button_full_width else "inline-block"
    
    # Handle alignment
    if button_alignment == "left":
        align_wrapper = "text-align: left;"
    elif button_alignment == "right":
        align_wrapper = "text-align: right;"
    else:
        align_wrapper = "text-align: center;"
    
    button_style = f"background-color:{button_bg_color} !important; border-radius:{button_border_radius}px; border:{border}; color:{button_text_color} !important; display:{display}; font-weight:bold; font-size:16px; line-height:20px; text-align:center; text-decoration:none; padding:{padding_btn}; margin-top:24px; margin-bottom:8px; width:{width};"
    
    return f'''<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="{card_style}">
  <tr>
    <td style="{padding_style} {align_wrapper}">
      <h2 style="{STYLE_H2} margin:0 0 16px 0;">{esc(title)}</h2>
      <p style="{STYLE_BODY_TEXT} margin:0 0 8px 0;">{esc(body_text)}</p>
      <a href="{esc(button_url)}" data-role="cta" style="{button_style}">{esc(button_label)}</a>
    </td>
  </tr>
</table>'''

def render_footer(data, container_width=640):
    """V7: Footer with array-based social links and configurable spacing"""
    address_lines = data.get('address_lines', [])
    social = data.get('social', [])
    
    # Colors (with defaults)
    bg_color = data.get('background_color', '#2A3033')
    text_color = data.get('text_color', '#cccccc')
    link_color = data.get('link_color', '#ffffff')
    
    # Spacing controls (with defaults)
    padding_top = data.get('padding_top', 60)
    padding_bottom = data.get('padding_bottom', 30)
    social_margin_top = data.get('social_margin_top', 40)
    social_margin_bottom = data.get('social_margin_bottom', 20)
    
    # V7: Get social links array and build icons dynamically
    social_links = social if isinstance(social, list) else []
    
    # Build social icons HTML dynamically
    social_icons_html = ""
    for link in social_links:
        url = (link.get('url') or '').strip()
        icon = (link.get('icon') or '').strip()
        alt = (link.get('alt') or link.get('platform', 'Social Media')).strip()
        
        # Ensure alt text always exists for accessibility
        if not alt or alt == '':
            alt = 'Social Media Link'
        
        # Only render if both URL and icon exist
        if url and icon:
            social_icons_html += f'''
          <td style="{STYLE_SOCIAL_ICON_CELL}">
            <a href="{esc(url)}" title="{esc(alt)}">
              <img src="{esc(icon)}" alt="{esc(alt)}" width="28" height="28" style="{STYLE_IMAGE}" />
            </a>
          </td>'''
    
    # Build social table (only if we have icons)
    social_table_html = ""
    if social_icons_html:
        social_table_html = f'''
      <!-- Social Icons -->
      <table cellpadding="0" cellspacing="0" role="presentation" style="{STYLE_TABLE} margin:{social_margin_top}px auto {social_margin_bottom}px auto;">
        <tr>
          {social_icons_html}
        </tr>
      </table>'''
    else:
        # No social links configured
        social_table_html = "<!-- No social links configured -->"
    
    # Address formatting
    address_html = ''
    if address_lines:
        first_line = f'<strong>{esc(address_lines[0])}</strong>' if address_lines else ''
        other_lines = '<br />'.join(esc(line) for line in address_lines[1:])
        address_html = f'{first_line}<br />{other_lines}' if other_lines else first_line
    
    # Split styles - padding must be on TD, not TABLE
    table_style = f"{STYLE_TABLE} background-color:{bg_color};"
    td_style = f"color:{text_color}; text-align:center; padding:{padding_top}px 20px {padding_bottom}px 20px;"
    link_style = f"color:{link_color} !important; text-decoration:underline;"
    
    return f'''<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="{table_style}">
  <tr>
    <td align="center" style="{td_style}">
      {social_table_html}
      
      <!-- Address -->
      <p style="color:{text_color}; font-size:14px; line-height:1.6; margin:0 0 8px 0;">
        {address_html}
      </p>
      
      <!-- Divider -->
      <div style="height:1px; background-color:#444444; margin:20px auto; max-width:400px;"></div>
      
      <!-- Links (Unsubscribe handled by Slate) -->
      <p style="color:{text_color}; font-size:13px; line-height:1.6; margin:15px 0;">
        <a href="https://gradschool.wsu.edu" data-role="footer-link" style="{link_style}">Graduate School website</a>
      </p>
      
      <!-- Copyright -->
      <p style="color:#999999; font-size:12px; line-height:1.6; margin:15px 0 0 0;">
        © 2025 Washington State University. All rights reserved.
      </p>
    </td>
  </tr>
</table>'''

def render_section(section, spacing=24, show_border=True, settings=None, is_last=False):
    """Render a complete section with all its cards"""
    title = section.get('title', '')
    key = section.get('key', '')
    layout = section.get('layout', {})
    
    # Override global spacing with section-specific if present
    if 'divider_spacing' not in layout:
        layout['divider_spacing'] = spacing
    
    # Special handling for closures
    if key == 'closures':
        closures = section.get('closures', [])
        return render_section_start(title, layout=layout, show_border=show_border, is_last=is_last) + '\n' + render_closures_section(closures) + '\n' + render_section_end()
    
    # Regular sections with cards
    cards = section.get('cards', [])
    card_html = []
    
    for card in cards:
        card_type = card.get('type', 'standard')
        
        if card_type == 'cta':
            # CTA box with full button customization AND padding support
            cta_title = card.get('title', '')
            cta_body = card.get('body_html', '')
            links = card.get('links', [])
            cta_button_label = links[0].get('label', 'Learn more') if links else 'Learn more'
            cta_button_url = links[0].get('url', '#') if links else '#'
            
            card_html.append(render_cta_box(
                cta_title, 
                cta_body, 
                cta_button_label, 
                cta_button_url,
                button_bg_color=card.get('button_bg_color', '#A60F2D'),
                button_text_color=card.get('button_text_color', '#ffffff'),
                button_padding_vertical=card.get('button_padding_vertical', 12),
                button_padding_horizontal=card.get('button_padding_horizontal', 32),
                button_border_width=card.get('button_border_width', 0),
                button_border_color=card.get('button_border_color', '#8c0d25'),
                button_border_radius=card.get('button_border_radius', 10),
                button_alignment=card.get('button_alignment', 'center'),
                button_full_width=card.get('button_full_width', False),
                card=card,
                section=section,
                settings=settings
            ))
        elif card_type == 'event':
            card_html.append(render_event_card(card, section, settings))
        elif card_type == 'resource':
            card_html.append(render_resource_card(card, section, settings))
        else:
            card_html.append(render_standard_card(card, section, settings))
    
    return render_section_start(title, layout=layout, show_border=show_border, is_last=is_last) + '\n' + '\n'.join(card_html) + '\n' + render_section_end()

def render_full_email(data):
    """Generate complete email HTML with container width support"""
    masthead = data.get('masthead', {})
    sections = data.get('sections', [])
    footer = data.get('footer', {})
    settings = data.get('settings', {})
    preheader_text = masthead.get('preheader', '')
    
    # Get container width from settings
    container_width = settings.get('container_width', 640)
    
    # Get section spacing and border settings
    section_spacing = settings.get('section_spacing', 24)
    show_section_borders = settings.get('show_section_borders', True)
    
    # Build sections HTML with is_last parameter
    sections_html = []
    for i, section in enumerate(sections):
        is_last = (i == len(sections) - 1)
        sections_html.append(render_section(
            section, 
            spacing=section_spacing, 
            show_border=show_section_borders, 
            settings=settings,
            is_last=is_last
        ))
    
    # Assemble complete email
    html = f'''<!DOCTYPE html>
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
  <style type="text/css">
    {EMAIL_CSS}
  </style>
</head>
<body style="{STYLE_RESET}">
  {render_preheader(preheader_text)}
  
  <!-- View in Browser -->
  {render_view_in_browser()}
  
  <!-- Masthead -->
  {render_masthead(masthead, container_width)}
  
  <!-- Main Content Container -->
  <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="{STYLE_TABLE} background-color:{BG_LIGHT};">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" role="presentation" width="{container_width}" class="container" style="{STYLE_TABLE} background-color:{BG_WHITE}; border-left:1px solid {BORDER_MEDIUM}; border-right:1px solid {BORDER_MEDIUM}; border-bottom:1px solid {BORDER_MEDIUM};">
          <tr>
            <td class="content" style="padding:18px 25px 28px; background-color:{BG_WHITE};">
              
              {chr(10).join(sections_html)}
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td>
              {render_footer(footer, container_width)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'''
    
    return html

from html.parser import HTMLParser
import re as _re

class _HTMLToText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.buf = []
        self._in_a = False
        self._href = ''
    def handle_starttag(self, tag, attrs):
        if tag == 'br':
            self.buf.append('\n')
        elif tag in ('p','h1','h2','h3'):
            self.buf.append('\n\n')
        elif tag == 'a':
            self._in_a = True
            for k,v in attrs:
                if k == 'href':
                    self._href = v
    def handle_endtag(self, tag):
        if tag == 'a' and self._in_a:
            if self._href and self._href != '#':
                self.buf.append(f' [{self._href}]')
            self._in_a = False
            self._href = ''
        elif tag in ('p','h1','h2','h3'):
            self.buf.append('\n')
    def handle_data(self, data):
        s = ' '.join((data or '').split())
        if s:
            self.buf.append(s)
    def get_text(self):
        t = ''.join(self.buf)
        t = _re.sub(r'\n{3,}', '\n\n', t)
        return t.strip()

def generate_plain_text(data):
    """Generate plain-text version of newsletter"""
    parts = []
    mast = data.get('masthead', {})
    if mast.get('title'): parts.append(mast['title'].upper())
    if mast.get('tagline'): parts.append(mast['tagline'])
    if mast.get('preheader'): parts.append(mast['preheader'])
    parts.append('\n' + '='*60 + '\n')
    for section in data.get('sections', []):
        title = section.get('title', '')
        if title: parts.append(f"\n{title.upper()}\n{'-'*len(title)}\n")
        if section.get('key') == 'closures':
            for closure in section.get('closures', []):
                date = (closure.get('date') or '').strip()
                reason = (closure.get('reason') or '').strip()
                if date or reason: parts.append(f"• {date} - {reason}")
            continue
        for card in section.get('cards', []):
            ctitle = card.get('title','')
            if ctitle: parts.append(f"\n{ctitle}")
            body_html = card.get('body_html','')
            if body_html:
                p = _HTMLToText(); p.feed(body_html); parts.append(p.get_text())
            location = card.get('location',''); date = card.get('date',''); time = card.get('time','')
            if location: parts.append(f"Location: {location}")
            if date: parts.append(f"Date: {date}")
            if time: parts.append(f"Time: {time}")
            for link in card.get('links', []):
                label = (link.get('label') or '').strip(); url = (link.get('url') or '').strip()
                if label and url and url != '#': parts.append(f"{label}: {url}")
            parts.append('')
    parts.append('\n' + '='*60 + '\n')
    footer = data.get('footer', {})
    for line in footer.get('address_lines', []): parts.append(line)
    
    # V7: Handle array-based social links
    social = footer.get('social', [])
    if isinstance(social, list):
        for link in social:
            platform = link.get('platform', 'Social')
            url = link.get('url', '')
            if url:
                parts.append(f"{platform}: {url}")
    
    parts.append('\nGraduate School website: https://gradschool.wsu.edu')
    return '\n'.join(parts)