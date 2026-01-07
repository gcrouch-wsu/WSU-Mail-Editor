/* WSU Org Chart - Unified Runtime (center | horizontal | vertical) */

// Expose rerender function for dynamic updates
window.WordpressOrgChart = {
  rerender: function(container) {
    if(!container) container = document.getElementById("wsu-orgchart");
    if(!container) return;
    if(typeof window._WordpressOrgChart_startTarget === 'function') {
      window._WordpressOrgChart_startTarget(container);
    }
  }
};

(function () {
  "use strict";

  // ---------- sizing / tokens ----------
  var CARD = { w: 276, r: 10, hMin: 92, pad: { l:12, r:12, t:12, b:12 } };
  var LAY  = { vGap: 26, margin: 24, hDefault: 110, rootPad: 24, sGap: 26, rGap: 12 };
  var TEXT = {
    name:  { font:'700 17px Inter,"Segoe UI",Roboto,Helvetica,Arial,system-ui,-apple-system,sans-serif', lh:20 },
    title: { font:'500 13.5px Inter,"Segoe UI",Roboto,Helvetica,Arial,system-ui,-apple-system,sans-serif', lh:18, max:20, splitSemi:true },
    gap: 8
  };

  // ---------- helpers ----------
  var NS="http://www.w3.org/2000/svg";
  function mk(tag, a){ var e=document.createElementNS(NS, tag); if(a){for(var k in a){ e.setAttribute(k,a[k]); }} if(tag==="line"||tag==="path"||tag==="rect"){ e.setAttribute("vector-effect","non-scaling-stroke"); } return e; }
  function byId(id){ return document.getElementById(id); }
  function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }
  function parseList(s){ if(!s) return []; return String(s).split(/[, ]+/).map(function(x){return parseFloat(x.trim());}).filter(isFinite); }
  function atDepth(arr, d, fallback){ return arr && arr.length ? arr[Math.min(d, arr.length-1)] : fallback; }
  function defaultCols(){ var w=Math.max(window.innerWidth||0, document.documentElement.clientWidth||0); if(w<640) return 2; if(w<960) return 3; return 4; }
  function viewportWidth(){ return Math.max(window.innerWidth||0, document.documentElement.clientWidth||0); }
  
  // Collapse/Expand State Management (Per-Container using WeakMaps)
  // ----------------------------------------------------------------
  // WeakMaps prevent memory leaks: when container DOM element is removed, state is garbage collected.
  // Multiple charts on one page each maintain independent state.
  //
  // USER_COLLAPSE_MAP: Tracks nodes the user manually collapsed (overrides auto-expand)
  //   - Persists across re-renders until user expands them
  //   - Used to honor user intent when data/layout changes
  //
  // USER_EXPAND_MAP: Tracks nodes the user manually expanded (overrides auto-collapse)
  //   - When auto-collapse depth would collapse a node, this map overrides it
  //   - Cleared when layout mode changes (e.g., desktop→mobile) to respect new depth settings
  //
  // CURRENT_MODE_MAP: Tracks current layout mode (horizontal/vertical) for hybrid renderer
  //   - Used to detect mode changes (triggers USER_EXPAND clearing)
  //
  var USER_COLLAPSE_MAP = new WeakMap();  // container → Set of collapsed node IDs
  var USER_EXPAND_MAP = new WeakMap();    // container → Set of expanded node IDs
  var CURRENT_MODE_MAP = new WeakMap();   // container → 'horizontal' | 'vertical'

  // Lazy-initialize collapse state Set for a container (avoids errors on first access)
  function getUserCollapse(container){ if(!USER_COLLAPSE_MAP.has(container)) USER_COLLAPSE_MAP.set(container, new Set()); return USER_COLLAPSE_MAP.get(container); }
  function getUserExpand(container){ if(!USER_EXPAND_MAP.has(container)) USER_EXPAND_MAP.set(container, new Set()); return USER_EXPAND_MAP.get(container); }
  function getCurrentMode(container){ return CURRENT_MODE_MAP.get(container) || null; }
  function setCurrentMode(container, mode){ CURRENT_MODE_MAP.set(container, mode); }

  function readScale(el){
    // Responsive scale support: read scale based on viewport width
    var vw = viewportWidth();
    var attr;
    if (vw >= 1024) {
      attr = "data-scale-desktop";
    } else if (vw >= 768) {
      attr = "data-scale-tablet";
    } else {
      attr = "data-scale-phone";
    }

    // Try responsive attribute first, fallback to data-scale for backwards compatibility
    var v = el.getAttribute(attr) || el.getAttribute("data-scale") || (getComputedStyle(el).getPropertyValue("--oc-scale")||"").trim();
    var n = parseFloat(v);
    if (!isFinite(n) || n <= 0) n = 1;
    return clamp(n, 0.6, 1.5);
  }
  function readCenterAuto(el){ var v=el.getAttribute("data-center"); if(v==null||v==="") return true; return v!=="0" && String(v).toLowerCase()!=="false"; }
  function readGaps(el){ var raw=el.getAttribute("data-hgaps")||(getComputedStyle(el).getPropertyValue("--oc-hgaps")||"").trim(); var a=parseList(raw); return a.length?a:[LAY.hDefault]; }
  function readStubs(el, gaps){
    var raw=el.getAttribute("data-stubs")||(getComputedStyle(el).getPropertyValue("--oc-stubs")||"").trim();
    var a=parseList(raw);
    if(!a.length){
      var v=el.getAttribute("data-stub")||(getComputedStyle(el).getPropertyValue("--oc-stub")||"").trim();
      var one=parseFloat(v); a=[isFinite(one)?one:36];
    }
    return a.map(function(s,i){
      var g=atDepth(gaps,i,gaps[gaps.length-1]||LAY.hDefault);
      var maxStub=Math.max(8, Math.floor(g/2-2));
      return clamp(Math.round(s),8,maxStub);
    });
  }
  function readCardW(el){
    var v=el.getAttribute("data-cardw")||(getComputedStyle(el).getPropertyValue("--oc-card-w")||"").trim();
    var n=parseFloat(v); if(!isFinite(n)) n=276; return clamp(Math.round(n),220,420);
  }
  function readCardH(el){
    var v=el.getAttribute("data-cardh")||(getComputedStyle(el).getPropertyValue("--oc-card-h")||"").trim();
    var n=parseFloat(v); if(!isFinite(n)) return null; // null means use calculated height
    return clamp(Math.round(n), 92, 800); // Minimum 92px, maximum 800px
  }
  function readVGap(el){
    var v=el.getAttribute("data-vgap")||(getComputedStyle(el).getPropertyValue("--oc-vgap")||"").trim();
    var n=parseFloat(v); if(!isFinite(n)) n=LAY.vGap; return clamp(Math.round(n), 10, 100);
  }
  function readHGap(el){
    var v=el.getAttribute("data-hgap")||(getComputedStyle(el).getPropertyValue("--oc-hgap")||"").trim();
    var n=parseFloat(v); if(!isFinite(n)) n=LAY.hDefault; return clamp(Math.round(n), 20, 200);
  }
  function readRowSpacing(el){
    var v=el.getAttribute("data-h-row-spacing")||(getComputedStyle(el).getPropertyValue("--oc-h-row-spacing")||"").trim();
    var n=parseFloat(v); if(!isFinite(n)) n=1.5; return clamp(n, 1.0, 3.0);
  }
  function readVConnectorAlign(el){
    var v=el.getAttribute("data-v-connector-align")||(getComputedStyle(el).getPropertyValue("--oc-v-connector-align")||"").trim();
    return v==="1"||v==="true"||v==="yes";
  }
  function readCConnectorAlign(el){
    var v=el.getAttribute("data-c-connector-align")||(getComputedStyle(el).getPropertyValue("--oc-c-connector-align")||"").trim();
    return v==="1"||v==="true"||v==="yes";
  }
  function readVRootOffsetY(el){
    var v=el.getAttribute("data-v-root-offset-y")||(getComputedStyle(el).getPropertyValue("--oc-v-root-offset-y")||"").trim();
    var n=parseInt(v,10);
    return isFinite(n)?n:0;
  }
  function readHRootOffsetX(el){
    var v=el.getAttribute("data-h-root-offset-x")||(getComputedStyle(el).getPropertyValue("--oc-h-root-offset-x")||"").trim();
    var n=parseInt(v,10);
    return isFinite(n)?n:0;
  }
  
  // ---------- Styling Attribute Readers ----------
  //
  // All readers follow this pattern:
  //   1. Try to read from data attribute (e.g., data-name-font-size)
  //   2. Fall back to CSS custom property (e.g., --oc-name-font-size)
  //   3. Fall back to hard-coded default
  //   4. Validate and clamp values to safe ranges
  //
  // This dual-source approach allows configuration via:
  //   - HTML attributes (for WordPress export, admin preview)
  //   - CSS variables (for theming, external stylesheets)
  //
  // Returns: string or default value
  //
  function readStyleAttr(el, attr, defaultValue){
    var v=el.getAttribute(attr)||(getComputedStyle(el).getPropertyValue("--oc-"+attr.replace("data-","").replace(/-/g,"-"))||"").trim();
    return v || defaultValue;
  }
  function readNameFont(el){
    var family=readStyleAttr(el,"data-name-font-family","Inter, \"Segoe UI\", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif");
    var size=parseFloat(readStyleAttr(el,"data-name-font-size","17"));
    var weight=readStyleAttr(el,"data-name-font-weight","700");
    var style=readStyleAttr(el,"data-name-font-style","normal");
    if(!isFinite(size)||size<=0) size=17;
    return {family:family,size:clamp(size,10,100),weight:weight,style:style}; // Increased max from 32 to 100
  }
  function readTitleFont(el){
    var family=readStyleAttr(el,"data-title-font-family","Inter, \"Segoe UI\", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif");
    var size=parseFloat(readStyleAttr(el,"data-title-font-size","13.5"));
    var weight=readStyleAttr(el,"data-title-font-weight","500");
    var style=readStyleAttr(el,"data-title-font-style","normal");
    if(!isFinite(size)||size<=0) size=13.5;
    return {family:family,size:clamp(size,8,100),weight:weight,style:style}; // Increased max from 24 to 100
  }
  function readNameColor(el){
    return readStyleAttr(el,"data-name-color","#111827");
  }
  function readTitleColor(el){
    return readStyleAttr(el,"data-title-color","#374151");
  }
  function readCardFill(el){
    return readStyleAttr(el,"data-card-fill","#fff");
  }
  function readCardStroke(el){
    return readStyleAttr(el,"data-card-stroke","#d0d0d0");
  }
  function readCardShadow(el){
    var enabled=readStyleAttr(el,"data-card-shadow","1");
    // Return true if enabled (1, "1", "true", etc.), false otherwise
    if(enabled==="0"||enabled==="false"||enabled==="none"||enabled==="off") return false;
    return true; // Default to enabled
  }
  function readLinkColor(el){
    return readStyleAttr(el,"data-link-color","#981e32");
  }
  function readLinkWidth(el){
    var v=parseFloat(readStyleAttr(el,"data-link-width","2.5"));
    return isFinite(v)&&v>0?clamp(v,1,10):2.5;
  }
  function readSpineColor(el){
    return readStyleAttr(el,"data-spine-color","#111");
  }
  function readSpineWidth(el){
    var v=parseFloat(readStyleAttr(el,"data-spine-width","3"));
    return isFinite(v)&&v>0?clamp(v,1,10):3;
  }
  function readBtnCircleFill(el){
    return readStyleAttr(el,"data-btn-circle-fill","#fff");
  }
  function readBtnCircleStroke(el){
    return readStyleAttr(el,"data-btn-circle-stroke","#d0d0d0");
  }
  function readBtnCircleOutline(el){
    var v=readStyleAttr(el,"data-btn-circle-outline","1");
    return v!=="0"&&v!=="false"&&v!=="none"&&v!=="no";
  }
  function readBtnRectFill(el){
    return readStyleAttr(el,"data-btn-rect-fill","#374151");
  }
  function readBgColor(el){
    var v=readStyleAttr(el,"data-bg-color","");
    return v||null; // null means transparent/default
  }
  
  // ---------- Typography enhancement readers ----------
  function readNameLineHeight(el){
    var v=parseFloat(readStyleAttr(el,"data-name-line-height","1.18"));
    return isFinite(v)&&v>0?clamp(v,0.8,2.5):1.18;
  }
  function readTitleLineHeight(el){
    var v=parseFloat(readStyleAttr(el,"data-title-line-height","1.33"));
    return isFinite(v)&&v>0?clamp(v,0.8,2.5):1.33;
  }
  function readNameLetterSpacing(el){
    var v=parseFloat(readStyleAttr(el,"data-name-letter-spacing","0"));
    return isFinite(v)?clamp(v,-2,5):0;
  }
  function readTitleLetterSpacing(el){
    var v=parseFloat(readStyleAttr(el,"data-title-letter-spacing","0"));
    return isFinite(v)?clamp(v,-2,5):0;
  }
  function readTextAlign(el){
    var v=readStyleAttr(el,"data-text-align","left");
    if(v==="center"||v==="right") return v;
    return "left";
  }
  
  // ---------- Card appearance readers ----------
  function readCardPadding(el){
    var top=parseFloat(readStyleAttr(el,"data-card-padding-top","12"));
    var bottom=parseFloat(readStyleAttr(el,"data-card-padding-bottom","12"));
    var left=parseFloat(readStyleAttr(el,"data-card-padding-left","12"));
    var right=parseFloat(readStyleAttr(el,"data-card-padding-right","12"));
    return {
      t:isFinite(top)?clamp(Math.round(top),0,40):12,
      b:isFinite(bottom)?clamp(Math.round(bottom),0,40):12,
      l:isFinite(left)?clamp(Math.round(left),0,40):12,
      r:isFinite(right)?clamp(Math.round(right),0,40):12
    };
  }
  function readCardRadius(el){
    var v=parseFloat(readStyleAttr(el,"data-card-radius","10"));
    return isFinite(v)?clamp(Math.round(v),0,30):10;
  }
  function readCardStrokeWidth(el){
    var v=parseFloat(readStyleAttr(el,"data-card-stroke-width","1"));
    return isFinite(v)&&v>=0?clamp(v,0,5):1;
  }
  function readTextGap(el){
    var v=parseFloat(readStyleAttr(el,"data-text-gap","8"));
    return isFinite(v)?clamp(Math.round(v),0,30):8;
  }
  
  // ---------- Spacing readers ----------
  function readMargin(el){
    var v=parseFloat(readStyleAttr(el,"data-margin","24"));
    return isFinite(v)?clamp(Math.round(v),0,100):24;
  }
  function readSiblingGap(el){
    var v=parseFloat(readStyleAttr(el,"data-sibling-gap","26"));
    return isFinite(v)?clamp(Math.round(v),10,80):26;
  }
  
  // ---------- Button appearance readers ----------
  function readBtnRadius(el){
    var v=parseFloat(readStyleAttr(el,"data-btn-radius","14"));
    return isFinite(v)?clamp(Math.round(v),8,24):14;
  }
  function readBtnOffset(el){
    var x=parseFloat(readStyleAttr(el,"data-btn-offset-x","8"));
    var y=parseFloat(readStyleAttr(el,"data-btn-offset-y","8"));
    return {
      x:isFinite(x)?clamp(Math.round(x),4,20):8,
      y:isFinite(y)?clamp(Math.round(y),4,20):8
    };
  }
  
  // ---------- Shadow readers ----------
  function readShadowBlur(el){
    var v=parseFloat(readStyleAttr(el,"data-shadow-blur","2"));
    return isFinite(v)&&v>=0?clamp(v,0,10):2;
  }
  function readShadowOpacity(el){
    var v=parseFloat(readStyleAttr(el,"data-shadow-opacity","0.35"));
    return isFinite(v)?clamp(v,0,1):0.35;
  }
  function readShadowOffset(el){
    var x=parseFloat(readStyleAttr(el,"data-shadow-offset-x","0"));
    var y=parseFloat(readStyleAttr(el,"data-shadow-offset-y","3"));
    return {
      x:isFinite(x)?clamp(Math.round(x),-10,10):0,
      y:isFinite(y)?clamp(Math.round(y),-10,10):3
    };
  }
  function readShadowColor(el){
    var c=readStyleAttr(el,"data-shadow-color","#981e32");
    return c||"#981e32";
  }
  // Hybrid renderer attribute readers (for toggle/responsive horizontal layout)
  function readCardWHybrid(container, pref){
    var attr=pref==="h"?"data-h-cardw":"data-v-cardw";
    var v=container.getAttribute(attr)||(getComputedStyle(container).getPropertyValue("--oc-card-w")||"").trim();
    var n=parseFloat(v); if(!isFinite(n)) n=(pref==="h"?216:276); return clamp(Math.round(n),200,420);
  }
  function readGapsHybrid(container, pref){
    var attr=pref==="h"?"data-h-hgaps":"data-v-hgaps";
    var raw=container.getAttribute(attr)||(getComputedStyle(container).getPropertyValue("--oc-hgaps")||"").trim();
    var a=parseList(raw); return a.length?a:[LAY.hDefault];
  }
  function readStubsHybrid(container, pref, gaps){
    var attr=pref==="h"?"data-h-stubs":"data-v-stubs";
    var raw=container.getAttribute(attr)||(getComputedStyle(container).getPropertyValue("--oc-stubs")||"").trim();
    var a=parseList(raw); if(!a.length) a=[36];
    return a.map(function(s,i){
      var g=atDepth(gaps,i,gaps[gaps.length-1]||LAY.hDefault);
      var maxStub=Math.max(8,Math.floor(g/2-2));
      return clamp(Math.round(s),8,maxStub);
    });
  }
  function readBreakpoint(container){ var bp=parseInt(container.getAttribute("data-breakpoint")||"820",10); if(!isFinite(bp)) bp=820; return bp; }
  function pickMode(container){
    var pref=(container.getAttribute("data-mode")||"auto").toLowerCase();
    if(pref==="horizontal"||pref==="vertical") return pref;
    return (viewportWidth()<readBreakpoint(container)) ? "vertical" : "horizontal";
  }
  function readVerticalAutoDepth(container){
    var w=viewportWidth();
    var bp=readBreakpoint(container);
    var tabletBp=768; // Tablet breakpoint (between phone and desktop)
    var isPhone=w<Math.min(bp,tabletBp);
    var isTablet=w>=tabletBp && w<1024;
    var vPhone=container.getAttribute("data-v-autodepth-phone");
    var vTablet=container.getAttribute("data-v-autodepth-tablet");
    var vDesk=container.getAttribute("data-v-autodepth-desktop");
    var vSingle=container.getAttribute("data-v-autodepth");
    function asDepth(x,fb){ if(x==null||x==="") return fb; var n=parseInt(x,10); return isFinite(n)?clamp(n,1,12):fb; }
    if(isPhone && vPhone!=null) return asDepth(vPhone,1);
    if(isTablet && vTablet!=null) return asDepth(vTablet,1);
    if(!isPhone && !isTablet && vDesk!=null) return asDepth(vDesk,1);
    if(vSingle!=null) return asDepth(vSingle,1);
    return 1;
  }
  function readHorizontalAutoDepth(container){
    var v=container.getAttribute("data-h-autodepth");
    if(v==null||v==="") return null;
    var n=parseInt(v,10); return isFinite(n)?clamp(n,1,12):null;
  }
  function readCenterHybrid(container){
    var v=container.getAttribute("data-h-center") || container.getAttribute("data-center");
    if(v==null||v==="") return true;
    v=String(v).toLowerCase(); return v!=="0" && v!=="false";
  }
  function readL1Stub(el){
    var n=parseFloat(el.getAttribute("data-l1stub")); if(!isFinite(n)) n=8; return clamp(Math.round(n),0,60);
  }
  function readRootPad(el){
    var n=parseFloat(el.getAttribute("data-rootpad")); if(!isFinite(n)) n=LAY.rootPad; return clamp(Math.round(n),0,200);
  }
  function getOpenDepth(el){
    var w=viewportWidth();
    var vAny  = parseInt(el.getAttribute("data-open-depth"), 10);
    var vPhone = parseInt(el.getAttribute("data-open-depth-phone"), 10);
    var vTablet = parseInt(el.getAttribute("data-open-depth-tablet"), 10);
    var vDesk = parseInt(el.getAttribute("data-open-depth-desktop"), 10);
    var hasAny  = Number.isFinite(vAny);
    var hasPhone = Number.isFinite(vPhone);
    var hasTablet = Number.isFinite(vTablet);
    var hasDesk = Number.isFinite(vDesk);
    // Check screen size: phone < 768px, tablet 768-1023px, desktop >= 1024px
    if (w >= 1024 && hasDesk) return Math.max(0, vDesk);
    if (w >= 768 && w < 1024 && hasTablet) return Math.max(0, vTablet);
    if (w < 768 && hasPhone) return Math.max(0, vPhone);
    if (hasDesk && w >= 1024) return Math.max(0, vDesk);
    if (hasTablet && w >= 768) return Math.max(0, vTablet);
    if (hasPhone) return Math.max(0, vPhone);
    if (hasAny) return Math.max(0, vAny);
    return null;
  }

  // ---------- Text Layout & Wrapping ----------

  // Canvas-based text measurement (accurate pixel width)
  // Creates single canvas context reused across all measurements for performance
  var measure=(function(){ var c=document.createElement("canvas"); var x=c.getContext("2d"); return function(t,f){ x.font=f; return x.measureText(t||"").width; }; })();

  // Truncate text to fit maxW using binary search + ellipsis (…)
  // Algorithm: Binary search to find longest substring that fits when "…" is appended
  // Returns: truncated string with ellipsis, or original if it fits
  function trunc(t,maxW,font){ if(!t) return ""; if(measure(t,font)<=maxW) return t; var ell="…",lo=0,hi=t.length,best=ell; while(lo<=hi){ var mid=(lo+hi)>>1,s=t.slice(0,mid)+ell; if(measure(s,font)<=maxW){best=s;lo=mid+1;} else hi=mid-1; } return best; }

  // Wrap text into multiple lines using greedy word-wrapping algorithm
  //
  // Features:
  //   - Splits on semicolons first if splitSemi=true (allows forced line breaks in titles)
  //   - For each segment, uses greedy algorithm: adds words until line exceeds maxW
  //   - If single word exceeds maxW, breaks it character-by-character
  //
  // Algorithm:
  //   1. Split into segments (by semicolon if enabled, else entire text)
  //   2. For each segment, split into words on whitespace
  //   3. For each word:
  //      - Try adding to current line
  //      - If fits: add it
  //      - If doesn't fit:
  //        a) Push current line to output
  //        b) If word itself too long: break character-by-character
  //        c) Else: start new line with this word
  //   4. Push final line to output
  //
  // Returns: Array of wrapped lines (empty strings filtered out)
  //
  function wrap(raw,maxW,font,splitSemi){
    // Split on semicolons for multi-line titles (e.g., "Line 1; Line 2")
    var parts=splitSemi?(raw||"").split(";").map(function(s){return s.trim();}).filter(Boolean):[raw||""];
    var out=[]; parts.forEach(function(part){
      var words=part.split(/\s+/), line="";
      words.forEach(function(w){
        var cand=line?line+" "+w:w;  // Try adding word to current line
        if(measure(cand,font)<=maxW){ line=cand; }  // Fits: add to line
        else{
          if(line) out.push(line);  // Push completed line
          // Handle word longer than maxW: break character-by-character
          if(measure(w,font)>maxW){
            var chunk=""; for(var i=0;i<w.length;i++){ var c2=chunk+w[i]; if(measure(c2,font)<=maxW) chunk=c2; else { if(chunk) out.push(chunk); chunk=w[i]; } }
            line=chunk;
          } else line=w;  // Word fits on new line
        }
      });
      if(line) out.push(line);  // Push final line of segment
    });
    return out;
  }
  function layoutText(name,title,innerW,container){
    // Read configurable fonts
    var nameFont=container?readNameFont(container):{family:"Inter, \"Segoe UI\", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif",size:17,weight:"700",style:"normal"};
    var titleFont=container?readTitleFont(container):{family:"Inter, \"Segoe UI\", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif",size:13.5,weight:"500",style:"normal"};
    // Read line heights and text gap
    var nameLhMult=container?readNameLineHeight(container):1.18;
    var titleLhMult=container?readTitleLineHeight(container):1.33;
    var textGap=container?readTextGap(container):TEXT.gap;
    var padding=container?readCardPadding(container):CARD.pad;
    // Build font strings for measurement
    var nameFontStr=nameFont.style+" "+nameFont.weight+" "+nameFont.size+"px "+nameFont.family;
    var titleFontStr=titleFont.style+" "+titleFont.weight+" "+titleFont.size+"px "+titleFont.family;
    // Make names wrap instead of truncate
    var nameRaw=wrap((name||"").trim(), innerW, nameFontStr, false);
    var nameLines=nameRaw.slice(0, 3); // Limit names to 3 lines max (can be adjusted)
    // Remove truncation for titles - allow full wrapping up to max
    var raw=wrap((title||"").trim(), innerW, titleFontStr, TEXT.title.splitSemi);
    var titleLines=raw.slice(0, TEXT.title.max); // No truncation - just limit to max lines
    // Calculate used height based on actual wrapped lines (use configurable line heights)
    var nameLh=nameFont.size*nameLhMult;
    var titleLh=titleFont.size*titleLhMult;
    var nameHeight = nameLines.length * nameLh;
    var titleHeight = titleLines.length * titleLh;
    var used=padding.t + nameHeight + textGap + titleHeight + padding.b;
    return { nameLines:nameLines, titleLines:titleLines, usedHeight:used, nameFont:nameFont, titleFont:titleFont, nameLh:nameLh, titleLh:titleLh, padding:padding, textGap:textGap };
  }

  // ---------- data loader ----------
  function tryParse(s){ try{ return JSON.parse(s); }catch(_){ return null; } }
  function loadData(){
    var elScript = document.querySelector('script#wsu-org-data[type="application/json"]');
    if(elScript){ var p=tryParse((elScript.textContent||"").trim()); if(Array.isArray(p)) return p; }
    var el=byId("wsu-org-data");
    if(el){
      var raw=(el.tagName==="TEXTAREA") ? (el.value!=null?el.value:(el.textContent||"")) : (el.getAttribute("data-json")||el.getAttribute("data-orgjson")||el.textContent||"");
      var p2=tryParse((raw||"").trim()); if(Array.isArray(p2)) return p2;
    }
    return [];
  }

  // ---------- tree ----------
  function buildTree(arr){
    var map=new Map(); arr.forEach(function(d){ if(d && d.id){ map.set(d.id, Object.assign({children:[]}, d)); } });
    var root=null; map.forEach(function(n){ if(n.parent==null) root=root||n; else { var p=map.get(n.parent); if(p) p.children.push(n); } });
    if(root){
      (root.children||[]).forEach(function(l1){
        l1.side = (l1.side==="L"||l1.side==="R") ? l1.side : "R";
        propagateSide(l1, l1.side);
      });
    }
    function propagateSide(node, side){
      (node.children||[]).forEach(function(ch){
        if(!ch.side) ch.side = side;
        propagateSide(ch, ch.side);
      });
    }
    return root;
  }

  // ---------- measure & block height ----------
  function measureCards(n, container){
    var inner=CARD.w - CARD.pad.l - CARD.pad.r;
    n.text=layoutText(n.name,n.title,inner,container);
    // Check for uniform card height setting
    var uniformH = container ? readCardH(container) : null;
    if(uniformH != null){
      n.h = uniformH; // Use uniform height for all cards
    } else {
      n.h = Math.max(CARD.hMin, n.text.usedHeight); // Use calculated height
    }
    (n.children||[]).forEach(function(ch){ measureCards(ch, container); });
  }
  function computeBlocks(n, collapsed, vGap){
    // Accept either Set (with .has method) or function
    var isColl = (typeof collapsed === 'function') ? collapsed : function(id){ return collapsed.has(id); };
    // Use provided gap or default to LAY.vGap
    var gap = (vGap != null) ? vGap : LAY.vGap;
    if(isColl(n.id) || !n.children.length){ n.blockH=n.h; return; }
    n.children.forEach(function(ch){ computeBlocks(ch, collapsed, vGap); });
    var sum=0; n.children.forEach(function(ch,i){ sum+=ch.blockH; if(i<n.children.length-1) sum+=gap; });
    n.blockH=Math.max(n.h, sum);
  }

  // ---------- Directional Placement Algorithm (Centered & Vertical Layouts) ----------
  // Places nodes with left/right directionality from parent
  //
  // Coordinate System:
  //   - dir = -1 for left placement (nodes grow leftward from spine)
  //   - dir = +1 for right placement (nodes grow rightward from spine)
  //   - spineX: horizontal center line position (only used for depth=0 Level-1 nodes)
  //
  // Vertical Centering:
  //   - Each node is centered within its blockH (allocated vertical space)
  //   - blockH includes node height + all descendant heights + gaps
  //   - Formula: y = yTop + (blockH - nodeHeight)/2
  //
  // Horizontal Positioning:
  //   - Level-1 (depth=0): positioned relative to spine using L1 stub
  //   - Deeper levels: positioned relative to parent's edge + horizontal gap
  //
  function placeDirectional(n, x, yTop, depth, gaps, isCollFunc, dir, spineX){
    // Center node vertically within its allocated block height
    n.x=x; n.y=yTop + (n.blockH - n.h)/2; n._dir=dir;
    if(isCollFunc(n.id) || !n.children.length) return;  // Stop if node collapsed or leaf

    var gap=atDepth(gaps, depth, gaps[gaps.length-1]||LAY.hDefault);
    var total=0; n.children.forEach(function(ch,i){ total+=ch.blockH; if(i<n.children.length-1) total+=LAY.vGap; });
    var y=yTop + (n.blockH - total)/2;

    var xChild;
    if (depth===0 && spineX!=null){
      xChild = (dir>0) ? (spineX + gap) : (spineX - gap - CARD.w);
    } else {
      xChild = x + dir*(CARD.w + gap);
    }

    n.children.forEach(function(ch,i){
        placeDirectional(ch, xChild, y, depth+1, gaps, isCollFunc, dir, spineX);
      y += ch.blockH + (i<n.children.length-1?LAY.vGap:0);
    });
  }

  // ---------- draw text/card ----------
  function drawText(g, txt, x0, y0, cardH, container){
    var padding=txt.padding || CARD.pad;
    var textGap=txt.textGap || TEXT.gap;
    var x=x0+padding.l, y=y0+padding.t;
    // Read configurable colors, fonts, and typography settings
    var nameColor=container?readNameColor(container):"#111827";
    var titleColor=container?readTitleColor(container):"#374151";
    var nameFont=container?readNameFont(container):{family:"Inter, \"Segoe UI\", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif",size:17,weight:"700",style:"normal"};
    var titleFont=container?readTitleFont(container):{family:"Inter, \"Segoe UI\", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif",size:13.5,weight:"500",style:"normal"};
    var nameLetterSpacing=container?readNameLetterSpacing(container):0;
    var titleLetterSpacing=container?readTitleLetterSpacing(container):0;
    var textAlign=container?readTextAlign(container):"left";
    // Use calculated line heights from text object, or calculate from font size
    var nameLh=txt.nameLh || (nameFont.size*1.18);
    var titleLh=txt.titleLh || (titleFont.size*1.33);
    // Draw name lines (wrapped names)
    if(txt.nameLines && txt.nameLines.length){
      txt.nameLines.forEach(function(line){
        // Don't use class to avoid CSS override - use inline styles only
        var name=mk("text",{x:x,y:y+nameLh}); 
        name.setAttribute("style", "fill: " + nameColor + "; font-family: " + nameFont.family + "; font-size: " + String(nameFont.size) + "px; font-weight: " + nameFont.weight + "; font-style: " + nameFont.style + "; letter-spacing: " + nameLetterSpacing + "px;");
        if(textAlign!=="left") name.setAttribute("text-anchor", textAlign==="center"?"middle":"end");
        if(textAlign==="center") name.setAttribute("x", x0+CARD.w/2);
        if(textAlign==="right") name.setAttribute("x", x0+CARD.w-padding.r);
        name.textContent=line || ""; 
        g.appendChild(name);
        y += nameLh;
      });
    }
    y += textGap;
    // Draw title lines
    if(txt.titleLines && txt.titleLines.length){
    txt.titleLines.forEach(function(line){
        // Don't use class to avoid CSS override - use inline styles only
        var t=mk("text",{x:x,y:y+titleLh}); 
        t.setAttribute("style", "fill: " + titleColor + "; font-family: " + titleFont.family + "; font-size: " + String(titleFont.size) + "px; font-weight: " + titleFont.weight + "; font-style: " + titleFont.style + "; letter-spacing: " + titleLetterSpacing + "px;");
        if(textAlign!=="left") t.setAttribute("text-anchor", textAlign==="center"?"middle":"end");
        if(textAlign==="center") t.setAttribute("x", x0+CARD.w/2);
        if(textAlign==="right") t.setAttribute("x", x0+CARD.w-padding.r);
        t.textContent=line || ""; 
        g.appendChild(t); 
        y+=titleLh;
      });
    }
  }
  function drawCard(g, n, container){
    // Read configurable card colors and appearance
    var cardFill=container?readCardFill(container):"#fff";
    var cardStroke=container?readCardStroke(container):"#d0d0d0";
    var cardRadius=container?readCardRadius(container):CARD.r;
    var cardStrokeWidth=container?readCardStrokeWidth(container):1;
    var cardShadow=container?readCardShadow(container):null;
    // Create clip path for this card to prevent text overflow
    var clipId = "clip-card-" + (n.id || Math.random().toString(36).slice(2,9));
    var svg = g.parentElement || g.ownerSVGElement;
    if(!svg) svg = g.closest("svg");
    if(svg){
      var defs = svg.querySelector("defs");
      if(!defs){
        defs = mk("defs",{});
        svg.insertBefore(defs, svg.firstChild);
      }
      // Check if clip path already exists
      if(!svg.querySelector("#" + clipId)){
        var clipPath = mk("clipPath",{id:clipId});
        clipPath.appendChild(mk("rect",{x:n.x,y:n.y,width:CARD.w,height:n.h,rx:cardRadius,ry:cardRadius}));
        defs.appendChild(clipPath);
      }
    }
    
    var rect=mk("rect",{ x:n.x, y:n.y, width:CARD.w, height:n.h, rx:cardRadius, ry:cardRadius, class:"oc-card-rect" });
    // Use inline style to override CSS (CSS has higher specificity than SVG attributes)
    var rectStyle = "fill: " + cardFill + "; stroke: " + cardStroke + "; stroke-width: " + String(cardStrokeWidth) + ";";
    // Add filter to inline style (CSS filter property overrides SVG filter attribute)
    if(cardShadow) {
      rectStyle += " filter: url(#ocShadow);";
    }
    rect.setAttribute("style", rectStyle);
    if(n.id) rect.setAttribute("data-node-id", n.id);
    g.appendChild(rect);
    
    // Create a group for text with clipping
    var textGroup = mk("g",{});
    if(svg) textGroup.setAttribute("clip-path", "url(#" + clipId + ")");
    drawText(textGroup, n.text, n.x, n.y, n.h, container);
    g.appendChild(textGroup);
  }

  var currentCols=defaultCols();

  // ---------- Helper functions for drawing with configurable styles ----------
  function drawLink(gL, d, container){
    var linkColor=container?readLinkColor(container):"#981e32";
    var linkWidth=container?readLinkWidth(container):2.5;
    gL.appendChild(mk("path",{ d:d, stroke:linkColor, "stroke-width":String(linkWidth), "stroke-linecap":"round", "stroke-linejoin":"round", fill:"none", class:"oc-link" }));
  }
  function drawSpine(gL, d, container){
    var spineColor=container?readSpineColor(container):"#111";
    var spineWidth=container?readSpineWidth(container):3;
    gL.appendChild(mk("path",{ d:d, stroke:spineColor, "stroke-width":String(spineWidth), "stroke-linecap":"round", "stroke-linejoin":"round", fill:"none" }));
  }
  function drawButton(gB, cx, cy, r, isCollapsed, container){
    var btnCircleFill=container?readBtnCircleFill(container):"#fff";
    var btnCircleStroke=container?readBtnCircleStroke(container):"#d0d0d0";
    var btnCircleOutline=container?readBtnCircleOutline(container):true;
    var btnRectFill=container?readBtnRectFill(container):"#374151";
    var btn=mk("g",{ class:"oc-btn", role:"button", tabindex:"0", "aria-label":(isCollapsed?"Expand":"Collapse") });
    // Don't use class on circle/rect to avoid CSS override - use inline styles only
    var circle=mk("circle",{ cx:cx, cy:cy, r:r });
    var circleStyle = "fill: " + btnCircleFill + ";";
    if(btnCircleOutline) {
      circleStyle += " stroke: " + btnCircleStroke + "; stroke-width: 1.5;";
    }
    circle.setAttribute("style", circleStyle);
    btn.appendChild(circle);
    // Scale rect sizes based on button radius (default r=14, default rect width=12)
    var scale = r / 14;
    var rectW = 12 * scale;
    var rectH = 3 * scale;
    var rect=mk("rect",{ x:cx-rectW/2, y:cy-rectH/2, width:rectW, height:rectH, rx:rectH/2, ry:rectH/2 });
    rect.setAttribute("style", "fill: " + btnRectFill + ";");
    btn.appendChild(rect);
    if(isCollapsed) {
      var rect2=mk("rect",{ x:cx-rectH/2, y:cy-rectW/2, width:rectH, height:rectW, rx:rectH/2, ry:rectH/2 });
      rect2.setAttribute("style", "fill: " + btnRectFill + ";");
      btn.appendChild(rect2);
    }
    return btn;
  }

  // ---------- CENTER renderer ----------
  function renderCenter(root, container, autoCollapse){
    // Use persistent collapse state
    var collapsed = getUserCollapse(container);
    var autoCollapsed = new Set();
    CARD.w=readCardW(container);
    CARD.pad=readCardPadding(container);
    CARD.r=readCardRadius(container);
    LAY.margin=readMargin(container);
    LAY.vGap=readVGap(container);
    LAY.sGap=readSiblingGap(container);
    var gaps=readGaps(container);
    var stubs=readStubs(container, gaps);
    var l1Stub=readL1Stub(container);
    var rootPad=readRootPad(container);
    var scale=readScale(container), centerAuto=readCenterAuto(container);

    measureCards(root, container);

    // Split L1 by side
    var L1=(root.children||[]);
    var leftKids = L1.filter(function(n){ return n.side==="L"; });
    var rightKids= L1.filter(function(n){ return n.side!=="L"; });

    var rootL=Object.assign({}, root, { children:leftKids });
    var rootR=Object.assign({}, root, { children:rightKids });

    [rootL,rootR].forEach(function(r){ computeBlocks(r, autoCollapsed); });

    // --- ONLY change: honor open depth on desktop if provided ---
    var openDepth = getOpenDepth(container);
    var currentColsFallback = defaultCols();
    var collapseAt = (openDepth != null) ? (openDepth + 1) : (currentColsFallback - 1);

    if(autoCollapse){
      [rootL,rootR].forEach(function(r){
        (function mark(n,d){
          if(d >= collapseAt && n.children && n.children.length) {
            autoCollapsed.add(n.id);
          }
          (n.children||[]).forEach(function(c){ mark(c, d+1); });
        })(r,0);
      });
    }

    // Combine auto-collapsed with user-collapsed
    var isCollFunc = function(id){ return collapsed.has(id) || (autoCollapsed.has(id) && !getUserExpand(container).has(id)); };
    [rootL,rootR].forEach(function(r){ computeBlocks(r, isCollFunc); });

    // Geometry
    var Xc = LAY.margin + CARD.w;         // spine x
    var yRoot = LAY.margin;               // Tammy top
    var yAfterRoot = yRoot + root.h + rootPad;

    // Place halves (depth-0 uses "spine → edge")
    placeDirectional(rootR, Xc,            yAfterRoot, 0, gaps, isCollFunc, +1, Xc);
    placeDirectional(rootL, Xc - CARD.w,   yAfterRoot, 0, gaps, isCollFunc, -1, Xc);

    // Extents / shift
    var minX=Infinity, maxX=-Infinity, maxY=yRoot + root.h;
    function walk(n){
      minX=Math.min(minX, n.x); maxX=Math.max(maxX, n.x+CARD.w); maxY=Math.max(maxY, n.y+n.h);
      if(!isCollFunc(n.id)) (n.children||[]).forEach(walk);
    }
    walk(rootL); walk(rootR);

    var shift=0;
    if(minX < LAY.margin) shift = (LAY.margin - minX);
    if(shift){
      (function shiftAll(n){ n.x+=shift; if(!isCollFunc(n.id)) (n.children||[]).forEach(shiftAll); })(rootL);
      (function shiftAll2(n){ n.x+=shift; if(!isCollFunc(n.id)) (n.children||[]).forEach(shiftAll2); })(rootR);
      Xc += shift; maxX += shift;
    }

    var W=Math.ceil(maxX + LAY.margin);
    var H=Math.max(Math.ceil(maxY + LAY.margin), 320);

    // ---- render ----
    container.innerHTML="";
    var sc=document.createElement("div"); sc.className="oc-scroll"; container.appendChild(sc);

    var svg=mk("svg",{ viewBox:"0 0 "+W+" "+H, width:String(Math.round(W*scale)), height:String(Math.round(H*scale)), role:"img","aria-label":"Organizational chart",preserveAspectRatio:"xMinYMin meet" });
    
    // Create SVG drop shadow filter for cards (if enabled)
    // This constructs a colored, customizable shadow using SVG filter primitives.
    // Shadow is applied via inline style filter:url(#ocShadow) on card rectangles.
    var cardShadow=container?readCardShadow(container):null;
    if(cardShadow){
      var shadowBlur=readShadowBlur(container);
      var shadowOpacity=readShadowOpacity(container);
      var shadowOffset=readShadowOffset(container);
      var shadowColor=readShadowColor(container);
      var defs=mk("defs",{});
      // Filter bounding box extended to 160% to prevent shadow clipping
      var f=mk("filter",{id:"ocShadow",x:"-30%",y:"-30%",width:"160%",height:"160%",filterUnits:"userSpaceOnUse","color-interpolation-filters":"sRGB"});
      // Step 1: Blur the card's alpha channel to create soft shadow base
      f.appendChild(mk("feGaussianBlur",{"in":"SourceAlpha",stdDeviation:String(shadowBlur),result:"b1"}));
      // Step 2: Create a flood of the shadow color
      f.appendChild(mk("feFlood",{"flood-color":shadowColor,result:"c1"}));
      // Step 3: Composite the color onto the blurred alpha (masks color to blur shape)
      f.appendChild(mk("feComposite",{"in":"c1","in2":"b1",operator:"in",result:"c2"}));
      // Step 4: Offset the colored shadow by user-defined x,y coordinates
      f.appendChild(mk("feOffset",{"in":"c2",dx:String(shadowOffset.x),dy:String(shadowOffset.y),result:"o1"}));
      // Step 5: Apply opacity using feComponentTransfer (slope controls alpha channel)
      // Note: feMergeNode doesn't support opacity attribute, so we use feComponentTransfer instead
      var ct=mk("feComponentTransfer",{"in":"o1",result:"o2"});
      ct.appendChild(mk("feFuncA",{type:"linear",slope:String(shadowOpacity)}));
      f.appendChild(ct);
      // Step 6: Merge shadow (o2) underneath original graphic (SourceGraphic)
      var m=mk("feMerge",{});
      m.appendChild(mk("feMergeNode",{"in":"o2"}));  // Shadow layer (bottom)
      m.appendChild(mk("feMergeNode",{"in":"SourceGraphic"}));  // Card layer (top)
      f.appendChild(m); defs.appendChild(f); svg.appendChild(defs);
    }
    
    var gL=mk("g",{class:"oc-links"}), gN=mk("g",{class:"oc-nodes"}), gB=mk("g",{class:"oc-buttons"});
    svg.appendChild(gL); svg.appendChild(gN); svg.appendChild(gB);

    // Tammy (single, centered)
    var tammyCard = { x: Xc - CARD.w/2, y: yRoot, h: root.h, text: root.text };
    drawCard(gN, tammyCard, container);

    // Spine from Tammy's bottom downward (once)
    var midsL1 = L1.length ? L1.map(function(ch){ return ch.y + ch.h/2; }) : [yAfterRoot];
    var yBandBot = Math.max.apply(Math, midsL1);
    var spineTop = yRoot + root.h;
    var spineBot = Math.max(spineTop, yBandBot);
    drawSpine(gL, "M"+Xc+" "+spineTop+" V"+spineBot, container);

    // L1 connectors (direct from spine with short shoulder near card)
    var connectorAlign = readCConnectorAlign(container);
    function drawL1SideDirect(kids, dir){
      kids.forEach(function(ch){
        var yC = ch.y + ch.h/2;
        var xEdge = (dir>0) ? ch.x : (ch.x + CARD.w);
        
        // Calculate aligned position if connector alignment is enabled
        var xAligned = xEdge;
        if(connectorAlign && ch.children && ch.children.length && !isCollFunc(ch.id)){
          var STUB_L2 = atDepth(stubs, 1, stubs[stubs.length-1]);
          var xChildEdge = (dir>0) ? (ch.x + CARD.w) : ch.x;
          xAligned = xChildEdge + dir*STUB_L2;
        }
        
        if (l1Stub>0){
          var xPre = xEdge - dir*l1Stub;
          drawLink(gL, "M"+Xc+" "+yC+" H"+xPre, container);
          drawLink(gL, "M"+xPre+" "+yC+" H"+xAligned, container);
        } else {
          drawLink(gL, "M"+Xc+" "+yC+" H"+xAligned, container);
        }
      });
    }
    drawL1SideDirect(leftKids,  -1);
    drawL1SideDirect(rightKids, +1);

    // Deeper levels (bus style, starting at depth=1)
    function drawLinks(n, depth){
      if(!isCollFunc(n.id) && n.children.length){
        var dir = n._dir || (n.side==="L" ? -1 : +1);
        var STUB = atDepth(stubs, depth, stubs[stubs.length-1]);
        var yM    = n.y + n.h/2;
        var xEdge = (dir>0) ? (n.x + CARD.w) : n.x;
        var xBus  = xEdge + dir*STUB;

        drawLink(gL, "M"+xEdge+" "+yM+" H"+xBus, container);

        var mids = n.children.map(function(ch){ return ch.y + ch.h/2; });
        var yTopBus = Math.min.apply(Math,mids), yBotBus = Math.max.apply(Math,mids);
        drawLink(gL, "M"+xBus+" "+yTopBus+" V"+yBotBus, container);

        n.children.forEach(function(ch){
          var yC=ch.y + ch.h/2;
          var xBefore=(dir>0) ? (ch.x - STUB) : (ch.x + CARD.w + STUB);
          var xChildEdge=(dir>0) ? ch.x : (ch.x + CARD.w);
          drawLink(gL, "M"+xBus+" "+yC+" H"+xBefore, container);
          drawLink(gL, "M"+xBefore+" "+yC+" H"+xChildEdge, container);
        });
      }
      (n.children||[]).forEach(function(c){ drawLinks(c, depth+1); });
    }
    leftKids.forEach(function(k){ drawLinks(k, 1); });
    rightKids.forEach(function(k){ drawLinks(k, 1); });

    // Deeper levels (bus style, starting at depth=1)
    function drawNodes(n){
      drawCard(gN, n, container);
      if(n.children && n.children.length){
        var r=readBtnRadius(container), btnOffset=readBtnOffset(container);
        var cx=n.x + CARD.w - r - btnOffset.x, cy=n.y + r + btnOffset.y;
        var btn=drawButton(gB, cx, cy, r, isCollFunc(n.id), container);
        function toggle(e){
          e.preventDefault();
          e.stopPropagation();
          if(isCollFunc(n.id)) {
            collapsed.delete(n.id);
            getUserExpand(container).add(n.id);
          } else {
            collapsed.add(n.id);
            getUserExpand(container).delete(n.id);
          }
          renderCenter(root, container, false);
        }
        btn.addEventListener("click", toggle);
        btn.addEventListener("keydown", function(e){ if(e.key==="Enter"||e.key===" ") toggle(e); });
        gB.appendChild(btn);
      }
      if(!isCollFunc(n.id)) n.children.forEach(drawNodes);
    }
    leftKids.forEach(drawNodes);
    rightKids.forEach(drawNodes);

    sc.appendChild(svg);

    if(centerAuto){
      var totalW=W*scale, viewW=sc.clientWidth || container.clientWidth || totalW;
      if(totalW>0 && viewW>0) sc.scrollLeft=Math.max(0, Math.round((totalW-viewW)/2));
    }
    
    // Add PDF button after rendering
    addPDFButton(container);
  }

  // ---------- VERTICAL renderer (root on left, flow right) ----------
  function renderVertical(root, container){
    var scale=readScale(container);
    CARD.w=readCardW(container);
    CARD.pad=readCardPadding(container);
    CARD.r=readCardRadius(container);
    LAY.margin=readMargin(container);
    LAY.sGap=readSiblingGap(container);
    // Read gap values from container
    var vGap = readVGap(container);  // Vertical gap between levels
    var hGap = readHGap(container);  // Horizontal gap between levels
    LAY.vGap=vGap;
    var collapsed = getUserCollapse(container);
    var autoCollapsed = new Set();
    var targetDepth = readVerticalAutoDepth(container);
    if(targetDepth != null){
      (function mark(n,d){
        if(d >= targetDepth && n.children && n.children.length) autoCollapsed.add(n.id);
        (n.children||[]).forEach(function(c){ mark(c, d+1); });
      })(root, 0);
    }
    
    measureCards(root, container); computeBlocks(root, autoCollapsed, vGap);
    
    // Combine auto-collapsed with user-collapsed
    var isCollFunc = function(id){ return collapsed.has(id) || (autoCollapsed.has(id) && !getUserExpand(container).has(id)); };
    computeBlocks(root, isCollFunc, vGap);

    // place left → right
    (function placeLR(n,x,yTop){
      n.x=x; n.y=yTop + (n.blockH - n.h)/2;
      if(isCollFunc(n.id) || !n.children.length) return;
      var total = n.children.map(function(ch){ return ch.blockH; }).reduce(function(a,b){return a+b;},0)
                + (n.children.length-1)*vGap;
      var y=yTop + (n.blockH - total)/2;
      var nextX = x + CARD.w + hGap;
      n.children.forEach(function(ch,i){
        placeLR(ch,nextX,y); y += ch.blockH + (i<n.children.length-1?vGap:0);
      });
    })(root, LAY.margin, LAY.margin);

    // Apply manual root offset
    var rootOffsetY = readVRootOffsetY(container);
    if(rootOffsetY !== 0){
      root.y += rootOffsetY;
    }

    // extents
    var maxX=0, maxY=0;
    (function walk(n){ maxX=Math.max(maxX, n.x+CARD.w); maxY=Math.max(maxY, n.y+n.h); if(!isCollFunc(n.id)) (n.children||[]).forEach(walk); })(root);

    var W=Math.ceil(maxX+LAY.margin), H=Math.ceil(maxY+LAY.margin);

    container.innerHTML="";
    var sc=document.createElement("div"); sc.className="oc-scroll"; container.appendChild(sc);
    var svg=mk("svg",{ viewBox:"0 0 "+W+" "+H, width:String(Math.round(W*scale)), height:String(Math.round(H*scale)), role:"img","aria-label":"Organizational chart",preserveAspectRatio:"xMinYMin meet" });
    
    // Create SVG drop shadow filter for cards (if enabled)
    // This constructs a colored, customizable shadow using SVG filter primitives.
    // Shadow is applied via inline style filter:url(#ocShadow) on card rectangles.
    var cardShadow=container?readCardShadow(container):true;
    if(cardShadow){
      var shadowBlur=readShadowBlur(container);
      var shadowOpacity=readShadowOpacity(container);
      var shadowOffset=readShadowOffset(container);
      var shadowColor=readShadowColor(container);
      var defs=mk("defs",{});
      // Filter bounding box extended to 160% to prevent shadow clipping
      var f=mk("filter",{id:"ocShadow",x:"-30%",y:"-30%",width:"160%",height:"160%",filterUnits:"userSpaceOnUse","color-interpolation-filters":"sRGB"});
      // Step 1: Blur the card's alpha channel to create soft shadow base
      f.appendChild(mk("feGaussianBlur",{"in":"SourceAlpha",stdDeviation:String(shadowBlur),result:"b1"}));
      // Step 2: Create a flood of the shadow color
      f.appendChild(mk("feFlood",{"flood-color":shadowColor,result:"c1"}));
      // Step 3: Composite the color onto the blurred alpha (masks color to blur shape)
      f.appendChild(mk("feComposite",{"in":"c1","in2":"b1",operator:"in",result:"c2"}));
      // Step 4: Offset the colored shadow by user-defined x,y coordinates
      f.appendChild(mk("feOffset",{"in":"c2",dx:String(shadowOffset.x),dy:String(shadowOffset.y),result:"o1"}));
      // Step 5: Apply opacity using feComponentTransfer (slope controls alpha channel)
      // Note: feMergeNode doesn't support opacity attribute, so we use feComponentTransfer instead
      var ct=mk("feComponentTransfer",{"in":"o1",result:"o2"});
      ct.appendChild(mk("feFuncA",{type:"linear",slope:String(shadowOpacity)}));
      f.appendChild(ct);
      // Step 6: Merge shadow (o2) underneath original graphic (SourceGraphic)
      var m=mk("feMerge",{});
      m.appendChild(mk("feMergeNode",{"in":"o2"}));  // Shadow layer (bottom)
      m.appendChild(mk("feMergeNode",{"in":"SourceGraphic"}));  // Card layer (top)
      f.appendChild(m); defs.appendChild(f); svg.appendChild(defs);
    }
    
    var gL=mk("g",{class:"oc-links"}), gN=mk("g",{class:"oc-nodes"}), gB=mk("g",{class:"oc-buttons"});
    svg.appendChild(gL); svg.appendChild(gN); svg.appendChild(gB);

    // connectors: bus style
    var connectorAlign = readVConnectorAlign(container);
    var STUB = 18;
    
    // Calculate children's bus position if connector alignment is enabled for root
    var rootChildrenBusX = null;
    if(connectorAlign && root.children && root.children.length > 0 && !isCollFunc(root.id)){
      // Calculate the bus position for root's children
      // Children are at: root.x + CARD.w + hGap
      // Children's bus is at: (root.x + CARD.w + hGap) + CARD.w + STUB = root.x + 2*CARD.w + hGap + STUB
      rootChildrenBusX = root.x + 2*CARD.w + hGap + STUB;
    }
    
    (function link(n, parentBusX){
      if(isCollFunc(n.id) || !n.children.length) return;
      var xEdge = n.x + CARD.w;
      var yM = n.y + n.h/2;

      // For root node with connector alignment, use children's bus position
      var xBus;
      if(connectorAlign && n === root && rootChildrenBusX != null){
        xBus = rootChildrenBusX;
      } else {
        xBus = xEdge + STUB;
      }
      
      drawLink(gL, "M"+xEdge+" "+yM+" H"+xBus, container);

      var mids = n.children.map(function(ch){ return ch.y + ch.h/2; });
      var yTopBus = Math.min.apply(Math,mids), yBotBus = Math.max.apply(Math,mids);
      drawLink(gL, "M"+xBus+" "+yTopBus+" V"+yBotBus, container);

      n.children.forEach(function(ch){
        var yC = ch.y + ch.h/2;
        var xBefore = ch.x - STUB;
        drawLink(gL, "M"+xBus+" "+yC+" H"+xBefore, container);
        drawLink(gL, "M"+xBefore+" "+yC+" H"+ch.x, container);
        link(ch, xBus);
      });
    })(root, null);

    // nodes + buttons
    (function drawNodes(n){
      drawCard(gN, n, container);
      if(n.children && n.children.length){
        var r=readBtnRadius(container), btnOffset=readBtnOffset(container);
        var cx=n.x + CARD.w - r - btnOffset.x, cy=n.y + r + btnOffset.y;
        var btn=drawButton(gB, cx, cy, r, isCollFunc(n.id), container);
        function toggle(e){ 
          e.preventDefault(); 
          e.stopPropagation(); 
          if(isCollFunc(n.id)) {
            collapsed.delete(n.id);
            getUserExpand(container).add(n.id);
          } else {
            collapsed.add(n.id);
            getUserExpand(container).delete(n.id);
          }
          renderVertical(root, container); 
        }
        btn.addEventListener("click", toggle);
        btn.addEventListener("keydown", function(e){ if(e.key==="Enter"||e.key===" ") toggle(e); });
        gB.appendChild(btn);
      }
      if(!isCollFunc(n.id)) n.children.forEach(drawNodes);
    })(root);

    sc.appendChild(svg);
    
    // Add PDF button after rendering
    addPDFButton(container);
  }

  // ---------- HORIZONTAL renderer (root on top, flow down) ----------
  // Web-friendly top-to-bottom layout with column wrapping
  function renderHorizontal(root, container, autoCollapse){
    var scale=readScale(container);
    CARD.w=readCardW(container);
    CARD.pad=readCardPadding(container);
    CARD.r=readCardRadius(container);
    LAY.margin=readMargin(container);
    LAY.vGap=readVGap(container);
    LAY.sGap=readSiblingGap(container);
    // Use persistent collapse state
    var collapsed = getUserCollapse(container);
    var autoCollapsed = new Set();
    measureCards(root, container); computeBlocks(root, autoCollapsed);

    // Auto-collapse for responsiveness
    var currentCols=defaultCols();
    var openDepth = getOpenDepth(container);
    var collapseAt = (openDepth != null) ? (openDepth + 1) : (currentCols - 1);
    
    if(autoCollapse){
      (function mark(n,d){
        if(d >= collapseAt && n.children && n.children.length) autoCollapsed.add(n.id);
        (n.children||[]).forEach(function(c){ mark(c, d+1); });
      })(root,0);
    }
    
    // Combine auto-collapsed with user-collapsed
    var isCollFunc = function(id){ return collapsed.has(id) || (autoCollapsed.has(id) && !getUserExpand(container).has(id)); };
    // Read gap values from container
    var vGap = readVGap(container);
    var hGap = readHGap(container);
    var rowSpacing = readRowSpacing(container);
    computeBlocks(root, isCollFunc, vGap);

    // Get max columns per level from attribute or calculate from viewport
    var maxColsPerLevel = parseInt(container.getAttribute("data-h-max-cols") || "0", 10);
    if(maxColsPerLevel <= 0){
      var viewportW = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
      maxColsPerLevel = Math.max(2, Math.min(6, Math.floor((viewportW - 100) / (CARD.w + hGap))));
    }

    // Simple ITS-style: Each parent's children in horizontal row below parent
    var viewportW = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
    var rootX = Math.max(LAY.margin, (viewportW - CARD.w) / 2);
    
    // Place nodes: children horizontally below parent
    (function placeTB(n, x, y){
      n.x = x;
      n.y = y;
      
      if(isCollFunc(n.id) || !n.children || n.children.length === 0) return;
      
      // Children positioned in horizontal row below parent
      var numChildren = n.children.length;
      var rowWidth = numChildren * CARD.w + (numChildren - 1) * hGap;
      var startX = x + (CARD.w - rowWidth) / 2;
      var childY = y + n.h + vGap;
      
      // Position each child
      n.children.forEach(function(ch, idx){
        var childX = startX + idx * (CARD.w + hGap);
        placeTB(ch, childX, childY);
      });
    })(root, rootX, LAY.margin);

    // Apply manual root offset
    var rootOffsetX = readHRootOffsetX(container);
    if(rootOffsetX !== 0){
      (function shiftX(n, dx){
        n.x += dx;
        (n.children||[]).forEach(function(ch){ shiftX(ch, dx); });
      })(root, rootOffsetX);
    }

    // Calculate extents
    var maxX=0, maxY=0;
    (function walk(n){ 
      maxX=Math.max(maxX, n.x + CARD.w);
      maxY=Math.max(maxY, n.y + n.h);
      if(!isCollFunc(n.id)) (n.children||[]).forEach(walk); 
    })(root);

    var W=Math.ceil(maxX+LAY.margin), H=Math.ceil(maxY+LAY.margin);

    container.innerHTML="";
    var sc=document.createElement("div"); sc.className="oc-scroll"; container.appendChild(sc);
    var svgHeight = Math.round(H*scale);
    var svgWidth = Math.round(W*scale);
    var svg=mk("svg",{ viewBox:"0 0 "+W+" "+H, width:String(svgWidth), height:String(svgHeight), role:"img","aria-label":"Organizational chart",preserveAspectRatio:"xMinYMin meet" });
    
    // Create SVG drop shadow filter for cards (if enabled)
    // This constructs a colored, customizable shadow using SVG filter primitives.
    // Shadow is applied via inline style filter:url(#ocShadow) on card rectangles.
    var cardShadow=container?readCardShadow(container):true;
    if(cardShadow){
      var shadowBlur=readShadowBlur(container);
      var shadowOpacity=readShadowOpacity(container);
      var shadowOffset=readShadowOffset(container);
      var shadowColor=readShadowColor(container);
      var defs=mk("defs",{});
      // Filter bounding box extended to 160% to prevent shadow clipping
      var f=mk("filter",{id:"ocShadow",x:"-30%",y:"-30%",width:"160%",height:"160%",filterUnits:"userSpaceOnUse","color-interpolation-filters":"sRGB"});
      // Step 1: Blur the card's alpha channel to create soft shadow base
      f.appendChild(mk("feGaussianBlur",{"in":"SourceAlpha",stdDeviation:String(shadowBlur),result:"b1"}));
      // Step 2: Create a flood of the shadow color
      f.appendChild(mk("feFlood",{"flood-color":shadowColor,result:"c1"}));
      // Step 3: Composite the color onto the blurred alpha (masks color to blur shape)
      f.appendChild(mk("feComposite",{"in":"c1","in2":"b1",operator:"in",result:"c2"}));
      // Step 4: Offset the colored shadow by user-defined x,y coordinates
      f.appendChild(mk("feOffset",{"in":"c2",dx:String(shadowOffset.x),dy:String(shadowOffset.y),result:"o1"}));
      // Step 5: Apply opacity using feComponentTransfer (slope controls alpha channel)
      // Note: feMergeNode doesn't support opacity attribute, so we use feComponentTransfer instead
      var ct=mk("feComponentTransfer",{"in":"o1",result:"o2"});
      ct.appendChild(mk("feFuncA",{type:"linear",slope:String(shadowOpacity)}));
      f.appendChild(ct);
      // Step 6: Merge shadow (o2) underneath original graphic (SourceGraphic)
      var m=mk("feMerge",{});
      m.appendChild(mk("feMergeNode",{"in":"o2"}));  // Shadow layer (bottom)
      m.appendChild(mk("feMergeNode",{"in":"SourceGraphic"}));  // Card layer (top)
      f.appendChild(m); defs.appendChild(f); svg.appendChild(defs);
    }
    
    var gL=mk("g",{class:"oc-links"}), gN=mk("g",{class:"oc-nodes"});
    svg.appendChild(gL); svg.appendChild(gN);

    // Connectors: Bus connector for each parent's horizontal row of children
    (function link(n){
      if(isCollFunc(n.id) || !n.children.length) return;
      
      var parentY = n.y + n.h;
      var parentX = n.x + CARD.w / 2;
      
      // Get child positions
      var childY = n.children[0].y;
      var busY = parentY + (childY - parentY) * 0.4;
      
      // Vertical stub from parent down to bus
      drawLink(gL, "M" + parentX + " " + parentY + " V" + busY, container);
      
      if(n.children.length === 1){
        // Single child: direct connection
        var childX = n.children[0].x + CARD.w / 2;
        if(Math.abs(parentX - childX) > 1){
          drawLink(gL, "M" + parentX + " " + busY + " H" + childX, container);
        }
        drawLink(gL, "M" + childX + " " + busY + " V" + childY, container);
        link(n.children[0]);
        
      } else {
        // Multiple children: horizontal bus
        var childXs = n.children.map(function(ch){ return ch.x + CARD.w / 2; });
        var minX = Math.min.apply(Math, childXs);
        var maxX = Math.max.apply(Math, childXs);
        
        drawLink(gL, "M" + minX + " " + busY + " H" + maxX, container);
        
        // Connect parent to bus if outside children span
        if(parentX < minX || parentX > maxX){
          var connectX = parentX < minX ? minX : maxX;
          drawLink(gL, "M" + parentX + " " + busY + " H" + connectX, container);
        }
        
        // Vertical lines from bus to each child
        n.children.forEach(function(ch){
          var childX = ch.x + CARD.w / 2;
          drawLink(gL, "M" + childX + " " + busY + " V" + childY, container);
          link(ch);
        });
      }
    })(root);

    // nodes + buttons
    var gB=mk("g",{class:"oc-buttons"});
    svg.appendChild(gB);
    (function drawNodes(n){
      drawCard(gN, n, container);
      if(n.children && n.children.length){
        var r=readBtnRadius(container), btnOffset=readBtnOffset(container);
        var cx=n.x + CARD.w - r - btnOffset.x, cy=n.y + r + btnOffset.y;
        var btn=drawButton(gB, cx, cy, r, isCollFunc(n.id), container);
        function toggle(e){ 
          e.preventDefault(); 
          e.stopPropagation(); 
          if(isCollFunc(n.id)) {
            collapsed.delete(n.id);
            getUserExpand(container).add(n.id);
          } else {
            collapsed.add(n.id);
            getUserExpand(container).delete(n.id);
          }
          renderHorizontal(root, container, false); 
        }
        btn.addEventListener("click", toggle);
        btn.addEventListener("keydown", function(e){ if(e.key==="Enter"||e.key===" ") toggle(e); });
        gB.appendChild(btn);
      }
      if(!isCollFunc(n.id)) n.children.forEach(drawNodes);
    })(root);

    sc.appendChild(svg);
    
    // Add PDF button after rendering
    addPDFButton(container);
  }

  // ---------- HYBRID RENDERER (toggle/responsive horizontal layout) ----------
  // This section provides full toggle/responsive functionality for horizontal layouts
  // Adapted from horizontal.js to work with container parameter instead of ROOT
  
  var HCFG = { alignRows:false, wrapMode:null, pack:"balanced", gaps:null, stubs:null, baseline:null, rowHeights:null, wrapW:1200 };
  
  function linkPath(d, container){ 
    var linkColor=container?readLinkColor(container):"#981e32";
    var linkWidth=container?readLinkWidth(container):2.5;
    return mk("path",{ d:d, fill:"none", stroke:linkColor, "stroke-width":String(linkWidth), "stroke-linecap":"round", "stroke-linejoin":"round" }); 
  }
  
  // Hybrid vertical renderer
  function v_measureCards(n, container){
    var inner=CARD.w - CARD.pad.l - CARD.pad.r;
    n.text=layoutText(n.name,n.title,inner,container);
    n.h=Math.max(CARD.hMin,n.text.usedHeight);
    (n.children||[]).forEach(function(ch){ v_measureCards(ch, container); });
  }
  function v_computeBlocks(n, isCollFunc){
    if (isCollFunc(n.id) || !n.children || !n.children.length){ n.blockH=n.h; return; }
    n.children.forEach(function(ch){ v_computeBlocks(ch, isCollFunc); });
    var sum=0; n.children.forEach(function(ch,i){ sum+=ch.blockH; if(i<n.children.length-1) sum+=LAY.sGap; });
    n.blockH=Math.max(n.h,sum);
  }
  function v_place(n,x,yTop,depth,gaps, isCollFunc){
    n.x=x; n.y=yTop+(n.blockH-n.h)/2;
    if (isCollFunc(n.id) || !n.children || !n.children.length) return;
    var gap=atDepth(gaps,depth,gaps[gaps.length-1]||LAY.hDefault);
    var total=0; n.children.forEach(function(ch,i){ total+=ch.blockH + (i?LAY.sGap:0); });
    var y=yTop+(n.blockH-total)/2, xChild=x+CARD.w+gap;
    n.children.forEach(function(ch,i){ v_place(ch,xChild,y,depth+1,gaps, isCollFunc); y+=ch.blockH+(i<n.children.length-1?LAY.sGap:0); });
  }
  function v_draw(svg,root,gaps,stubs, isCollFunc, container){
    var gL=mk("g",{class:"oc-links"}), gN=mk("g",{class:"oc-nodes"}), gB=mk("g",{class:"oc-buttons"});
    svg.appendChild(gL); svg.appendChild(gN); svg.appendChild(gB);
    (function links(n,depth){
      if(!isCollFunc(n.id) && n.children && n.children.length){
        var STUB=atDepth(stubs,depth,stubs[stubs.length-1]);
        var xR=n.x+CARD.w, yM=n.y+n.h/2, xBus=xR+STUB;
        gL.appendChild(linkPath("M"+xR+" "+yM+" H"+xBus, container));
        var mids=n.children.map(function(ch){ return ch.y+ch.h/2; });
        gL.appendChild(linkPath("M"+xBus+" "+Math.min.apply(Math,mids)+" V"+Math.max.apply(Math,mids), container));
        n.children.forEach(function(ch){
          var yC=ch.y+ch.h/2, xBefore=ch.x-STUB;
          gL.appendChild(linkPath("M"+xBus+" "+yC+" H"+xBefore, container));
          gL.appendChild(linkPath("M"+xBefore+" "+yC+" H"+ch.x, container));
        });
      }
      if(!isCollFunc(n.id)) (n.children||[]).forEach(function(c){ links(c,depth+1); });
    })(root,0);
    (function nodes(n){
      var cardFill=container?readCardFill(container):"#fff";
      var cardStroke=container?readCardStroke(container):"#d0d0d0";
      var cardRect=mk("rect",{x:n.x,y:n.y,width:CARD.w,height:n.h,rx:CARD.r,ry:CARD.r,class:"oc-card-rect"});
      cardRect.setAttribute("fill",cardFill);
      cardRect.setAttribute("stroke",cardStroke);
      if(n.id) cardRect.setAttribute("data-node-id", n.id);
      var cardShadow=container?readCardShadow(container):null;
      if(cardShadow) cardRect.setAttribute("filter","url(#ocShadow)");
      gN.appendChild(cardRect);
      drawText(gN,n.text,n.x,n.y,n.h,container);
      if(n.children && n.children.length){
        var r=readBtnRadius(container), btnOffset=readBtnOffset(container);
        var cx=n.x+CARD.w-r-btnOffset.x, cy=n.y+r+btnOffset.y;
        var btn=drawButton(gB, cx, cy, r, isCollFunc(n.id), container);
        function toggle(e){ e.preventDefault(); e.stopPropagation(); var collapsedNow = isCollFunc(n.id); var USER_COLLAPSE=getUserCollapse(container); var USER_EXPAND=getUserExpand(container); if(collapsedNow){ USER_EXPAND.add(n.id); USER_COLLAPSE.delete(n.id); } else { USER_COLLAPSE.add(n.id); USER_EXPAND.delete(n.id); } renderHybrid(container, getCurrentMode(container)); }
        btn.addEventListener("click",toggle);
        btn.addEventListener("keydown",function(e){ if(e.key==="Enter"||e.key===" ") toggle(e); });
        gB.appendChild(btn);
      }
      if(!isCollFunc(n.id)) (n.children||[]).forEach(nodes);
    })(root);
  }
  
  // Hybrid horizontal renderer
  function h_measureCards(n, container){
    var inner=CARD.w - CARD.pad.l - CARD.pad.r;
    n.text=layoutText(n.name,n.title,inner,container);
    n.w=CARD.w;
    n.h=Math.max(CARD.hMin,n.text.usedHeight);
    (n.children||[]).forEach(function(ch){ h_measureCards(ch, container); });
  }
  function h_groupChildrenIntoRows(parent, isCollFunc){
    var kids = (isCollFunc(parent.id) || !parent.children) ? [] : parent.children.slice();
    parent._rows = null; if(!kids.length) return;
    var sorted = kids.slice().sort(function(a,b){ return b.span - a.span; });
    function rowsWithTarget(targetRows){
      var rows = Array.from({length:targetRows}, ()=>({w:0,list:[]}));
      sorted.forEach(function(node){
        rows.sort(function(a,b){ return a.w - b.w; });
        var r=rows[0];
        var add=node.span + (r.list.length?LAY.sGap:0);
        r.list.push(node); r.w+=add;
      });
      return rows.map(function(r){ return r.list; }).filter(function(l){ return l.length; });
    }
    var rows = (HCFG.pack==="compact")
      ? (function(){
          var out=[], cur=[], used=0;
          kids.forEach(function(ch){
            var need=(cur.length?LAY.sGap:0)+ch.span;
            if(cur.length && used+need>HCFG.wrapW){ out.push(cur); cur=[ch]; used=ch.span; }
            else { cur.push(ch); used+=need; }
          });
          if(cur.length) out.push(cur);
          return out;
        })()
      : rowsWithTarget(2);
    var tooWide = rows.some(function(row){
      var w=0; row.forEach(function(ch,i){ w+=ch.span+(i?LAY.sGap:0); }); return w>HCFG.wrapW*1.08;
    });
    if(tooWide) rows = rowsWithTarget(3);
    parent._rows = rows.length?rows:[kids];
  }
  function h_computeSpans(n, isCollFunc){
    if (isCollFunc(n.id) || !n.children || !n.children.length){ n.span=n.w; return; }
    n.children.forEach(function(ch){ h_computeSpans(ch, isCollFunc); });
    if (HCFG.wrapMode==="flow"){
      h_groupChildrenIntoRows(n, isCollFunc);
      var maxRowWidth=0;
      n._rows.forEach(function(row){
        var rw=0; row.forEach(function(ch,i){ rw += ch.span + (i?LAY.sGap:0); });
        if(rw>maxRowWidth) maxRowWidth=rw;
      });
      n.span=Math.max(n.w,maxRowWidth);
    } else {
      var total=0; n.children.forEach(function(ch,i){ total+=ch.span+(i?LAY.sGap:0); });
      n.span=Math.max(n.w,total);
    }
  }
  function h_collectDepthRowHeights(root, isCollFunc){
    var rowHeights=[];
    (function walk(n,d){
      rowHeights[d]=Math.max(rowHeights[d]||0,n.h);
      if(!isCollFunc(n.id) && n.children && n.children.length) n.children.forEach(function(ch){ walk(ch,d+1); });
    })(root,0);
    var baseline=[]; baseline[0]=LAY.margin;
    for(var d=1; d<rowHeights.length; d++){
      var prevGap=atDepth(HCFG.gaps,d-1,HCFG.gaps[HCFG.gaps.length-1]||LAY.hDefault);
      baseline[d]=baseline[d-1]+(rowHeights[d-1]||0)+prevGap;
    }
    HCFG.rowHeights=rowHeights; HCFG.baseline=baseline;
  }
  function h_place(n,xLeft,yTop,depth,gaps, isCollFunc){
    n.x = xLeft + (n.span - n.w)/2;
    n.y = HCFG.alignRows ? HCFG.baseline[depth] : yTop;
    if (isCollFunc(n.id) || !n.children || !n.children.length) return;
    var gap=atDepth(gaps,depth,gaps[gaps.length-1]||LAY.hDefault);
    if (!HCFG.alignRows){
      var childTop = n.y + n.h + gap;
      var total=0; n.children.forEach(function(ch,i){ total+=ch.span+(i?LAY.sGap:0); });
      var left = xLeft + (n.span - total)/2;
      n.children.forEach(function(ch,i){
        h_place(ch, left, childTop, depth+1, gaps, isCollFunc);
        left += ch.span + (i<n.children.length-1?LAY.sGap:0);
      });
      return;
    }
    var alignedTop = HCFG.baseline[depth+1];
    if (HCFG.wrapMode==="flow" && n._rows && n._rows.length>1){
      var rowH = (HCFG.rowHeights[depth+1]||0);
      n._rows.forEach(function(row,rIdx){
        var rowW=0; row.forEach(function(ch,i){ rowW+=ch.span+(i?LAY.sGap:0); });
        var left = xLeft + (n.span - rowW)/2;
        row.forEach(function(ch,i){
          ch.x = left + (ch.span - ch.w)/2;
          ch.y = alignedTop + rIdx*(rowH + LAY.rGap);
          h_place(ch, left, ch.y, depth+1, gaps, isCollFunc);
          left += ch.span + (i?LAY.sGap:0);
        });
      });
    } else {
      var total2=0; n.children.forEach(function(ch,i){ total2 += ch.span + (i?LAY.sGap:0); });
      var left2 = xLeft + (n.span - total2)/2;
      n.children.forEach(function(ch,i){
        ch.x = left2 + (ch.span - ch.w)/2;
        ch.y = alignedTop;
        h_place(ch, left2, ch.y, depth+1, gaps, isCollFunc);
        left2 += ch.span + (i<n.children.length-1?LAY.sGap:0);
      });
    }
  }
  function h_pushCollisions(root, isCollFunc){
    function bbox(n){ return {l:n.x, r:n.x+n.w, t:n.y, b:n.y+n.h}; }
    var byDepth={};
    (function collect(n,d){
      (byDepth[d]=byDepth[d]||[]).push(n);
      if(!isCollFunc(n.id) && n.children && n.children.length) n.children.forEach(function(c){ collect(c,d+1); });
    })(root,0);
    Object.keys(byDepth).forEach(function(k){
      var nodes=byDepth[k]; if(nodes.length<2) return;
      nodes.sort(function(a,b){ return a.y-b.y; });
      for(var i=1;i<nodes.length;i++){
        var A=bbox(nodes[i-1]), B=bbox(nodes[i]);
        if(B.t < A.b + 2){ shiftSubtree(nodes[i], (A.b + 2) - B.t); }
      }
    });
    function shiftSubtree(n,dy){
      n.y+=dy;
      if(!isCollFunc(n.id) && n.children && n.children.length) n.children.forEach(function(c){ shiftSubtree(c,dy); });
    }
  }
  function h_draw(svg,root,gaps,stubs, isCollFunc, container){
    var gL=mk("g",{class:"oc-links"}), gN=mk("g",{class:"oc-nodes"}), gB=mk("g",{class:"oc-buttons"});
    svg.appendChild(gL); svg.appendChild(gN); svg.appendChild(gB);
    (function links(n,depth){
      if(!isCollFunc(n.id) && n.children && n.children.length){
        var STUB=atDepth(stubs,depth,stubs[stubs.length-1]);
        // Allow a separate parent-stub value via data-h-parent-stubs (fallback to STUB)
        var pAttr=(container && container.getAttribute) ? (container.getAttribute("data-h-parent-stubs")||"").trim() : "";
        var pList=pAttr ? pAttr.split(/[,\s]+/).map(function(x){ return parseInt(x,10); }).filter(function(v){ return !isNaN(v); }) : [];
        var PARENT_STUB = pList.length ? atDepth(pList, depth, pList[pList.length-1]) : STUB;
        var xMid=n.x+n.w/2;
        var busYBase = HCFG.baseline ? (HCFG.baseline[depth+1] - STUB)
                                     : (n.y + n.h + atDepth(gaps,depth,LAY.hDefault) - STUB);
        // Parent drop uses PARENT_STUB into the bus
        var parentBusY = HCFG.baseline ? (HCFG.baseline[depth+1] - PARENT_STUB)
                                       : (n.y + n.h + atDepth(gaps,depth,LAY.hDefault) - PARENT_STUB);
        gL.appendChild(linkPath("M"+xMid+" "+(n.y+n.h)+" V"+parentBusY, container));
        if (HCFG.wrapMode==="flow" && n._rows && n._rows.length>1 && HCFG.baseline){
          var rowH=(HCFG.rowHeights[depth+1]||0);
          n._rows.forEach(function(row,rIdx){
            var busY = (HCFG.baseline[depth+1] - STUB) + rIdx*(rowH + LAY.rGap);
            var mids=row.map(function(ch){ return ch.x + ch.w/2; });
            var x1=Math.min.apply(Math,mids), x2=Math.max.apply(Math,mids);
            gL.appendChild(linkPath("M"+x1+" "+busY+" H"+x2, container));
            row.forEach(function(ch){
              var cx=ch.x+ch.w/2;
              gL.appendChild(linkPath("M"+cx+" "+busY+" V"+(ch.y - STUB), container));
              gL.appendChild(linkPath("M"+cx+" "+(ch.y - STUB)+" V"+ch.y, container));
            });
          });
        } else {
          var midsAll=n.children.map(function(ch){ return ch.x + ch.w/2; });
          var xa=Math.min.apply(Math,midsAll), xb=Math.max.apply(Math,midsAll);
          gL.appendChild(linkPath("M"+xa+" "+busYBase+" H"+xb, container));
          n.children.forEach(function(ch){
            var cx=ch.x+ch.w/2;
            gL.appendChild(linkPath("M"+cx+" "+busYBase+" V"+(ch.y - STUB), container));
            gL.appendChild(linkPath("M"+cx+" "+(ch.y - STUB)+" V"+ch.y, container));
          });
        }
      }
      if(!isCollFunc(n.id)) (n.children||[]).forEach(function(c){ links(c,depth+1); });
    })(root,0);
    (function nodes(n){
      var cardFill=container?readCardFill(container):"#fff";
      var cardStroke=container?readCardStroke(container):"#d0d0d0";
      var cardRect=mk("rect",{x:n.x,y:n.y,width:n.w,height:n.h,rx:CARD.r,ry:CARD.r,class:"oc-card-rect"});
      cardRect.setAttribute("fill",cardFill);
      cardRect.setAttribute("stroke",cardStroke);
      if(n.id) cardRect.setAttribute("data-node-id", n.id);
      var cardShadow=container?readCardShadow(container):null;
      if(cardShadow) cardRect.setAttribute("filter","url(#ocShadow)");
      gN.appendChild(cardRect);
      drawText(gN,n.text,n.x,n.y,n.h,container);
      if(n.children && n.children.length){
        var r=14, cx=n.x+n.w-r-8, cy=n.y+r+8;
        var btn=drawButton(gB, cx, cy, r, isCollFunc(n.id), container);
        function toggle(e){ e.preventDefault(); e.stopPropagation(); var collapsedNow = isCollFunc(n.id); var USER_COLLAPSE=getUserCollapse(container); var USER_EXPAND=getUserExpand(container); if(collapsedNow){ USER_EXPAND.add(n.id); USER_COLLAPSE.delete(n.id); } else { USER_COLLAPSE.add(n.id); USER_EXPAND.delete(n.id); } renderHybrid(container, getCurrentMode(container)); }
        btn.addEventListener("click",toggle);
        btn.addEventListener("keydown",function(e){ if(e.key==="Enter"||e.key===" ") toggle(e); });
        gB.appendChild(btn);
      }
      if(!isCollFunc(n.id)) (n.children||[]).forEach(nodes);
    })(root);
  }
  
  function isEditingContext(){
    try {
      var href=(window.location&&window.location.href)||"";
      if(/wp-admin\/|post\.php|post-new\.php|site-editor|widgets\.php/i.test(href)) return true;
      var cls=(document.body&&document.body.className)||"";
      if(/\bblock-editor\b|\bblock-editor-page\b|\bwp-admin\b/i.test(cls)) return true;
    } catch(_e){}
    return false;
  }
  function isPreview(container){
    return container.getAttribute("data-preview-mode")==="true" || isEditingContext();
  }
  function ensureStageAndToggle(container){
    var stage=container.querySelector(":scope > .oc-stage");
    if(!stage){ stage=document.createElement("div"); stage.className="oc-stage"; container.appendChild(stage); }
    // In preview/editor mode, do not show a toggle pill
    if(isPreview(container)){
      var existing=container.querySelector(":scope > .oc-toggle");
      if(existing) existing.remove();
      return stage;
    }
    // Only show toggle when explicitly enabled
    if(container.getAttribute("data-toggle")==="1"){
      var pill=container.querySelector(":scope > .oc-toggle");
      if(!pill){
        pill=document.createElement("button"); pill.className="oc-toggle"; pill.type="button";
        pill.setAttribute("aria-label","Toggle org chart layout");
        pill.addEventListener("click", function(){ renderHybrid(container, getCurrentMode(container)==="horizontal"?"vertical":"horizontal"); });
        container.appendChild(pill);
      }
      pill.textContent = "View: " + (getCurrentMode(container)==="horizontal" ? "Horizontal" : "Vertical");
    } else {
      var pillExisting=container.querySelector(":scope > .oc-toggle");
      if(pillExisting) pillExisting.remove();
    }
    return stage;
  }
  
  function drawScene(mode, tree, container){
    // If a simple layout render previously added a top-level '.oc-scroll',
    // remove it to avoid duplicate charts when switching to hybrid mode.
    try {
      var strayScrolls = container.querySelectorAll(":scope > .oc-scroll");
      strayScrolls.forEach(function(node){ node.parentNode && node.parentNode.removeChild(node); });
      // Also remove any toggle in preview mode
      if(isPreview(container)){
        var strayToggle = container.querySelector(":scope > .oc-toggle");
        if(strayToggle) strayToggle.remove();
      }
    } catch(_e) {}
    
    var stage=ensureStageAndToggle(container);
    CARD.w = readCardWHybrid(container, mode==="horizontal"?"h":"v");
    CARD.pad=readCardPadding(container);
    CARD.r=readCardRadius(container);
    LAY.margin=readMargin(container);
    LAY.vGap=readVGap(container);
    LAY.sGap=readSiblingGap(container);
    var gaps  = readGapsHybrid(container, mode==="horizontal"?"h":"v");
    var stubs = readStubsHybrid(container, mode==="horizontal"?"h":"v", gaps);
    var scale = readScale(container);
    var USER_COLLAPSE=getUserCollapse(container);
    var USER_EXPAND=getUserExpand(container);
    var autoCollapsed = new Set();
    var cut = (mode==="vertical") ? readVerticalAutoDepth(container) : readHorizontalAutoDepth(container);
    if (cut!=null){
      (function precollapse(n,d){
        if (d>=cut && n.children && n.children.length) autoCollapsed.add(n.id);
        (n.children||[]).forEach(function(c){ precollapse(c,d+1); });
      })(tree,0);
    }
    var isCollFunc = function(id){
      return USER_COLLAPSE.has(id) || (autoCollapsed.has(id) && !USER_EXPAND.has(id));
    };
    var maxX=0, maxY=0;
    if(mode==="vertical"){
      v_measureCards(tree, container);
      v_computeBlocks(tree, isCollFunc);
      v_place(tree, LAY.margin, LAY.margin, 0, gaps, isCollFunc);
      // Apply manual root offset
      var rootOffsetY = readVRootOffsetY(container);
      if(rootOffsetY !== 0){
        tree.y += rootOffsetY;
      }
      (function walk(n){ maxX=Math.max(maxX,n.x+CARD.w); maxY=Math.max(maxY,n.y+n.h); if(!isCollFunc(n.id)) (n.children||[]).forEach(walk); })(tree);
    } else {
      var avail=Math.max(320,(container.clientWidth||0)-2*LAY.margin);
      HCFG.gaps=gaps;
      HCFG.stubs=stubs;
      HCFG.alignRows=(container.getAttribute("data-h-alignrows")==="1");
      HCFG.wrapMode=((container.getAttribute("data-h-wrap")||"").toLowerCase().trim()==="flow")?"flow":null;
      HCFG.pack=((container.getAttribute("data-h-pack")||"balanced").toLowerCase().trim()==="compact")?"compact":"balanced";
      HCFG.wrapW=Math.max(280,avail);
      h_measureCards(tree, container);
      h_computeSpans(tree, isCollFunc);
      if(HCFG.alignRows) h_collectDepthRowHeights(tree, isCollFunc);
      h_place(tree, LAY.margin, LAY.margin, 0, gaps, isCollFunc);
      // Apply manual root offset
      var rootOffsetX = readHRootOffsetX(container);
      if(rootOffsetX !== 0){
        tree.x += rootOffsetX;
      }
      if(!HCFG.alignRows) h_pushCollisions(tree, isCollFunc);
      (function fit(){
        var bounds={maxX:0,maxY:0,maxDepth:0};
        (function walk(n,d){ bounds.maxX=Math.max(bounds.maxX,n.x+n.w); bounds.maxY=Math.max(bounds.maxY,n.y+n.h); bounds.maxDepth=Math.max(bounds.maxDepth,d); if(!isCollFunc(n.id)) (n.children||[]).forEach(function(c){ walk(c,d+1); }); })(tree,0);
        var overflow = (bounds.maxX > (LAY.margin + HCFG.wrapW + LAY.margin));
        if(!overflow) return;
        var targetDepth=Math.min(bounds.maxDepth,8);
        (function collapseAt(n,d){
          if(d===targetDepth && n.children && n.children.length) USER_COLLAPSE.add(n.id);
          if(!isCollFunc(n.id)) (n.children||[]).forEach(function(c){ collapseAt(c,d+1); });
        })(tree,0);
        h_computeSpans(tree, isCollFunc);
        if(HCFG.alignRows) h_collectDepthRowHeights(tree, isCollFunc);
        h_place(tree, LAY.margin, LAY.margin, 0, gaps, isCollFunc);
        // Apply manual root offset
        if(rootOffsetX !== 0){
          tree.x += rootOffsetX;
        }
        if(!HCFG.alignRows) h_pushCollisions(tree, isCollFunc);
      })();
      (function walk2(n){
        maxX=Math.max(maxX,n.x+n.w); maxY=Math.max(maxY,n.y+n.h);
        if(!isCollFunc(n.id)) (n.children||[]).forEach(walk2);
      })(tree);
    }
    var W=maxX+LAY.margin, H=Math.max(maxY+LAY.margin,320);
    stage.innerHTML="";
    var sc=document.createElement("div"); sc.className="oc-scroll"; stage.appendChild(sc);
    var svg=mk("svg",{ viewBox:"0 0 "+W+" "+H, width:String(Math.round(W*scale)), height:String(Math.round(H*scale)), role:"img","aria-label":"Organizational chart","preserveAspectRatio":"xMinYMin meet" });

    // Add shadow filter for cards if shadow is enabled
    var cardShadow=container?readCardShadow(container):true;
    if(cardShadow){
      var shadowBlur=readShadowBlur(container);
      var shadowOpacity=readShadowOpacity(container);
      var shadowOffset=readShadowOffset(container);
      var shadowColor=readShadowColor(container);
      var defs=mk("defs",{});
      var f=mk("filter",{id:"ocShadow",x:"-30%",y:"-30%",width:"160%",height:"160%",filterUnits:"userSpaceOnUse","color-interpolation-filters":"sRGB"});
      f.appendChild(mk("feGaussianBlur",{"in":"SourceAlpha",stdDeviation:String(shadowBlur),result:"b1"}));
      f.appendChild(mk("feFlood",{"flood-color":shadowColor,result:"c1"}));
      f.appendChild(mk("feComposite",{"in":"c1","in2":"b1",operator:"in",result:"c2"}));
      f.appendChild(mk("feOffset",{"in":"c2",dx:String(shadowOffset.x),dy:String(shadowOffset.y),result:"o1"}));
      // Apply opacity using feComponentTransfer (feMergeNode doesn't support opacity attribute)
      var ct=mk("feComponentTransfer",{"in":"o1",result:"o2"});
      ct.appendChild(mk("feFuncA",{type:"linear",slope:String(shadowOpacity)}));
      f.appendChild(ct);
      var m=mk("feMerge",{});
      m.appendChild(mk("feMergeNode",{"in":"o2"}));
      m.appendChild(mk("feMergeNode",{"in":"SourceGraphic"}));
      f.appendChild(m); defs.appendChild(f); svg.appendChild(defs);
    }
    sc.appendChild(svg);
    if(mode==="vertical") v_draw(svg, tree, gaps, stubs, isCollFunc, container);
    else h_draw(svg, tree, gaps, stubs, isCollFunc, container);
    if(readCenterHybrid(container)){
      var totalW=W*scale, viewW=sc.clientWidth||stage.clientWidth||totalW;
      if(totalW>0 && viewW>0){
        var rootMid = (mode==="vertical") ? (tree.x + CARD.w/2) : (tree.x + tree.w/2 || 0);
        sc.scrollLeft = Math.max(0, Math.round(rootMid*scale - viewW/2));
      }
    }
    
    // Add PDF button after rendering (hybrid renderer)
    addPDFButton(container);
  }
  
  function renderHybrid(container, forceMode){
    var data=loadData();
    if(!Array.isArray(data)||!data.length){ container.innerHTML="<div style='padding:8px;color:#6b7280;font:13px/1.2 system-ui'>No org data found.</div>"; return; }
    var tree=buildTree(data);
    if(!tree){ container.innerHTML="<div style='padding:8px;color:#6b7280;font:13px/1.2 system-ui'>Root (parent:null) not found.</div>"; return; }
    var currentMode = forceMode || pickMode(container);
    setCurrentMode(container, currentMode);
    ensureStageAndToggle(container);
    drawScene(currentMode, tree, container);
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){ ensureStageAndToggle(container); drawScene(currentMode, tree, container); });
    }
  }

  // ---------- bootstrap ----------
  function startTarget(container){
    // Expose startTarget globally so rerender can call it
    window._WordpressOrgChart_startTarget = startTarget;
    // Apply background color if set
    var bgColor = readBgColor(container);
    if(bgColor) container.style.backgroundColor = bgColor;
    else container.style.backgroundColor = "";

    var data=loadData();
    if(!Array.isArray(data) || !data.length){ container.innerHTML="<div style='padding:8px;color:#6b7280;font:13px/1.2 system-ui'>No org data found.</div>"; return; }
    var root=buildTree(data);
    if(!root){ container.innerHTML="<div style='padding:8px;color:#6b7280;font:13px/1.2 system-ui'>Root (parent:null) not found.</div>"; return; }

    var layout=(container.getAttribute("data-layout")||"center").toLowerCase();
    
    // Check if hybrid renderer is needed (toggle/responsive horizontal layout)
    var hasMode = container.hasAttribute("data-mode");
    var hasToggle = container.hasAttribute("data-toggle");
    var hasBreakpoint = container.hasAttribute("data-breakpoint");
    var needsHybrid = (layout==="horizontal") && (hasMode || hasToggle || hasBreakpoint);
    
    if(layout==="center" || layout==="centered"){ 
      renderCenter(root, container, true); 
    } else if(layout==="horizontal" && !needsHybrid){
      // Simple horizontal layout (no toggle/responsive mode)
      renderHorizontal(root, container, true);
    } else if(needsHybrid){
      renderHybrid(container);
    } else if(layout==="horizontal"){ 
      renderHorizontal(root, container, true); 
    } else { 
      renderVertical(root, container); 
    }
  }

  function addPDFButton(container){
    if(container.querySelector(".oc-pdf-button")) return;
    if(isPreview(container)) return;
    var pdfBtn = document.createElement("button");
    pdfBtn.className = "oc-pdf-button";
    pdfBtn.textContent = 'Print / Save PDF';
    pdfBtn.setAttribute("aria-label", "Print or save org chart as PDF");
    pdfBtn.style.cssText = "position:absolute;top:10px;right:10px;padding:8px 16px;background:#981e32;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;box-shadow:0 2px 4px rgba(0,0,0,0.2);z-index:1000;font-family:system-ui,-apple-system,sans-serif;";
    
    // Add hover effect
    pdfBtn.addEventListener("mouseenter", function(){
      this.style.background = "#7a1828";
    });
    pdfBtn.addEventListener("mouseleave", function(){
      this.style.background = "#981e32";
    });
    
    // PDF download handler
    pdfBtn.addEventListener("click", function(){
      // If in editor/preview context, block printing defensively
      if(isPreview(container)) return;
      try{
      var USER_COLLAPSE = getUserCollapse(container);
      var USER_EXPAND = getUserExpand(container);
      var savedCollapsed = new Set(USER_COLLAPSE);
      var savedExpanded = new Set(USER_EXPAND);
      var layout = (container.getAttribute("data-layout")||"center").toLowerCase();
      var savedScaleAttr = container.getAttribute("data-scale");
      var scaleAdjusted = false;
      if(layout === "horizontal" || layout === "vertical"){
        var savedScale = parseFloat(savedScaleAttr);
        var printScale = (isFinite(savedScale) && savedScale > 0) ? Math.min(savedScale, 1) : 1;
        container.setAttribute("data-scale", String(printScale));
        scaleAdjusted = true;
      }
      
      var printStyleEl = null;
      if(layout === "horizontal" || layout === "vertical"){
        printStyleEl = document.createElement("style");
        printStyleEl.textContent = "@media print { @page { size: landscape; margin: 0.5in; } }";
        document.head.appendChild(printStyleEl);
      }
      
      var savedDepthAttrs = {
        openDepthDesktop: container.getAttribute("data-open-depth-desktop"),
        openDepthTablet: container.getAttribute("data-open-depth-tablet"),
        openDepthPhone: container.getAttribute("data-open-depth-phone"),
        vAutoDepthDesktop: container.getAttribute("data-v-autodepth-desktop"),
        vAutoDepthTablet: container.getAttribute("data-v-autodepth-tablet"),
        vAutoDepthPhone: container.getAttribute("data-v-autodepth-phone"),
        hAutoDepth: container.getAttribute("data-h-autodepth")
      };
      
      USER_COLLAPSE.clear();
      USER_EXPAND.clear();
      container.setAttribute("data-open-depth-desktop", "999");
      container.setAttribute("data-open-depth-tablet", "999");
      container.setAttribute("data-open-depth-phone", "999");
      container.setAttribute("data-v-autodepth-desktop", "999");
      container.setAttribute("data-v-autodepth-tablet", "999");
      container.setAttribute("data-v-autodepth-phone", "999");
      container.setAttribute("data-h-autodepth", "999");
      
      var data = loadData();
      var root = buildTree(data);
      if(layout === "center" || layout === "centered" || !container.hasAttribute("data-layout")){
        renderCenter(root, container, false);
      } else if(layout === "vertical"){
        renderVertical(root, container);
      } else if(layout === "horizontal"){
        var hasMode = container.hasAttribute("data-mode");
        var hasToggle = container.hasAttribute("data-toggle");
        var hasBreakpoint = container.hasAttribute("data-breakpoint");
        var needsHybrid = hasMode || hasToggle || hasBreakpoint;
        if(needsHybrid){
          renderHybrid(container, getCurrentMode(container));
        } else {
          renderHorizontal(root, container, false);
        }
      }
      
      // Wait for render to complete, then print
      setTimeout(function(){
        var buttons = container.querySelectorAll(".oc-btn");
        var toggle = container.querySelector(".oc-toggle");
        var pdfButton = container.querySelector(".oc-pdf-button");
        if(pdfButton) pdfButton.style.display = "none";
        buttons.forEach(function(btn){ btn.style.display = "none"; });
        if(toggle) toggle.style.display = "none";
        
        // Convert to black & white by removing inline styles and setting B&W colors
        var savedStyles = new Map();
        
        // Save and convert text elements to black
        container.querySelectorAll("text").forEach(function(el){
          savedStyles.set(el, el.getAttribute("style"));
          el.setAttribute("style", "fill: #000; font-family: " + (el.style.fontFamily || "inherit") + "; font-size: " + (el.style.fontSize || "inherit") + "; font-weight: " + (el.style.fontWeight || "inherit") + "; font-style: " + (el.style.fontStyle || "inherit") + "; letter-spacing: " + (el.style.letterSpacing || "0") + ";");
        });
        
        // Save and convert card rectangles to white with black stroke
        container.querySelectorAll("rect.oc-card-rect, rect[data-node-id]").forEach(function(el){
          savedStyles.set(el, el.getAttribute("style"));
          el.setAttribute("style", "fill: #fff; stroke: #000; stroke-width: 1px;");
          el.removeAttribute("filter");
        });
        
        // Save and convert connector lines to black
        container.querySelectorAll(".oc-links path, .oc-link, path").forEach(function(el){
          if(!el.closest(".oc-btn")){
            savedStyles.set(el, el.getAttribute("style"));
            el.setAttribute("style", "stroke: #000; stroke-width: 1px; fill: none;");
          }
        });
        
        container.querySelectorAll(".oc-btn circle, .oc-btn rect").forEach(function(el){
          savedStyles.set(el, el.getAttribute("style"));
        });
        
        var restoreState = function(){
          USER_COLLAPSE.clear();
          savedCollapsed.forEach(function(id){ USER_COLLAPSE.add(id); });
          USER_EXPAND.clear();
          savedExpanded.forEach(function(id){ USER_EXPAND.add(id); });
          if(savedDepthAttrs.openDepthDesktop != null) {
            container.setAttribute("data-open-depth-desktop", savedDepthAttrs.openDepthDesktop);
          } else {
            container.removeAttribute("data-open-depth-desktop");
          }
          if(savedDepthAttrs.openDepthTablet != null) {
            container.setAttribute("data-open-depth-tablet", savedDepthAttrs.openDepthTablet);
          } else {
            container.removeAttribute("data-open-depth-tablet");
          }
          if(savedDepthAttrs.openDepthPhone != null) {
            container.setAttribute("data-open-depth-phone", savedDepthAttrs.openDepthPhone);
          } else {
            container.removeAttribute("data-open-depth-phone");
          }
          if(savedDepthAttrs.vAutoDepthDesktop != null) {
            container.setAttribute("data-v-autodepth-desktop", savedDepthAttrs.vAutoDepthDesktop);
          } else {
            container.removeAttribute("data-v-autodepth-desktop");
          }
          if(savedDepthAttrs.vAutoDepthTablet != null) {
            container.setAttribute("data-v-autodepth-tablet", savedDepthAttrs.vAutoDepthTablet);
          } else {
            container.removeAttribute("data-v-autodepth-tablet");
          }
          if(savedDepthAttrs.vAutoDepthPhone != null) {
            container.setAttribute("data-v-autodepth-phone", savedDepthAttrs.vAutoDepthPhone);
          } else {
            container.removeAttribute("data-v-autodepth-phone");
          }
          if(savedDepthAttrs.hAutoDepth != null) {
            container.setAttribute("data-h-autodepth", savedDepthAttrs.hAutoDepth);
          } else {
            container.removeAttribute("data-h-autodepth");
          }
          
          savedStyles.forEach(function(styleValue, element){
            if(styleValue){
              element.setAttribute("style", styleValue);
            } else {
              element.removeAttribute("style");
            }
          });
          
          if(printStyleEl && printStyleEl.parentNode){
            printStyleEl.parentNode.removeChild(printStyleEl);
          }
          
          if(scaleAdjusted){
            if(savedScaleAttr != null) container.setAttribute("data-scale", savedScaleAttr);
            else container.removeAttribute("data-scale");
          }
          
          var data = loadData();
          var root = buildTree(data);
          if(!root) return;
          
          // Re-render with autoCollapse=true to respect restored depth attributes
          if(layout === "center" || layout === "centered" || !container.hasAttribute("data-layout")){
            renderCenter(root, container, true);
          } else if(layout === "vertical"){
            renderVertical(root, container);
          } else if(layout === "horizontal"){
            var hasMode = container.hasAttribute("data-mode");
            var hasToggle = container.hasAttribute("data-toggle");
            var hasBreakpoint = container.hasAttribute("data-breakpoint");
            var needsHybrid = hasMode || hasToggle || hasBreakpoint;
            if(needsHybrid){
              renderHybrid(container, getCurrentMode(container));
            } else {
              renderHorizontal(root, container, true);
            }
          }
          
          window.removeEventListener("afterprint", restoreState);
        };
        
        window.addEventListener("afterprint", restoreState, { once: true });
        setTimeout(restoreState, 2000);
        window.print();
      }, 300);
      } catch(err){
        // Best-effort restoration on error to avoid crashes
        try { window.getSelection && window.getSelection().removeAllRanges && window.getSelection().removeAllRanges(); } catch(_e){}
        if(printStyleEl && printStyleEl.parentNode){
          printStyleEl.parentNode.removeChild(printStyleEl);
        }
        if(scaleAdjusted){
          if(savedScaleAttr != null) container.setAttribute("data-scale", savedScaleAttr);
          else container.removeAttribute("data-scale");
        }
        // Restore collapsed state immediately
        USER_COLLAPSE.clear();
        savedCollapsed.forEach(function(id){ USER_COLLAPSE.add(id); });
        USER_EXPAND.clear();
        savedExpanded.forEach(function(id){ USER_EXPAND.add(id); });
        console && console.error && console.error("PDF generation error:", err);
      }
    });
    
    container.style.position = "relative";
    container.appendChild(pdfBtn);
  }

  function start(){
    var container=byId("wsu-orgchart");
    if(!container) return;

    // Apply background color if set
    var bgColor = readBgColor(container);
    if(bgColor) container.style.backgroundColor = bgColor;
    else container.style.backgroundColor = "";

    var data=loadData();
    if(!Array.isArray(data) || !data.length){ container.innerHTML="<div style='padding:8px;color:#6b7280;font:13px/1.2 system-ui'>No org data found.</div>"; return; }
    var root=buildTree(data);
    if(!root){ container.innerHTML="<div style='padding:8px;color:#6b7280;font:13px/1.2 system-ui'>Root (parent:null) not found.</div>"; return; }

    // Check layout type
    var layout=(container.getAttribute("data-layout")||"center").toLowerCase();
    var hasMode = container.hasAttribute("data-mode");
    var hasToggle = container.hasAttribute("data-toggle");
    var hasBreakpoint = container.hasAttribute("data-breakpoint");
    var needsHybrid = (layout==="horizontal") && (hasMode || hasToggle || hasBreakpoint);
    
    // For center layout (default), use working pattern
    if(layout==="center" || layout==="centered" || !container.hasAttribute("data-layout")){
      renderCenter(root, container, true);
      if(document.fonts && document.fonts.ready){ document.fonts.ready.then(function(){ renderCenter(root, container, true); }); }

      var to; var currentCols=defaultCols();
      window.addEventListener("resize", function(){
        clearTimeout(to);
        to=setTimeout(function(){
          var next=defaultCols();
          var shrinking=next<currentCols;
          currentCols=next;
          renderCenter(root, container, true);
        }, 120);
    }, {passive:true});
    } else {
      // For other layouts (vertical, hybrid horizontal), use startTarget wrapper
      startTarget(container);
      if(document.fonts && document.fonts.ready){ document.fonts.ready.then(function(){ startTarget(container); }); }

      var to;
      window.addEventListener("resize", function(){
        clearTimeout(to);
        to=setTimeout(function(){
          if(needsHybrid){
            renderHybrid(container, getCurrentMode(container));
          } else {
            startTarget(container);
          }
        }, 120);
      }, {passive:true});

      window.addEventListener("orientationchange", function(){
        setTimeout(function(){
          if(needsHybrid){
            renderHybrid(container, getCurrentMode(container));
          } else {
            startTarget(container);
          }
        }, 140);
      }, {passive:true});
    }
  }

  // Ensure window.WordpressOrgChart is set with actual startTarget
  if(!window.WordpressOrgChart) {
    window.WordpressOrgChart = {
      rerender: function(container) {
        if(!container) container = byId("wsu-orgchart");
        if(!container) return;
        startTarget(container);
      }
    };
  } else {
    window.WordpressOrgChart.rerender = function(container) {
      if(!container) container = byId("wsu-orgchart");
      if(!container) return;
      startTarget(container);
    };
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
