// Org Chart Admin - Client Side JavaScript v2.0
if (typeof $ === 'undefined') {
  var $ = s => document.querySelector(s);
}
if (typeof log === 'undefined') {
  var log = (m,o) => { 
    const e = $("#log"); 
    if (e) {
      const time = new Date().toLocaleTimeString(); 
      e.textContent += "["+time+"] "+m+(o?("\n"+(typeof o==="string"?o:JSON.stringify(o,null,2))):"") + "\n"; 
      e.scrollTop = e.scrollHeight; 
    }
  };
}
if (typeof toast === 'undefined') {
  var toast = m => { 
    const t = $("#toast"); 
    if (t) {
      t.textContent = m; 
      t.classList.add("show"); 
      setTimeout(() => t.classList.remove("show"), 1200); 
    }
  };
}
if (typeof uid === 'undefined') {
  var uid = () => "id_" + Math.random().toString(36).slice(2,9);
}

// Model
if (typeof NODES === 'undefined') {
  var NODES = [];
}
if (typeof SELECTED_ID === 'undefined') {
  var SELECTED_ID = null;
}
if (typeof HELPER === 'undefined') {
  var HELPER = { text:"Use the circle icons to expand or collapse the tree.", size:14 };
}
if (typeof CURRENT_LAYOUT === 'undefined') {
  var CURRENT_LAYOUT = "centered";
}
if (typeof SELF_CONTAINED_EXPORT === 'undefined') {
  var SELF_CONTAINED_EXPORT = false;
}

// Layout switching
function updateLayoutType() {
  const layout = $("#layoutType").value;
  CURRENT_LAYOUT = layout;
  
  let desc = "";
  if(layout === "centered") {
    desc = "Centered: Spine with left/right branching";
  } else if(layout === "vertical") {
    desc = "Simple Vertical: Root on left, flows right";
  } else {
    desc = "Horizontal: Root on top, flows downward";
  }
  $("#layoutDesc").textContent = desc;
  
  // Hide all layout sections
  $("#layoutCentered").classList.remove("show");
  $("#layoutVertical").classList.remove("show");
  $("#layoutVerticalHorizontal").classList.remove("show");
  
  // Show appropriate layout section
  if(layout === "centered"){
    $("#layoutCentered").classList.add("show");
    $("#sectionL1").style.display = "block";
    $("#rowSide").style.display = "flex";
  } else if(layout === "vertical") {
    $("#layoutVertical").classList.add("show");
    $("#sectionL1").style.display = "none";
    $("#rowSide").style.display = "none";
  } else {
    $("#layoutVerticalHorizontal").classList.add("show");
    $("#sectionL1").style.display = "none";
    $("#rowSide").style.display = "none";
  }
  
  refresh();
}

// Runtime loading
// ========== Runtime Loading Sequence ==========
//
// Dynamically loads Wordpress.js and Wordpress.css for the selected layout type.
// This is necessary when switching between layouts or when admin first loads.
//
// Critical Timing Sequence (failure-prone if altered):
//   1. Clear preview container HTML
//   2. Remove old <script id="runtime"> and <link id="runtime-css"> to prevent conflicts
//   3. Load CSS first with 50ms delay (allows DOM cleanup to complete)
//   4. Load JS with cache-busting query param (&cb=timestamp)
//   5. Wait for script.onload event
//   6. Wait additional 100ms for global WordpressOrgChart initialization
//      (The runtime script needs time to execute its IIFE and populate window.WordpressOrgChart)
//   7. Call WordpressOrgChart.rerender(container) to render chart
//   8. Wait 50ms, then attach card click handlers (DOM must be ready)
//
// Why the delays are needed:
//   - 50ms after CSS: Browser needs time to remove old script/styles from DOM
//   - 100ms after onload: WordpressOrgChart global needs time to initialize
//   - 50ms after rerender: SVG elements need time to render before attaching handlers
//
// Cache Busting:
//   - Uses ?cb=timestamp to prevent browser from using stale cached versions
//   - Critical when switching layouts or after code changes
//
function loadRuntime() {
  console.log("========================================");
  console.log("[admin.js] loadRuntime() called for layout:", CURRENT_LAYOUT);
  console.log("[admin.js] Current window.WordpressOrgChart:", window.WordpressOrgChart);
  log("Loading runtime: " + CURRENT_LAYOUT);

  // Step 1: Clear preview container
  const host = $("#wsu-orgchart");
  console.log("[admin.js] loadRuntime() - host element:", host);
  host.innerHTML = "";
  host.className = "host wsu-orgchart";

  // Step 2: Remove old runtime script and CSS to prevent conflicts
  const oldScript = $("#runtime");
  const oldCss = $("#runtime-css");
  console.log("[admin.js] loadRuntime() - removing old script:", oldScript);
  console.log("[admin.js] loadRuntime() - removing old css:", oldCss);
  if(oldScript) oldScript.remove();
  if(oldCss) oldCss.remove();
  console.log("[admin.js] loadRuntime() - old elements removed");

  // Step 3: Load CSS for current layout (all layouts use same Wordpress.css)
  const link = document.createElement("link");
  link.id = "runtime-css";
  link.rel = "stylesheet";
  link.href = "/api/orgchart/runtime.css?type=" + CURRENT_LAYOUT + "&cb=" + Date.now();
  document.head.appendChild(link);

  // Step 4: Wait 50ms for DOM cleanup, then load JS
  setTimeout(() => {
    const s = document.createElement("script");
    s.id = "runtime";
    s.src = "/api/orgchart/runtime.js?type=" + CURRENT_LAYOUT + "&cb=" + Date.now();
    s.onload = () => {
      // Step 5: Script loaded, but global not yet initialized
      console.log("========================================");
      console.log("[admin.js] Runtime script onload fired");
      console.log("[admin.js] Script element:", s);
      console.log("[admin.js] window.WordpressOrgChart immediately after load:", window.WordpressOrgChart);
      console.log("[admin.js] typeof window.WordpressOrgChart:", typeof window.WordpressOrgChart);
      if(window.WordpressOrgChart) {
        console.log("[admin.js] window.WordpressOrgChart.rerender:", window.WordpressOrgChart.rerender);
        console.log("[admin.js] typeof rerender:", typeof window.WordpressOrgChart.rerender);
      }
      log("Runtime loaded");
      // Step 6: Wait 100ms for WordpressOrgChart global to initialize
      setTimeout(() => {
        console.log("[admin.js] After 100ms timeout in onload");
        const container = $("#wsu-orgchart");
        console.log("[admin.js] container:", container);
        console.log("[admin.js] window.WordpressOrgChart:", window.WordpressOrgChart);
        if(window.WordpressOrgChart) {
          console.log("[admin.js] window.WordpressOrgChart.rerender:", window.WordpressOrgChart.rerender);
          console.log("[admin.js] typeof rerender:", typeof window.WordpressOrgChart.rerender);
        }
        // Step 7: Render chart if global is ready
        if(container && window.WordpressOrgChart && typeof window.WordpressOrgChart.rerender === 'function') {
          console.log("[admin.js] ✓ Calling rerender from loadRuntime onload");
          window.WordpressOrgChart.rerender(container);
          // Step 8: Wait 50ms for SVG rendering, then attach click handlers
          setTimeout(attachCardClickHandlers, 50);
        } else {
          console.log("[admin.js] ✗ rerender not available");
          console.log("[admin.js]   - container exists:", !!container);
          console.log("[admin.js]   - WordpressOrgChart exists:", !!window.WordpressOrgChart);
          console.log("[admin.js]   - rerender is function:", typeof (window.WordpressOrgChart && window.WordpressOrgChart.rerender) === 'function');
        }
      }, 100);
    };
    s.onerror = () => log("Runtime failed");
    document.body.appendChild(s);
  }, 50);
}

// Layout reading
function readStyles() {
  return {
    nameFont: $("#style_name_font").value || "Inter, Segoe UI, system-ui, sans-serif",
    nameSize: parseFloat($("#style_name_size").value || "17"),
    nameWeight: $("#style_name_weight").value || "700",
    nameStyle: $("#style_name_style").value || "normal",
    nameColor: $("#style_name_color").value || "#111827",
    titleFont: $("#style_title_font").value || "Inter, Segoe UI, system-ui, sans-serif",
    titleSize: parseFloat($("#style_title_size").value || "13.5"),
    titleWeight: $("#style_title_weight").value || "500",
    titleStyle: $("#style_title_style").value || "normal",
    titleColor: $("#style_title_color").value || "#374151",
    cardFill: $("#style_card_fill").value || "#ffffff",
    cardStroke: $("#style_card_stroke").value || "#d0d0d0",
    cardShadow: $("#style_card_shadow").value || "1",
    linkColor: $("#style_link_color").value || "#981e32",
    linkWidth: parseFloat($("#style_link_width").value || "2.5"),
    spineColor: $("#style_spine_color").value || "#111111",
    spineWidth: parseFloat($("#style_spine_width").value || "3"),
    btnCircleFill: $("#style_btn_circle_fill").value || "#ffffff",
    btnCircleStroke: $("#style_btn_circle_stroke").value || "#d0d0d0",
    btnCircleOutline: $("#style_btn_circle_outline").value || "1",
    btnRectFill: $("#style_btn_rect_fill").value || "#374151",
    bgColor: ($("#style_bg_transparent") && $("#style_bg_transparent").value === "1") ? "" : ($("#style_bg_color").value || "#ffffff"), // Empty string means transparent/default
    
    // Typography enhancements
    nameLineHeight: parseFloat($("#style_name_line_height").value || "1.18"),
    titleLineHeight: parseFloat($("#style_title_line_height").value || "1.33"),
    nameLetterSpacing: parseFloat($("#style_name_letter_spacing").value || "0"),
    titleLetterSpacing: parseFloat($("#style_title_letter_spacing").value || "0"),
    textAlign: $("#style_text_align").value || "left",
    textGap: parseInt($("#style_text_gap").value || "8", 10),
    
    // Card appearance
    cardPaddingTop: parseInt($("#style_card_padding_top").value || "12", 10),
    cardPaddingBottom: parseInt($("#style_card_padding_bottom").value || "12", 10),
    cardPaddingLeft: parseInt($("#style_card_padding_left").value || "12", 10),
    cardPaddingRight: parseInt($("#style_card_padding_right").value || "12", 10),
    cardRadius: parseInt($("#style_card_radius").value || "10", 10),
    cardStrokeWidth: parseFloat($("#style_card_stroke_width").value || "1"),
    
    // Button appearance
    btnRadius: parseInt($("#style_btn_radius").value || "14", 10),
    btnOffsetX: parseInt($("#style_btn_offset_x").value || "8", 10),
    btnOffsetY: parseInt($("#style_btn_offset_y").value || "8", 10),
    
    // Shadow
    shadowColor: $("#style_shadow_color").value || "#981e32",
    shadowBlur: parseFloat($("#style_shadow_blur").value || "2"),
    shadowOpacity: parseFloat($("#style_shadow_opacity").value || "0.35"),
    shadowOffsetX: parseInt($("#style_shadow_offset_x").value || "0", 10),
    shadowOffsetY: parseInt($("#style_shadow_offset_y").value || "3", 10),
    
    // Spacing
    margin: parseInt($("#style_margin").value || "24", 10),
    siblingGap: parseInt($("#style_sibling_gap").value || "26", 10)
  };
}

function readLayout() {
  const styles = readStyles();
  const base = { styles: styles };
  if(CURRENT_LAYOUT === "centered"){
    return Object.assign(base, {
      scaleDesktop: parseFloat($("#c_scale_desktop").value || "0.85"),
      scaleTablet: parseFloat($("#c_scale_tablet").value || "0.75"),
      scalePhone: parseFloat($("#c_scale_phone").value || "0.60"),
      hgaps: ($("#hgaps").value||"40").trim(),
      stubs: ($("#stubs").value||"18").trim(),
      cardw: parseInt($("#cardw").value || "260", 10),
      cardh: $("#cardh").value !== "" ? parseInt($("#cardh").value, 10) : null,
      l1stub: parseInt($("#l1stub").value || "6", 10),
      center: parseInt($("#center").value || "1", 10),
      connectorAlign: parseInt($("#c_connector_align").value || "0", 10),
      openDepthDesktop: $("#c_open_depth_desktop").value !== "" ? parseInt($("#c_open_depth_desktop").value, 10) : 1,
      openDepthTablet: $("#c_open_depth_tablet").value !== "" ? parseInt($("#c_open_depth_tablet").value, 10) : 1,
      openDepthPhone: $("#c_open_depth_phone").value !== "" ? parseInt($("#c_open_depth_phone").value, 10) : 1
    });
  } else if(CURRENT_LAYOUT === "vertical") {
    return Object.assign(base, {
      scaleDesktop: parseFloat($("#v_scale_desktop").value || "0.85"),
      scaleTablet: parseFloat($("#v_scale_tablet").value || "0.75"),
      scalePhone: parseFloat($("#v_scale_phone").value || "0.60"),
      cardw: parseInt($("#v_cardw").value || "260", 10),
      cardh: $("#v_cardh").value !== "" ? parseInt($("#v_cardh").value, 10) : null,
      hgap: parseInt($("#v_hgap").value || "60", 10),
      vgap: parseInt($("#v_vgap").value || "26", 10),
      rootOffsetY: parseInt($("#v_root_offset_y").value || "0", 10),
      openDepthDesktop: $("#v_open_depth_desktop").value !== "" ? parseInt($("#v_open_depth_desktop").value, 10) : 1,
      openDepthTablet: $("#v_open_depth_tablet").value !== "" ? parseInt($("#v_open_depth_tablet").value, 10) : 1,
      openDepthPhone: $("#v_open_depth_phone").value !== "" ? parseInt($("#v_open_depth_phone").value, 10) : 1
    });
  } else {
    return Object.assign(base, {
      scaleDesktop: parseFloat($("#vh_scale_desktop").value || "0.85"),
      scaleTablet: parseFloat($("#vh_scale_tablet").value || "0.75"),
      scalePhone: parseFloat($("#vh_scale_phone").value || "0.60"),
      cardw: parseInt($("#vh_cardw").value || "260", 10),
      cardh: $("#vh_cardh").value !== "" ? parseInt($("#vh_cardh").value, 10) : null,
      vgap: parseInt($("#vh_vgap").value || "26", 10),
      hgap: parseInt($("#vh_hgap").value || "26", 10),
      hstub: parseInt($("#vh_stub").value || "18", 10),
      parentStub: parseInt($("#vh_parent_stub").value || "18", 10),
      maxCols: parseInt($("#vh_max_cols").value || "0", 10),
      rowSpacing: parseFloat($("#vh_row_spacing").value || "1.5"),
      breakpoint: parseInt($("#vh_breakpoint").value || "820", 10),
      toggle: parseInt($("#vh_toggle").value || "0", 10),
      rootOffsetX: parseInt($("#h_root_offset_x").value || "0", 10),
      alignRows: parseInt($("#vh_alignrows").value || "0", 10),
      wrap: ($("#vh_wrap").value || "").trim(),
      pack: ($("#vh_pack").value || "balanced").trim(),
      openDepthDesktop: $("#vh_open_depth_desktop").value !== "" ? parseInt($("#vh_open_depth_desktop").value, 10) : 2,
      openDepthTablet: $("#vh_open_depth_tablet").value !== "" ? parseInt($("#vh_open_depth_tablet").value, 10) : 1,
      openDepthPhone: $("#vh_open_depth_phone").value !== "" ? parseInt($("#vh_open_depth_phone").value, 10) : 1
    });
  }
}

// ========== Layout Attribute Application ==========
//
// Applies all configuration to DOM data attributes for the preview container.
// This function converts form inputs to data-* attributes that Wordpress.js reads.
//
// Process:
//   1. Clear all existing data-* attributes to prevent stale values
//   2. Apply shared styling attributes (typography, colors, shadows, spacing)
//   3. Apply layout-specific attributes conditionally based on CURRENT_LAYOUT:
//      - "centered": Center-aligned layout with L/R side designation
//      - "vertical": Traditional top-down layout
//      - "horizontal": Hybrid horizontal/vertical with optional responsive toggle
//
// Note: Some attributes are conditionally set/removed based on non-empty values
//       to allow Wordpress.js defaults to take effect when not specified.
//
function applyLayoutToDom() {
  const L = readLayout();
  const host = $("#wsu-orgchart");

  // Clear all data-* attributes to prevent stale configuration from previous layout
  Array.from(host.attributes).forEach(attr => {
    if(attr.name.startsWith("data-")) host.removeAttribute(attr.name);
  });

  // Apply styling attributes (shared across all layouts)
  const S = L.styles;
  console.log("[admin.js] applyLayoutToDom() - Setting styling attributes:", {
    nameColor: S.nameColor,
    titleColor: S.titleColor,
    cardFill: S.cardFill,
    linkColor: S.linkColor,
    bgColor: S.bgColor
  });
  host.setAttribute("data-name-font-family", S.nameFont);
  host.setAttribute("data-name-font-size", String(S.nameSize));
  host.setAttribute("data-name-font-weight", S.nameWeight);
  host.setAttribute("data-name-font-style", S.nameStyle);
  host.setAttribute("data-name-color", S.nameColor);
  host.setAttribute("data-title-font-family", S.titleFont);
  host.setAttribute("data-title-font-size", String(S.titleSize));
  host.setAttribute("data-title-font-weight", S.titleWeight);
  host.setAttribute("data-title-font-style", S.titleStyle);
  host.setAttribute("data-title-color", S.titleColor);
  host.setAttribute("data-card-fill", S.cardFill);
  host.setAttribute("data-card-stroke", S.cardStroke);
  host.setAttribute("data-card-shadow", S.cardShadow);
  host.setAttribute("data-link-color", S.linkColor);
  host.setAttribute("data-link-width", String(S.linkWidth));
  host.setAttribute("data-spine-color", S.spineColor);
  host.setAttribute("data-spine-width", String(S.spineWidth));
  host.setAttribute("data-btn-circle-fill", S.btnCircleFill);
  host.setAttribute("data-btn-circle-stroke", S.btnCircleStroke);
  host.setAttribute("data-btn-circle-outline", S.btnCircleOutline);
  host.setAttribute("data-btn-rect-fill", S.btnRectFill);
  if(S.bgColor && S.bgColor.trim() !== "") {
    host.setAttribute("data-bg-color", S.bgColor);
    host.style.backgroundColor = S.bgColor;
  } else {
    host.removeAttribute("data-bg-color");
    host.style.backgroundColor = "";
  }
  
  // Typography enhancements
  host.setAttribute("data-name-line-height", String(S.nameLineHeight));
  host.setAttribute("data-title-line-height", String(S.titleLineHeight));
  host.setAttribute("data-name-letter-spacing", String(S.nameLetterSpacing));
  host.setAttribute("data-title-letter-spacing", String(S.titleLetterSpacing));
  host.setAttribute("data-text-align", S.textAlign);
  host.setAttribute("data-text-gap", String(S.textGap));
  
  // Card appearance
  host.setAttribute("data-card-padding-top", String(S.cardPaddingTop));
  host.setAttribute("data-card-padding-bottom", String(S.cardPaddingBottom));
  host.setAttribute("data-card-padding-left", String(S.cardPaddingLeft));
  host.setAttribute("data-card-padding-right", String(S.cardPaddingRight));
  host.setAttribute("data-card-radius", String(S.cardRadius));
  host.setAttribute("data-card-stroke-width", String(S.cardStrokeWidth));
  
  // Button appearance
  host.setAttribute("data-btn-radius", String(S.btnRadius));
  host.setAttribute("data-btn-offset-x", String(S.btnOffsetX));
  host.setAttribute("data-btn-offset-y", String(S.btnOffsetY));
  
  // Shadow
  host.setAttribute("data-shadow-color", S.shadowColor);
  host.setAttribute("data-shadow-blur", String(S.shadowBlur));
  host.setAttribute("data-shadow-opacity", String(S.shadowOpacity));
  host.setAttribute("data-shadow-offset-x", String(S.shadowOffsetX));
  host.setAttribute("data-shadow-offset-y", String(S.shadowOffsetY));
  
  // Spacing
  host.setAttribute("data-margin", String(S.margin));
  host.setAttribute("data-sibling-gap", String(S.siblingGap));

  // ========== Layout-Specific Attributes ==========
  // Apply conditional attributes based on CURRENT_LAYOUT ("centered", "vertical", or "horizontal")

  if(CURRENT_LAYOUT === "centered"){
    // Centered Layout: CEO at center, branches to L/R sides
    // Key features: side designation (L/R), horizontal gaps, Level-1 stub offset

    // Set responsive scale attributes (desktop/tablet/phone zoom levels)
    host.setAttribute("data-scale-desktop", String(L.scaleDesktop));
    host.setAttribute("data-scale-tablet", String(L.scaleTablet));
    host.setAttribute("data-scale-phone", String(L.scalePhone));
    // Set data-scale for preview (uses desktop value)
    host.setAttribute("data-scale", String(L.scaleDesktop));
    // Centered-specific geometry
    host.setAttribute("data-hgaps", L.hgaps);           // Horizontal gap between siblings
    host.setAttribute("data-stubs", L.stubs);           // Connector stub lengths
    host.setAttribute("data-cardw", String(L.cardw));   // Fixed card width
    if(L.cardh != null) host.setAttribute("data-cardh", String(L.cardh)); // Optional fixed height
    host.setAttribute("data-l1stub", String(L.l1stub)); // Level-1 stub offset from spine
    host.setAttribute("data-center", String(L.center)); // Center alignment flag
    host.setAttribute("data-c-connector-align", String(L.connectorAlign || 0));
    // Auto-collapse depth per device (0 = all expanded, 1 = collapse depth>1, etc.)
    host.setAttribute("data-open-depth-desktop", String(L.openDepthDesktop));
    host.setAttribute("data-open-depth-tablet", String(L.openDepthTablet));
    host.setAttribute("data-open-depth-phone", String(L.openDepthPhone));

  } else if(CURRENT_LAYOUT === "vertical") {
    // Vertical Layout: Traditional top-down tree (CEO at top, children below)
    // Key features: vertical gaps, horizontal gaps, root Y offset

    host.setAttribute("data-layout", "vertical");
    // Set responsive scale attributes (desktop/tablet/phone zoom levels)
    host.setAttribute("data-scale-desktop", String(L.scaleDesktop));
    host.setAttribute("data-scale-tablet", String(L.scaleTablet));
    host.setAttribute("data-scale-phone", String(L.scalePhone));
    // Set data-scale for preview (uses desktop value)
    host.setAttribute("data-scale", String(L.scaleDesktop));
    // Vertical-specific geometry
    host.setAttribute("data-cardw", String(L.cardw));   // Fixed card width
    if(L.cardh != null) host.setAttribute("data-cardh", String(L.cardh)); // Optional fixed height
    host.setAttribute("data-hgap", String(L.hgap));     // Horizontal gap between siblings
    host.setAttribute("data-vgap", String(L.vgap));     // Vertical gap between levels
    host.setAttribute("data-v-root-offset-y", String(L.rootOffsetY || 0)); // Root Y position offset
    // Auto-collapse depth per device (uses "data-v-autodepth-*" for vertical layout)
    host.setAttribute("data-v-autodepth-desktop", String(L.openDepthDesktop));
    host.setAttribute("data-v-autodepth-tablet", String(L.openDepthTablet));
    host.setAttribute("data-v-autodepth-phone", String(L.openDepthPhone));

  } else {
    // Horizontal Layout: Hybrid left-to-right with optional responsive toggle
    // Key features: multi-row support, max columns, row spacing, wrap/pack strategies

    host.setAttribute("data-layout", "horizontal");
    // Force hybrid horizontal mode by default (no toggle required)
    host.setAttribute("data-mode", "horizontal");
    // Set responsive scale attributes (desktop/tablet/phone zoom levels)
    host.setAttribute("data-scale-desktop", String(L.scaleDesktop));
    host.setAttribute("data-scale-tablet", String(L.scaleTablet));
    host.setAttribute("data-scale-phone", String(L.scalePhone));
    // Set data-scale for preview (uses desktop value)
    host.setAttribute("data-scale", String(L.scaleDesktop));
    // Horizontal-specific geometry
    host.setAttribute("data-cardw", String(L.cardw));   // Fixed card width
    if(L.cardh != null) host.setAttribute("data-cardh", String(L.cardh)); // Optional fixed height
    host.setAttribute("data-vgap", String(L.vgap));     // Vertical gap between rows
    host.setAttribute("data-hgap", String(L.hgap));     // Horizontal gap between siblings
    // Connector stub lengths (conditionally set if specified)
    if(L.hstub != null) host.setAttribute("data-h-stubs", String(L.hstub));
    if(L.parentStub != null) host.setAttribute("data-h-parent-stubs", String(L.parentStub));
    // Multi-row configuration (conditionally set/removed to allow defaults)
    if(L.maxCols && L.maxCols > 0) host.setAttribute("data-h-max-cols", String(L.maxCols));
    else host.removeAttribute("data-h-max-cols"); // 0 = no limit
    if(L.rowSpacing) host.setAttribute("data-h-row-spacing", String(L.rowSpacing));
    else host.removeAttribute("data-h-row-spacing"); // Use default
    host.setAttribute("data-h-root-offset-x", String(L.rootOffsetX || 0)); // Root X position offset
    // Auto-collapse depth (uses "data-h-autodepth" for horizontal layout)
    host.setAttribute("data-h-autodepth", String(L.openDepthDesktop));
    // Hybrid-row options: wrap/pack strategies and row alignment
    // These control how multi-row layouts distribute and align nodes
    if(L.alignRows === 1) host.setAttribute("data-h-alignrows", "1"); // Align rows vertically
    else host.removeAttribute("data-h-alignrows");
    if(L.wrap) host.setAttribute("data-h-wrap", L.wrap);  // Wrap strategy (e.g., "balanced")
    else host.removeAttribute("data-h-wrap");
    if(L.pack) host.setAttribute("data-h-pack", L.pack);  // Pack strategy (e.g., "balanced")
    else host.removeAttribute("data-h-pack");
    // Optional responsive toggle: switches to vertical layout on narrow screens
    if(L.toggle === 1){
      host.setAttribute("data-mode", "auto");  // Enable auto-switching based on breakpoint
      host.setAttribute("data-breakpoint", String(L.breakpoint)); // Width threshold (px)
      host.setAttribute("data-toggle", "1");
    } else {
      // Disable toggle, use pure horizontal mode
      host.removeAttribute("data-toggle");
      host.removeAttribute("data-breakpoint");
      if(host.getAttribute("data-mode")==="auto") host.setAttribute("data-mode","horizontal");
    }
  }
}

function applyDataToDom() {
  $("#wsu-org-data").textContent = JSON.stringify(NODES, null, 2);
}

function applyHelperToPreview() {
  if(CURRENT_LAYOUT === "centered"){
    const el = $("#helperPreview");
    el.textContent = HELPER.text || "";
    el.style.fontSize = (HELPER.size||14) + "px";
    el.style.display = "block";
  } else {
    $("#helperPreview").style.display = "none";
  }
}

// ========== Event Delegation: Card Click Handlers ==========
//
// Attaches click handlers for card selection in the admin preview.
// Uses event delegation pattern (single listener on container) for performance.
//
// DOM Structure:
//   - SVG container holds all cards as <g> groups
//   - Each card group contains: <rect data-node-id="..."> + <text> + <tspan> elements
//   - Collapse/expand buttons have class "oc-btn" and should be ignored
//
// Traversal Strategy:
//   1. Ignore clicks on collapse/expand buttons (.oc-btn)
//   2. Walk up DOM tree from click target to find card's <rect>
//   3. Handle special cases:
//      - Direct rect click: use that rect
//      - Text/tspan/g click: search parent's children for rect with data-node-id
//   4. Extract node ID from rect's data-node-id attribute
//   5. Update inspector, L1 buttons, and apply visual highlight
//
// Why Event Delegation:
//   - Performance: Single listener instead of N listeners (one per card)
//   - Dynamic: Works with cards added/removed by re-renders
//   - Memory: No listener cleanup needed when cards are removed
//
function attachCardClickHandlers() {
  const container = $("#wsu-orgchart");
  if(!container) return;

  // Remove old handler to prevent duplicate listeners
  const oldHandler = container._cardClickHandler;
  if(oldHandler) {
    container.removeEventListener("click", oldHandler);
  }

  const handler = function(e) {
    // Ignore clicks on collapse/expand buttons (they have their own handlers)
    if(e.target.closest('.oc-btn')) return;

    // Find the card rect element that was clicked
    let target = e.target;
    let card = null;

    // Walk up DOM tree to find element with data-node-id
    while(target && target !== container) {
      // Direct rect click: use this rect
      if(target.tagName === "rect" && target.getAttribute("data-node-id")) {
        card = target;
        break;
      }
      // Text/tspan/g click: look for nearby rect with data-node-id
      // (SVG groups text separately from rect, so need to search siblings)
      if(target.tagName === "text" || target.tagName === "tspan" || target.tagName === "g") {
        let parent = target.parentElement;
        if(parent) {
          // Search parent's children for rect with data-node-id
          let rects = parent.querySelectorAll("rect[data-node-id]");
          if(rects.length > 0) {
            card = rects[0];  // Use first matching rect (card background)
            break;
          }
        }
      }
      target = target.parentElement;  // Continue walking up
    }

    // No card found: click was on background or other non-card element
    if(!card) return;

    // Extract node ID and update selection state
    const nodeId = card.getAttribute("data-node-id");
    if(nodeId && findNode(nodeId)) {
      SELECTED_ID = nodeId;
      hydrateInspector();   // Populate inspector panel with node data
      updateL1Buttons();    // Update L1 side assignment buttons

      // Visual feedback: highlight selected card with thicker stroke + glow
      container.querySelectorAll("rect[data-node-id]").forEach(r => {
        r.style.strokeWidth = "";  // Reset all cards to default
        r.style.filter = "";
      });
      card.style.strokeWidth = "3";  // Thicker stroke on selected card
      card.style.filter = "drop-shadow(0 0 8px rgba(152,30,50,0.5))";  // Red glow
      
      console.log("[admin.js] Card clicked, selected node:", nodeId);
    }
  };
  
  container.addEventListener("click", handler);
  container._cardClickHandler = handler;
  
  // Log that handlers are attached
  const cardCount = container.querySelectorAll("rect[data-node-id]").length;
  console.log("[admin.js] Card click handlers attached, found", cardCount, "cards with data-node-id");
}

function refresh() { 
  console.log("========================================");
  console.log("[admin.js] refresh() called");
  console.log("[admin.js] refresh() - CURRENT_LAYOUT:", CURRENT_LAYOUT);
  applyLayoutToDom(); 
  applyDataToDom(); 
  applyHelperToPreview(); 
  
  // Try to trigger re-render if runtime is already loaded
  const container = $("#wsu-orgchart");
  console.log("[admin.js] refresh() - container:", container);
  console.log("[admin.js] refresh() - window.WordpressOrgChart:", window.WordpressOrgChart);
  console.log("[admin.js] refresh() - typeof window.WordpressOrgChart:", typeof window.WordpressOrgChart);
  if(window.WordpressOrgChart) {
    console.log("[admin.js] refresh() - window.WordpressOrgChart.rerender:", window.WordpressOrgChart.rerender);
    console.log("[admin.js] refresh() - typeof rerender:", typeof window.WordpressOrgChart.rerender);
  }
  if(container && window.WordpressOrgChart && typeof window.WordpressOrgChart.rerender === 'function') {
    // Runtime is loaded, just trigger re-render
    console.log("[admin.js] ✓ Calling rerender() - runtime is loaded");
    window.WordpressOrgChart.rerender(container);
    // Attach click handlers after render
    setTimeout(attachCardClickHandlers, 50);
  } else {
    // Runtime not loaded yet, load it
    console.log("[admin.js] ✗ Runtime not loaded or rerender not available, calling loadRuntime()");
    console.log("[admin.js]   - container exists:", !!container);
    console.log("[admin.js]   - WordpressOrgChart exists:", !!window.WordpressOrgChart);
    console.log("[admin.js]   - rerender is function:", typeof (window.WordpressOrgChart && window.WordpressOrgChart.rerender) === 'function');
    loadRuntime(); 
  }
  console.log("========================================");
}

// Node helpers
const findNode = id => NODES.find(n=>n.id===id) || null;
const childrenOf = pid => NODES.filter(n=>n.parent===pid);
const rootNode = () => NODES.find(n=>n.parent==null) || null;
const isLevel1 = n => n && rootNode() && n.parent === rootNode().id;

function subtreeIds(id) {
  const out=[id], q=[id];
  while(q.length){
    const cur=q.shift();
    const kids=childrenOf(cur);
    for(const k of kids){ out.push(k.id); q.push(k.id); }
  }
  return out;
}

const ensureUniqueId = raw => {
  let base=(raw||"").trim()||uid();
  base = base.replace(/\s+/g,"_").replace(/[^a-zA-Z0-9_\-]/g,"").toLowerCase();
  let got=base, i=2;
  while(NODES.some(n=>n.id===got)) got = base + "_" + i++;
  return got;
};

// Dropdowns
function buildTreeOrderFlat() {
  const r=rootNode(); if(!r) return [];
  const out=[];
  (function walk(id, depth){
    const n=findNode(id); if(!n) return;
    out.push({n, depth});
    childrenOf(id).forEach(k=>walk(k.id, depth+1));
  })(r.id, 0);
  return out;
}

function renderNodeDropdowns() {
  const sel=$("#nodeSelect");
  sel.innerHTML="";
  if(!NODES.length){
    const o=document.createElement("option"); 
    o.value=""; o.textContent="(no nodes)"; 
    sel.appendChild(o); 
    sel.disabled=true; 
    return;
  }
  sel.disabled=false;
  const items = rootNode() ? buildTreeOrderFlat() : NODES.map(n=>({n,depth:0}));
  for(const {n,depth} of items){
    const o=document.createElement("option");
    const indent = "· ".repeat(Math.min(depth,6));
    o.value=n.id; 
    o.textContent=`${indent}${n.name||n.id} (${n.id})`;
    sel.appendChild(o);
  }
  if(SELECTED_ID && findNode(SELECTED_ID)){ 
    sel.value=SELECTED_ID; 
  } else { 
    sel.value = items[0]?.n.id || ""; 
    SELECTED_ID=sel.value||null; 
  }
  $("#selInfo").textContent = SELECTED_ID || "none";

  if(CURRENT_LAYOUT === "centered"){
    const l1=$("#selL1");
    l1.innerHTML="";
    const r=rootNode();
    if(!r){ l1.disabled=true; return; }
    const L1=childrenOf(r.id);
    if(!L1.length){ l1.disabled=true; return; }
    l1.disabled=false;
    for(const n of L1){
      const o=document.createElement("option");
      o.value=n.id; 
      o.textContent=`${n.name||n.id} (${n.id}) ${n.side?("• "+n.side):""}`;
      l1.appendChild(o);
    }
    const cur=findNode(SELECTED_ID);
    l1.value = (cur && isLevel1(cur)) ? cur.id : L1[0].id;
    updateL1Buttons();
  }
}

// Inspector
function hydrateInspector() {
  const n = SELECTED_ID ? findNode(SELECTED_ID) : null;
  $("#selInfo").textContent = n ? n.id : "none";
  $("#f_id").value = n ? n.id : "";
  $("#f_name").value = n ? (n.name  || "")  : "";
  $("#f_title").value = n ? (n.title || "")  : "";
  if(CURRENT_LAYOUT === "centered"){
    $("#f_side").value = n && n.side ? n.side : "";
  }
  
  // Populate parent dropdown with valid options
  const parentSelect = $("#f_parent");
  parentSelect.innerHTML = '<option value="">(root - no parent)</option>';
  
  if(n) {
    // Get all nodes that can be parents (not self, not descendants)
    const descendants = new Set(subtreeIds(n.id));
    const validParents = NODES.filter(node => 
      node.id !== n.id && !descendants.has(node.id)
    );
    
    validParents.forEach(node => {
      const option = document.createElement("option");
      option.value = node.id;
      option.textContent = `${node.name} (${node.id})`;
      if(node.id === n.parent) option.selected = true;
      parentSelect.appendChild(option);
    });
  }
}

// CRUD
function addRoot() {
  if(rootNode()){ alert("Root already exists."); return; }
  const id=ensureUniqueId("root");
  NODES.push({id, parent:null, name:"Root", title:""});
  SELECTED_ID=id; renderNodeDropdowns(); hydrateInspector(); refresh(); toast("Root added");
}

function addChild() {
  if(!SELECTED_ID){ alert("Select a node first."); return; }
  const id=ensureUniqueId("node");
  const parent=findNode(SELECTED_ID);
  const side = (CURRENT_LAYOUT === "centered" && isLevel1(parent)) ? parent.side || "" : "";
  NODES.push({id, parent:SELECTED_ID, name:"New Person", title:"", side});
  SELECTED_ID=id; renderNodeDropdowns(); hydrateInspector(); refresh(); toast("Child added");
}

function addSibling() {
  if(!SELECTED_ID){ alert("Select a node first."); return; }
  const cur=findNode(SELECTED_ID);
  const id=ensureUniqueId("node");
  NODES.push({id, parent:cur.parent ?? null, name:"New Person", title:"", side:cur.side || ""});
  SELECTED_ID=id; renderNodeDropdowns(); hydrateInspector(); refresh(); toast("Sibling added");
}

function delNode() {
  if(!SELECTED_ID){ alert("Select a node first."); return; }
  const node = findNode(SELECTED_ID);
  if(!node){ alert("Node not found."); return; }
  
  // Reassign children to this node's parent (grandparent) instead of deleting them
  const grandparent = node.parent;
  const children = childrenOf(SELECTED_ID);
  
  if(children.length > 0) {
    const confirm = window.confirm(
      `This person has ${children.length} direct report(s).\n\n` +
      `Click OK to reassign them to ${grandparent ? `"${findNode(grandparent)?.name}"` : 'root'}, or Cancel to abort.`
    );
    if(!confirm) return;
    
    // Reassign all children to grandparent
    children.forEach(child => {
      child.parent = grandparent;
    });
  }
  
  // Remove only this node
  const idx = NODES.findIndex(n => n.id === SELECTED_ID);
  if(idx >= 0) NODES.splice(idx, 1);
  
  SELECTED_ID = null;
  renderNodeDropdowns();
  hydrateInspector();
  refresh();
  toast(children.length > 0 ? `Deleted and reassigned ${children.length} report(s)` : "Deleted");
}

function saveInspector() {
  const was = SELECTED_ID ? findNode(SELECTED_ID) : null;
  if(!was){ alert("No selection."); return; }
  const newId = ensureUniqueId($("#f_id").value || was.id);
  const parentV = $("#f_parent").value.trim();
  const newParent = parentV === "" ? null : parentV;
  if(newParent===newId){ alert("A node cannot be its own parent."); return; }
  if(newParent && !findNode(newParent)){ alert("Parent id not found."); return; }
  const descendants = new Set(subtreeIds(was.id));
  if(newParent && descendants.has(newParent)){ alert("Cannot set parent to a descendant."); return; }

  was.id = newId;
  was.parent = newParent;
  was.name = $("#f_name").value;
  was.title= $("#f_title").value;
  if(CURRENT_LAYOUT === "centered"){
    const sideSel = $("#f_side").value;
    if(sideSel==="L" || sideSel==="R") was.side = sideSel; else delete was.side;
  }

  if(newId !== SELECTED_ID){
    NODES.forEach(n => { if(n.parent===SELECTED_ID) n.parent=newId; });
    SELECTED_ID = newId;
  }
  renderNodeDropdowns(); hydrateInspector(); refresh(); toast("Saved");
}

function revertInspector() { hydrateInspector(); }

// L1 actions
function updateL1Buttons() {
  if(CURRENT_LAYOUT !== "centered") return;
  const cur=findNode(SELECTED_ID);
  const enable = !!(cur && isLevel1(cur));
  ["btnL1Up","btnL1Down","btnL1Flip"].forEach(id => { 
    const b=document.getElementById(id); 
    b.disabled = !enable; 
  });
}

function l1Move(delta) {
  const cur=findNode(SELECTED_ID);
  const r=rootNode();
  if(!r || !cur || !isLevel1(cur)) { alert("Select a Level-1 node first."); return; }
  const l1 = childrenOf(r.id).map(x=>x.id);
  const i = l1.indexOf(cur.id);
  const j = i + delta;
  if(j<0 || j>=l1.length) return;

  const newOrder = l1.slice();
  const [mv] = newOrder.splice(i,1);
  newOrder.splice(j,0,mv);

  const l1Set = new Set(l1);
  const l1Map = new Map(childrenOf(r.id).map(n=>[n.id,n]));
  const reordered = [];
  for(const node of NODES){ if(!l1Set.has(node.id)) reordered.push(node); }
  for(const id of newOrder){ reordered.push(l1Map.get(id)); }
  NODES = reordered;

  renderNodeDropdowns(); refresh(); toast("Reordered Level-1");
}

function l1Flip() {
  const cur = findNode(SELECTED_ID);
  const r = rootNode();
  if(!r || !cur || !isLevel1(cur)) { alert("Select a Level-1 node first."); return; }
  const ids = subtreeIds(cur.id);
  const curSide = (cur.side==="L"||cur.side==="R")?cur.side:"L";
  const next = (curSide==="L")?"R":"L";
  for(const id of ids){ const k=findNode(id); k.side = next; }
  renderNodeDropdowns(); refresh(); toast(`Flipped subtree to ${next}`);
}

// Import/Export
async function importBlock(raw) {
  if(!raw){ alert("Paste or upload a WP block first."); return; }
  const resp = await fetch("/api/orgchart/import", {
    method:"POST", 
    headers:{"Content-Type":"application/json"}, 
    body: JSON.stringify({raw})
  });
  const j = await resp.json();
  if(!j.ok){ alert(j.error||"Import failed"); log("Import failed", j.error); return; }
  NODES = j.nodes || [];
  
  // Detect layout type from imported HTML
  const hostMatch = raw.match(/<div[^>]+id=["']wsu-orgchart["'][^>]*>/i);
  if(hostMatch){
    const hasMode = hostMatch[0].includes("data-mode");
    const hasHgap = hostMatch[0].includes("data-hgap");
    
    if(hasMode) {
      CURRENT_LAYOUT = "vertical_horizontal";
    } else if(hasHgap) {
      CURRENT_LAYOUT = "vertical";
    } else {
      CURRENT_LAYOUT = "centered";
    }
    
    $("#layoutType").value = CURRENT_LAYOUT;
    updateLayoutType();
  }
  
  // Import centered layout settings
  if(CURRENT_LAYOUT === "centered"){
    // Import responsive scale (prefer new format, fall back to legacy single scale)
    if(j.layout.scaleDesktop !== null && j.layout.scaleDesktop !== undefined){
      $("#c_scale_desktop").value = j.layout.scaleDesktop;
      $("#c_scale_tablet").value = j.layout.scaleTablet ?? 0.75;
      $("#c_scale_phone").value = j.layout.scalePhone ?? 0.60;
    } else if(j.layout.scale !== null && j.layout.scale !== undefined){
      // Legacy format: use single scale for all breakpoints
      $("#c_scale_desktop").value = j.layout.scale;
      $("#c_scale_tablet").value = j.layout.scale;
      $("#c_scale_phone").value = j.layout.scale;
    }
    if(j.layout.hgaps) $("#hgaps").value = j.layout.hgaps;
    if(j.layout.stubs) $("#stubs").value = j.layout.stubs;
    if(j.layout.cardw) $("#cardw").value = j.layout.cardw;
    if(j.layout.l1stub !== null && j.layout.l1stub !== undefined) $("#l1stub").value = j.layout.l1stub;
    if(j.layout.center !== null && j.layout.center !== undefined) $("#center").value = String(j.layout.center);
    if(j.layout.connectorAlign !== null && j.layout.connectorAlign !== undefined) $("#c_connector_align").value = String(j.layout.connectorAlign);
    if(j.layout.openDepthDesktop !== null && j.layout.openDepthDesktop !== undefined) $("#c_open_depth_desktop").value = String(j.layout.openDepthDesktop);
    if(j.layout.openDepthTablet !== null && j.layout.openDepthTablet !== undefined) $("#c_open_depth_tablet").value = String(j.layout.openDepthTablet);
    if(j.layout.openDepthPhone !== null && j.layout.openDepthPhone !== undefined) $("#c_open_depth_phone").value = String(j.layout.openDepthPhone);
  }

  // Import vertical layout settings
  if(CURRENT_LAYOUT === "vertical"){
    // Import responsive scale (prefer new format, fall back to legacy single scale)
    if(j.layout.scaleDesktop !== null && j.layout.scaleDesktop !== undefined){
      $("#v_scale_desktop").value = j.layout.scaleDesktop;
      $("#v_scale_tablet").value = j.layout.scaleTablet ?? 0.75;
      $("#v_scale_phone").value = j.layout.scalePhone ?? 0.60;
    } else if(j.layout.scale !== null && j.layout.scale !== undefined){
      // Legacy format: use single scale for all breakpoints
      $("#v_scale_desktop").value = j.layout.scale;
      $("#v_scale_tablet").value = j.layout.scale;
      $("#v_scale_phone").value = j.layout.scale;
    }
    if(j.layout.cardw) $("#v_cardw").value = j.layout.cardw;
    if(j.layout.hgap) $("#v_hgap").value = j.layout.hgap;
    if(j.layout.vgap) $("#v_vgap").value = j.layout.vgap;
  }

  // Import horizontal layout settings
  if(CURRENT_LAYOUT === "vertical_horizontal"){
    // Import responsive scale (prefer new format, fall back to legacy single scale)
    if(j.layout.scaleDesktop !== null && j.layout.scaleDesktop !== undefined){
      $("#vh_scale_desktop").value = j.layout.scaleDesktop;
      $("#vh_scale_tablet").value = j.layout.scaleTablet ?? 0.75;
      $("#vh_scale_phone").value = j.layout.scalePhone ?? 0.60;
    } else if(j.layout.scale !== null && j.layout.scale !== undefined){
      // Legacy format: use single scale for all breakpoints
      $("#vh_scale_desktop").value = j.layout.scale;
      $("#vh_scale_tablet").value = j.layout.scale;
      $("#vh_scale_phone").value = j.layout.scale;
    }
  }

  SELECTED_ID = (rootNode() && rootNode().id) || (NODES[0] && NODES[0].id) || null;
  renderNodeDropdowns(); hydrateInspector(); updateL1Buttons(); refresh(); toast("Imported");
}

async function buildExport() {
  const L = readLayout();
  const attrs = {id:"wsu-orgchart", class:"wsu-orgchart"};
  
  // Add styling attributes (shared across all layouts)
  const S = L.styles;
  attrs["data-name-font-family"] = S.nameFont;
  attrs["data-name-font-size"] = String(S.nameSize);
  attrs["data-name-font-weight"] = S.nameWeight;
  attrs["data-name-font-style"] = S.nameStyle;
  attrs["data-name-color"] = S.nameColor;
  attrs["data-title-font-family"] = S.titleFont;
  attrs["data-title-font-size"] = String(S.titleSize);
  attrs["data-title-font-weight"] = S.titleWeight;
  attrs["data-title-font-style"] = S.titleStyle;
  attrs["data-title-color"] = S.titleColor;
  attrs["data-card-fill"] = S.cardFill;
  attrs["data-card-stroke"] = S.cardStroke;
  attrs["data-card-shadow"] = S.cardShadow;
  attrs["data-link-color"] = S.linkColor;
  attrs["data-link-width"] = String(S.linkWidth);
  attrs["data-spine-color"] = S.spineColor;
  attrs["data-spine-width"] = String(S.spineWidth);
  attrs["data-btn-circle-fill"] = S.btnCircleFill;
  attrs["data-btn-circle-stroke"] = S.btnCircleStroke;
  attrs["data-btn-circle-outline"] = S.btnCircleOutline;
  attrs["data-btn-rect-fill"] = S.btnRectFill;
  if(S.bgColor) attrs["data-bg-color"] = S.bgColor;
  
  // Typography enhancements
  attrs["data-name-line-height"] = String(S.nameLineHeight);
  attrs["data-title-line-height"] = String(S.titleLineHeight);
  attrs["data-name-letter-spacing"] = String(S.nameLetterSpacing);
  attrs["data-title-letter-spacing"] = String(S.titleLetterSpacing);
  attrs["data-text-align"] = S.textAlign;
  attrs["data-text-gap"] = String(S.textGap);
  
  // Card appearance
  attrs["data-card-padding-top"] = String(S.cardPaddingTop);
  attrs["data-card-padding-bottom"] = String(S.cardPaddingBottom);
  attrs["data-card-padding-left"] = String(S.cardPaddingLeft);
  attrs["data-card-padding-right"] = String(S.cardPaddingRight);
  attrs["data-card-radius"] = String(S.cardRadius);
  attrs["data-card-stroke-width"] = String(S.cardStrokeWidth);
  
  // Button appearance
  attrs["data-btn-radius"] = String(S.btnRadius);
  attrs["data-btn-offset-x"] = String(S.btnOffsetX);
  attrs["data-btn-offset-y"] = String(S.btnOffsetY);
  
  // Shadow
  attrs["data-shadow-color"] = S.shadowColor;
  attrs["data-shadow-blur"] = String(S.shadowBlur);
  attrs["data-shadow-opacity"] = String(S.shadowOpacity);
  attrs["data-shadow-offset-x"] = String(S.shadowOffsetX);
  attrs["data-shadow-offset-y"] = String(S.shadowOffsetY);
  
  // Spacing
  attrs["data-margin"] = String(S.margin);
  attrs["data-sibling-gap"] = String(S.siblingGap);
  
  if(CURRENT_LAYOUT === "centered"){
    // Centered layout: default, no data-layout attribute needed
    attrs["data-scale-desktop"] = String(L.scaleDesktop);
    attrs["data-scale-tablet"] = String(L.scaleTablet);
    attrs["data-scale-phone"] = String(L.scalePhone);
    attrs["data-scale"] = String(L.scaleDesktop);
    attrs["data-hgaps"] = L.hgaps;
    attrs["data-stubs"] = L.stubs;
    attrs["data-cardw"] = String(L.cardw);
    if(L.cardh != null) attrs["data-cardh"] = String(L.cardh);
    attrs["data-l1stub"] = String(L.l1stub);
    attrs["data-center"] = String(L.center);
    attrs["data-c-connector-align"] = String(L.connectorAlign || 0);
    attrs["data-open-depth-desktop"] = String(L.openDepthDesktop);
    attrs["data-open-depth-tablet"] = String(L.openDepthTablet);
    attrs["data-open-depth-phone"] = String(L.openDepthPhone);
  } else if(CURRENT_LAYOUT === "vertical") {
    attrs["data-layout"] = "vertical";
    attrs["data-scale-desktop"] = String(L.scaleDesktop);
    attrs["data-scale-tablet"] = String(L.scaleTablet);
    attrs["data-scale-phone"] = String(L.scalePhone);
    attrs["data-scale"] = String(L.scaleDesktop);
    attrs["data-cardw"] = String(L.cardw);
    if(L.cardh != null) attrs["data-cardh"] = String(L.cardh);
    attrs["data-hgap"] = String(L.hgap);
    attrs["data-vgap"] = String(L.vgap);
    attrs["data-v-root-offset-y"] = String(L.rootOffsetY || 0);
    attrs["data-open-depth-desktop"] = String(L.openDepthDesktop);
    attrs["data-open-depth-tablet"] = String(L.openDepthTablet);
    attrs["data-open-depth-phone"] = String(L.openDepthPhone);
    attrs["data-v-autodepth-desktop"] = String(L.openDepthDesktop);
    attrs["data-v-autodepth-tablet"] = String(L.openDepthTablet);
    attrs["data-v-autodepth-phone"] = String(L.openDepthPhone);
  } else {
    attrs["data-layout"] = "horizontal";
    attrs["data-mode"] = "horizontal";
    attrs["data-scale-desktop"] = String(L.scaleDesktop);
    attrs["data-scale-tablet"] = String(L.scaleTablet);
    attrs["data-scale-phone"] = String(L.scalePhone);
    attrs["data-scale"] = String(L.scaleDesktop);
    attrs["data-cardw"] = String(L.cardw);
    if(L.cardh != null) attrs["data-cardh"] = String(L.cardh);
    attrs["data-vgap"] = String(L.vgap);
    attrs["data-hgap"] = String(L.hgap);
    if(L.hstub != null) attrs["data-h-stubs"] = String(L.hstub);
    if(L.parentStub != null) attrs["data-h-parent-stubs"] = String(L.parentStub);
    if(L.maxCols && L.maxCols > 0) attrs["data-h-max-cols"] = String(L.maxCols);
    if(L.rowSpacing) attrs["data-h-row-spacing"] = String(L.rowSpacing);
    attrs["data-h-root-offset-x"] = String(L.rootOffsetX || 0);
    attrs["data-open-depth-desktop"] = String(L.openDepthDesktop);
    attrs["data-open-depth-tablet"] = String(L.openDepthTablet);
    attrs["data-open-depth-phone"] = String(L.openDepthPhone);
    attrs["data-h-autodepth"] = String(L.openDepthDesktop);
    if(L.alignRows === 1) attrs["data-h-alignrows"] = "1";
    if(L.wrap) attrs["data-h-wrap"] = L.wrap;
    if(L.pack) attrs["data-h-pack"] = L.pack;
    // Optional toggle for responsive switching
    if(L.toggle === 1){
      attrs["data-mode"] = "auto";
      attrs["data-breakpoint"] = String(L.breakpoint);
      attrs["data-toggle"] = String(L.toggle);
    } else {
      delete attrs["data-breakpoint"];
      delete attrs["data-toggle"];
    }
  }
  
  const attrStr = Object.entries(attrs).map(([k,v])=>`${k}="${v}"`).join(" ");
  const closeScript = "<" + "/script>";

  const helperDiv = (CURRENT_LAYOUT === "centered" && HELPER.text)
    ? `<div style="text-align:right;font-size:${(HELPER.size||14)}px;margin-bottom:8px;">${escapeHtml(HELPER.text)}</div>\n`
    : "";

  // Build base HTML (shared between both export modes)
  const baseHTML = [
    "<!-- Org chart container -->",
    helperDiv.trimEnd(),
    `<div ${attrStr}></div>`,
    "",
    "<!-- Org data (JSON) -->",
    '<script id="wsu-org-data" type="application/json">',
    JSON.stringify(NODES, null, 2),
    closeScript
  ];

  if (SELF_CONTAINED_EXPORT) {
    return await buildSelfContainedExport(baseHTML, closeScript);
  } else {
    return buildLightweightExport(baseHTML);
  }
}

function buildLightweightExport(baseHTML) {
  // Current behavior - requires global Wordpress.js/css
  return [
    "<!--",
    "  WordPress Setup:",
    "  - Wordpress.js must be loaded globally via WordPress Custom JavaScript",
    "  - Wordpress.css must be loaded globally via WordPress Edit CSS",
    "  - No script or link tags needed in this HTML block",
    "-->",
    "",
    "<!-- Helper text (optional) -->",
    ...baseHTML,
    "",
    "<!-- Safe bootstrap to ensure render on WP pages -->",
    "<script>(function(){",
    "  function renderOnce(el){",
    "    if(!el) return;",
    "    if(window._WordpressOrgChart_startTarget){",
    "      try { window._WordpressOrgChart_startTarget(el); return; } catch(err){ console&&console.warn&&console.warn('OrgChart startTarget failed:',err); }",
    "    }",
    "    if(window.WordpressOrgChart && typeof window.WordpressOrgChart.rerender==='function'){",
    "      try { window.WordpressOrgChart.rerender(el); return; } catch(err2){ console&&console.warn&&console.warn('OrgChart rerender failed:',err2); }",
    "    }",
    "  }",
    "  function boot(){",
    "    var el=document.getElementById('wsu-orgchart');",
    "    if(!el) return;",
    "    var attempts=0;",
    "    (function check(){",
    "      attempts++;",
    "      if(window._WordpressOrgChart_startTarget || (window.WordpressOrgChart && typeof window.WordpressOrgChart.rerender==='function')){",
    "        renderOnce(el);",
    "      } else if(attempts < 40){",
    "        setTimeout(check, 75);",
    "      }",
    "    })();",
    "  }",
    "  if(document.readyState==='loading'){",
    "    document.addEventListener('DOMContentLoaded', boot, {once:true});",
    "  } else {",
    "    boot();",
    "  }",
    "})();</script>"
  ].filter(Boolean).join("\n");
}

async function buildSelfContainedExport(baseHTML, closeScript) {
  // Fetch embedded resources
  let css, js;

  try {
    const cssResp = await fetch("/api/orgchart/runtime.css?type=" + CURRENT_LAYOUT);
    if (!cssResp.ok) {
      alert(`Failed to fetch CSS: ${cssResp.status} ${cssResp.statusText}`);
      return "";
    }
    css = await cssResp.text();
    console.log("CSS fetched, length:", css.length);
  } catch(err) {
    alert("Failed to load CSS for self-contained export: " + err.message);
    return "";
  }

  try {
    const jsResp = await fetch("/api/orgchart/runtime.js?type=" + CURRENT_LAYOUT);
    if (!jsResp.ok) {
      alert(`Failed to fetch JS: ${jsResp.status} ${jsResp.statusText}`);
      return "";
    }
    js = await jsResp.text();
    console.log("JS fetched, length:", js.length);

  } catch(err) {
    alert("Failed to load JS for self-contained export: " + err.message);
    return "";
  }

  // Base64 encode JavaScript to bypass WordPress HTML parsing
  // Prevents WordPress from interpreting </div> sequences as closing tags
  const fullJs = js;
  let encodedJs;
  try {
    // Convert to UTF-8 bytes then Base64 with chunking to avoid call stack limits
    const utf8Bytes = new TextEncoder().encode(fullJs);
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < utf8Bytes.length; i += chunkSize) {
      const chunk = utf8Bytes.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, chunk);
    }
    encodedJs = btoa(binaryString);
  } catch(e) {
    // Fallback for older browsers or if modern approach fails
    encodedJs = btoa(unescape(encodeURIComponent(fullJs)));
  }

  return [
    "<!--",
    "  Self-Contained Org Chart",
    "  - All CSS and JavaScript embedded",
    "  - No WordPress global setup required",
    "  - Paste into Custom HTML block and it works",
    "  - File size: ~100KB (includes runtime)",
    "  - JavaScript is Base64 encoded to prevent WordPress HTML parsing issues",
    "-->",
    "",
    "<!-- Embedded Styles -->",
    "<style>",
    css,
    "</style>",
    "",
    "<!-- Helper text (optional) -->",
    ...baseHTML,
    "",
    "<!-- Embedded Runtime (Base64 encoded to prevent WordPress HTML parsing issues) -->",
    "<script>",
    "(function(){",
    "  var code=atob('" + encodedJs + "');",
    "  var script=document.createElement('script');",
    "  script.textContent=code;",
    "  document.head.appendChild(script);",
    "  ",
    "  function renderOnce(el){",
    "    if(!el) return;",
    "    if(window._WordpressOrgChart_startTarget){",
    "      try { window._WordpressOrgChart_startTarget(el); return; } catch(err){ console&&console.warn&&console.warn('OrgChart startTarget failed:',err); }",
    "    }",
    "    if(window.WordpressOrgChart && typeof window.WordpressOrgChart.rerender==='function'){",
    "      try { window.WordpressOrgChart.rerender(el); return; } catch(err2){ console&&console.warn&&console.warn('OrgChart rerender failed:',err2); }",
    "    }",
    "  }",
    "  function boot(){",
    "    var el=document.getElementById('wsu-orgchart');",
    "    if(!el) return;",
    "    var attempts=0;",
    "    (function check(){",
    "      attempts++;",
    "      if(window._WordpressOrgChart_startTarget || (window.WordpressOrgChart && typeof window.WordpressOrgChart.rerender==='function')){",
    "        renderOnce(el);",
    "      } else if(attempts < 40){",
    "        setTimeout(check, 75);",
    "      }",
    "    })();",
    "  }",
    "  if(document.readyState==='loading'){",
    "    document.addEventListener('DOMContentLoaded', boot, {once:true});",
    "  } else {",
    "    boot();",
    "  }",
    "})();",
    closeScript
  ].filter(Boolean).join("\n");
}

function escapeHtml(s) {
  return String(s||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

// Wire controls - wait for DOM to be ready
function wireControls() {
  const layoutTypeEl = document.getElementById("layoutType");
  if (!layoutTypeEl) {
    setTimeout(wireControls, 50);
    return;
  }
  
  layoutTypeEl.addEventListener("change", updateLayoutType);

  const btnUploadImport = document.getElementById("btnUploadImport");
  if (btnUploadImport) {
    btnUploadImport.addEventListener("click", async ()=>{
      const f = document.getElementById("fileHtml").files?.[0];
      if(!f){ alert("Choose an HTML file first."); return; }
      const text = await f.text();
      document.getElementById("txt").value = text;
      importBlock(text);
    });
  }

  const btnDoImport = document.getElementById("btnDoImport");
  if (btnDoImport) {
    btnDoImport.addEventListener("click", ()=> {
      importBlock(document.getElementById("txt").value.trim());
    });
  }

  const btnLoad = document.getElementById("btnLoad");
  if (btnLoad) {
    btnLoad.addEventListener("click", async ()=>{
      const t = await (await fetch("/api/orgchart/sample?type=" + CURRENT_LAYOUT)).text(); 
      document.getElementById("txt").value=t;
      toast("Sample loaded");
    });
  }

  const btnClear = document.getElementById("btnClear");
  if (btnClear) {
    btnClear.addEventListener("click", ()=> { 
      document.getElementById("txt").value=""; 
    });
  }

  const btnAddRoot = document.getElementById("btnAddRoot");
  if (btnAddRoot) btnAddRoot.addEventListener("click", addRoot);
  const btnAddChild = document.getElementById("btnAddChild");
  if (btnAddChild) btnAddChild.addEventListener("click", addChild);
  const btnAddSibling = document.getElementById("btnAddSibling");
  if (btnAddSibling) btnAddSibling.addEventListener("click", addSibling);
  const btnDelete = document.getElementById("btnDelete");
  if (btnDelete) btnDelete.addEventListener("click", delNode);
  const btnSave = document.getElementById("btnSave");
  if (btnSave) btnSave.addEventListener("click", saveInspector);
  const btnRevert = document.getElementById("btnRevert");
  if (btnRevert) btnRevert.addEventListener("click", revertInspector);

  const selL1 = document.getElementById("selL1");
  if (selL1) {
    selL1.addEventListener("change", ()=>{
      const v=selL1.value; 
      if(v){ SELECTED_ID=v; hydrateInspector(); renderNodeDropdowns(); updateL1Buttons(); }
    });
  }
  const btnL1Up = document.getElementById("btnL1Up");
  if (btnL1Up) btnL1Up.addEventListener("click", ()=>l1Move(-1));
  const btnL1Down = document.getElementById("btnL1Down");
  if (btnL1Down) btnL1Down.addEventListener("click", ()=>l1Move(1));
  const btnL1Flip = document.getElementById("btnL1Flip");
  if (btnL1Flip) btnL1Flip.addEventListener("click", l1Flip);

// Centered layout controls
["c_scale_desktop","c_scale_tablet","c_scale_phone","hgaps","stubs","cardw","cardh","l1stub","center","c_connector_align","c_open_depth_desktop","c_open_depth_tablet","c_open_depth_phone"].forEach(id=>{
  const el=document.getElementById(id);
  if(el){ el.addEventListener("input", refresh); el.addEventListener("change", refresh); }
});

// Simple vertical layout controls
["v_scale_desktop","v_scale_tablet","v_scale_phone","v_cardw","v_cardh","v_hgap","v_vgap","v_root_offset_y","v_open_depth_desktop","v_open_depth_tablet","v_open_depth_phone"].forEach(id=>{
  const el=document.getElementById(id);
  if(el){ el.addEventListener("input", refresh); el.addEventListener("change", refresh); }
});

// V/H layout controls
["vh_scale_desktop","vh_scale_tablet","vh_scale_phone","vh_cardw","vh_cardh","vh_vgap","vh_hgap","vh_stub","vh_parent_stub","vh_max_cols","vh_row_spacing","vh_breakpoint","vh_toggle","h_root_offset_x","vh_open_depth_desktop","vh_open_depth_tablet","vh_open_depth_phone","vh_alignrows","vh_wrap","vh_pack"].forEach(id=>{
  const el=document.getElementById(id);
  if(el){ el.addEventListener("input", refresh); el.addEventListener("change", refresh); }
});

// Styling controls (shared across all layouts)
["style_name_font","style_name_size","style_name_weight","style_name_style","style_name_color",
 "style_title_font","style_title_size","style_title_weight","style_title_style","style_title_color",
 "style_card_fill","style_card_stroke","style_card_shadow",
 "style_link_color","style_link_width","style_spine_color","style_spine_width",
 "style_btn_circle_fill","style_btn_circle_stroke","style_btn_circle_outline","style_btn_rect_fill",
 "style_bg_color","style_bg_transparent"].forEach(id=>{
  const el=document.getElementById(id);
  if(el){ el.addEventListener("input", refresh); el.addEventListener("change", refresh); }
});

// Enhancement controls (typography, card, button, shadow, spacing)
["style_name_line_height","style_title_line_height","style_name_letter_spacing","style_title_letter_spacing",
 "style_text_align","style_text_gap",
 "style_card_padding_top","style_card_padding_bottom","style_card_padding_left","style_card_padding_right",
 "style_card_radius","style_card_stroke_width",
 "style_btn_radius","style_btn_offset_x","style_btn_offset_y",
 "style_shadow_color","style_shadow_blur","style_shadow_opacity","style_shadow_offset_x","style_shadow_offset_y",
 "style_margin","style_sibling_gap"].forEach(id=>{
  const el=document.getElementById(id);
  if(el){ el.addEventListener("input", refresh); el.addEventListener("change", refresh); }
});

  const helperText = document.getElementById("helperText");
  if (helperText) {
    helperText.addEventListener("input", ()=>{ 
      HELPER.text = helperText.value; 
      applyHelperToPreview(); 
    });
  }
  const helperSize = document.getElementById("helperSize");
  if (helperSize) {
    helperSize.addEventListener("input", ()=>{ 
      HELPER.size = parseInt(helperSize.value||"14",10); 
      applyHelperToPreview(); 
    });
  }

  const nodeSelect = document.getElementById("nodeSelect");
  if (nodeSelect) {
    nodeSelect.addEventListener("change", ()=>{
      SELECTED_ID = nodeSelect.value || null;
      hydrateInspector(); renderNodeDropdowns(); updateL1Buttons();
    });
  }

  const selfContainedExport = document.getElementById("selfContainedExport");
  if (selfContainedExport) {
    selfContainedExport.addEventListener("change", (e) => {
      SELF_CONTAINED_EXPORT = e.target.checked;
    });
  }

  const btnExport = document.getElementById("btnExport");
  if (btnExport) {
    btnExport.addEventListener("click", async ()=>{
      const html = await buildExport();
      if(!html) return; // Failed to fetch resources

      const a=document.createElement("a");
      a.href=URL.createObjectURL(new Blob([html],{type:"text/html"}));
      let layoutType = CURRENT_LAYOUT === "centered" ? "center" : CURRENT_LAYOUT;
      if(layoutType === "vertical_horizontal") layoutType = "horizontal";

      // Add suffix for self-contained exports
      const suffix = SELF_CONTAINED_EXPORT ? "_standalone" : "";
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
      a.download=`wsu_org_${layoutType}${suffix}_${dateStr}.html`;

      a.click();
      URL.revokeObjectURL(a.href);
      toast("Exported HTML");
    });
  }

  const btnJson = document.getElementById("btnJson");
  if (btnJson) {
    btnJson.addEventListener("click", ()=>{
      const a=document.createElement("a");
      a.href=URL.createObjectURL(new Blob([JSON.stringify(NODES,null,2)],{type:"application/json"}));
      a.download="wsu_org_data.json"; a.click(); URL.revokeObjectURL(a.href);
    });
  }

  // Download Wordpress.js
  const btnDownloadJs = document.getElementById("btnDownloadJs");
  if (btnDownloadJs) {
    btnDownloadJs.addEventListener("click", async ()=>{
      try {
        const resp = await fetch("/api/orgchart/download/js");
        if (!resp.ok) {
          alert("Failed to download Wordpress.js: " + resp.statusText);
          return;
        }
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Wordpress.js";
        a.click();
        URL.revokeObjectURL(url);
        toast("Wordpress.js downloaded");
      } catch(err) {
        alert("Error downloading Wordpress.js: " + err.message);
      }
    });
  }

  // Download Wordpress.css
  const btnDownloadCss = document.getElementById("btnDownloadCss");
  if (btnDownloadCss) {
    btnDownloadCss.addEventListener("click", async ()=>{
      try {
        const resp = await fetch("/api/orgchart/download/css");
        if (!resp.ok) {
          alert("Failed to download Wordpress.css: " + resp.statusText);
          return;
        }
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Wordpress.css";
        a.click();
        URL.revokeObjectURL(url);
        toast("Wordpress.css downloaded");
      } catch(err) {
        alert("Error downloading Wordpress.css: " + err.message);
      }
    });
  }

  // Excel Upload Handler
  const btnUploadExcel = document.getElementById("btnUploadExcel");
  if (btnUploadExcel) {
    btnUploadExcel.addEventListener("click", ()=>{
      const fileInput = document.getElementById("fileExcel");
      const file = fileInput.files[0];
      if(!file){ toast("Please select an Excel file first"); return; }
      
      const reader = new FileReader();
      reader.onload = function(e){
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {type: 'array'});
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
          
          // Parse Excel data - expect headers in first row
          const headers = rows[0];
          const idIdx = headers.findIndex(h => h && String(h).toLowerCase().trim() === 'id');
          const nameIdx = headers.findIndex(h => h && String(h).toLowerCase().trim() === 'name');
          const titleIdx = headers.findIndex(h => h && String(h).toLowerCase().trim() === 'title');
          const parentIdx = headers.findIndex(h => h && String(h).toLowerCase().trim() === 'parent');
          const sideIdx = headers.findIndex(h => h && String(h).toLowerCase().trim() === 'side');
          
          if(idIdx === -1 || nameIdx === -1 || titleIdx === -1 || parentIdx === -1){
            toast("Excel must have columns: ID, Name, Title, Parent");
            return;
          }
          
          NODES = [];
          for(let i = 1; i < rows.length; i++){
            const row = rows[i];
            if(!row || !row[idIdx]) continue; // Skip empty rows
            
            const node = {
              id: String(row[idIdx]).trim(),
              name: row[nameIdx] ? String(row[nameIdx]).trim() : "",
              title: row[titleIdx] ? String(row[titleIdx]).trim() : "",
              parent: row[parentIdx] ? String(row[parentIdx]).trim() : null
            };
            
            // Handle empty parent (root node)
            if(node.parent === "" || node.parent === "null" || !node.parent){
              node.parent = null;
            }
            
            // Add side if provided (for center layout)
            if(sideIdx !== -1 && row[sideIdx]){
              const side = String(row[sideIdx]).trim().toUpperCase();
              if(side === "L" || side === "R") node.side = side;
            }
            
            NODES.push(node);
          }
          
          const root = rootNode();
          SELECTED_ID = root ? root.id : (NODES[0] ? NODES[0].id : null);
          renderNodeDropdowns(); hydrateInspector(); updateL1Buttons(); refresh();
          toast(`Imported ${NODES.length} nodes from Excel`);
          fileInput.value = ""; // Clear file input
        } catch(err){
          console.error("Excel import error:", err);
          toast("Error parsing Excel file: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Excel Template Download Handler
  const btnDownloadTemplate = document.getElementById("btnDownloadTemplate");
  if (btnDownloadTemplate) {
    btnDownloadTemplate.addEventListener("click", ()=>{
      // Create sample data with proper structure
      const templateData = [
        ["ID", "Name", "Title", "Parent", "Side"],
        ["ceo", "Jane Smith", "Chief Executive Officer", "", ""],
        ["coo", "John Doe", "Chief Operating Officer", "ceo", "L"],
        ["cto", "Alice Johnson", "Chief Technology Officer", "ceo", "R"],
        ["dev1", "Bob Wilson", "Senior Developer", "cto", ""],
        ["dev2", "Carol Martinez", "Software Engineer", "cto", ""]
      ];
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      // Set column widths for better readability
      ws['!cols'] = [
        {wch: 12},  // ID
        {wch: 25},  // Name
        {wch: 35},  // Title
        {wch: 12},  // Parent
        {wch: 8}    // Side
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, "Org Chart Data");
      
      // Generate Excel file
      XLSX.writeFile(wb, "org_chart_template.xlsx");
      toast("Template downloaded");
    });
  }

  // Initial setup
  const layoutEl = document.getElementById("layoutType");
  if (layoutEl) {
    const layout = layoutEl.value;
    CURRENT_LAYOUT = layout;
    if(layout === "centered"){
      const layoutCentered = document.getElementById("layoutCentered");
      if (layoutCentered) layoutCentered.classList.add("show");
      const sectionL1 = document.getElementById("sectionL1");
      if (sectionL1) sectionL1.style.display = "block";
      const rowSide = document.getElementById("rowSide");
      if (rowSide) rowSide.style.display = "flex";
    } else if(layout === "vertical") {
      const layoutVertical = document.getElementById("layoutVertical");
      if (layoutVertical) layoutVertical.classList.add("show");
      const sectionL1 = document.getElementById("sectionL1");
      if (sectionL1) sectionL1.style.display = "none";
      const rowSide = document.getElementById("rowSide");
      if (rowSide) rowSide.style.display = "none";
    } else {
      const layoutVerticalHorizontal = document.getElementById("layoutVerticalHorizontal");
      if (layoutVerticalHorizontal) layoutVerticalHorizontal.classList.add("show");
      const sectionL1 = document.getElementById("sectionL1");
      if (sectionL1) sectionL1.style.display = "none";
      const rowSide = document.getElementById("rowSide");
      if (rowSide) rowSide.style.display = "none";
    }
  }

  const helperTextEl = document.getElementById("helperText");
  if (helperTextEl) helperTextEl.value = HELPER.text;
  const helperSizeEl = document.getElementById("helperSize");
  if (helperSizeEl) helperSizeEl.value = String(HELPER.size);
  renderNodeDropdowns(); hydrateInspector(); applyHelperToPreview(); refresh();

  log("Admin loaded - ready v2.1");
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wireControls);
} else {
  wireControls();
}