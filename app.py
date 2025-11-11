# app.py - WSU Newsletter Editor v7.0.1 (Export Fix)
# CHANGELOG v7.0.1:
# - FIXED: Export truncation caused by unsafe HTML comment embedding
# - FIXED: Overly aggressive minification breaking HTML structure
# - ADDED: Better error handling and logging for export
# - IMPROVED: JSON embedding uses Base64 encoding for safety

from flask import Flask, render_template, request, send_file, jsonify
from datetime import datetime
import io
import json
import re
import traceback
import base64

# Import configuration
from config import *

# Import our HTML generators
from email_templates import render_full_email, generate_plain_text

app = Flask(__name__)

# Disable caching for development
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
# V7.0.3: Set max content length to prevent memory issues with large exports
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5MB limit

# ---------------- Helper Functions ----------------


def apply_config_defaults(model_data, template_type):
    """Apply config.py defaults to model data"""
    if template_type == "ff":
        model_data["masthead"]["title"] = model_data["masthead"].get("title", FRIDAY_FOCUS["title"])
        model_data["masthead"]["tagline"] = model_data["masthead"].get(
            "tagline", FRIDAY_FOCUS["tagline"]
        )
        model_data["masthead"]["preheader"] = model_data["masthead"].get(
            "preheader", FRIDAY_FOCUS["preheader"]
        )
    elif template_type == "briefing":
        model_data["masthead"]["title"] = model_data["masthead"].get("title", BRIEFING["title"])
        model_data["masthead"]["tagline"] = model_data["masthead"].get(
            "tagline", BRIEFING["tagline"]
        )
        model_data["masthead"]["preheader"] = model_data["masthead"].get(
            "preheader", BRIEFING["preheader"]
        )

    # Apply branding defaults
    model_data["masthead"]["banner_url"] = model_data["masthead"].get(
        "banner_url", DEFAULT_BANNER_URL
    )
    model_data["masthead"]["banner_alt"] = model_data["masthead"].get(
        "banner_alt", DEFAULT_BANNER_ALT
    )

    # Apply footer defaults
    if not model_data["footer"].get("address_lines"):
        model_data["footer"]["address_lines"] = [
            ORGANIZATION["name"],
            ORGANIZATION["address_line_1"],
            ORGANIZATION["address_line_2"],
        ]

    # V7: Apply social defaults (array-based)
    if not model_data["footer"].get("social"):
        model_data["footer"]["social"] = [link.copy() for link in DEFAULT_SOCIAL_LINKS]

    return model_data


def create_default_section_layout():
    """Create default section layout from config"""
    return {
        "padding_top": SECTION_LAYOUT_DEFAULTS["padding_top"],
        "padding_bottom": SECTION_LAYOUT_DEFAULTS["padding_bottom"],
        "background_color": SECTION_LAYOUT_DEFAULTS["background_color"],
        "border_radius": SECTION_LAYOUT_DEFAULTS["border_radius"],
        "divider_enabled": SECTION_LAYOUT_DEFAULTS["divider_enabled"],
        "divider_thickness": SECTION_LAYOUT_DEFAULTS["divider_thickness"],
        "divider_color": SECTION_LAYOUT_DEFAULTS["divider_color"],
        "divider_spacing": SECTION_LAYOUT_DEFAULTS["divider_spacing"],
        "title_align": SECTION_LAYOUT_DEFAULTS["title_align"],  # V7: Added title alignment
    }


# ---------------- Default Data Models ----------------


def default_ff_model():
    """Friday Focus default data with complete resources"""
    return {
        "template": "ff",
        "masthead": {
            "banner_url": DEFAULT_BANNER_URL,
            "banner_alt": DEFAULT_BANNER_ALT,
            "title": FRIDAY_FOCUS["title"],
            "tagline": FRIDAY_FOCUS["tagline"],
            "preheader": FRIDAY_FOCUS["preheader"],
            "hero_show": True,
            "hero_link": "",
        },
        "sections": [
            {
                "key": "deadlines",
                "title": "Deadlines and Important Information",
                "layout": create_default_section_layout(),
                "cards": [
                    {
                        "type": "standard",
                        "title": "Sample Announcement",
                        "body_html": "<p>Placeholder body copy for a standard item.</p>",
                        "location": "Building / Room",
                        "date": "",
                        "time": "",
                        "links": [{"label": "Read more", "url": "#"}],
                        "spacing_bottom": CARD_DEFAULTS["spacing_bottom"],
                        "background_color": CARD_DEFAULTS["background_color"],
                    }
                ],
            },
            {
                "key": "events",
                "title": "Upcoming Events",
                "layout": create_default_section_layout(),
                "cards": [
                    {
                        "type": "event",
                        "title": SAMPLE_EVENT["title"],
                        "body_html": SAMPLE_EVENT["body_html"],
                        "location": SAMPLE_EVENT["location"],
                        "date": SAMPLE_EVENT["date"],
                        "time": SAMPLE_EVENT["time"],
                        "links": [{"label": "Learn more", "url": "#"}],
                        "spacing_bottom": 20,
                        "background_color": "#f9f9f9",
                    }
                ],
            },
            {
                "key": "resources",
                "title": "Resources",
                "layout": create_default_section_layout(),
                "cards": [
                    {
                        "type": "resource",
                        "title": RESOURCE_LINKS["health_counseling"]["title"],
                        "body_html": RESOURCE_LINKS["health_counseling"]["body_html"],
                        "location": "",
                        "date": "",
                        "time": "",
                        "show_icon": True,
                        "icon_url": RESOURCE_ICONS["health_counseling"],
                        "icon_alt": "Health and Counseling Services icon",
                        "icon_size": 80,
                        "links": [
                            {
                                "label": "Read more",
                                "url": RESOURCE_LINKS["health_counseling"]["url"],
                            }
                        ],
                        "spacing_bottom": 20,
                    },
                    {
                        "type": "resource",
                        "title": RESOURCE_LINKS["basic_needs"]["title"],
                        "body_html": RESOURCE_LINKS["basic_needs"]["body_html"],
                        "show_icon": True,
                        "icon_url": RESOURCE_ICONS["basic_needs"],
                        "icon_alt": "Basic Needs icon",
                        "icon_size": 80,
                        "links": [
                            {"label": "Read more", "url": RESOURCE_LINKS["basic_needs"]["url"]}
                        ],
                        "spacing_bottom": 20,
                    },
                    {
                        "type": "resource",
                        "title": RESOURCE_LINKS["career_services"]["title"],
                        "body_html": RESOURCE_LINKS["career_services"]["body_html"],
                        "show_icon": True,
                        "icon_url": RESOURCE_ICONS["career_services"],
                        "icon_alt": "Career Services icon",
                        "icon_size": 80,
                        "links": [
                            {"label": "Read more", "url": RESOURCE_LINKS["career_services"]["url"]}
                        ],
                        "spacing_bottom": 20,
                    },
                ],
            },
            {
                "key": "submit_request",
                "title": "",
                "layout": create_default_section_layout(),
                "cards": [
                    {
                        "type": "cta",
                        "title": "Want to advertise in Friday Focus?",
                        "body_html": "<p>Submit your events, announcements, and opportunities for the next newsletter.</p>",
                        "button_bg_color": CTA_BUTTON_DEFAULTS["bg_color"],
                        "button_text_color": CTA_BUTTON_DEFAULTS["text_color"],
                        "button_padding_vertical": CTA_BUTTON_DEFAULTS["padding_vertical"],
                        "button_padding_horizontal": CTA_BUTTON_DEFAULTS["padding_horizontal"],
                        "button_border_width": CTA_BUTTON_DEFAULTS["border_width"],
                        "button_border_color": CTA_BUTTON_DEFAULTS["border_color"],
                        "button_border_radius": CTA_BUTTON_DEFAULTS["border_radius"],
                        "button_alignment": CTA_BUTTON_DEFAULTS["alignment"],
                        "button_full_width": CTA_BUTTON_DEFAULTS["full_width"],
                        "links": [
                            {
                                "label": "Please use this form",
                                "url": FRIDAY_FOCUS["submit_form_url"],
                            }
                        ],
                    }
                ],
            },
        ],
        "footer": {
            "address_lines": [
                ORGANIZATION["name"],
                ORGANIZATION["address_line_1"],
                ORGANIZATION["address_line_2"],
            ],
            "social": [link.copy() for link in DEFAULT_SOCIAL_LINKS],  # V7: Array-based
            "background_color": FOOTER_DEFAULTS["background_color"],
            "text_color": FOOTER_DEFAULTS["text_color"],
            "link_color": FOOTER_DEFAULTS["link_color"],
            "padding_top": FOOTER_DEFAULTS["padding_top"],
            "padding_bottom": FOOTER_DEFAULTS["padding_bottom"],
            "social_margin_top": FOOTER_DEFAULTS["social_margin_top"],
            "social_margin_bottom": FOOTER_DEFAULTS["social_margin_bottom"],
        },
        "settings": {
            "container_width": LAYOUT_DEFAULTS["container_width"],
            "section_spacing": LAYOUT_DEFAULTS["section_spacing"],
            "show_section_borders": LAYOUT_DEFAULTS["show_section_borders"],
            "padding_text": LAYOUT_DEFAULTS["padding_text"],
            "padding_image": LAYOUT_DEFAULTS["padding_image"],
            "typography": TYPOGRAPHY_DEFAULTS,
            "colors": {
                "primary": BRAND_PRIMARY,
                "text_dark": TEXT_DARK,
                "text_body": TEXT_BODY,
                "text_muted": TEXT_MUTED,
            },
        },
    }


def default_briefing_model():
    """Graduate School Briefing default data"""
    return {
        "template": "briefing",
        "masthead": {
            "banner_url": DEFAULT_BANNER_URL,
            "banner_alt": DEFAULT_BANNER_ALT,
            "title": BRIEFING["title"],
            "tagline": BRIEFING["tagline"],
            "preheader": BRIEFING["preheader"],
            "hero_show": True,
            "hero_link": "",
        },
        "sections": [
            {
                "key": "updates",
                "title": "Updates from the Graduate School",
                "layout": create_default_section_layout(),
                "cards": [
                    {
                        "type": "standard",
                        "title": "Sample Update",
                        "body_html": "<p>Plain text summary of an update.</p>",
                        "links": [],
                        "spacing_bottom": 20,
                    }
                ],
            },
            {
                "key": "fiscal",
                "title": "Fiscal Processor Updates",
                "layout": create_default_section_layout(),
                "cards": [
                    {
                        "type": "standard",
                        "title": "Sample Fiscal Note",
                        "body_html": "<p>Operational information that may impact fiscal processors.</p>",
                        "links": [],
                        "spacing_bottom": 20,
                    }
                ],
            },
            {
                "key": "closures",
                "title": "Graduate School Closures",
                "layout": create_default_section_layout(),
                "closures": [{"date": "Jan 1", "reason": "Office closed for New Year's Day"}],
            },
            {
                "key": "submit_request",
                "title": "",
                "layout": create_default_section_layout(),
                "cards": [
                    {
                        "type": "cta",
                        "title": "Submit Your Post",
                        "body_html": (
                            "<p>Do you have an update or announcement to share? We encourage submissions from "
                            "all graduate programs. Submit your post here. You can also access "
                            '<a href="https://gradschool.wsu.edu/faculty-and-staff-updates/">current and archived updates</a>.'
                            "</p>"
                        ),
                        "button_bg_color": CTA_BUTTON_DEFAULTS["bg_color"],
                        "button_text_color": CTA_BUTTON_DEFAULTS["text_color"],
                        "button_padding_vertical": CTA_BUTTON_DEFAULTS["padding_vertical"],
                        "button_padding_horizontal": CTA_BUTTON_DEFAULTS["padding_horizontal"],
                        "button_border_width": CTA_BUTTON_DEFAULTS["border_width"],
                        "button_border_color": CTA_BUTTON_DEFAULTS["border_color"],
                        "button_border_radius": CTA_BUTTON_DEFAULTS["border_radius"],
                        "button_alignment": CTA_BUTTON_DEFAULTS["alignment"],
                        "button_full_width": CTA_BUTTON_DEFAULTS["full_width"],
                        "links": [
                            {"label": "Submit your post", "url": BRIEFING["submit_form_url"]}
                        ],
                    }
                ],
            },
            {
                "key": "assistance",
                "title": "Need Assistance?",
                "layout": create_default_section_layout(),
                "cards": [
                    {
                        "type": "standard",
                        "title": "Contact Options",
                        "body_html": f"<p>Submit a ticket via our Jira service desk, access resources in our Knowledge Base, email {ORGANIZATION['email']}, or call {ORGANIZATION['phone']}.</p>",
                        "links": [
                            {"label": "Service Desk", "url": BRIEFING["jira_url"]},
                            {"label": "Knowledge Base", "url": BRIEFING["knowledge_base_url"]},
                        ],
                        "spacing_bottom": 20,
                    }
                ],
            },
        ],
        "footer": {
            "address_lines": [
                ORGANIZATION["name"],
                ORGANIZATION["address_line_1"],
                ORGANIZATION["address_line_2"],
            ],
            "social": [link.copy() for link in DEFAULT_SOCIAL_LINKS],  # V7: Array-based
            "background_color": FOOTER_DEFAULTS["background_color"],
            "text_color": FOOTER_DEFAULTS["text_color"],
            "link_color": FOOTER_DEFAULTS["link_color"],
            "padding_top": FOOTER_DEFAULTS["padding_top"],
            "padding_bottom": FOOTER_DEFAULTS["padding_bottom"],
            "social_margin_top": FOOTER_DEFAULTS["social_margin_top"],
            "social_margin_bottom": FOOTER_DEFAULTS["social_margin_bottom"],
        },
        "settings": {
            "container_width": LAYOUT_DEFAULTS["container_width"],
            "section_spacing": LAYOUT_DEFAULTS["section_spacing"],
            "show_section_borders": LAYOUT_DEFAULTS["show_section_borders"],
            "padding_text": LAYOUT_DEFAULTS["padding_text"],
            "padding_image": LAYOUT_DEFAULTS["padding_image"],
            "typography": TYPOGRAPHY_DEFAULTS,
            "colors": {
                "primary": BRAND_PRIMARY,
                "text_dark": TEXT_DARK,
                "text_body": TEXT_BODY,
                "text_muted": TEXT_MUTED,
            },
        },
    }


# ---------------- Flask Routes ----------------


@app.route("/")
def index():
    """Main editor page"""
    template_type = request.args.get("type", "ff")

    if template_type == "briefing":
        model = default_briefing_model()
    else:
        model = default_ff_model()

    return render_template("editor.html", model=json.dumps(model))


@app.post("/api/preview")
def api_preview():
    """Generate HTML preview from JSON data with detailed error handling"""
    try:
        data = request.get_json(force=True)
        html_output = render_full_email(data)
        return jsonify({"html": html_output, "success": True})
    except KeyError as e:
        # Specific handling for missing keys (like 'top', 'right', etc.)
        error_trace = traceback.format_exc()
        app.logger.error(f"Preview KeyError - Missing key '{str(e)}':\n{error_trace}")
        return (
            jsonify({"html": "", "success": False, "error": f"Missing required key: {str(e)}"}),
            500,
        )
    except Exception as e:
        # General error handling with full traceback
        error_trace = traceback.format_exc()
        app.logger.error(f"Preview generation failed: {str(e)}\n{error_trace}")
        return jsonify({"html": "", "success": False, "error": str(e)}), 500


@app.post("/api/generate_plaintext")
def api_generate_plaintext():
    """Generate plain-text version"""
    try:
        data = request.get_json(force=True)
        text = generate_plain_text(data)
        return jsonify({"text": text, "success": True})
    except Exception as e:
        app.logger.error(f"Plain-text generation failed: {str(e)}")
        return jsonify({"text": "", "success": False, "error": str(e)}), 500


@app.post("/api/export")
def api_export():
    """Export final HTML for Slate - V7.0.1 FIX: Safe JSON embedding"""
    try:
        data = request.get_json(force=True)

        # Extract export options
        export_options = data.get("export_options", {})
        minify = export_options.get("minify", False)
        strip_json = export_options.get("strip_json", False)
        requested_template = export_options.get("template_type")

        # Remove export_options from data before rendering
        newsletter_data = {k: v for k, v in data.items() if k != "export_options"}

        # Generate HTML - Log size for debugging
        app.logger.info(
            f"Generating HTML for template: {newsletter_data.get('template', 'unknown')}"
        )
        html_output = render_full_email(newsletter_data)
        original_size = len(html_output)
        app.logger.info(f"Generated HTML size: {original_size} bytes")

        # IMPROVED MINIFICATION: More conservative approach
        if minify:
            # Only remove whitespace between tags, preserve all other whitespace
            html_output = re.sub(r">\s+<", "><", html_output)
            minified_size = len(html_output)
            app.logger.info(
                f"Minified HTML size: {minified_size} bytes (saved {original_size - minified_size} bytes)"
            )

        # SAFE JSON EMBEDDING: Use Base64 encoding to prevent HTML comment issues
        if not strip_json:
            # Convert to JSON string
            json_str = json.dumps(newsletter_data, separators=(",", ":"))

            # Encode as Base64 to prevent HTML comment conflicts
            json_b64 = base64.b64encode(json_str.encode("utf-8")).decode("ascii")

            # Embed as safe HTML comment - breaks into chunks to avoid line length issues
            chunk_size = 100
            chunks = [json_b64[i : i + chunk_size] for i in range(0, len(json_b64), chunk_size)]

            embedded_comment = "<!-- WSU_NEWSLETTER_DATA_B64\n"
            embedded_comment += "\n".join(chunks)
            embedded_comment += "\n-->\n"

            html_output = html_output.replace("</body>", embedded_comment + "</body>")

            app.logger.info(
                f"Embedded JSON data: {len(json_str)} bytes → {len(json_b64)} bytes (Base64)"
            )

        final_size = len(html_output)
        app.logger.info(f"Final HTML size: {final_size} bytes")

        # Generate filename
        template_type = newsletter_data.get("template") or requested_template or "ff"
        friendly_prefix = {
            "ff": "FF",
            "briefing": "Briefing",
        }.get(template_type, EXPORT_DEFAULTS["filename_prefix"].get(template_type, "Newsletter"))
        suffix = "_PRODUCTION" if strip_json else ""
        filename = f"{friendly_prefix}_{datetime.now().strftime('%d-%m-%Y')}{suffix}.html"

        app.logger.info(f"Exporting as: {filename}")

        # Create response with explicit encoding
        html_bytes = html_output.encode("utf-8")

        return send_file(
            io.BytesIO(html_bytes),
            mimetype="text/html; charset=utf-8",
            as_attachment=True,
            download_name=filename,
        )

    except KeyError as e:
        error_trace = traceback.format_exc()
        app.logger.error(f"Export KeyError - Missing key '{str(e)}':\n{error_trace}")
        return jsonify({"success": False, "error": f"Missing required data: {str(e)}"}), 500
    except Exception as e:
        error_trace = traceback.format_exc()
        app.logger.error(f"Export failed: {str(e)}\n{error_trace}")
        return jsonify({"success": False, "error": f"Export failed: {str(e)}"}), 500


@app.post("/api/import")
def api_import():
    """Import newsletter from HTML file - V7.0.1 FIX: Support Base64 encoded data"""
    try:
        data = request.get_json(force=True)
        html_content = data.get("html", "")

        # Try new Base64 format first
        match = re.search(r"<!-- WSU_NEWSLETTER_DATA_B64\s+(.*?)\s+-->", html_content, re.DOTALL)

        if match:
            # Extract and decode Base64 data
            b64_data = match.group(1).replace("\n", "").replace(" ", "")
            try:
                json_str = base64.b64decode(b64_data).decode("utf-8")
                newsletter_data = json.loads(json_str)
                app.logger.info("✅ Imported newsletter from Base64-encoded data")
            except Exception as decode_error:
                app.logger.error(f"Failed to decode Base64 data: {decode_error}")
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Corrupted embedded data (Base64 decode failed)",
                        }
                    ),
                    400,
                )
        else:
            # Try legacy JSON format (unencoded)
            match = re.search(r"<!-- WSU_NEWSLETTER_DATA:(.*?) -->", html_content, re.DOTALL)

            if not match:
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "No embedded data found. This HTML was not exported from this editor.",
                        }
                    ),
                    400,
                )

            json_str = match.group(1)
            newsletter_data = json.loads(json_str)
            app.logger.info("✅ Imported newsletter from legacy JSON format")

        # V7 MIGRATION: Convert old social object to array
        if "footer" in newsletter_data and "social" in newsletter_data["footer"]:
            social = newsletter_data["footer"]["social"]

            # If it's old object format, convert to array
            if isinstance(social, dict) and not isinstance(social, list):
                migrated_social = []

                # Convert known platforms in order
                for platform_key in ["instagram", "linkedin", "facebook", "twitter", "youtube"]:
                    if platform_key in social:
                        platform_data = social[platform_key]

                        # Handle both old formats (string URL or object with url/icon)
                        if isinstance(platform_data, str):
                            # Very old format: just a string URL
                            migrated_social.append(
                                {
                                    "platform": platform_key.capitalize(),
                                    "url": platform_data,
                                    "icon": "",
                                    "alt": platform_key.capitalize(),
                                }
                            )
                        elif isinstance(platform_data, dict):
                            # V6 format: object with url and icon
                            migrated_social.append(
                                {
                                    "platform": platform_key.capitalize(),
                                    "url": platform_data.get("url", ""),
                                    "icon": platform_data.get("icon", ""),
                                    "alt": platform_data.get("alt", platform_key.capitalize()),
                                }
                            )

                newsletter_data["footer"]["social"] = migrated_social
                app.logger.info(
                    f"✅ Migrated {len(migrated_social)} social links from V6 to V7 format"
                )

        # V7 MIGRATION: Add title_align to sections if missing
        if "sections" in newsletter_data:
            for section in newsletter_data["sections"]:
                if "layout" in section and "title_align" not in section["layout"]:
                    section["layout"]["title_align"] = "left"
                    app.logger.info(
                        f"✅ Added default title_align to section: {section.get('title', 'untitled')}"
                    )

        return jsonify({"success": True, "data": newsletter_data})

    except json.JSONDecodeError as e:
        app.logger.error(f"JSON decode error: {str(e)}")
        return jsonify({"success": False, "error": f"Invalid JSON data: {str(e)}"}), 400
    except Exception as e:
        error_trace = traceback.format_exc()
        app.logger.error(f"Import failed: {str(e)}\n{error_trace}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/defaults/<template_type>")
def api_defaults(template_type):
    """Get default data for a template type"""
    if template_type == "briefing":
        model = default_briefing_model()
    else:
        model = default_ff_model()

    return jsonify(model)


@app.post("/api/validate")
def api_validate():
    """Validate newsletter for accessibility and content issues"""
    try:
        data = request.get_json(force=True)
        issues = []

        # Check masthead
        if not data.get("masthead", {}).get("banner_alt"):
            issues.append(
                {
                    "severity": "error",
                    "message": "Banner image missing alt text",
                    "location": "Masthead",
                    "fix": "Add descriptive alt text for screen readers",
                }
            )

        preheader = data.get("masthead", {}).get("preheader", "")
        if len(preheader) > 90:
            issues.append(
                {
                    "severity": "warning",
                    "message": f"Preheader text is {len(preheader)} characters (optimal: 40-90)",
                    "location": "Masthead",
                    "fix": "Shorten preheader for better inbox preview",
                }
            )

        # Check sections and cards
        for section in data.get("sections", []):
            section_title = section.get("title", "Untitled Section")

            for card in section.get("cards", []):
                card_title = card.get("title", "Untitled Card")

                # Check for placeholder links
                for link in card.get("links", []):
                    if link.get("url") == "#" or not link.get("url"):
                        issues.append(
                            {
                                "severity": "warning",
                                "message": f"Placeholder link in '{card_title}'",
                                "location": section_title,
                                "fix": "Replace '#' with actual URL or remove link",
                            }
                        )

                # Check for missing link labels
                for link in card.get("links", []):
                    if not link.get("label"):
                        issues.append(
                            {
                                "severity": "error",
                                "message": f"Link missing label in '{card_title}'",
                                "location": section_title,
                                "fix": "Add descriptive link text",
                            }
                        )

                # Check resource icons
                if card.get("type") == "resource" and card.get("show_icon"):
                    if not card.get("icon_alt"):
                        issues.append(
                            {
                                "severity": "error",
                                "message": f"Resource icon missing alt text in '{card_title}'",
                                "location": section_title,
                                "fix": "Add descriptive alt text for icon",
                            }
                        )

        # V7: Check social links
        footer_social = data.get("footer", {}).get("social", [])
        if isinstance(footer_social, list):
            for idx, link in enumerate(footer_social):
                if not link.get("alt") or link.get("alt").strip() == "":
                    issues.append(
                        {
                            "severity": "warning",
                            "message": f"Social link #{idx+1} ({link.get('platform', 'Unknown')}) missing alt text",
                            "location": "Footer",
                            "fix": "Add descriptive alt text for accessibility",
                        }
                    )

        return jsonify(
            {
                "success": True,
                "issues": issues,
                "total": len(issues),
                "errors": len([i for i in issues if i["severity"] == "error"]),
                "warnings": len([i for i in issues if i["severity"] == "warning"]),
            }
        )

    except Exception as e:
        app.logger.error(f"Validation failed: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.post("/api/stats")
def api_stats():
    """Get content statistics"""
    try:
        data = request.get_json(force=True)

        word_count = 0
        image_count = 0
        link_count = 0
        card_count = 0

        # Count masthead banner
        if data.get("masthead", {}).get("banner_url"):
            image_count += 1

        # Process sections
        for section in data.get("sections", []):
            for card in section.get("cards", []):
                card_count += 1

                # Count words in body_html
                body = card.get("body_html", "")
                # Strip HTML tags for word count
                text = re.sub(r"<[^>]+>", "", body)
                word_count += len(text.split())

                # Count images
                if card.get("show_icon") and card.get("icon_url"):
                    image_count += 1

                # Count links
                link_count += len(card.get("links", []))

        # V7: Count social media icons
        footer_social = data.get("footer", {}).get("social", [])
        if isinstance(footer_social, list):
            image_count += len([link for link in footer_social if link.get("icon")])

        # Estimated read time (200 words per minute)
        read_time = max(1, round(word_count / 200))

        return jsonify(
            {
                "success": True,
                "stats": {
                    "word_count": word_count,
                    "read_time_minutes": read_time,
                    "image_count": image_count,
                    "link_count": link_count,
                    "card_count": card_count,
                    "section_count": len(data.get("sections", [])),
                    "social_links": len(footer_social) if isinstance(footer_social, list) else 0,
                },
            }
        )

    except Exception as e:
        app.logger.error(f"Stats generation failed: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------- Error Handlers ----------------


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def server_error(e):
    app.logger.error(f"Server error: {str(e)}")
    return jsonify({"error": "Server error"}), 500


# ---------------- Run App ----------------

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
