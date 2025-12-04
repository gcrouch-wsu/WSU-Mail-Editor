# AI Handoff Documentation - Org Chart Admin System

## Project Overview
Unified organizational chart admin system with Flask backend and web-based editor. Generates WordPress-ready HTML with embedded data and styling.

## Architecture

### Backend (Python Flask)
**File:** `unified_org_admin_secure.py`
- Flask server on localhost:5000
- Security features: input validation, rate limiting, CSRF protection, content length limits
- API endpoint: `/api/import` - parses WordPress HTML blocks and extracts JSON data + layout attributes
- Serves admin interface and sample files based on layout type
- Opens browser automatically on startup

### Frontend (Admin Interface)
**Files:** `unified_admin.html`, `admin.js`

**3-Column Layout:**
- **Column 1:** Import & People, Inspector (node editing)
- **Column 2:** Styling (typography, cards, buttons, shadows, spacing), Layout controls
- **Column 3:** Live Preview (sticky, scrollable)

**Key Features:**
- Import from HTML file or paste
- Excel import/export support (uses SheetJS CDN)
- Node management (add/edit/delete, parent reassignment)
- Level-1 node reordering and L↔R flip (for centered layout)
- Real-time preview updates
- Export to WordPress-ready HTML

### Runtime Files
**Primary:**
- `Wordpress.js` - Unified runtime supporting all three layout types
- `Wordpress.css` - Unified styles

**Fallback (if Wordpress.js/css don't exist):**
- `center.js/css`, `vertical.js/css`, `horizontal.js/css`

**Sample Files:**
- `center.html`, `vertical.html`, `horizontal.html` - Sample charts for each layout
- `current_org_chart.html` - Current working org chart (WSU Graduate School)

## Layout Types

### 1. Centered (Spine)
- Root in center with left/right branching
- Nodes have `side: "L"` or `side: "R"` property
- Responsive scale (desktop/tablet/phone)
- Responsive open depth (auto-expand levels)
- Configurable: hgaps, stubs, L1 stub, center alignment

### 2. Simple Vertical
- Root on left, flows right
- No side property needed
- Responsive scale
- Responsive auto-depth
- Configurable: hgap, vgap, root offset Y

### 3. Horizontal
- Root on top, flows downward
- Hybrid row mode with wrap/pack options
- Responsive scale
- Responsive auto-depth
- Optional breakpoint toggle for responsive switching
- Configurable: stubs, parent stubs, max columns, row spacing, align rows

## Data Structure

### Node Format
```json
{
  "id": "unique-id",
  "name": "Person Name",
  "title": "Job Title",
  "parent": "parent-id or null for root",
  "side": "L or R (centered layout only)"
}
```

### WordPress Export Format
```html
<!-- Comments with setup instructions -->
<div style="...">Helper text (optional)</div>
<div id="wsu-orgchart" class="wsu-orgchart" data-*="...">
  <!-- Container with all configuration as data attributes -->
</div>
<script id="wsu-org-data" type="application/json">[...]</script>
<script>(function(){ /* Bootstrap code */ })();</script>
```

## Responsive Scale Implementation

**Current State (as of Nov 2025):**
- Admin interface supports responsive scale (desktop/tablet/phone breakpoints)
- Export includes `data-scale-desktop`, `data-scale-tablet`, `data-scale-phone` attributes
- Preview uses `data-scale` (set to desktop value) because Wordpress.js currently only reads that attribute
- When Wordpress.js is updated to support responsive scaling, it will read the breakpoint-specific attributes

**Breakpoints:**
- Desktop: ≥1024px (default: 0.85)
- Tablet: 768-1023px (default: 0.75)
- Phone: <768px (default: 0.60)

## Security Features

### Input Validation
- Node ID: alphanumeric, hyphens, underscores only (max 50 chars)
- Name/Title: max length limits (100/200 chars)
- Max nodes: 1000
- HTML input: max 500KB

### Sanitization
- Removes script tags except `<script id="wsu-org-data">`
- Removes event handlers (onclick, etc.)
- **Critical:** HTML comments must not contain `<script>` or `</script>` text - this breaks the regex pattern

### Rate Limiting
- 30 requests per minute per client IP
- Applied to /sample, /api/import, and runtime endpoints

## Important Notes

### HTML Comment Issue
The Python sanitization uses regex to preserve the data script while removing others:
```python
r'<script(?![^>]*id=["\']wsu-org-data["\'])[^>]*>.*?</script>'
```
**Problem:** If HTML comments contain `<script>` text, the regex matches from the comment to the actual script tag's closing, removing the data script.

**Solution:** Never use `<script>` or `</script>` in HTML comments. Use "script" instead.

### File Serving Logic
Python backend checks for files in this order:
1. Wordpress.js/css (unified, preferred)
2. Falls back to layout-specific files if unified doesn't exist

### Import/Export Cycle
- Exported HTML can be re-imported
- Import detects layout type from attributes (data-mode, data-hgap, or default to centered)
- Backwards compatible with legacy single-scale format

## Development Workflow

### To Run Application
```bash
cd "C:\python projects\Org Chart 5"
python unified_org_admin_secure.py
```
Browser opens automatically to http://localhost:5000/

### To Test Changes
1. Edit controls in admin interface
2. View live preview (updates in real-time)
3. Export HTML
4. Test re-import of exported HTML
5. Verify all attributes preserved

### Common Debugging
- Check browser console for JavaScript errors
- Check Flask terminal for Python errors
- Verify data attributes on preview div: Inspect Element → `<div id="wsu-orgchart">`
- Test import with `/api/import` endpoint directly if needed

## File Dependencies

### Required Files
- `unified_org_admin_secure.py` - Flask server
- `unified_admin.html` - Admin UI
- `admin.js` - Admin logic
- `Wordpress.js` - Runtime
- `Wordpress.css` - Styles
- Sample HTML files (for Load Sample button)

### Optional Files
- Individual layout JS/CSS (fallback)
- `current_org_chart.html` (working example)

## Future Enhancements Needed

1. **Wordpress.js Update:** Add responsive scale support (read data-scale-desktop/tablet/phone)
2. ~~**Alignment Improvements:** Ensure all grid3 inputs/selects align perfectly~~ ✓ **COMPLETED** (Nov 2025)
3. **Additional Validation:** More robust parent-child cycle detection
4. **Export Options:** JSON-only export, different HTML formats
5. **Undo/Redo:** History tracking for node changes
6. **Drag-and-Drop Reorganization:** Interactive card dragging for org structure changes (see detailed plan below)

## CSS Grid Layout
```css
main {
  display: grid;
  grid-template-columns: 380px 420px 1fr;
  gap: 16px;
  padding: 14px;
}
```
Sections flow left-to-right, top-to-bottom in document order.

## Critical Code Sections

### Scale Application (admin.js:326-371)
Sets both responsive attributes AND legacy data-scale for preview compatibility.

### Import Logic (admin.js:766-854)
Handles backwards compatibility with legacy single-scale format.

### Export Building (admin.js:856-1018)
Generates WordPress-ready HTML with all attributes and bootstrap code.

### Sanitization (Python:135-156)
Regex-based HTML cleaning - fragile, avoid modifying without thorough testing.

## Recent Fixes (November 2025)

### Issue 1: Card Fill Not Updating in Live Preview
**Problem:** Changing card fill color in admin controls didn't update preview. Button circle fill worked, but card fill didn't.

**Root Cause:** CSS rule at `Wordpress.css:69` (`.oc-card-rect { fill: #fff; }`) was overriding SVG `fill` attribute set by JavaScript. CSS has higher specificity than SVG attributes.

**Fix:** Modified `drawCard()` function in `Wordpress.js:542-551` to use inline styles instead of SVG attributes:
```javascript
// Before:
rect.setAttribute("fill", cardFill);

// After:
var rectStyle = "fill: " + cardFill + "; stroke: " + cardStroke + "; stroke-width: " + String(cardStrokeWidth) + ";";
rect.setAttribute("style", rectStyle);
```

**Why This Works:** Inline styles have higher CSS specificity than stylesheet rules, overriding the `.oc-card-rect` CSS.

---

### Issue 2: Shadow Opacity Not Working
**Problem:** Shadow blur worked, but opacity changes didn't affect the shadow appearance.

**Root Cause:** Invalid SVG implementation. Original code used `opacity` attribute on `feMergeNode` element, which doesn't support opacity in SVG specification:
```javascript
// Wrong:
m.appendChild(mk("feMergeNode",{"in":"o1",opacity:String(shadowOpacity)}));
```

**Fix:** Used proper SVG filter primitive `feComponentTransfer` with `feFuncA` to control alpha channel. Applied to all four renderers (`renderCenter`, `renderVertical`, `renderHorizontal`, `drawScene`):
```javascript
// Correct:
var ct=mk("feComponentTransfer",{"in":"o1",result:"o2"});
ct.appendChild(mk("feFuncA",{type:"linear",slope:String(shadowOpacity)}));
f.appendChild(ct);
var m=mk("feMerge",{});
m.appendChild(mk("feMergeNode",{"in":"o2"}));  // Uses result with opacity applied
m.appendChild(mk("feMergeNode",{"in":"SourceGraphic"}));
```

**Why This Works:** `feComponentTransfer` + `feFuncA` is the standard SVG way to modify alpha channel opacity.

---

### Issue 3: Shadow Not Visible in Preview
**Problem:** Shadow controls were updating attributes correctly, but shadow wasn't visible. User noted "I do see a shadow when I click on a card but not otherwise" (indicating CSS was applying on certain events).

**Root Cause:** CSS `filter` property at `Wordpress.css:70` was overriding SVG `filter` attribute:
```css
.oc-card-rect {
  filter: drop-shadow(0 1px 0 rgba(16,24,40,.04)) drop-shadow(0 1px 2px rgba(16,24,40,.08));
}
```

**Fix:** Added filter to inline style string in `drawCard()` function:
```javascript
// Before:
if(cardShadow) rect.setAttribute("filter","url(#ocShadow)");

// After (part of rectStyle string):
if(cardShadow) {
  rectStyle += " filter: url(#ocShadow);";
}
rect.setAttribute("style", rectStyle);
```

**Why This Works:** Inline `style` attribute overrides CSS `filter` property, allowing SVG filter reference to work.

---

### Issue 4: Padding, Margin, Border Radius Not Updating
**Problem:** Changing padding, margin, border radius, or spacing controls didn't update the preview.

**Root Cause:** Global variables `CARD.pad`, `CARD.r`, `LAY.margin`, `LAY.vGap`, `LAY.sGap` were initialized once at startup but never refreshed when user changed controls.

**Fix:** Added global variable updates to all four renderer functions:

**renderCenter (lines 604-609):**
```javascript
CARD.w=readCardW(container);
CARD.pad=readCardPadding(container);
CARD.r=readCardRadius(container);
LAY.margin=readMargin(container);
LAY.vGap=readVGap(container);
LAY.sGap=readSiblingGap(container);
```

**renderVertical (lines 809-817):**
```javascript
CARD.w=readCardW(container);
CARD.pad=readCardPadding(container);
CARD.r=readCardRadius(container);
LAY.margin=readMargin(container);
LAY.sGap=readSiblingGap(container);
var vGap = readVGap(container);
var hGap = readHGap(container);
LAY.vGap=vGap;
```

**renderHorizontal (lines 952-957):**
```javascript
CARD.w=readCardW(container);
CARD.pad=readCardPadding(container);
CARD.r=readCardRadius(container);
LAY.margin=readMargin(container);
LAY.vGap=readVGap(container);
LAY.sGap=readSiblingGap(container);
```

**drawScene (lines 1459-1464):**
```javascript
CARD.w = readCardWHybrid(container, mode==="horizontal"?"h":"v");
CARD.pad=readCardPadding(container);
CARD.r=readCardRadius(container);
LAY.margin=readMargin(container);
LAY.vGap=readVGap(container);
LAY.sGap=readSiblingGap(container);
```

**Why This Works:** Globals are now refreshed from data attributes on every rerender, ensuring live preview reflects current control values.

---

### Key Lessons
1. **CSS Specificity:** Inline styles > CSS rules > SVG attributes. When CSS overrides aren't working, use inline styles.
2. **SVG Filters:** Always check SVG specification for valid attributes. `feMergeNode` doesn't support `opacity`, use `feComponentTransfer` instead.
3. **Global Variables:** In event-driven systems, cached globals must be refreshed when source data changes.
4. **Multi-Renderer Architecture:** Fixes must be applied to ALL renderers (center, vertical, horizontal, hybrid) to ensure consistent behavior.

---

## Export Modes

### Lightweight Export (Default)
- File size: ~7KB (data dependent)
- Requires Wordpress.js and Wordpress.css loaded globally in WordPress
- Efficient for multiple charts on one site
- Updates propagate when global runtime updated

### Self-Contained Export
- File size: ~100KB (includes embedded JS/CSS)
- No WordPress setup required
- Each chart is independent
- Ideal for: single charts, external sharing, demos
- Enabled via checkbox in admin interface: "Self-contained export (includes JS/CSS)"
- Filename includes "_standalone" suffix

Both export modes include all recent fixes and work identically in terms of functionality.

---

## Proposed Feature: Drag-and-Drop Reorganization

### Overview
Add interactive drag-and-drop capability to allow users to reorganize the org chart by dragging cards to new positions. This would complement (not replace) the existing form-based editing controls.

### Business Value
**Primary Benefits:**
- **Speed:** Reorganizing people becomes 5-10x faster (5 seconds vs 30-60 seconds per move)
- **Intuitive UX:** Matches mental model of "moving people around" spatially
- **Professional Polish:** Elevates tool to commercial-grade quality (matches Lucidchart, Miro patterns)
- **Encourages Exploration:** Users more likely to try different org structures when interaction is fluid
- **Reduces Cognitive Load:** No need to remember/lookup person IDs or navigate dropdowns

**Best Use Cases:**
- Medium-sized charts (15-50 people) - large enough to benefit, small enough to avoid clutter
- Frequent reorganizations (startups, rapid growth companies, seasonal restructuring)
- Users who prefer visual/spatial interaction over forms
- Exploratory "what-if" scenarios during planning meetings

**Limitations:**
- Less efficient than forms for bulk operations (moving 10+ people at once)
- Precision challenges on very large charts (100+ people where zoom makes targets small)
- Touch device challenges on mobile/tablet (though mitigated by good library choice)

### Technical Feasibility: ✓ HIGH

**Implementation Approach:**
- **Recommended Library:** SortableJS (mature, 40KB, touch-friendly, no dependencies)
- **Alternative:** interact.js (more powerful, 60KB, steeper learning curve)
- **Fallback:** HTML5 native Drag & Drop API (no deps but worse touch support)

**Estimated Effort:**
- Basic drag-and-drop: 4-6 hours
- Visual feedback polish: 2-3 hours
- Validation/safety features: 2 hours
- **Total: ~8-11 hours (1-1.5 days focused work)**

### UX Design Specification

#### Visual Feedback States

**1. Dragging State**
```
┌─────────────────────────────┐
│ 👤 Alice Johnson (CFO)      │ ← Ghost/translucent, follows cursor
└─────────────────────────────┘
```

**2. Drop Zone Indicators**
Cards that can receive the dragged card show colored borders/highlights:
- **Green:** Valid drop - makes dragged card a subordinate
- **Blue:** Valid sibling drop (if applicable to layout)
- **Red/X:** Invalid drop (would create cycle or violate constraints)

**3. Animation**
- Smooth slide transitions when structure updates
- "Shake" animation on invalid drops
- Bounce-back if dropped in invalid location

#### Interaction Patterns Per Layout Type

**Centered Layout (Most Complex):**
```
Drop Zones:
┌──────────────────────┐
│     CEO              │
│  ┌────────┬────────┐ │
│  │   L    │   R    │ │  ← Drop on left/right half determines side
│  └────────┴────────┘ │
└──────────────────────┘

On drop:
  - Drop on left 50% → add as left child (side: "L")
  - Drop on right 50% → add as right child (side: "R")
  - If ambiguous → show modal dialog: "Add to Left or Right side?"
```

**Vertical Layout:**
```
┌──────────────┐
│   Manager    │
└──────────────┘
      ↓ Drop here = make child
┌──────────────┐
│   Employee   │
└──────────────┘
```

**Horizontal Layout:**
```
┌──────────┐   Drop here = make child
│ Manager  │ →
└──────────┘
```

#### Safety & Validation

**Prevent Invalid Operations:**
1. **Cycle Detection:** Can't make an ancestor your child
   ```
   ❌ Can't drag CEO onto a subordinate
   ✓ Can drag subordinate to different branch
   ```

2. **Subtree Moves:** Dragging a card with children moves entire subtree
   ```
   Confirm Dialog:
   "Move Alice Johnson and 12 subordinates?"
   [Cancel] [Move All]
   ```

3. **Undo Support:** Maintain history stack
   ```
   Ctrl+Z = Undo last drag operation
   Ctrl+Shift+Z = Redo
   ```

### Implementation Technical Details

#### Data Flow
```
1. User drags card → onDragStart(nodeId)
2. Hover over target → highlightValidDropZones(targetId)
3. Drop on target → onDrop(draggedId, targetId, dropZone)
4. Validation → validateMove(draggedId, targetId)
   → If invalid: animateReject(), return
   → If valid: updateNODES(draggedId, newParent, newSide?)
5. Trigger rerender → refresh()
6. Push to undo stack → history.push({action, oldState, newState})
```

#### Code Changes Required

**admin.js modifications:**

**1. Add SortableJS library** (unified_admin.html):
```html
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
```

**2. Initialize drag handlers** (admin.js, after attachCardClickHandlers):
```javascript
function attachDragHandlers() {
  const container = document.getElementById("wsu-orgchart");
  if (!container) return;

  // Get all card elements (SVG rect elements with data-node-id)
  const cards = container.querySelectorAll("rect[data-node-id]");

  cards.forEach(card => {
    card.style.cursor = "grab";
    card.addEventListener("mousedown", onCardDragStart);
    card.addEventListener("touchstart", onCardDragStart, {passive: false});
  });
}
```

**3. Drag event handlers:**
```javascript
let draggedNodeId = null;
let dragGhost = null;

function onCardDragStart(e) {
  draggedNodeId = e.target.getAttribute("data-node-id");

  // Create ghost element
  dragGhost = createDragGhost(draggedNodeId);
  document.body.appendChild(dragGhost);

  // Highlight valid drop zones
  highlightDropZones(draggedNodeId);

  e.target.style.cursor = "grabbing";
}

function onCardDragOver(e) {
  e.preventDefault();
  const targetNodeId = e.target.getAttribute("data-node-id");

  // Visual feedback (green/red border)
  if (isValidDrop(draggedNodeId, targetNodeId)) {
    e.target.style.stroke = "#10b981"; // green
  } else {
    e.target.style.stroke = "#ef4444"; // red
  }
}

function onCardDrop(e) {
  e.preventDefault();
  const targetNodeId = e.target.getAttribute("data-node-id");

  if (!isValidDrop(draggedNodeId, targetNodeId)) {
    animateShake(e.target);
    return;
  }

  // Determine drop zone for centered layout
  let newSide = null;
  if (CURRENT_LAYOUT === "centered") {
    const rect = e.target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    newSide = (clickX < rect.width / 2) ? "L" : "R";

    // Optional: show confirmation dialog for clarity
    if (confirm(`Add to ${newSide === "L" ? "Left" : "Right"} side?`)) {
      performMove(draggedNodeId, targetNodeId, newSide);
    }
  } else {
    performMove(draggedNodeId, targetNodeId);
  }

  clearDragState();
  refresh();
}
```

**4. Validation logic:**
```javascript
function isValidDrop(draggedId, targetId) {
  if (draggedId === targetId) return false; // Can't drop on self

  // Check for cycles: can't make ancestor your child
  const draggedNode = findNode(draggedId);
  const targetNode = findNode(targetId);

  // Walk up from target to root, if we hit draggedId = cycle
  let current = targetNode;
  while (current) {
    if (current.id === draggedId) return false; // Would create cycle
    current = current.parent ? findNode(current.parent) : null;
  }

  return true;
}
```

**5. Update NODES array:**
```javascript
function performMove(draggedId, newParentId, newSide = null) {
  const node = findNode(draggedId);
  const oldParent = node.parent;
  const oldSide = node.side;

  // Update node
  node.parent = newParentId;
  if (CURRENT_LAYOUT === "centered" && newSide) {
    node.side = newSide;
  }

  // Add to undo stack
  pushUndoState({
    action: "move",
    nodeId: draggedId,
    oldParent: oldParent,
    oldSide: oldSide,
    newParent: newParentId,
    newSide: newSide
  });

  // Update UI
  hydrateInspector(); // Refresh inspector if this node selected
  toast("Moved " + node.name);
}
```

**6. Undo/Redo stack:**
```javascript
const UNDO_STACK = [];
let UNDO_INDEX = -1;

function pushUndoState(action) {
  UNDO_STACK.splice(UNDO_INDEX + 1); // Remove future states
  UNDO_STACK.push(action);
  UNDO_INDEX++;

  if (UNDO_STACK.length > 50) {
    UNDO_STACK.shift(); // Limit history to 50 operations
    UNDO_INDEX--;
  }
}

function undo() {
  if (UNDO_INDEX < 0) return;

  const action = UNDO_STACK[UNDO_INDEX];
  if (action.action === "move") {
    const node = findNode(action.nodeId);
    node.parent = action.oldParent;
    node.side = action.oldSide;
  }

  UNDO_INDEX--;
  refresh();
}

function redo() {
  if (UNDO_INDEX >= UNDO_STACK.length - 1) return;

  UNDO_INDEX++;
  const action = UNDO_STACK[UNDO_INDEX];
  if (action.action === "move") {
    const node = findNode(action.nodeId);
    node.parent = action.newParent;
    node.side = action.newSide;
  }

  refresh();
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
});
```

### Alternative: Simpler Implementation

If full drag-and-drop feels too complex initially, consider **"Click-to-Move" mode:**

**Interaction:**
1. Click card → enters "move mode", card highlighted
2. Click target card → shows menu: "Make child of X?" [Yes] [Cancel]
3. Confirm → performs move

**Pros:**
- Simpler implementation (~2-3 hours)
- Works better on touch devices
- No library dependency
- Still much faster than current dropdown method

**Cons:**
- Less intuitive than drag-and-drop
- Requires two clicks instead of drag action
- Not as "modern" feeling

### Testing Checklist

When implementing, test:
- ✓ Drag within same branch
- ✓ Drag to different branch
- ✓ Drag root (should be disabled)
- ✓ Drag parent onto child (should reject - cycle)
- ✓ Drag card with large subtree (show count)
- ✓ Undo/redo cycle (verify state)
- ✓ Drag on centered layout (L/R side correct)
- ✓ Touch device support (mobile/tablet)
- ✓ Accessibility (keyboard-only alternative)

### User Feedback Questions

Before implementing, gather feedback on:
1. **Interaction preference:** Drag-and-drop vs click-to-move vs both?
2. **Side assignment (centered):** Auto-detect from drop position vs always prompt?
3. **Subtree moves:** Auto-move all children vs prompt for confirmation?
4. **Visual style:** Color scheme for drop zones (green/red/blue)?
5. **Undo behavior:** How many operations to keep in history?

### Risks & Mitigation

**Risk 1: Accidental moves**
- Mitigation: Require confirmation for moves affecting >5 people
- Mitigation: Prominent undo button + Ctrl+Z keyboard shortcut

**Risk 2: SVG drag complexity**
- Mitigation: Use library (SortableJS) that handles SVG
- Mitigation: Consider wrapping cards in HTML divs for easier dragging

**Risk 3: Touch device issues**
- Mitigation: Use touch-optimized library (SortableJS supports touch)
- Mitigation: Increase drop target sizes on mobile

**Risk 4: User confusion on centered layout (L/R sides)**
- Mitigation: Show visual indicator during drag (highlight left/right halves)
- Mitigation: Optional confirmation dialog

### Success Metrics

If implemented, measure:
- Time to reorganize 5 people (before: ~2-3 min, target: <30 sec)
- User satisfaction survey (5-point scale)
- Error rate (invalid moves attempted / total moves)
- Undo usage (indicates mistakes or exploration)
- Feature adoption (% of users who use drag vs forms)

---

## Recent Updates (December 2025)

### Issue 1: Responsive Scale Support ✅ FIXED

**Problem:** Admin interface exported responsive scale attributes (`data-scale-desktop`, `data-scale-tablet`, `data-scale-phone`), but Wordpress.js only read the legacy `data-scale` attribute.

**Fix Applied:** Updated `readScale()` function in `Wordpress.js:62-79` to:
- Check viewport width using `viewportWidth()` helper
- Read appropriate breakpoint-specific attribute:
  - Desktop (≥1024px): `data-scale-desktop`
  - Tablet (768-1023px): `data-scale-tablet`
  - Phone (<768px): `data-scale-phone`
- Fallback to `data-scale` for backwards compatibility
- Existing resize handlers automatically trigger scale updates when crossing breakpoints

**Files Modified:**
- `Wordpress.js:62-79` - Enhanced `readScale()` function

**Status:** ✅ Complete - Charts now respond to viewport size changes with appropriate scaling.

---

### Issue 2: Standalone Export Not Rendering ✅ FIXED

**Problem:** Self-contained export (checkbox "Self-contained export (includes JS/CSS)") generated HTML file with embedded CSS/JS, but threw syntax error when pasted into WordPress Custom HTML block due to HTML parser interpreting `</div>` sequences in JavaScript as closing tags.

**Root Cause:** Wordpress.js contains `innerHTML` assignments with `</div>` sequences (lines 1727, 1729, 1749, 1751, 2043, 2045). When JavaScript is embedded directly in `<script>` tags, WordPress sanitization reverses escape sequences, causing HTML parser to treat `</div>` as closing tags.

**Solution Implemented:** Base64 encoding of JavaScript
- JavaScript is Base64 encoded to completely bypass HTML parsing
- Uses UTF-8 encoding with chunking (8192 bytes) to avoid call stack limits
- Includes fallback for older browsers
- Runtime decoder script decodes and injects JavaScript dynamically
- Proper initialization polling ensures script loads before rendering

**Files Modified:**
- `admin.js:1157-1268` - Replaced escaping approach with Base64 encoding in `buildSelfContainedExport()`
- `admin.js:1188-1231` - Base64 encoding with proper Unicode handling and chunking
- `admin.js:1232-1266` - Added initialization polling to match lightweight export behavior

**Additional Fixes:**
- Added `data-scale` attribute to all layouts for initial rendering
- Fixed PDF button emoji encoding issue (changed to plain text)
- Fixed print restore to properly collapse back to original depth settings
- Added responsive expand/collapse attributes to all layouts (common `data-open-depth-*`)

**Current Status:** ✅ **RESOLVED** - Standalone export works in WordPress Custom HTML blocks

---

## Recent Updates (December 2025)

### Standalone Export Fix ✅ COMPLETE
- Base64 encoding implemented to bypass WordPress HTML parsing
- Proper initialization polling ensures chart renders correctly
- All features work identically in both lightweight and standalone modes
- Scale, expand/collapse, and print functionality all working

### Print Functionality Improvements ✅ COMPLETE
- Chart fully expands for printing
- Properly collapses back to original depth settings after print dialog closes
- PDF button uses plain text instead of emoji for better compatibility
- State restoration works for all layout types

### Export Attribute Consistency ✅ COMPLETE
- All layouts now export consistent responsive scale attributes (`data-scale-desktop`, `data-scale-tablet`, `data-scale-phone`)
- All layouts export common expand/collapse depth attributes (`data-open-depth-desktop`, `data-open-depth-tablet`, `data-open-depth-phone`)
- Backwards compatibility maintained with layout-specific attributes

## Contact/Handoff Notes
- Responsive scale feature: ✅ **COMPLETE** and working
- Standalone export: ✅ **COMPLETE** - Base64 encoding solution working in WordPress
- Print functionality: ✅ **COMPLETE** - Expand/collapse restore working correctly
- System is production-ready for WordPress deployment using both export modes
- Drag-and-drop feature detailed above - awaiting user feedback before implementation
