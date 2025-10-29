# config.py - Centralized configuration for WSU Newsletter Editor v7.0.0
"""
This file contains all default values, URLs, and branding elements.
Edit these values to customize defaults for your organization.

CHANGELOG v7.0.0:
- BREAKING: Social links now array-based (unlimited platforms)
- ADDED: Section title alignment default
- IMPROVED: Better organization and documentation
"""

# ============================================================
# BRAND ASSETS
# ============================================================

# Default banner image (masthead)
DEFAULT_BANNER_URL = "https://futurecoug.wsu.edu/www/images/FF_header.png"
DEFAULT_BANNER_ALT = "WSU Graduate School"

# Default resource icons (used in Friday Focus Resources section)
RESOURCE_ICONS = {
    'health_counseling': "https://futurecoug.wsu.edu/www/images/health_counseling.png",
    'basic_needs': "https://futurecoug.wsu.edu/www/images/we_can_help_ff.png",
    'career_services': "https://futurecoug.wsu.edu/www/images/career-coach-2.png"
}

# ============================================================
# BRAND COLORS
# ============================================================

BRAND_PRIMARY = '#A60F2D'      # WSU Crimson
BRAND_SECONDARY = '#8c0d25'    # Dark Crimson
TEXT_DARK = '#2A3033'
TEXT_BODY = '#333333'
TEXT_MUTED = '#5E6A71'

# ============================================================
# TYPOGRAPHY
# ============================================================

TYPOGRAPHY_DEFAULTS = {
    'font_family': 'Arial, Helvetica, sans-serif',
    'h2_size': 22,           # Section headings
    'h2_line_height': 1.3,
    'h3_size': 18,           # Card titles
    'h3_line_height': 1.3,
    'body_size': 16,         # Body text
    'body_line_height': 1.6,
    'meta_size': 15,         # Location/date/time
    'meta_line_height': 1.7
}

# ============================================================
# NEWSLETTER METADATA
# ============================================================

# Friday Focus defaults
FRIDAY_FOCUS = {
    'title': 'Friday Focus Newsletter',
    'tagline': 'A semimonthly newsletter for graduate students',
    'preheader': 'Your biweekly update from the WSU Graduate School',
    'submit_form_url': 'https://gradschool.wsu.edu/request-for-ff-promotion/'
}

# Briefing defaults
BRIEFING = {
    'title': 'Graduate School Briefing',
    'tagline': 'Semimonthly updates for graduate program faculty and staff',
    'preheader': 'Updates from the Graduate School',
    'submit_form_url': 'https://gradschool.wsu.edu/listserv/',
    'jira_url': 'https://jira.esg.wsu.edu/servicedesk/customer/portal/121/group/323',
    'knowledge_base_url': 'https://confluence.esg.wsu.edu/display/GRADSCHOOL'
}

# ============================================================
# CONTACT INFORMATION
# ============================================================

ORGANIZATION = {
    'name': 'WSU Graduate School',
    'address_line_1': 'French Administration Building 324',
    'address_line_2': 'Pullman, WA 99164',
    'phone': '509-335-6424',
    'email': 'gradschool@wsu.edu',
    'website': 'https://gradschool.wsu.edu'
}

# ============================================================
# SOCIAL MEDIA (V7 - Array-based for unlimited platforms)
# ============================================================

DEFAULT_SOCIAL_LINKS = [
    {
        'platform': 'Instagram',
        'url': 'https://www.instagram.com/gradschoolwsu/',
        'icon': 'https://futurecoug.wsu.edu/www/images/insta%20icon%20.png',
        'alt': 'Instagram'
    },
    {
        'platform': 'LinkedIn',
        'url': 'https://www.linkedin.com/school/washington-state-university-graduate-school/',
        'icon': 'https://futurecoug.wsu.edu/www/images/Lin%20icon.png',
        'alt': 'LinkedIn'
    },
    {
        'platform': 'Facebook',
        'url': 'https://www.facebook.com/WsuGraduateSchool/',
        'icon': 'https://futurecoug.wsu.edu/www/images/facebook%20icon.png',
        'alt': 'Facebook'
    }
]

# Legacy compatibility - Keep for backward compatibility with migration code
SOCIAL_ICONS = {
    'instagram': DEFAULT_SOCIAL_LINKS[0]['icon'],
    'linkedin': DEFAULT_SOCIAL_LINKS[1]['icon'],
    'facebook': DEFAULT_SOCIAL_LINKS[2]['icon']
}

SOCIAL_PROFILES = {
    'instagram': DEFAULT_SOCIAL_LINKS[0]['url'],
    'linkedin': DEFAULT_SOCIAL_LINKS[1]['url'],
    'facebook': DEFAULT_SOCIAL_LINKS[2]['url']
}

# ============================================================
# LAYOUT DEFAULTS
# ============================================================

# Global layout settings
LAYOUT_DEFAULTS = {
    'container_width': 640,           # Email width in pixels (560-700)
    'section_spacing': 24,            # Space between border and section title
    'show_section_borders': True,     # Show horizontal divider lines
    'card_spacing': 20,               # Space between cards (margin-bottom)
    
    # Global padding (applied to all content unless overridden)
    'padding_text': {
        'top': 20,
        'right': 20,
        'bottom': 20,
        'left': 20
    },
    'padding_image': {
        'top': 20,
        'right': 15,
        'bottom': 20,
        'left': 0
    }
}

# Section-specific layout defaults
SECTION_LAYOUT_DEFAULTS = {
    'padding_top': 18,
    'padding_bottom': 28,
    'background_color': '',           # Empty = transparent
    'border_radius': 0,
    'divider_enabled': True,
    'divider_thickness': 2,
    'divider_color': '#e0e0e0',
    'divider_spacing': 24,
    'title_align': 'left'             # V7: Title alignment (left/center/right)
}

# Card-level defaults
CARD_DEFAULTS = {
    'background_color': '#f9f9f9',
    'spacing_bottom': 20,           # Margin below card
    'padding_top': 20,
    'padding_right': 20,
    'padding_bottom': 20,
    'padding_left': 20,
    'border_radius': 0,
    'border_width': 0,
    'border_color': '#e0e0e0'
}

# ============================================================
# CARD DEFAULTS
# ============================================================

# CTA Button defaults
CTA_BUTTON_DEFAULTS = {
    'bg_color': '#A60F2D',
    'text_color': '#ffffff',
    'padding_vertical': 12,
    'padding_horizontal': 32,
    'border_width': 0,
    'border_color': '#8c0d25',
    'border_radius': 10,
    'alignment': 'center',
    'full_width': False
}

# Footer defaults
FOOTER_DEFAULTS = {
    'background_color': '#FFFFFF',
    'text_color': '#000000',
    'link_color': '#ffffff',
    'padding_top': 0,              # Footer top padding
    'padding_bottom': 0,           # Footer bottom padding
    'social_margin_top': 0,        # Social icons top margin
    'social_margin_bottom': 0      # Social icons bottom margin
}

# ============================================================
# SAMPLE CONTENT (for default templates)
# ============================================================

SAMPLE_EVENT = {
    'title': 'Sample Event Title',
    'location': 'Pullman Campus',
    'date': 'Friday, October 10, 2025',
    'time': '2:00 PM – 4:00 PM',
    'body_html': '<p>Join us for an exciting event designed to help graduate students connect and learn.</p>'
}

SAMPLE_ANNOUNCEMENT = {
    'title': 'Sample Announcement',
    'body_html': '<p>Placeholder body copy for a standard item.</p>',
    'location': 'Building / Room'
}

# Resource links (for default Friday Focus template)
RESOURCE_LINKS = {
    'health_counseling': {
        'title': 'Health & Counseling Resources',
        'body_html': '<p>Support for emotional health, addiction, and medical needs is available through Cougar Health Services and Counseling & Psychological Services (CAPS).</p>',
        'url': 'https://handbook.wsu.edu/communitystandards/student-resources/campus-resources-and-support/',
        'icon': 'health_counseling'
    },
    'basic_needs': {
        'title': 'Basic Needs Benefit Navigator',
        'body_html': '<p>A university resource to help students navigate help with childcare, financial aid, food security, housing, utility support, health resources, and more.</p>',
        'url': 'https://deanofstudents.wsu.edu/student-resources',
        'icon': 'basic_needs'
    },
    'career_services': {
        'title': 'Explore Your Interests / Self-Assessment',
        'body_html': '<p>The Academic Success and Career Center offers self-assessments to help you find a career path that fits your interests.</p>',
        'url': 'https://ascc.wsu.edu/channels/explore-your-interests-self-assessment/',
        'icon': 'career_services'
    }
}

# ============================================================
# SLATE INTEGRATION
# ============================================================

# Hardcoded Slate variables (DO NOT CHANGE unless Slate template changes)
SLATE_VARIABLES = {
    'view_in_browser': 'browser',           # href value for "View in Browser" link
    'opt_out': '{{ opt_out_link }}',       # Unsubscribe link variable
}

# ============================================================
# EXPORT OPTIONS
# ============================================================

EXPORT_DEFAULTS = {
    'minify': True,           # Minify HTML output by default
    'strip_json': False,      # Keep embedded JSON for re-import by default
    'filename_prefix': {
        'ff': 'Friday_Focus_',
        'briefing': 'Briefing_'
    }
}