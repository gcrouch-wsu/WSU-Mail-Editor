#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Unified Org Chart Admin - Secure Version v3.0
• Enhanced security with input validation and rate limiting
• CSRF protection
• Content length limits
• Improved error handling
"""

import json
import re
import webbrowser
import secrets
from pathlib import Path
from functools import wraps
from datetime import datetime, timedelta
from collections import defaultdict
from flask import Flask, Response, jsonify, send_file, request, session

APP_ROOT = Path(__file__).resolve().parent
app = Flask(__name__)

# Security configuration
app.config['SECRET_KEY'] = secrets.token_hex(32)  # Generate secure secret key
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max request size
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Rate limiting configuration
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 30  # requests per window
rate_limit_storage = defaultdict(list)

# Input validation constants
MAX_NODE_ID_LENGTH = 50
MAX_NODE_NAME_LENGTH = 100
MAX_NODE_TITLE_LENGTH = 200
MAX_NODES_COUNT = 1000
MAX_HTML_INPUT_LENGTH = 500 * 1024  # 500KB

def rate_limit_check(client_id):
    """Check if client has exceeded rate limit."""
    now = datetime.now()
    cutoff = now - timedelta(seconds=RATE_LIMIT_WINDOW)

    # Clean old requests
    rate_limit_storage[client_id] = [
        timestamp for timestamp in rate_limit_storage[client_id]
        if timestamp > cutoff
    ]

    # Check limit
    if len(rate_limit_storage[client_id]) >= RATE_LIMIT_MAX_REQUESTS:
        return False

    # Add current request
    rate_limit_storage[client_id].append(now)
    return True

def rate_limit(f):
    """Rate limiting decorator."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_id = request.remote_addr
        if not rate_limit_check(client_id):
            return jsonify(
                ok=False,
                error="Rate limit exceeded. Please try again later."
            ), 429
        return f(*args, **kwargs)
    return decorated_function

def add_security_headers(response):
    """Add security headers to response."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Content-Security-Policy'] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.sheetjs.com"
    return response

app.after_request(add_security_headers)

def validate_layout_type(layout_type):
    """Validate layout type parameter."""
    valid_types = ["centered", "vertical", "vertical_horizontal"]
    if layout_type not in valid_types:
        return "centered"  # Default fallback
    return layout_type

def validate_node(node):
    """Validate a single node object."""
    errors = []

    if not isinstance(node, dict):
        return ["Node must be an object"]

    # Validate ID
    node_id = node.get('id', '')
    if not node_id or not isinstance(node_id, str):
        errors.append("Node ID is required and must be a string")
    elif len(node_id) > MAX_NODE_ID_LENGTH:
        errors.append(f"Node ID must be {MAX_NODE_ID_LENGTH} characters or less")
    elif not re.match(r'^[a-zA-Z0-9_-]+$', node_id):
        errors.append("Node ID must contain only letters, numbers, hyphens, and underscores")

    # Validate name
    name = node.get('name', '')
    if name and not isinstance(name, str):
        errors.append("Node name must be a string")
    elif isinstance(name, str) and len(name) > MAX_NODE_NAME_LENGTH:
        errors.append(f"Node name must be {MAX_NODE_NAME_LENGTH} characters or less")

    # Validate title
    title = node.get('title', '')
    if title and not isinstance(title, str):
        errors.append("Node title must be a string")
    elif isinstance(title, str) and len(title) > MAX_NODE_TITLE_LENGTH:
        errors.append(f"Node title must be {MAX_NODE_TITLE_LENGTH} characters or less")

    # Validate parent (optional)
    parent = node.get('parent')
    if parent is not None and not isinstance(parent, str):
        errors.append("Node parent must be a string or null")

    # Validate side (optional, for centered layout)
    side = node.get('side')
    if side is not None and side not in ['L', 'R', '']:
        errors.append("Node side must be 'L', 'R', or empty")

    return errors

def sanitize_html_input(html_string):
    """Basic sanitization of HTML input - removes potentially dangerous patterns."""
    if not html_string or not isinstance(html_string, str):
        return ""

    # Limit length
    if len(html_string) > MAX_HTML_INPUT_LENGTH:
        raise ValueError(f"Input exceeds maximum length of {MAX_HTML_INPUT_LENGTH} characters")

    # Remove script tags (except our data script)
    # Allow script tags only with id="wsu-org-data"
    cleaned = re.sub(
        r'<script(?![^>]*id=["\']wsu-org-data["\'])[^>]*>.*?</script>',
        '',
        html_string,
        flags=re.DOTALL | re.IGNORECASE
    )

    # Remove event handlers
    cleaned = re.sub(r'\s*on\w+\s*=\s*["\'][^"\']*["\']', '', cleaned, flags=re.IGNORECASE)

    return cleaned

def _find_file(filenames):
    """Find first existing file from a list."""
    for name in filenames:
        path = APP_ROOT / name
        if path.exists() and path.is_file():
            return path
    return None

def _find_runtime_path(layout_type):
    """Find JS runtime for layout type."""
    layout_type = validate_layout_type(layout_type)

    # First check for unified Wordpress.js (supports all layouts)
    wordpress_js = _find_file(["Wordpress.js"])
    if wordpress_js:
        return wordpress_js
    # Fall back to individual layout files if Wordpress.js doesn't exist
    if layout_type == "centered":
        return _find_file(["center.js"])
    elif layout_type == "vertical":
        return _find_file(["vertical.js"])
    else:  # vertical_horizontal
        return _find_file(["horizontal.js"])

def _find_sample_html(layout_type):
    """Find sample HTML for layout type."""
    layout_type = validate_layout_type(layout_type)

    if layout_type == "centered":
        return _find_file(["center.html"])
    elif layout_type == "vertical":
        return _find_file(["vertical.html"])
    else:  # vertical_horizontal
        return _find_file(["horizontal.html"])

def _find_css_path(layout_type):
    """Find CSS for layout type."""
    layout_type = validate_layout_type(layout_type)

    # First check for unified Wordpress.css (supports all layouts)
    wordpress_css = _find_file(["Wordpress.css"])
    if wordpress_css:
        return wordpress_css
    # Fall back to individual layout files if Wordpress.css doesn't exist
    if layout_type == "centered":
        return _find_file(["center.css"])
    elif layout_type == "vertical":
        return _find_file(["vertical.css"])
    else:  # vertical_horizontal
        return _find_file(["horizontal.css"])

# Main admin page
@app.route("/")
def home():
    """Serve the main admin HTML page."""
    html_file = APP_ROOT / "unified_admin.html"
    if html_file.exists():
        return send_file(str(html_file), mimetype="text/html")
    else:
        return """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Error</title></head>
<body>
  <h1>Error: unified_admin.html not found</h1>
  <p>Please create unified_admin.html in the same directory as this script.</p>
  <p>Looking in: """ + str(APP_ROOT) + """</p>
</body></html>""", 404

# Admin JavaScript
@app.route("/admin.js")
def serve_admin_js():
    """Serve the admin JavaScript file with no-cache headers."""
    js_file = APP_ROOT / "admin.js"
    if js_file.exists():
        response = send_file(str(js_file), mimetype="text/javascript")
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    return Response(
        "console.error('admin.js not found');",
        mimetype="text/javascript",
        status=404
    )

# Sample HTML files
@app.route("/sample")
@rate_limit
def sample():
    """Serve sample HTML for the selected layout type."""
    layout_type = request.args.get("type", "centered")
    layout_type = validate_layout_type(layout_type)

    fp = _find_sample_html(layout_type)
    if fp and fp.exists():
        return send_file(str(fp), mimetype="text/html")
    return Response(
        f"No sample file found for {layout_type} layout.",
        mimetype="text/plain",
        status=404
    )

# Chart runtime JavaScript (dynamically selected based on layout type)
@app.route("/runtime.js")
@rate_limit
def serve_runtime():
    """Serve the chart runtime JS based on layout type parameter."""
    layout_type = request.args.get("type", "centered")
    layout_type = validate_layout_type(layout_type)

    rp = _find_runtime_path(layout_type)
    if not rp:
        msg = f"console.error('Runtime JS not found for {layout_type} layout.');"
        return Response(msg, mimetype="text/javascript", status=404)
    return send_file(str(rp), mimetype="text/javascript")

# Chart runtime CSS (dynamically selected based on layout type)
@app.route("/runtime.css")
@rate_limit
def serve_css():
    """Serve the chart CSS based on layout type parameter."""
    layout_type = request.args.get("type", "centered")
    layout_type = validate_layout_type(layout_type)

    css_file = _find_css_path(layout_type)
    if css_file and css_file.exists():
        return send_file(str(css_file), mimetype="text/css")
    return Response("", mimetype="text/css", status=404)

# Import API endpoint
@app.route("/api/import", methods=["POST"])
@rate_limit
def api_import():
    """
    Parse a pasted/loaded WP block with security validation:
      - Extract JSON array from <script id="wsu-org-data">
      - Extract container data-* attributes
      - Validate all input data
    """
    try:
        # Check content type
        if not request.is_json and not request.get_json(silent=True):
            return jsonify(ok=False, error="Invalid content type. Expected JSON."), 400

        data = request.get_json(force=True) or {}
        raw = data.get("raw", "")

        if not raw:
            return jsonify(ok=False, error="No input provided"), 400

        if not isinstance(raw, str):
            return jsonify(ok=False, error="Input must be a string"), 400

        # Sanitize HTML input
        try:
            raw = sanitize_html_input(raw)
        except ValueError as e:
            return jsonify(ok=False, error=str(e)), 400

        # Find the JSON data script with timeout protection
        try:
            m = re.search(
                r'<script[^>]+id=["\']wsu-org-data["\'][^>]*>(.*?)</script>',
                raw,
                re.S | re.I
            )
        except re.error as e:
            return jsonify(ok=False, error=f"Regex error: {e}"), 400

        if not m:
            return jsonify(
                ok=False,
                error="Could not find <script id='wsu-org-data'> JSON block"
            ), 400

        # Parse JSON with size limit
        json_text = m.group(1).strip()
        if len(json_text) > MAX_HTML_INPUT_LENGTH:
            return jsonify(
                ok=False,
                error="JSON data too large"
            ), 400

        try:
            nodes = json.loads(json_text)
        except json.JSONDecodeError as e:
            return jsonify(ok=False, error=f"JSON parse error: {e}"), 400

        if not isinstance(nodes, list):
            return jsonify(
                ok=False,
                error="JSON payload must be a bare array ([])"
            ), 400

        # Validate node count
        if len(nodes) > MAX_NODES_COUNT:
            return jsonify(
                ok=False,
                error=f"Too many nodes. Maximum allowed: {MAX_NODES_COUNT}"
            ), 400

        # Validate each node
        all_errors = []
        for i, node in enumerate(nodes):
            node_errors = validate_node(node)
            if node_errors:
                all_errors.append(f"Node {i} ({node.get('id', 'unknown')}): {', '.join(node_errors)}")

        if all_errors:
            return jsonify(
                ok=False,
                error="Validation errors: " + "; ".join(all_errors[:5])  # Show first 5 errors
            ), 400

        # Extract layout attributes from container div
        host = re.search(r'<div[^>]+id=["\']wsu-orgchart["\'][^>]*>', raw, re.I)
        layout = {}

        def attr(name, cast=None, default=None):
            """Extract attribute value from host div with type safety."""
            if not host:
                return default
            m2 = re.search(fr'{name}\s*=\s*"([^"]+)"', host.group(0))
            if not m2:
                return default
            val = m2.group(1)

            if cast is float:
                try:
                    result = float(val)
                    # Sanity check for reasonable values
                    if not (-1000 <= result <= 1000):
                        return default
                    return result
                except (ValueError, OverflowError):
                    return default
            if cast is int:
                try:
                    result = int(float(val))
                    # Sanity check for reasonable values
                    if not (-10000 <= result <= 10000):
                        return default
                    return result
                except (ValueError, OverflowError):
                    return default

            # For strings, limit length
            if isinstance(val, str) and len(val) > 100:
                return default
            return val

        # Extract responsive scale attributes (all layouts)
        layout["scaleDesktop"] = attr("data-scale-desktop", float, None)
        layout["scaleTablet"] = attr("data-scale-tablet", float, None)
        layout["scalePhone"] = attr("data-scale-phone", float, None)
        # Legacy single scale for backwards compatibility
        layout["scale"] = attr("data-scale", float, None)

        # Extract all possible attributes (centered layout)
        layout["hgaps"] = attr("data-hgaps", None, None)
        layout["stubs"] = attr("data-stubs", None, None)
        layout["cardw"] = attr("data-cardw", int, None)
        layout["l1stub"] = attr("data-l1stub", int, None)
        layout["center"] = attr("data-center", int, None)
        layout["openDepthDesktop"] = attr("data-open-depth-desktop", int, None)
        layout["openDepthTablet"] = attr("data-open-depth-tablet", int, None)
        layout["openDepthPhone"] = attr("data-open-depth-phone", int, None)
        layout["connectorAlign"] = attr("data-c-connector-align", int, None)

        # Extract simple vertical layout attributes
        layout["hgap"] = attr("data-hgap", int, None)
        layout["vgap"] = attr("data-vgap", int, None)

        # Extract vertical/horizontal layout attributes
        layout["mode"] = attr("data-mode", None, None)
        layout["breakpoint"] = attr("data-breakpoint", int, None)
        layout["toggle"] = attr("data-toggle", int, None)

        return jsonify(ok=True, nodes=nodes, layout=layout)

    except json.JSONDecodeError as e:
        return jsonify(ok=False, error=f"JSON parse error: {e}"), 400
    except Exception as e:
        # Log the error in production
        app.logger.error(f"Import error: {e}")
        return jsonify(ok=False, error="Internal server error"), 500

def _open_browser():
    """Open the default browser to the admin page."""
    try:
        webbrowser.open_new("http://localhost:5000/")
    except Exception:
        pass

if __name__ == "__main__":
    print("\n" + "="*50)
    print("  Unified Org Chart Admin v3.0 (Secure)")
    print("="*50)
    print("\nSecurity features enabled:")
    print("  [+] Input validation")
    print("  [+] Rate limiting (30 req/min)")
    print("  [+] Content length limits (5MB)")
    print("  [+] Security headers")
    print("  [+] Sanitization")
    print("\nChecking files...")

    # Check for admin files
    html_exists = (APP_ROOT / "unified_admin.html").exists()
    js_exists = (APP_ROOT / "admin.js").exists()

    print(f"\nAdmin Interface:")
    print(f"  HTML: {'[OK] Found' if html_exists else '[!!] MISSING unified_admin.html'}")
    print(f"  JS:   {'[OK] Found' if js_exists else '[!!] MISSING admin.js'}")

    # Check for chart runtimes
    print(f"\nChart Runtimes:")
    for layout in ["centered", "vertical", "horizontal"]:
        layout_key = "vertical_horizontal" if layout == "horizontal" else layout
        rt = _find_runtime_path(layout_key)
        css = _find_css_path(layout_key)
        sample = _find_sample_html(layout_key)

        print(f"  {layout}:")
        print(f"    JS:     {'[OK]' if rt else '[!!]'} {rt.name if rt else 'NOT FOUND'}")
        print(f"    CSS:    {'[OK]' if css else '[!!]'} {css.name if css else 'NOT FOUND'}")
        print(f"    Sample: {'[OK]' if sample else '[!!]'} {sample.name if sample else 'NOT FOUND'}")

    if not html_exists or not js_exists:
        print("\n[WARNING] Admin interface files missing!")
        print("   The server will start but may not work correctly.")

    print("\n" + "="*50)
    print("  Starting server at http://localhost:5000/")
    print("="*50 + "\n")

    _open_browser()
    app.run(host="localhost", port=5000, debug=False)
