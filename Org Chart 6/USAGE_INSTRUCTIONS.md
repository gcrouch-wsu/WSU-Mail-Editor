# Org Chart Admin - Usage Instructions

## Getting Started

### Starting the Application
1. Open terminal/command prompt
2. Navigate to the folder: `cd "C:\python projects\Org Chart 5"`
3. Run: `python unified_org_admin_secure.py`
4. Browser opens automatically to http://localhost:5000/

### Stopping the Application
Press `Ctrl+C` in the terminal window

## Interface Overview

The admin interface has three columns:

**Left Column:**
- Import & People - Import data and manage nodes
- Inspector - Edit individual node details

**Middle Column:**
- Styling - Control appearance (fonts, colors, cards, buttons)
- Layout - Configure layout-specific settings

**Right Column:**
- Live Preview - See changes in real-time (scrolls with you)

## Choosing a Layout Type

Select from the dropdown at the top of the left column:

1. **Centered (Left/Right)** - Traditional org chart with spine down the center, branches on left and right
2. **Simple Vertical** - Root on left, flows horizontally to the right
3. **Horizontal** - Root at top, flows vertically downward

## Importing Data

### Option 1: Upload HTML File
1. Click "Choose File" next to "Upload HTML File"
2. Select a previously exported `.html` file
3. Click "Upload & Import"
4. Data loads automatically

### Option 2: Paste HTML
1. Copy WordPress Custom HTML block content
2. Paste into the text area
3. Click "Import Now"

### Option 3: Upload Excel File
1. Click "Download Template" to get the Excel format
2. Fill in your org chart data (id, name, title, parent, side)
3. Click "Choose File" next to "Upload Excel File"
4. Click "Upload Excel"

### Option 4: Load Sample
Click "Load Sample" to load a pre-configured example for the current layout type

## Managing Nodes

### Adding Nodes
- **Add Child:** Select a node, click "Add Child" (creates child under selected node)
- **Add Sibling:** Select a node, click "Add Sibling" (creates sibling at same level)
- **Add Root:** Click "Add Root" to create a new top-level node

### Editing Nodes
1. Select a node from the "Node selector" dropdown
2. Inspector shows current values
3. Edit ID, Parent, Name, Title, or Side (for centered layout)
4. Click "Save" to apply changes
5. Click "Revert" to undo unsaved changes

### Deleting Nodes
- **Delete (Reassign Reports):** Deletes the node but keeps its children (reassigns them to deleted node's parent)
- **Delete Entire Subtree:** Deletes the node and all its descendants

### Level-1 Controls (Centered Layout Only)
**Reordering:**
1. Select a Level-1 node from the dropdown
2. Click "↑ Up" or "↓ Down" to change order
3. Order changes immediately in preview

**Flipping Sides:**
1. Select a Level-1 node
2. Click "Flip L ↔ R"
3. Node and entire subtree moves to opposite side

## Styling the Chart

All styling changes appear immediately in the Live Preview.

### Text Styling
- **Name:** Font, size (px), weight, style, color
- **Title:** Font, size (px), weight, style, color

### Card Styling
- **Card fill:** Background color
- **Card stroke:** Border color
- **Card shadow:** On/Off

### Connector Styling
- **Link color/width:** Lines connecting child to parent
- **Spine color/width:** Main vertical/horizontal line (layout dependent)

### Button Styling
- **Circle fill/stroke/outline:** Expand/collapse button appearance
- **Button fill:** The +/− symbol color

### Typography Enhancement
- **Line height:** Spacing between lines of text
- **Letter spacing:** Space between characters
- **Text alignment:** Left, Center, or Right
- **Text gap:** Vertical space between name and title

### Card Appearance
- **Padding:** Space inside card (top, bottom, left, right)
- **Border radius:** Card corner roundness
- **Border width:** Card outline thickness

### Button Appearance
- **Button size:** Radius of expand/collapse button
- **Offset X/Y:** Button position relative to card corner

### Shadow Settings
- **Blur:** Shadow softness
- **Opacity:** Shadow darkness (0-1)
- **Offset X/Y:** Shadow position

### Spacing
- **Margin:** Space around entire chart
- **Sibling gap:** Space between sibling nodes

### Background
- **Background color:** Chart background
- **Use transparent:** Makes background transparent

## Layout Settings

Settings vary by layout type. Changes apply immediately to Live Preview.

### Centered Layout

**Basic Settings:**
- **HGaps:** Horizontal spacing pattern (e.g., "40,60,80")
- **Stubs:** Connector stub length pattern (e.g., "18,24,30")
- **Card width/height:** Card dimensions in pixels
- **L1 Stub:** Stub length for Level-1 connectors
- **Center:** Center the root node (Yes/No)
- **Align root connector:** Align connector to root (Yes/No)

**Scale (Responsive):**
Set different zoom levels for different screen sizes:
- **Desktop** (≥1024px): Typically 0.85
- **Tablet** (768-1023px): Typically 0.75
- **Phone** (<768px): Typically 0.60

**Expand/Collapse Depth (Responsive):**
How many levels open by default:
- **Desktop:** 1-5 levels
- **Tablet:** 1-5 levels
- **Phone:** 1-5 levels

**Helper Text:**
- **Text:** Message shown above chart (e.g., "Click circles to expand")
- **Font size:** Text size in pixels

### Simple Vertical Layout

**Basic Settings:**
- **Card width/height:** Card dimensions
- **H Gap:** Horizontal space between levels
- **V Gap:** Vertical space between siblings
- **Root offset Y:** Move root up/down

**Scale & Expand/Collapse Depth:** Same as Centered layout

### Horizontal Layout

**General:**
- **Card width/height:** Card dimensions
- **V Gap:** Vertical connector spacing
- **H Gap:** Horizontal sibling spacing
- **H Stub/Parent Stub:** Connector stub lengths
- **Max Columns:** Limit children per row (0 = unlimited)
- **Row Spacing:** Space between wrapped rows
- **Breakpoint:** Responsive toggle breakpoint (px)
- **Toggle:** Enable responsive mode switching (Yes/No)
- **Root offset X:** Move root left/right
- **Align rows:** Align wrapped rows (Yes/No)
- **Wrap:** Single row, Flow (wrap), or none
- **Pack:** Balanced or Compact

**Scale & Expand/Collapse Depth:** Same as Centered layout

## Exporting Your Chart

### Choose Export Mode

The admin interface provides two export modes to fit different use cases:

**Lightweight Export (Default):**
- Smaller file size (~7KB)
- Requires one-time WordPress setup (load Wordpress.js/css globally)
- Best for sites with multiple org charts
- Easy to update all charts at once
- Changes to global runtime files update all charts

**Self-Contained Export:**
- Larger file size (~100KB, ~28KB gzipped)
- No WordPress setup needed - just paste and it works
- Best for single charts, sharing externally, demos, or testing
- Each chart carries its own version of JS/CSS
- Fully portable and independent

**To use self-contained mode:**
1. Check the box "Self-contained export (includes JS/CSS)" in the header
2. Click "Export WP HTML"
3. File downloads with "_standalone" suffix (e.g., `wsu_org_center_standalone_20251128.html`)
4. Paste into WordPress Custom HTML block - no global setup required

### Export WordPress HTML
1. Make all desired changes in the admin
2. (Optional) Check "Self-contained export" for standalone mode
3. Click "Export WP HTML" at the top
4. File downloads (e.g., `wsu_org_center_20251128.html` or `wsu_org_center_standalone_20251128.html`)
5. **Use this file in WordPress Custom HTML block**

### Download JSON
1. Click "Download JSON" at the top
2. File contains just the node data
3. **Use for backup or programmatic access**

## WordPress Deployment

1. Export HTML from the admin
2. In WordPress, add a **Custom HTML block**
3. Paste the entire exported HTML content
4. **Important:** Ensure `Wordpress.js` is loaded globally via **WordPress Custom JavaScript** plugin
5. **Important:** Ensure `Wordpress.css` is loaded globally via **WordPress Edit CSS** plugin
6. Publish/Update the page

The chart renders automatically when the page loads.

## Tips & Best Practices

### Node IDs
- Use unique, descriptive IDs (e.g., "john-doe", "ceo", "marketing-director")
- Only letters, numbers, hyphens, underscores allowed
- IDs are permanent - changing an ID creates a new node

### Parent-Child Relationships
- Each node can have only one parent
- Root node has `parent: null`
- Deleting a parent reassigns children to grandparent (unless you delete subtree)

### Side Assignment (Centered Layout)
- "L" = left side, "R" = right side
- Only applies to Level-1 nodes and their descendants
- Use Level-1 Controls to flip entire subtrees

### Styling Consistency
- Use web-safe fonts for best compatibility
- Test colors in different lighting/screens
- Keep text readable (sufficient contrast, size)

### Performance
- Charts with 100+ nodes may be slow on mobile
- Use responsive open depth to limit initial nodes shown
- Smaller scale values help fit more on screen

### Testing Workflow
1. Make changes in admin
2. Check Live Preview
3. Export HTML
4. Re-import the exported HTML to verify it works
5. Deploy to WordPress

## Troubleshooting

### Preview Not Updating
- Check browser console for errors (F12)
- Refresh the page
- Restart the Python server

### Import Fails
- Ensure HTML contains `<script id="wsu-org-data">` tag
- Check that JSON is valid (no trailing commas, proper quotes)
- Verify file is under 500KB

### Nodes Not Appearing
- Check that parent IDs match existing node IDs
- Verify JSON structure is correct
- Check browser console for errors

### Export Doesn't Work in WordPress
- Confirm Wordpress.js is loaded globally
- Confirm Wordpress.css is loaded globally
- Check browser console on WordPress page for errors
- Verify Custom HTML block contains entire exported content

### Scale Not Working
- Scale values must be 0.4-1.6
- Desktop/Tablet/Phone scales work on WordPress (when Wordpress.js supports responsive scaling)
- Preview uses desktop scale value

## Keyboard Shortcuts

None currently - all actions are click-based.

## Browser Compatibility

**Recommended:** Chrome, Edge, Firefox (latest versions)
**Required:** JavaScript enabled
**Not Supported:** Internet Explorer

## Data Privacy & Security

- All processing happens locally (localhost:5000)
- No data sent to external servers
- Rate limiting prevents abuse (30 requests/minute)
- Input validation prevents malicious data
- Exported files are standalone HTML (safe to share)

## Getting Help

Check the Live Preview as you work - it shows exactly what will appear in WordPress. If something doesn't look right in the preview, adjust settings until it does.

For technical issues, check:
1. Browser console (F12 → Console tab)
2. Terminal where Python is running (look for error messages)
3. AI_HANDOFF.md for technical details
