// editor.js - WSU Newsletter Editor
// Features: array-based social links, title alignment, collapsible UI, auto-save

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function debounce(fn, ms = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

function setIframeHtml(iframe, html) {
  try {
    // Prefer srcdoc to avoid cross-origin issues after user navigates inside the iframe
    iframe.removeAttribute('src');
    iframe.srcdoc = html;
    setTimeout(() => {
      const doc = iframe.contentDocument;
      const h = doc && doc.body && doc.body.scrollHeight ? doc.body.scrollHeight : 600;
      iframe.style.height = Math.max(600, h) + 'px';
    }, 120);
  } catch (e) {
    // Fallback: reset to about:blank, then inject
    try {
      iframe.src = 'about:blank';
      iframe.onload = () => {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
        iframe.style.height = Math.max(600, doc.body.scrollHeight) + 'px';
      };
    } catch (_) {
      console.error('Preview iframe update failed:', e);
    }
  }
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function escapeHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function cleanHtml(html) {
  // Create temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Allowed tags - keep these, strip everything else
  const allowedTags = [
    'P',
    'BR',
    'STRONG',
    'B',
    'EM',
    'I',
    'U',
    'A',
    'UL',
    'OL',
    'LI',
    'H3',
    'TABLE',
    'TBODY',
    'THEAD',
    'TR',
    'TD',
    'TH',
    'COLGROUP',
    'COL',
  ];

  // Recursively clean nodes
  function cleanNode(node) {
    // If it's a text node, keep it
    if (node.nodeType === 3) {
      return node.cloneNode();
    }

    // If it's an element node
    if (node.nodeType === 1) {
      const tagName = node.tagName.toUpperCase();

      // If tag is not allowed, extract its children
      if (!allowedTags.includes(tagName)) {
        const fragment = document.createDocumentFragment();
        Array.from(node.childNodes).forEach((child) => {
          const cleaned = cleanNode(child);
          if (cleaned) fragment.appendChild(cleaned);
        });
        return fragment;
      }

      // Tag is allowed - create clean version
      const cleanElement = document.createElement(tagName);

      // Preserve href for links
      if (tagName === 'A' && node.href) {
        cleanElement.href = node.href;
      }

      // Preserve style attribute for allowed tags
      if (node.getAttribute && node.getAttribute('style')) {
        cleanElement.setAttribute('style', node.getAttribute('style'));
      }

      // Preserve table-specific attributes
      if (node.getAttribute) {
        ['colspan', 'rowspan', 'role', 'width'].forEach((attr) => {
          if (node.hasAttribute(attr)) {
            cleanElement.setAttribute(attr, node.getAttribute(attr));
          }
        });
      }

      // Recursively clean children
      Array.from(node.childNodes).forEach((child) => {
        const cleaned = cleanNode(child);
        if (cleaned) cleanElement.appendChild(cleaned);
      });

      return cleanElement;
    }

    return null;
  }

  // Clean all children
  const fragment = document.createDocumentFragment();
  Array.from(temp.childNodes).forEach((child) => {
    const cleaned = cleanNode(child);
    if (cleaned) fragment.appendChild(cleaned);
  });

  // Return cleaned HTML
  const result = document.createElement('div');
  result.appendChild(fragment);
  return result.innerHTML;
}
// ============================================================
// AUTO-SAVE FUNCTIONALITY
// ============================================================

const EDITOR_INSTANCE_ID = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
const APP_VERSION = window.__VERSION__ || '7.0';
const AUTO_SAVE_KEY = `wsu_newsletter_backup_${EDITOR_INSTANCE_ID}`;
const AUTO_SAVE_TIME_KEY = `wsu_newsletter_backup_time_${EDITOR_INSTANCE_ID}`;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
let autoSaveTimer = null;
let hasUnsavedChanges = false;

function saveToLocalStorage() {
  try {
    const backup = {
      state: state,
      timestamp: new Date().toISOString(),
      version: '7.0.2',
    };

    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(backup));

    // Update badge
    const badge = document.querySelector('.badge');
    if (badge) {
      const now = new Date().toLocaleTimeString();
      badge.textContent = `v${APP_VERSION} - Auto-saved at ${now}`;
      badge.style.color = '#28a745';
    }

    hasUnsavedChanges = false;
    console.log('📦 Auto-saved to localStorage');
  } catch (e) {
    console.warn('⚠️ Auto-save failed:', e);
    if (e.name === 'QuotaExceededError') {
      showToast('Storage full - auto-save disabled', 'error');
    }
  }
}

function loadFromLocalStorage() {
  try {
    const backupStr = localStorage.getItem(AUTO_SAVE_KEY);
    if (!backupStr) return null;

    const backup = JSON.parse(backupStr);
    const backupTime = new Date(backup.timestamp);
    const now = new Date();
    const ageMinutes = Math.floor((now - backupTime) / 60000);

    // Only offer restore if backup is less than 24 hours old
    if (ageMinutes > 1440) {
      console.log('📦 Auto-save backup too old, ignoring');
      return null;
    }

    return {
      data: backup.state,
      timestamp: backup.timestamp,
      ageMinutes: ageMinutes,
    };
  } catch (e) {
    console.warn('⚠️ Failed to load auto-save:', e);
    return null;
  }
}

function clearLocalStorage() {
  try {
    localStorage.removeItem(AUTO_SAVE_KEY);
    localStorage.removeItem(AUTO_SAVE_TIME_KEY);
    console.log('🗑️ Cleared auto-save backup');
  } catch (e) {
    console.warn('⚠️ Failed to clear backup:', e);
  }
}

function startAutoSave() {
  // Clear any existing timer
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
  }

  // Save immediately
  saveToLocalStorage();

  // Then save every 30 seconds
  autoSaveTimer = setInterval(() => {
    if (hasUnsavedChanges) {
      saveToLocalStorage();
    }
  }, AUTO_SAVE_INTERVAL);

  console.log('✅ Auto-save started (every 30 seconds)');
}

function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

function markChanged() {
  hasUnsavedChanges = true;

  // Update badge
  const badge = document.querySelector('.badge');
  if (badge && !badge.textContent.includes('unsaved')) {
    badge.textContent = `v${APP_VERSION} - unsaved changes`;
    badge.style.color = '#ffc107';
  }
}

// Warn before leaving page with unsaved changes
window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    return e.returnValue;
  }
});

// ============================================================
// STATE MANAGEMENT
// ============================================================

let state = window.__START_MODEL__;
const UNDO_MAX = 50;
let undoStack = [];
let redoStack = [];

function pushHistory() {
  undoStack.push(clone(state));
  if (undoStack.length > UNDO_MAX) {
    undoStack.shift();
  }
  redoStack = [];
  markChanged(); // NEW: Track that state changed
}

function undo() {
  if (undoStack.length > 0) {
    redoStack.push(clone(state));
    state = undoStack.pop();
    rebuildUI(false);
    showToast('Undo successful', 'info');
  } else {
    showToast('Nothing to undo', 'info');
  }
}

function redo() {
  if (redoStack.length > 0) {
    undoStack.push(clone(state));
    state = redoStack.pop();
    rebuildUI(false);
    showToast('Redo successful', 'info');
  } else {
    showToast('Nothing to redo', 'info');
  }
}

// ============================================================
// DOM ELEMENTS
// ============================================================

const templateSelect = document.getElementById('templateSelect');
const sectionsContainer = document.getElementById('sectionsContainer');
const previewFrame = document.getElementById('previewFrame');
const btnRefresh = document.getElementById('btnRefresh');
const btnExportHtml = document.getElementById('btnExportHtml');
const btnUndo = document.getElementById('btnUndo');
const btnRedo = document.getElementById('btnRedo');
const btnReset = document.getElementById('btnReset');
const btnImportHtml = document.getElementById('btnImportHtml');
const importFileInput = document.getElementById('importFileInput');
const btnValidate = document.getElementById('btnValidate');
const btnStats = document.getElementById('btnStats');

// Masthead controls
const mastBannerUrl = document.getElementById('mast_banner_url');
const mastBannerAlt = document.getElementById('mast_banner_alt');
const mastTitle = document.getElementById('mast_title');
const mastTagline = document.getElementById('mast_tagline');
const mastPreheader = document.getElementById('mast_preheader');
const heroShow = document.getElementById('hero_show');
const heroLink = document.getElementById('hero_link');

// Footer controls
const footerAddrs = document.getElementById('footerAddrs');
const footBgColor = document.getElementById('foot_bg_color');
const footTextColor = document.getElementById('foot_text_color');
const footLinkColor = document.getElementById('foot_link_color');
const btnAddAddr = document.getElementById('btnAddAddr');

// V7: Social links container
const socialLinksContainer = document.getElementById('socialLinksContainer');
const btnAddSocial = document.getElementById('btnAddSocial');

// Rich text editor modal
const rteModal = document.getElementById('rteModal');
const rteArea = document.getElementById('rteArea');
const rteClose = document.getElementById('rteClose');
const rteCancel = document.getElementById('rteCancel');
const rteSave = document.getElementById('rteSave');

// Plain text modal
const plainTextModal = document.getElementById('plainTextModal');
const plainTextArea = document.getElementById('plainTextArea');
const btnGeneratePlainText = document.getElementById('btnGeneratePlainText');
const btnCopyPlainText = document.getElementById('btnCopyPlainText');
const plainTextClose = document.getElementById('plainTextClose');
const plainTextCancel = document.getElementById('plainTextCancel');

// Validation modal
const validationModal = document.getElementById('validationModal');
const validationResults = document.getElementById('validationResults');
const validationClose = document.getElementById('validationClose');

// Stats modal
const statsModal = document.getElementById('statsModal');
const statsContent = document.getElementById('statsContent');
const statsClose = document.getElementById('statsClose');
const statsClose2 = document.getElementById('statsClose2');

// Table modal controls
const tableModal = document.getElementById('tableModal');
const tableClose = document.getElementById('tableClose');
const tableCancel = document.getElementById('tableCancel');
const tableCreate = document.getElementById('tableCreate');
const tableRowsInput = document.getElementById('tableRows');
const tableColsInput = document.getElementById('tableCols');
const tableIncludeHeader = document.getElementById('tableIncludeHeader');
const tableWidthInput = document.getElementById('tableWidth');
const tableColWidthsInput = document.getElementById('tableColWidths');
const tableBorderStyleSelect = document.getElementById('tableBorderStyle');
const tablePlaceholderCheckbox = document.getElementById('tableShowPlaceholders');
const tableBorderColorInput = document.getElementById('tableBorderColor');
const tableFontSizeInput = document.getElementById('tableFontSize');
const tableHeaderBgInput = document.getElementById('tableHeaderBg');
const tableHeaderLineWidthInput = document.getElementById('tableHeaderLineWidth');
const tableHeaderLineColorInput = document.getElementById('tableHeaderLineColor');

// Table cell modal controls
const tableCellModal = document.getElementById('tableCellModal');
const tableCellClose = document.getElementById('tableCellClose');
const tableCellCancel = document.getElementById('tableCellCancel');
const tableCellApply = document.getElementById('tableCellApply');
const cellApplyScopeSelect = document.getElementById('cellApplyScope');
const cellTextColorInput = document.getElementById('cellTextColor');
const cellBgColorInput = document.getElementById('cellBgColor');
const cellFontSizeInput = document.getElementById('cellFontSize');
const cellFontFamilySelect = document.getElementById('cellFontFamily');
const cellFontWeightSelect = document.getElementById('cellFontWeight');
const cellTextAlignSelect = document.getElementById('cellTextAlign');

let currentRteTarget = null;
let savedSelectionRange = null;
let currentTableElement = null;
let currentTableCell = null;
let tableModalTarget = null;
let tableModalOriginalContent = null;
let tableCellTarget = null;
let toolbarCleanupHandlers = [];
let toolbarHost = null;
let toolbarHostOriginalPosition = null;
let pointerDown = false;
let pendingToolbarTable = null;

// Create debounced update function
const debouncedUpdate = debounce(updatePreview, 400);

// ============================================================
// INITIALIZATION
// ============================================================

function init() {
  console.log(`🚀 WSU Newsletter Editor v${APP_VERSION} initializing...`);

  // NEW: Check for auto-save backup
  const backup = loadFromLocalStorage();
  if (backup) {
    const message = `Found an auto-saved draft from ${backup.ageMinutes} minutes ago. Restore it?`;
    if (confirm(message)) {
      state = backup.data;
      showToast('Draft restored from auto-save', 'success');
      console.log('✅ Restored from auto-save backup');
    } else {
      clearLocalStorage();
    }
  }

  // Ensure state has all required properties
  initializeState();

  // Bind all UI sections
  bindMasthead();
  bindSettings();
  renderSections();
  renderFooter();

  // Align color picker labels (fallback for browsers without :has())
  applyInlineColorLabel();
  initColorPalettes();

  // Template selector
  templateSelect.value = state.template || 'ff';
  templateSelect.addEventListener('change', () => switchTemplate(templateSelect.value));

  // Top bar buttons
  btnRefresh.addEventListener('click', updatePreview);
  btnExportHtml.addEventListener('click', exportHtml);
  btnUndo.addEventListener('click', undo);
  btnRedo.addEventListener('click', redo);
  btnReset.addEventListener('click', resetToDefaults);
  btnImportHtml.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', importHtml);

  if (btnValidate) btnValidate.addEventListener('click', runValidation);
  if (btnStats) btnStats.addEventListener('click', showStats);

  // Rich text editor toolbar
  document.querySelectorAll('.toolbar button[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.execCommand(btn.dataset.cmd, false, null);
      rteArea.focus();
    });
  });

  document.getElementById('btnLink').addEventListener('click', () => {
    const url = prompt('Enter URL:');
    if (url) {
      document.execCommand('createLink', false, url);
      rteArea.focus();
    }
  });

  document.getElementById('btnUL').addEventListener('click', () => {
    document.execCommand('insertUnorderedList');
    rteArea.focus();
  });

  document.getElementById('btnOL').addEventListener('click', () => {
    document.execCommand('insertOrderedList');
    rteArea.focus();
  });

  const btnTable = document.getElementById('btnTable');
  if (btnTable) {
    btnTable.addEventListener('click', () => {
      saveSelection();
      openTableModal(currentTableElement || getSelectionTable());
    });
  }

  document.getElementById('btnClear').addEventListener('click', () => {
    rteArea.innerHTML = '';
    rteArea.focus();
  });

  // NEW: Paste cleaning
  rteArea.addEventListener('paste', (e) => {
    e.preventDefault();

    // Try to get HTML first, fallback to plain text
    let pastedContent = e.clipboardData.getData('text/html');

    if (pastedContent) {
      // Clean the HTML
      const cleaned = cleanHtml(pastedContent);
      document.execCommand('insertHTML', false, cleaned);
      showToast('Pasted and cleaned formatting', 'success');
      console.log('🧹 Cleaned paste:', { original: pastedContent.length, cleaned: cleaned.length });
    } else {
      // Plain text fallback
      pastedContent = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, pastedContent);
    }
  });

  // RTE modal controls
  rteClose.onclick = () => rteModal.classList.add('hidden');
  rteCancel.onclick = () => rteModal.classList.add('hidden');
  rteSave.onclick = saveRteContent;

  // Plain text modal
  if (btnGeneratePlainText) {
    btnGeneratePlainText.addEventListener('click', generatePlainText);
  }
  if (btnCopyPlainText) {
    btnCopyPlainText.addEventListener('click', () => {
      plainTextArea.select();
      document.execCommand('copy');
      showToast('Plain text copied to clipboard', 'success');
    });
  }
  if (plainTextClose) plainTextClose.onclick = () => plainTextModal.classList.add('hidden');
  if (plainTextCancel) plainTextCancel.onclick = () => plainTextModal.classList.add('hidden');

  // Validation modal
  if (validationClose) validationClose.onclick = () => validationModal.classList.add('hidden');

  // Stats modal
  if (statsClose) statsClose.onclick = () => statsModal.classList.add('hidden');

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
      e.preventDefault();
      redo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      exportHtml();
    }
  });

  // Initial preview
  console.log('📸 Generating initial preview...');
  updatePreview();

  // NEW: Start auto-save
  startAutoSave();
}

// Ensure labels that contain color inputs align inline across browsers
function applyInlineColorLabel() {
  document.querySelectorAll('label').forEach((label) => {
    if (label.querySelector("input[type='color']")) {
      label.classList.add('inlineColorLabel');
    }
  });
}

function initializeState() {
  console.log('🔧 Initializing state with V7 defaults...');

  // Ensure settings exists
  if (!state.settings) {
    state.settings = {
      container_width: 640,
      section_spacing: 24,
      show_section_borders: true,
      padding_text: { top: 20, right: 20, bottom: 20, left: 20 },
      padding_image: { top: 0, right: 15, bottom: 0, left: 0 },
      typography: { h2_size: 22, h3_size: 18, body_size: 16 },
      colors: { primary: '#A60F2D', text_dark: '#2A3033', text_body: '#333333' },
    };
  }

  // Ensure masthead has hero controls
  if (!state.masthead) state.masthead = {};
  if (typeof state.masthead.hero_show === 'undefined') state.masthead.hero_show = true;
  if (!state.masthead.hero_link) state.masthead.hero_link = '';
  if (!state.masthead.banner_align) state.masthead.banner_align = 'center';

  // V7: Ensure footer.social is array
  if (!state.footer) state.footer = {};
  if (!state.footer.social || !Array.isArray(state.footer.social)) {
    if (!state.footer.social) {
      state.footer.social = [];
    }
  }

  // V7: Ensure sections have title_align
  if (state.sections) {
    state.sections.forEach((section) => {
      if (!section.layout) {
        section.layout = {
          padding_top: 18,
          padding_bottom: 28,
          background_color: '',
          border_radius: 0,
          divider_enabled: true,
          divider_thickness: 2,
          divider_color: '#e0e0e0',
          divider_spacing: 24,
          title_align: 'left',
        };
      } else if (!section.layout.title_align) {
        section.layout.title_align = 'left';
      }
    });
  }

  console.log('✅ State initialized');
}

// ============================================================
// TEMPLATE SWITCHING
// ============================================================

async function switchTemplate(templateType) {
  if (!confirm('Switch template? This will load default content and discard current edits.')) {
    templateSelect.value = state.template || 'ff';
    return;
  }

  pushHistory();

  try {
    const response = await fetch(`/api/defaults/${templateType}`);
    if (response.ok) {
      state = await response.json();
      rebuildUI(false);
      showToast(
        `Switched to ${templateType === 'ff' ? 'Friday Focus' : 'Briefing'} template`,
        'success'
      );
    } else {
      showToast('Failed to load template defaults', 'error');
    }
  } catch (error) {
    console.error('Error switching template:', error);
    showToast('Error switching template', 'error');
  }
}

async function resetToDefaults() {
  if (confirm('Reset to template defaults? This will discard all current content.')) {
    await switchTemplate(state.template || 'ff');
  }
}

function rebuildUI(pushToHistory = true) {
  if (pushToHistory) pushHistory();

  initializeState();
  bindMasthead();
  bindSettings();
  renderSections();
  renderFooter();
  updatePreview();
}

window.addEventListener('load', init);

// ============================================================
// SETTINGS
// ============================================================

function bindSettings() {
  console.log('🔧 Binding settings controls...');

  // Section spacing
  const sectionSpacingInput = document.getElementById('section_spacing');
  if (sectionSpacingInput) {
    sectionSpacingInput.value = state.settings.section_spacing || 24;
    sectionSpacingInput.addEventListener('input', (e) => {
      state.settings.section_spacing = parseInt(e.target.value, 10) || 24;
      updatePreview();
    });
  }

  // Show borders checkbox
  const showBordersCheckbox = document.getElementById('show_section_borders');
  if (showBordersCheckbox) {
    showBordersCheckbox.checked = state.settings.show_section_borders !== false;
    showBordersCheckbox.addEventListener('change', (e) => {
      state.settings.show_section_borders = e.target.checked;
      updatePreview();
    });
  }

  // Global padding - Text
  const gTextTop = document.getElementById('g_text_pad_top');
  const gTextRight = document.getElementById('g_text_pad_right');
  const gTextBottom = document.getElementById('g_text_pad_bottom');
  const gTextLeft = document.getElementById('g_text_pad_left');

  if (gTextTop && gTextRight && gTextBottom && gTextLeft) {
    gTextTop.value = state.settings.padding_text.top;
    gTextRight.value = state.settings.padding_text.right;
    gTextBottom.value = state.settings.padding_text.bottom;
    gTextLeft.value = state.settings.padding_text.left;

    const updateTextPadding = () => {
      state.settings.padding_text = {
        top: parseInt(gTextTop.value || 0, 10),
        right: parseInt(gTextRight.value || 0, 10),
        bottom: parseInt(gTextBottom.value || 0, 10),
        left: parseInt(gTextLeft.value || 0, 10),
      };
      updatePreview();
    };

    gTextTop.addEventListener('input', updateTextPadding);
    gTextRight.addEventListener('input', updateTextPadding);
    gTextBottom.addEventListener('input', updateTextPadding);
    gTextLeft.addEventListener('input', updateTextPadding);
  }

  // Global padding - Image
  const gImgTop = document.getElementById('g_img_pad_top');
  const gImgRight = document.getElementById('g_img_pad_right');
  const gImgBottom = document.getElementById('g_img_pad_bottom');
  const gImgLeft = document.getElementById('g_img_pad_left');

  if (gImgTop && gImgRight && gImgBottom && gImgLeft) {
    gImgTop.value = state.settings.padding_image.top;
    gImgRight.value = state.settings.padding_image.right;
    gImgBottom.value = state.settings.padding_image.bottom;
    gImgLeft.value = state.settings.padding_image.left;

    const updateImgPadding = () => {
      state.settings.padding_image = {
        top: parseInt(gImgTop.value || 0, 10),
        right: parseInt(gImgRight.value || 0, 10),
        bottom: parseInt(gImgBottom.value || 0, 10),
        left: parseInt(gImgLeft.value || 0, 10),
      };
      updatePreview();
    };

    gImgTop.addEventListener('input', updateImgPadding);
    gImgRight.addEventListener('input', updateImgPadding);
    gImgBottom.addEventListener('input', updateImgPadding);
    gImgLeft.addEventListener('input', updateImgPadding);
  }

  // Container width
  const containerWidthInput = document.getElementById('container_width');
  if (containerWidthInput) {
    containerWidthInput.value = state.settings.container_width || 640;
    containerWidthInput.addEventListener('input', (e) => {
      state.settings.container_width = Math.max(
        560,
        Math.min(700, parseInt(e.target.value || 640, 10))
      );
      updatePreview();
    });
  }

  console.log('✅ Settings controls bound');
}

// ============================================================
// MASTHEAD
// ============================================================

function bindMasthead() {
  console.log('🔧 Binding masthead controls...');

  const mast = state.masthead || {};

  mastBannerUrl.value = mast.banner_url || '';
  mastBannerAlt.value = mast.banner_alt || '';
  mastTitle.value = mast.title || '';
  mastTagline.value = mast.tagline || '';
  mastPreheader.value = mast.preheader || '';

  if (heroShow) heroShow.checked = mast.hero_show !== false;
  if (heroLink) heroLink.value = mast.hero_link || '';

  // Banner alignment control
  const bannerAlign = document.getElementById('banner_align');
  if (bannerAlign) {
    bannerAlign.value = mast.banner_align || 'center';
  }

  // NEW: Banner padding controls
  const bannerPadTop = document.getElementById('banner_pad_top');
  const bannerPadRight = document.getElementById('banner_pad_right');
  const bannerPadBottom = document.getElementById('banner_pad_bottom');
  const bannerPadLeft = document.getElementById('banner_pad_left');

  if (bannerPadTop && bannerPadRight && bannerPadBottom && bannerPadLeft) {
    const padding = mast.banner_padding || { top: 20, right: 0, bottom: 0, left: 0 };
    bannerPadTop.value = padding.top;
    bannerPadRight.value = padding.right;
    bannerPadBottom.value = padding.bottom;
    bannerPadLeft.value = padding.left;
  }

  const updateMasthead = () => {
    state.masthead = state.masthead || {};
    state.masthead.banner_url = mastBannerUrl.value;
    state.masthead.banner_alt = mastBannerAlt.value;
    state.masthead.title = mastTitle.value;
    state.masthead.tagline = mastTagline.value;
    state.masthead.preheader = mastPreheader.value;
    if (heroShow) state.masthead.hero_show = heroShow.checked;
    if (heroLink) state.masthead.hero_link = heroLink.value;
    if (bannerAlign) state.masthead.banner_align = bannerAlign.value;

    // NEW: Save banner padding to state
    if (bannerPadTop) {
      state.masthead.banner_padding = {
        top: parseInt(bannerPadTop.value || 20, 10),
        right: parseInt(bannerPadRight.value || 0, 10),
        bottom: parseInt(bannerPadBottom.value || 0, 10),
        left: parseInt(bannerPadLeft.value || 0, 10),
      };
    }

    markChanged();
  };

  mastBannerUrl.oninput = () => {
    updateMasthead();
    debouncedUpdate();
  };
  mastBannerAlt.oninput = () => {
    updateMasthead();
    debouncedUpdate();
  };
  mastTitle.oninput = () => {
    updateMasthead();
    debouncedUpdate();
  };
  mastTagline.oninput = () => {
    updateMasthead();
    debouncedUpdate();
  };

  if (heroShow) {
    heroShow.onchange = () => {
      updateMasthead();
      updatePreview();
    };
  }

  if (heroLink) {
    heroLink.oninput = () => {
      updateMasthead();
      debouncedUpdate();
    };
  }

  if (bannerAlign) {
    bannerAlign.onchange = () => {
      updateMasthead();
      updatePreview();
    };
  }

  // NEW: Banner padding listeners
  if (bannerPadTop) {
    const updateBannerPadding = () => {
      updateMasthead();
      updatePreview();
    };

    bannerPadTop.addEventListener('input', updateBannerPadding);
    bannerPadRight.addEventListener('input', updateBannerPadding);
    bannerPadBottom.addEventListener('input', updateBannerPadding);
    bannerPadLeft.addEventListener('input', updateBannerPadding);
  }

  // Preheader counter
  const preheaderCounter = document.getElementById('preheaderCounter');
  const preheaderWarning = document.getElementById('preheaderWarning');

  function updatePreheaderCounter() {
    const len = mastPreheader.value.length;
    if (preheaderCounter) preheaderCounter.textContent = len;
    if (preheaderWarning) {
      if (len > 90) {
        preheaderWarning.style.display = 'inline';
        preheaderCounter.style.color = '#dc3545';
      } else {
        preheaderWarning.style.display = 'none';
        preheaderCounter.style.color = len >= 40 ? '#28a745' : '#666';
      }
    }
  }

  mastPreheader.oninput = () => {
    updateMasthead();
    updatePreheaderCounter();
    debouncedUpdate();
  };

  updatePreheaderCounter();
  console.log('✅ Masthead controls bound');
}

// ============================================================
// FOOTER - V7: ARRAY-BASED SOCIAL LINKS
// ============================================================

function renderFooter() {
  console.log('🔧 Rendering footer with V7 array-based social links...');

  state.footer = state.footer || {
    address_lines: [],
    social: [],
    background_color: '#2A3033',
    text_color: '#cccccc',
    link_color: '#ffffff',
    padding_top: 60,
    padding_bottom: 30,
    social_margin_top: 40,
    social_margin_bottom: 20,
  };

  // V7: Ensure social is array
  if (!Array.isArray(state.footer.social)) {
    state.footer.social = [];
  }

  // Render address lines
  footerAddrs.innerHTML = '';

  (state.footer.address_lines || []).forEach((line, idx) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <input type="text" value="${escapeHtml(line)}" data-idx="${idx}" />
      <button data-move="-1" data-idx="${idx}">↑</button>
      <button data-move="1" data-idx="${idx}">↓</button>
      <button class="danger" data-remove="${idx}">Remove</button>
    `;

    const input = row.querySelector('input');
    input.oninput = (e) => {
      state.footer.address_lines[idx] = e.target.value;
      debouncedUpdate();
    };

    row.querySelectorAll('[data-move]').forEach((btn) => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.idx, 10);
        const dir = parseInt(btn.dataset.move, 10);
        const newIdx = i + dir;

        if (newIdx >= 0 && newIdx < state.footer.address_lines.length) {
          pushHistory();
          const temp = state.footer.address_lines[i];
          state.footer.address_lines[i] = state.footer.address_lines[newIdx];
          state.footer.address_lines[newIdx] = temp;
          renderFooter();
          updatePreview();
        }
      };
    });

    row.querySelector('[data-remove]').onclick = () => {
      pushHistory();
      state.footer.address_lines.splice(idx, 1);
      renderFooter();
      updatePreview();
    };

    footerAddrs.appendChild(row);
  });

  btnAddAddr.onclick = () => {
    pushHistory();
    state.footer.address_lines = state.footer.address_lines || [];
    state.footer.address_lines.push('New address line');
    renderFooter();
    updatePreview();
  };

  // V7: Render dynamic social links array
  socialLinksContainer.innerHTML = '';

  (state.footer.social || []).forEach((link, idx) => {
    const socialRow = document.createElement('div');
    socialRow.style.cssText =
      'border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; margin: 10px 0; background: #fafafa;';

    socialRow.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 2fr 2fr auto auto auto; gap: 6px; align-items: center;">
        <input type="text" placeholder="Platform" value="${escapeHtml(link.platform || '')}" class="platform" />
        <input type="url" placeholder="Profile URL" value="${escapeHtml(link.url || '')}" class="url" />
        <input type="url" placeholder="Icon URL" value="${escapeHtml(link.icon || '')}" class="icon" />
        <button data-move="-1" title="Move up">↑</button>
        <button data-move="1" title="Move down">↓</button>
        <button class="danger" data-remove="1">Remove</button>
      </div>
    `;

    socialRow.querySelector('.platform').oninput = (e) => {
      link.platform = e.target.value;
      link.alt = e.target.value;
      debouncedUpdate();
    };

    socialRow.querySelector('.url').oninput = (e) => {
      link.url = e.target.value;
      debouncedUpdate();
    };

    socialRow.querySelector('.icon').oninput = (e) => {
      link.icon = e.target.value;
      debouncedUpdate();
    };

    socialRow.querySelectorAll('[data-move]').forEach((btn) => {
      btn.onclick = () => {
        const dir = parseInt(btn.dataset.move, 10);
        const newIdx = idx + dir;

        if (newIdx >= 0 && newIdx < state.footer.social.length) {
          pushHistory();
          const temp = state.footer.social[idx];
          state.footer.social[idx] = state.footer.social[newIdx];
          state.footer.social[newIdx] = temp;
          renderFooter();
          updatePreview();
        }
      };
    });

    socialRow.querySelector('[data-remove]').onclick = () => {
      if (confirm(`Remove ${link.platform || 'this social link'}?`)) {
        pushHistory();
        state.footer.social.splice(idx, 1);
        renderFooter();
        updatePreview();
      }
    };

    socialLinksContainer.appendChild(socialRow);
  });

  // Add new social link button
  if (btnAddSocial) {
    btnAddSocial.onclick = () => {
      pushHistory();
      state.footer.social = state.footer.social || [];
      state.footer.social.push({
        platform: 'Twitter',
        url: 'https://twitter.com/',
        icon: 'https://example.com/twitter-icon.png',
        alt: 'Twitter',
      });
      renderFooter();
      updatePreview();
      showToast('Social link added', 'success');
    };
  }

  // Footer color controls
  footBgColor.value = state.footer.background_color || '#2A3033';
  footTextColor.value = state.footer.text_color || '#cccccc';
  footLinkColor.value = state.footer.link_color || '#ffffff';

  footBgColor.addEventListener('input', (e) => {
    state.footer.background_color = e.target.value;
    updatePreview();
  });

  footTextColor.addEventListener('input', (e) => {
    state.footer.text_color = e.target.value;
    updatePreview();
  });

  footLinkColor.addEventListener('input', (e) => {
    state.footer.link_color = e.target.value;
    updatePreview();
  });

  // Footer spacing controls
  const footPaddingTop = document.getElementById('foot_padding_top');
  const footPaddingBottom = document.getElementById('foot_padding_bottom');
  const footSocialMarginTop = document.getElementById('foot_social_margin_top');
  const footSocialMarginBottom = document.getElementById('foot_social_margin_bottom');

  if (footPaddingTop) {
    footPaddingTop.value = state.footer.padding_top ?? 60;
    footPaddingTop.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      state.footer.padding_top = Number.isFinite(v) ? v : 60;
      updatePreview();
    });
  }

  if (footPaddingBottom) {
    footPaddingBottom.value = state.footer.padding_bottom ?? 30;
    footPaddingBottom.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      state.footer.padding_bottom = Number.isFinite(v) ? v : 30;
      updatePreview();
    });
  }

  if (footSocialMarginTop) {
    footSocialMarginTop.value = state.footer.social_margin_top ?? 40;
    footSocialMarginTop.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      state.footer.social_margin_top = Number.isFinite(v) ? v : 40;
      updatePreview();
    });
  }

  if (footSocialMarginBottom) {
    footSocialMarginBottom.value = state.footer.social_margin_bottom ?? 20;
    footSocialMarginBottom.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      state.footer.social_margin_bottom = Number.isFinite(v) ? v : 20;
      updatePreview();
    });
  }

  console.log('✅ Footer rendered with', state.footer.social?.length || 0, 'social links');

  // Re-apply inline color label alignment after re-render
  applyInlineColorLabel();
}

// ============================================================
// RICH TEXT EDITOR
// ============================================================

function saveRteContent() {
  if (currentRteTarget) {
    const clone = rteArea.cloneNode(true);
    clone.querySelectorAll('.tableToolbar').forEach((el) => el.remove());
    const cleanedHtml = clone.innerHTML;
    currentRteTarget.card.body_html = cleanedHtml;
    rteArea.innerHTML = cleanedHtml;
    currentRteTarget.bodyPreview.innerHTML = cleanedHtml || '<em>Click Edit to add content</em>';
    markChanged();
    updatePreview();
  }
  rteModal.classList.add('hidden');
}

// ============================================================
// PREVIEW & EXPORT
// ============================================================

function updatePreview() {
  // NEW: Show loading state
  previewFrame.style.opacity = '0.5';
  previewFrame.style.transition = 'opacity 0.2s';

  fetch('/api/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success && data.html) {
        setIframeHtml(previewFrame, data.html);
      } else {
        console.error('Preview generation failed:', data.error);
        showToast('Preview failed: ' + (data.error || 'Unknown error'), 'error');
      }
    })
    .catch((error) => {
      console.error('Preview error:', error);
      showToast('Preview error: ' + error.message, 'error');
    })
    .finally(() => {
      // NEW: Hide loading state
      previewFrame.style.opacity = '1';
    });
}

function exportHtml() {
  const minify = document.getElementById('exportMinify')?.checked || false;
  const stripJSON = document.getElementById('exportStripJSON')?.checked || false;
  const templateType = state.template || templateSelect?.value || 'ff';

  state.template = templateType; // ensure state carries template type for export/import round-trip

  fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...state,
      export_options: { minify, strip_json: stripJSON, template_type: templateType },
    }),
  })
    .then((response) => {
      // V7.0.3: Check response size for Gmail clipping warning
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 102400) {
        showToast('⚠️ Newsletter exceeds 102KB - Gmail may clip it', 'warning');
      }
      return response.blob();
    })
    .then((blob) => {
      // V7.0.3: Additional size check on blob
      if (blob.size > 102400) {
        console.warn(`📧 Export size: ${(blob.size / 1024).toFixed(1)}KB (Gmail clips at ~102KB)`);
        showToast(
          `Export: ${(blob.size / 1024).toFixed(1)}KB - Gmail may clip content over 102KB`,
          'warning'
        );
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        (state.template === 'ff' ? 'Friday_Focus_' : 'Briefing_') +
        new Date().toISOString().slice(0, 10) +
        (stripJSON ? '_PRODUCTION' : '') +
        '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (blob.size <= 102400) {
        showToast('HTML exported successfully', 'success');
      }

      // Clear unsaved changes after successful export
      hasUnsavedChanges = false;
      saveToLocalStorage(); // Update backup
    })
    .catch((error) => {
      console.error('Export error:', error);
      showToast('Export failed: ' + error.message, 'error');
    });
}

function importHtml() {
  const file = importFileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const htmlContent = e.target.result;

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlContent }),
      });

      const result = await response.json();

      if (result.success) {
        pushHistory();
        state = result.data;
        rebuildUI(false);
        showToast('Newsletter imported successfully', 'success');
      } else {
        showToast('Import failed: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Import error:', error);
      showToast('Import failed: ' + error.message, 'error');
    }

    importFileInput.value = '';
  };

  reader.readAsText(file);
}

// ============================================================
// VALIDATION & STATS
// ============================================================

async function runValidation() {
  try {
    const response = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });

    const result = await response.json();

    if (result.success) {
      displayValidationResults(result);
    } else {
      showToast('Validation failed: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Validation error:', error);
    showToast('Validation error: ' + error.message, 'error');
  }
}

function displayValidationResults(result) {
  const issues = result.issues || [];

  if (issues.length === 0) {
    validationResults.innerHTML = `
      <div style="text-align:center; padding:40px;">
        <h3 style="color:#28a745; margin:0 0 10px 0;">✓ No Issues Found</h3>
        <p style="color:#666;">Your newsletter passes all accessibility checks!</p>
      </div>
    `;
  } else {
    const errorCount = result.errors || 0;
    const warningCount = result.warnings || 0;

    let html = `
      <div style="background:#f8f9fa; padding:12px; border-radius:4px; margin-bottom:16px;">
        <strong>Found ${issues.length} issue(s):</strong>
        ${errorCount > 0 ? `<span style="color:#dc3545; margin-left:12px;">${errorCount} error(s)</span>` : ''}
        ${warningCount > 0 ? `<span style="color:#ffc107; margin-left:12px;">${warningCount} warning(s)</span>` : ''}
      </div>
    `;

    issues.forEach((issue) => {
      const color = issue.severity === 'error' ? '#dc3545' : '#ffc107';
      html += `
        <div style="border-left:4px solid ${color}; background:#fff; padding:12px; margin-bottom:12px; border-radius:0 4px 4px 0;">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
            <strong style="color:${color};">${issue.severity === 'error' ? '⚠ Error' : '⚠ Warning'}</strong>
            <span style="color:#666; font-size:12px;">${issue.location}</span>
          </div>
          <p style="margin:0 0 8px 0; color:#333;">${issue.message}</p>
          <p style="margin:0; color:#666; font-size:13px;"><strong>Fix:</strong> ${issue.fix}</p>
        </div>
      `;
    });

    validationResults.innerHTML = html;
  }

  validationModal.classList.remove('hidden');
}

async function showStats() {
  try {
    const response = await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });

    const result = await response.json();

    if (result.success) {
      displayStats(result.stats);
    } else {
      showToast('Stats failed: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Stats error:', error);
    showToast('Stats error: ' + error.message, 'error');
  }
}

function displayStats(stats) {
  statsContent.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
      <div style="background:#f8f9fa; padding:20px; border-radius:8px; text-align:center;">
        <div style="font-size:32px; font-weight:bold; color:#A60F2D;">${stats.word_count}</div>
        <div style="color:#666; margin-top:8px;">Words</div>
      </div>
      <div style="background:#f8f9fa; padding:20px; border-radius:8px; text-align:center;">
        <div style="font-size:32px; font-weight:bold; color:#A60F2D;">${stats.read_time_minutes}</div>
        <div style="color:#666; margin-top:8px;">Min Read</div>
      </div>
      <div style="background:#f8f9fa; padding:20px; border-radius:8px; text-align:center;">
        <div style="font-size:32px; font-weight:bold; color:#A60F2D;">${stats.image_count}</div>
        <div style="color:#666; margin-top:8px;">Images</div>
      </div>
      <div style="background:#f8f9fa; padding:20px; border-radius:8px; text-align:center;">
        <div style="font-size:32px; font-weight:bold; color:#A60F2D;">${stats.link_count}</div>
        <div style="color:#666; margin-top:8px;">Links</div>
      </div>
      <div style="background:#f8f9fa; padding:20px; border-radius:8px; text-align:center;">
        <div style="font-size:32px; font-weight:bold; color:#A60F2D;">${stats.card_count}</div>
        <div style="color:#666; margin-top:8px;">Cards</div>
      </div>
      <div style="background:#f8f9fa; padding:20px; border-radius:8px; text-align:center;">
        <div style="font-size:32px; font-weight:bold; color:#A60F2D;">${stats.section_count}</div>
        <div style="color:#666; margin-top:8px;">Sections</div>
      </div>
    </div>
    <div style="margin-top:16px; padding:16px; background:#e3f2fd; border-radius:8px;">
      <strong style="color:#1976d2;">V7 Feature:</strong>
      <span style="color:#666;">Social Links: ${stats.social_links || 0}</span>
    </div>
  `;

  statsModal.classList.remove('hidden');
}

async function generatePlainText() {
  try {
    const response = await fetch('/api/generate_plaintext', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });

    const result = await response.json();

    if (result.success) {
      plainTextArea.value = result.text;
      plainTextModal.classList.remove('hidden');
    } else {
      showToast('Plain text generation failed: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Plain text error:', error);
    showToast('Plain text error: ' + error.message, 'error');
  }
}

// ============================================================
// SECTIONS
// ============================================================

function renderSections() {
  console.log('🔧 Rendering sections...');
  sectionsContainer.innerHTML = '';

  state.sections = state.sections || [];

  state.sections.forEach((section, sIdx) => {
    if (!section.layout) {
      section.layout = {
        padding_top: 18,
        padding_bottom: 28,
        background_color: '',
        border_radius: 0,
        divider_enabled: true,
        divider_thickness: 2,
        divider_color: '#e0e0e0',
        divider_spacing: 24,
        title_align: 'left',
      };
    } else if (!section.layout.title_align) {
      section.layout.title_align = 'left';
    }

    // V7: Create collapsible wrapper
    const detailsWrapper = document.createElement('details');
    detailsWrapper.open = true;
    detailsWrapper.style.cssText =
      'margin-bottom: 16px; border: 2px dashed #ddd; border-radius: 8px; padding: 8px; background: #fafafa;';

    const summary = document.createElement('summary');
    summary.style.cssText =
      'cursor: pointer; font-weight: 600; color: #333; padding: 8px; user-select: none; list-style: none;';
    summary.innerHTML = `
      <span style="color: #A60F2D;">📄 ${escapeHtml(section.title || section.key)}</span>
      <span style="color: #999; font-weight: normal; font-size: 12px; margin-left: 8px;">
        (${section.cards?.length || 0} cards)
      </span>
    `;

    detailsWrapper.appendChild(summary);

    const secDiv = document.createElement('div');
    secDiv.className = 'sectionEditor';

    secDiv.innerHTML = `
      <div class="sectionHeader">
        <span class="title">${escapeHtml(section.title || section.key)}</span>
        <div class="btnRow">
          <button data-sidx="${sIdx}" data-dir="-1">↑</button>
          <button data-sidx="${sIdx}" data-dir="1">↓</button>
          <button class="danger" data-remove="${sIdx}">Remove Section</button>
        </div>
      </div>
      
      <div class="row">
        <label>Section Title
          <input class="sec_title" type="text" value="${escapeHtml(section.title || '')}" />
        </label>
      </div>
      
      <details style="margin: 12px 0;">
        <summary style="cursor: pointer; font-weight: 600; color: #5E6A71;">Section Layout Settings</summary>
        <div style="padding: 12px; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 4px; margin-top: 8px;">
          
          <div class="row">
            <label>Padding Top (px)
              <input class="layout_padding_top" type="number" min="0" max="60" value="${section.layout.padding_top}" />
            </label>
          </div>
          
          <div class="row">
            <label>Padding Bottom (px)
              <input class="layout_padding_bottom" type="number" min="0" max="60" value="${section.layout.padding_bottom}" />
            </label>
          </div>
          
          <div class="colorRow">
            <label>Background Color</label>
            <input class="layout_bg_color" type="color" value="${section.layout.background_color || '#ffffff'}" />
            <button class="layout_clear_bg" style="margin-left: 8px;">Clear</button>
          </div>
          
          <div class="row">
            <label>Border Radius (px)
              <input class="layout_border_radius" type="number" min="0" max="20" value="${section.layout.border_radius}" />
            </label>
          </div>
          
          <div class="row">
            <label>Title Alignment
              <select class="layout_title_align">
                <option value="left" ${section.layout.title_align === 'left' || !section.layout.title_align ? 'selected' : ''}>Left</option>
                <option value="center" ${section.layout.title_align === 'center' ? 'selected' : ''}>Center</option>
                <option value="right" ${section.layout.title_align === 'right' ? 'selected' : ''}>Right</option>
              </select>
            </label>
          </div>
          
          <h4 style="margin: 16px 0 8px 0;">Section Divider</h4>
          
          <div class="row">
            <label>
              <input class="layout_divider_enabled" type="checkbox" ${section.layout.divider_enabled ? 'checked' : ''} />
              Show divider line below section
            </label>
          </div>
          
          <div class="layout_divider_controls" style="${section.layout.divider_enabled ? '' : 'display:none;'}">
            <div class="row">
              <label>Divider Thickness (px)
                <input class="layout_divider_thickness" type="number" min="1" max="10" value="${section.layout.divider_thickness}" />
              </label>
            </div>
            
            <div class="colorRow">
              <label>Divider Color</label>
              <input class="layout_divider_color" type="color" value="${section.layout.divider_color}" />
            </div>
            
            <div class="row">
              <label>Spacing (border to title, px)
                <input class="layout_divider_spacing" type="number" min="0" max="60" value="${section.layout.divider_spacing}" />
              </label>
            </div>
          </div>
          
        </div>
      </details>
      
      <div class="cards"></div>
      
      ${
        section.key === 'closures'
          ? ''
          : `
        <div class="btnRow">
          <button class="addCard" data-sidx="${sIdx}">+ Add Card</button>
        </div>
      `
      }
    `;

    // Section title editing
    secDiv.querySelector('.sec_title').oninput = (e) => {
      section.title = e.target.value;
      secDiv.querySelector('.sectionHeader .title').textContent = section.title || section.key;
      summary.innerHTML = `
        <span style="color: #A60F2D;">📄 ${escapeHtml(section.title || section.key)}</span>
        <span style="color: #999; font-weight: normal; font-size: 12px; margin-left: 8px;">
          (${section.cards?.length || 0} cards)
        </span>
      `;
      debouncedUpdate();
    };

    // Section layout controls
    const layout = section.layout;

    secDiv.querySelector('.layout_padding_top').addEventListener('input', (e) => {
      layout.padding_top = parseInt(e.target.value, 10) || 18;
      updatePreview();
    });

    secDiv.querySelector('.layout_padding_bottom').addEventListener('input', (e) => {
      layout.padding_bottom = parseInt(e.target.value, 10) || 28;
      updatePreview();
    });

    secDiv.querySelector('.layout_bg_color').addEventListener('input', (e) => {
      layout.background_color = e.target.value;
      updatePreview();
    });

    secDiv.querySelector('.layout_clear_bg').addEventListener('click', () => {
      layout.background_color = '';
      secDiv.querySelector('.layout_bg_color').value = '#ffffff';
      updatePreview();
    });

    secDiv.querySelector('.layout_border_radius').addEventListener('input', (e) => {
      layout.border_radius = parseInt(e.target.value, 10) || 0;
      updatePreview();
    });

    // V7: Title alignment
    secDiv.querySelector('.layout_title_align').addEventListener('change', (e) => {
      layout.title_align = e.target.value;
      updatePreview();
    });

    secDiv.querySelector('.layout_divider_enabled').addEventListener('change', (e) => {
      layout.divider_enabled = e.target.checked;
      secDiv.querySelector('.layout_divider_controls').style.display = e.target.checked
        ? 'block'
        : 'none';
      updatePreview();
    });

    secDiv.querySelector('.layout_divider_thickness').addEventListener('input', (e) => {
      layout.divider_thickness = parseInt(e.target.value, 10) || 2;
      updatePreview();
    });

    secDiv.querySelector('.layout_divider_color').addEventListener('input', (e) => {
      layout.divider_color = e.target.value;
      updatePreview();
    });

    secDiv.querySelector('.layout_divider_spacing').addEventListener('input', (e) => {
      layout.divider_spacing = parseInt(e.target.value, 10) || 24;
      updatePreview();
    });

    // Section reordering
    secDiv.querySelectorAll('[data-dir]').forEach((btn) => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.sidx, 10);
        const dir = parseInt(btn.dataset.dir, 10);
        const newIdx = i + dir;

        if (newIdx >= 0 && newIdx < state.sections.length) {
          pushHistory();
          const temp = state.sections[i];
          state.sections[i] = state.sections[newIdx];
          state.sections[newIdx] = temp;
          renderSections();
          updatePreview();
        }
      };
    });

    // Section removal
    secDiv.querySelector('[data-remove]').onclick = () => {
      if (confirm('Remove this entire section?')) {
        pushHistory();
        state.sections.splice(sIdx, 1);
        renderSections();
        updatePreview();
      }
    };

    // Render cards
    const cardsContainer = secDiv.querySelector('.cards');

    if (section.key === 'closures') {
      renderClosures(cardsContainer, section, sIdx);
    } else {
      section.cards = section.cards || [];
      section.cards.forEach((card, cIdx) => {
        cardsContainer.appendChild(renderCard(section, sIdx, card, cIdx));
      });

      const addCardBtn = secDiv.querySelector('.addCard');
      if (addCardBtn) {
        addCardBtn.onclick = () => addCard(sIdx);
      }
    }

    detailsWrapper.appendChild(secDiv);
    sectionsContainer.appendChild(detailsWrapper);
  });

  // Add new section button
  const addSectionBar = document.createElement('div');
  addSectionBar.className = 'btnRow';
  addSectionBar.innerHTML = `
    <button id="btnAddSection">+ Add New Section</button>
    <button id="btnAddCtaSection">+ Add CTA Section</button>
  `;
  addSectionBar.querySelector('#btnAddSection').onclick = addNewSection;
  addSectionBar.querySelector('#btnAddCtaSection').onclick = addCtaSection;
  sectionsContainer.appendChild(addSectionBar);

  console.log('✅ Sections rendered');

  // Re-apply inline color label alignment after sections render
  applyInlineColorLabel();
}

// Add a preconfigured CTA section so removed 'Submit to Friday Focus' can be re-added
function addCtaSection() {
  pushHistory();

  const isBriefing = (state.template || 'ff') === 'briefing';
  const meta = (state.settings && state.settings.meta) || {};
  const ffUrl = meta.ff_submit_url || 'https://gradschool.wsu.edu/request-for-ff-promotion/';
  const briefingUrl = meta.briefing_submit_url || 'https://gradschool.wsu.edu/listserv/';
  const ctaSection = {
    key: 'submit_request',
    title: '',
    layout: {
      padding_top: 18,
      padding_bottom: 28,
      background_color: '',
      border_radius: 0,
      divider_enabled: true,
      divider_thickness: 2,
      divider_color: '#e0e0e0',
      divider_spacing: 24,
      title_align: 'left',
    },
    cards: [
      {
        type: 'cta',
        title: isBriefing ? 'Submit Your Post' : 'Want to advertise in Friday Focus?',
        body_html: isBriefing
          ? '<p>Share your updates or announcements for the next Graduate School Briefing.</p>'
          : '<p>Submit your events, announcements, and opportunities for the next newsletter.</p>',
        button_bg_color: '#A60F2D',
        button_text_color: '#ffffff',
        button_padding_vertical: 12,
        button_padding_horizontal: 32,
        button_border_width: 0,
        button_border_color: '#8c0d25',
        button_border_radius: 10,
        button_alignment: 'center',
        button_full_width: false,
        links: [
          {
            label: isBriefing ? 'Submit your post' : 'Please use this form',
            url: isBriefing ? briefingUrl : ffUrl,
          },
        ],
      },
    ],
  };

  state.sections = state.sections || [];
  state.sections.push(ctaSection);

  renderSections();
  updatePreview();
  showToast('CTA section added', 'success');
}

function renderClosures(container, section, sIdx) {
  section.closures = section.closures || [];

  const closuresDiv = document.createElement('div');
  closuresDiv.innerHTML = `
    <div class="row">
      <strong>Closures</strong>
      <div class="closuresList"></div>
      <div class="btnRow">
        <button class="addClosure">+ Add Closure</button>
      </div>
    </div>
  `;

  const closuresList = closuresDiv.querySelector('.closuresList');

  section.closures.forEach((closure, cIdx) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <input type="text" placeholder="Date (e.g., Jan 1)" value="${escapeHtml(closure.date || '')}" class="closureDate" style="flex:1;" />
      <input type="text" placeholder="Reason" value="${escapeHtml(closure.reason || '')}" class="closureReason" style="flex:2;" />
      <button class="danger" data-remove="${cIdx}">Remove</button>
    `;

    row.querySelector('.closureDate').oninput = (e) => {
      closure.date = e.target.value;
      debouncedUpdate();
    };

    row.querySelector('.closureReason').oninput = (e) => {
      closure.reason = e.target.value;
      debouncedUpdate();
    };

    row.querySelector('[data-remove]').onclick = () => {
      pushHistory();
      section.closures.splice(cIdx, 1);
      renderSections();
      updatePreview();
    };

    closuresList.appendChild(row);
  });

  closuresDiv.querySelector('.addClosure').onclick = () => {
    pushHistory();
    section.closures.push({ date: '', reason: '' });
    renderSections();
    updatePreview();
  };

  container.appendChild(closuresDiv);
}

function addNewSection() {
  pushHistory();

  const title = prompt('Enter section title:');
  if (!title) return;

  const key = title.toLowerCase().replace(/\s+/g, '_');

  state.sections.push({
    key: key,
    title: title,
    layout: {
      padding_top: 18,
      padding_bottom: 28,
      background_color: '',
      border_radius: 0,
      divider_enabled: true,
      divider_thickness: 2,
      divider_color: '#e0e0e0',
      divider_spacing: 24,
      title_align: 'left',
    },
    cards: [],
  });

  renderSections();
  updatePreview();
  showToast('Section added', 'success');
}

function addCard(sIdx) {
  pushHistory();

  const section = state.sections[sIdx];
  const isResource = section.key === 'resources';
  const isCTA = section.key === 'submit_request';

  const newCard = {
    type: isCTA ? 'cta' : isResource ? 'resource' : 'standard',
    title: 'New Card',
    body_html: '',
    location: '',
    date: '',
    time: '',
    links: [],
    spacing_bottom: 20,
    background_color: '#f9f9f9',
  };

  if (isResource) {
    newCard.show_icon = false;
    newCard.icon_url = '';
    newCard.icon_alt = '';
    newCard.icon_size = 80;
  }

  if (isCTA) {
    newCard.button_bg_color = '#A60F2D';
    newCard.button_text_color = '#ffffff';
    newCard.button_padding_vertical = 12;
    newCard.button_padding_horizontal = 32;
    newCard.button_border_width = 0;
    newCard.button_border_color = '#8c0d25';
    newCard.button_border_radius = 10;
    newCard.button_alignment = 'center';
    newCard.button_full_width = false;
  }

  section.cards = section.cards || [];
  section.cards.push(newCard);

  renderSections();
  updatePreview();
  showToast('Card added', 'success');
}

function renderCard(section, sIdx, card, cIdx) {
  const isResource = section.key === 'resources';
  const isEvent = section.key === 'events';
  const isCTA = card.type === 'cta';

  const cardDiv = document.createElement('div');
  cardDiv.className = 'cardItem';

  cardDiv.innerHTML = `
    <div class="cardHead">
      <span class="titleText">${escapeHtml(card.title || '(untitled)')}</span>
      <div class="btnRow">
        <button class="duplicateCard" title="Duplicate card">📋</button>
        <button data-move="-1">↑</button>
        <button data-move="1">↓</button>
        <button class="danger" data-remove="1">Remove</button>
      </div>
    </div>
    
    <div class="cardFields">
      <label>Title
        <input class="titleInput" type="text" value="${escapeHtml(card.title || '')}" />
      </label>
      
      ${
        !isCTA
          ? `
      <div class="row">
        <label>Location
          <input class="locationInput" type="text" value="${escapeHtml(card.location || '')}" />
        </label>
      </div>
      
      <div class="row">
        <label>Date
          <input class="dateInput" type="text" placeholder="e.g., Friday, October 10, 2025" value="${escapeHtml(card.date || '')}" />
        </label>
      </div>
      
      <div class="row">
        <label>Time
          <input class="timeInput" type="text" placeholder="e.g., 2:00 PM – 4:00 PM" value="${escapeHtml(card.time || '')}" />
        </label>
      </div>
      `
          : ''
      }
      
      ${
        isResource
          ? `
        <div class="row">
          <label>
            <input type="checkbox" class="iconToggle" ${card.show_icon ? 'checked' : ''} />
            Show Icon
          </label>
        </div>
        <div class="row">
          <label>Icon URL
            <input class="iconUrl" type="url" value="${escapeHtml(card.icon_url || '')}" />
          </label>
        </div>
        <div class="row">
          <label>Icon Alt Text
            <input class="iconAlt" type="text" value="${escapeHtml(card.icon_alt || '')}" />
          </label>
        </div>
        <div class="row">
          <label>Icon Size
            <select class="iconSize">
              <option value="60" ${card.icon_size === 60 ? 'selected' : ''}>Small (60×60px)</option>
              <option value="80" ${card.icon_size === 80 || !card.icon_size ? 'selected' : ''}>Medium (80×80px)</option>
              <option value="100" ${card.icon_size === 100 ? 'selected' : ''}>Large (100×100px)</option>
              <option value="120" ${card.icon_size === 120 ? 'selected' : ''}>XL (120×120px)</option>
            </select>
          </label>
        </div>
      `
          : ''
      }
      
      ${
        isCTA
          ? `
        <h4 style="margin: 16px 0 8px 0;">CTA Button Settings</h4>
        
        <div class="colorRow">
          <label>Button Background Color</label>
          <input class="btnBgColor" type="color" value="${card.button_bg_color || '#A60F2D'}" />
        </div>
        
        <div class="colorRow">
          <label>Button Text Color</label>
          <input class="btnTextColor" type="color" value="${card.button_text_color || '#ffffff'}" />
        </div>
        
        <div class="row">
          <label>Vertical Padding (px)
            <input class="btnPadVert" type="number" min="0" max="30" value="${card.button_padding_vertical || 12}" />
          </label>
        </div>
        
        <div class="row">
          <label>Horizontal Padding (px)
            <input class="btnPadHoriz" type="number" min="0" max="60" value="${card.button_padding_horizontal || 32}" />
          </label>
        </div>
        
        <div class="row">
          <label>Border Radius (px)
            <input class="btnBorderRadius" type="number" min="0" max="20" value="${card.button_border_radius || 10}" />
          </label>
        </div>
        
        <div class="row">
          <label>Text Alignment
            <select class="ctaTextAlign">
              <option value="left" ${card.text_alignment === 'left' || !card.text_alignment ? 'selected' : ''}>Left</option>
              <option value="center" ${card.text_alignment === 'center' ? 'selected' : ''}>Center</option>
              <option value="right" ${card.text_alignment === 'right' ? 'selected' : ''}>Right</option>
            </select>
          </label>
        </div>

        <div class="row">
          <label>Button Alignment
            <select class="btnAlign">
              <option value="left" ${card.button_alignment === 'left' ? 'selected' : ''}>Left</option>
              <option value="center" ${card.button_alignment === 'center' || !card.button_alignment ? 'selected' : ''}>Center</option>
              <option value="right" ${card.button_alignment === 'right' ? 'selected' : ''}>Right</option>
            </select>
          </label>
        </div>
        
        <div class="row">
          <label>
            <input type="checkbox" class="btnFullWidth" ${card.button_full_width ? 'checked' : ''} />
            Full Width Button
          </label>
        </div>
      `
          : ''
      }
      
      <div class="row">
        <label>Body Content
          <div class="rtePreview" tabindex="0">${card.body_html || '<em>Click Edit to add content</em>'}</div>
          <div class="btnRow">
            <button class="editRte">Edit Body</button>
          </div>
        </label>
      </div>
      
      <div class="row">
        <strong>Links</strong>
        <div class="linksList"></div>
        <div class="btnRow">
          <button class="addLink">+ Add Link</button>
        </div>
      </div>
      
      <details style="margin: 12px 0;" class="cardAdvancedControls">
        <summary style="cursor: pointer; font-weight: 600; color: #5E6A71;">Card Styling</summary>
        <div style="padding: 12px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 4px; margin-top: 8px;">
          
          <div class="row">
            <label>Card Background Color
              <input class="cardBgColor" type="color" value="${card.background_color || '#f9f9f9'}" />
              <button class="cardClearBg" style="margin-left: 8px;">Clear</button>
            </label>
          </div>
          
          <div class="row">
            <label>Card Bottom Spacing (px)
              <input class="cardSpacing" type="number" min="0" max="60" value="${card.spacing_bottom || 20}" />
            </label>
          </div>
          
        </div>
      </details>
    </div>
  `;

  const titleInput = cardDiv.querySelector('.titleInput');
  const titleText = cardDiv.querySelector('.titleText');
  titleInput.oninput = (e) => {
    card.title = e.target.value;
    titleText.textContent = e.target.value || '(untitled)';
    debouncedUpdate();
  };

  // Location, date, time
  if (!isCTA) {
    cardDiv.querySelector('.locationInput').oninput = (e) => {
      card.location = e.target.value;
      debouncedUpdate();
    };

    cardDiv.querySelector('.dateInput').oninput = (e) => {
      card.date = e.target.value;
      debouncedUpdate();
    };

    cardDiv.querySelector('.timeInput').oninput = (e) => {
      card.time = e.target.value;
      debouncedUpdate();
    };
  }

  // Resource icon controls
  if (isResource) {
    cardDiv.querySelector('.iconToggle').onchange = (e) => {
      card.show_icon = e.target.checked;
      updatePreview();
    };

    cardDiv.querySelector('.iconUrl').oninput = (e) => {
      card.icon_url = e.target.value;
      debouncedUpdate();
    };

    cardDiv.querySelector('.iconAlt').oninput = (e) => {
      card.icon_alt = e.target.value;
      debouncedUpdate();
    };

    cardDiv.querySelector('.iconSize').onchange = (e) => {
      card.icon_size = parseInt(e.target.value, 10);
      updatePreview();
    };
  }

  // CTA button controls
  if (isCTA) {
    cardDiv.querySelector('.btnBgColor').addEventListener('input', (e) => {
      card.button_bg_color = e.target.value;
      updatePreview();
    });

    cardDiv.querySelector('.btnTextColor').addEventListener('input', (e) => {
      card.button_text_color = e.target.value;
      updatePreview();
    });

    cardDiv.querySelector('.btnPadVert').addEventListener('input', (e) => {
      card.button_padding_vertical = parseInt(e.target.value, 10) || 12;
      updatePreview();
    });

    cardDiv.querySelector('.btnPadHoriz').addEventListener('input', (e) => {
      card.button_padding_horizontal = parseInt(e.target.value, 10) || 32;
      updatePreview();
    });

    cardDiv.querySelector('.btnBorderRadius').addEventListener('input', (e) => {
      card.button_border_radius = parseInt(e.target.value, 10) || 10;
      updatePreview();
    });

    cardDiv.querySelector('.btnAlign').addEventListener('change', (e) => {
      card.button_alignment = e.target.value;
      updatePreview();
    });

    const ctaTextAlignSel = cardDiv.querySelector('.ctaTextAlign');
    if (ctaTextAlignSel) {
      ctaTextAlignSel.addEventListener('change', (e) => {
        card.text_alignment = e.target.value;
        updatePreview();
      });
    }

    cardDiv.querySelector('.btnFullWidth').addEventListener('change', (e) => {
      card.button_full_width = e.target.checked;
      updatePreview();
    });
  }

  // Card styling controls
  cardDiv.querySelector('.cardBgColor').addEventListener('input', (e) => {
    card.background_color = e.target.value;
    updatePreview();
  });

  cardDiv.querySelector('.cardClearBg').addEventListener('click', () => {
    card.background_color = '';
    cardDiv.querySelector('.cardBgColor').value = '#f9f9f9';
    updatePreview();
  });

  cardDiv.querySelector('.cardSpacing').addEventListener('input', (e) => {
    card.spacing_bottom = parseInt(e.target.value, 10) || 20;
    updatePreview();
  });

  const bodyPreview = cardDiv.querySelector('.rtePreview');
  cardDiv.querySelector('.editRte').onclick = () => {
    pushHistory();
    currentRteTarget = { card, bodyPreview };
    rteArea.innerHTML = card.body_html || '';
    rteModal.classList.remove('hidden');
    rteArea.focus();
  };

  cardDiv.querySelector('.duplicateCard').onclick = () => {
    pushHistory();
    const duplicate = clone(card);
    duplicate.title = (duplicate.title || '') + ' (Copy)';
    section.cards.splice(cIdx + 1, 0, duplicate);
    renderSections();
    updatePreview();
    showToast('Card duplicated', 'success');
  };

  cardDiv.querySelector('[data-remove]').onclick = () => {
    if (confirm('Remove this card?')) {
      pushHistory();
      section.cards.splice(cIdx, 1);
      renderSections();
      updatePreview();
      showToast('Card removed', 'info');
    }
  };

  cardDiv.querySelectorAll('[data-move]').forEach((btn) => {
    btn.onclick = () => {
      const dir = parseInt(btn.dataset.move, 10);
      const newIdx = cIdx + dir;

      if (newIdx >= 0 && newIdx < section.cards.length) {
        pushHistory();
        const temp = section.cards[cIdx];
        section.cards[cIdx] = section.cards[newIdx];
        section.cards[newIdx] = temp;
        renderSections();
        updatePreview();
      }
    };
  });

  renderCardLinks(cardDiv, card);

  return cardDiv;
}

function renderCardLinks(cardDiv, card) {
  card.links = card.links || [];

  const linksList = cardDiv.querySelector('.linksList');
  linksList.innerHTML = '';

  // Show bullet indicator if 2+ links
  const showBullets = card.links.length >= 2;

  card.links.forEach((link, lIdx) => {
    const linkRow = document.createElement('div');
    linkRow.className = 'row';

    const bulletIndicator = showBullets
      ? '<span style="margin-right: 8px; font-weight: bold;">•</span>'
      : '';

    linkRow.innerHTML = `
      ${bulletIndicator}
      <input type="text" placeholder="Label" value="${escapeHtml(link.label || '')}" class="linkLabel" />
      <input type="url" placeholder="URL" value="${escapeHtml(link.url || '')}" class="linkUrl" />
      <button class="secondary" data-move="-1" ${lIdx === 0 ? 'disabled' : ''} title="Move up">↑</button>
      <button class="secondary" data-move="1" ${lIdx === card.links.length - 1 ? 'disabled' : ''} title="Move down">↓</button>
      <button class="danger" data-remove="${lIdx}">Remove</button>
    `;

    linkRow.querySelector('.linkLabel').oninput = (e) => {
      link.label = e.target.value;
      debouncedUpdate();
      markChanged();
    };

    linkRow.querySelector('.linkUrl').oninput = (e) => {
      link.url = e.target.value;
      debouncedUpdate();
      markChanged();
    };

    // Link reordering
    linkRow.querySelectorAll('[data-move]').forEach((btn) => {
      btn.onclick = () => {
        const dir = parseInt(btn.dataset.move, 10);
        const newIdx = lIdx + dir;

        if (newIdx >= 0 && newIdx < card.links.length) {
          pushHistory();
          const temp = card.links[lIdx];
          card.links[lIdx] = card.links[newIdx];
          card.links[newIdx] = temp;
          renderCardLinks(cardDiv, card);
          updatePreview();
        }
      };
    });

    linkRow.querySelector('[data-remove]').onclick = () => {
      pushHistory();
      card.links.splice(lIdx, 1);
      renderCardLinks(cardDiv, card);
      updatePreview();
    };

    linksList.appendChild(linkRow);
  });

  cardDiv.querySelector('.addLink').onclick = () => {
    pushHistory();
    card.links.push({ label: '', url: '' });
    renderCardLinks(cardDiv, card);
    updatePreview();
  };
}

console.log(`✅ WSU Newsletter Editor v${APP_VERSION} loaded`);

function openTableModal(targetTable = null) {
  if (!tableModal) {
    return;
  }

  initColorPalettes(tableModal);

  if (targetTable) {
    tableModalTarget = targetTable;
  } else if (!tableModalTarget) {
    tableModalTarget = currentTableElement || getSelectionTable();
  }

  if (tableModalTarget) {
    prefillTableModalFromTable(tableModalTarget);
  } else {
    tableModalOriginalContent = null;
    tableRowsInput.value = tableRowsInput.value || '3';
    tableColsInput.value = tableColsInput.value || '2';
    tableIncludeHeader.checked = true;
    if (!tableWidthInput.value) {
      tableWidthInput.value = '100%';
    }
    tableColWidthsInput.value = '';
    tableBorderStyleSelect.value = 'light';
    if (tableBorderColorInput) {
      tableBorderColorInput.value = DEFAULT_BORDER_COLOR;
    }
    if (tableFontSizeInput) {
      tableFontSizeInput.value = '16';
    }
    if (tableHeaderBgInput) {
      tableHeaderBgInput.value = '#f4f4f4';
    }
    if (tableHeaderLineWidthInput) {
      tableHeaderLineWidthInput.value = '0';
    }
    if (tableHeaderLineColorInput) {
      tableHeaderLineColorInput.value = DEFAULT_BORDER_COLOR;
    }
    if (tablePlaceholderCheckbox) {
      tablePlaceholderCheckbox.checked = true;
    }
  }

  tableModal.classList.remove('hidden');
  tableRowsInput.focus();
}

function closeTableModal() {
  if (tableModal) {
    tableModal.classList.add('hidden');
  }
  tableModalTarget = null;
  tableModalOriginalContent = null;
}

function buildTableHtml({
  rows,
  cols,
  includeHeader,
  tableWidth,
  columnWidths,
  borderStyle,
  borderColor,
  showPlaceholders,
  fontSize,
  headerBgColor,
  headerUnderlineWidth,
  headerUnderlineColor,
}) {
  const safeRows = Math.max(1, rows);
  const safeCols = Math.max(1, cols);
  const bodyRows = includeHeader ? Math.max(0, safeRows - 1) : safeRows;

  const normalizeWidth = (width) => {
    if (!width) return '';
    const trimmed = width.trim();
    if (!trimmed) return '';
    if (/^(\d+%|\d+px)$/i.test(trimmed)) {
      return trimmed;
    }
    if (/^\d+$/.test(trimmed)) {
      return `${trimmed}px`;
    }
    return '';
  };

  const normalizedTableWidth = normalizeWidth(tableWidth) || '100%';
  const tableStyles = [
    `width:${normalizedTableWidth}`,
    'border-collapse:collapse',
    'margin:12px 0',
  ];
  if (fontSize && Number.isFinite(fontSize)) {
    tableStyles.push(`font-size:${fontSize}px`);
  }

  const resolvedBorderColor = borderColor || DEFAULT_BORDER_COLOR;
  let cellBorder;
  let headerBorder;
  if (borderStyle === 'none') {
    cellBorder = 'border:0;';
    headerBorder = 'border:0;';
  } else {
    const width = borderStyle === 'medium' ? '2px' : '1px';
    cellBorder = `border:${width} solid ${resolvedBorderColor};`;
    headerBorder = `border:${width} solid ${resolvedBorderColor};`;
  }

  const headerBg = headerBgColor || '#f4f4f4';
  const headerLineW = Number.isFinite(headerUnderlineWidth) ? Math.max(0, headerUnderlineWidth) : 0;
  const headerLineColorValue = headerUnderlineColor || resolvedBorderColor;

  let headerCellStyle = `padding:8px 10px; ${headerBorder} background-color:${headerBg}; text-align:left; font-weight:bold;`;
  if (headerLineW > 0) {
    headerCellStyle += ` border-bottom:${headerLineW}px solid ${headerLineColorValue};`;
  }

  const cellStyle = `padding:8px 10px; ${cellBorder} text-align:left;`;

  const widths = columnWidths.map((w) => normalizeWidth(w)).filter((w) => w.length > 0);

  const getWidthStyle = (index) => {
    if (!widths.length) {
      return '';
    }
    const width = widths[index] || widths[widths.length - 1];
    return width ? `width:${width};` : '';
  };

  let html = `<table role="presentation" style="${tableStyles.join('; ')}">`;

  if (includeHeader) {
    html += '<thead><tr>';
    for (let c = 0; c < safeCols; c += 1) {
      html += `<th style="${headerCellStyle}${getWidthStyle(c)}">Header ${c + 1}</th>`;
    }
    html += '</tr></thead>';
  }

  html += '<tbody>';
  for (let r = 0; r < bodyRows; r += 1) {
    html += '<tr>';
    for (let c = 0; c < safeCols; c += 1) {
      const content = showPlaceholders ? `Cell ${r + 1}-${c + 1}` : '';
      html += `<td style="${cellStyle}${getWidthStyle(c)}">${content}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';

  return html;
}

if (tableClose) {
  tableClose.onclick = closeTableModal;
}
if (tableCancel) {
  tableCancel.onclick = closeTableModal;
}
if (tableModal) {
  tableModal.addEventListener('click', (e) => {
    if (e.target === tableModal) {
      closeTableModal();
    }
  });
}
if (tableCreate) {
  tableCreate.onclick = () => {
    const rows = parseInt(tableRowsInput.value || '3', 10);
    const cols = parseInt(tableColsInput.value || '2', 10);
    if (Number.isNaN(rows) || rows < 1 || Number.isNaN(cols) || cols < 1) {
      showToast('Please enter valid row and column counts.', 'error');
      return;
    }
    const tableWidth = (tableWidthInput.value || '100%').trim();
    const colWidths = (tableColWidthsInput.value || '').split(',').map((w) => w.trim());
    const fontSize = tableFontSizeInput
      ? parseInt(tableFontSizeInput.value || '16', 10)
      : undefined;
    const headerBg = tableHeaderBgInput?.value || '#f4f4f4';
    const headerLineWidth = tableHeaderLineWidthInput
      ? parseInt(tableHeaderLineWidthInput.value || '0', 10)
      : 0;
    const headerLineColor =
      tableHeaderLineColorInput?.value ||
      (tableBorderColorInput && tableBorderColorInput.value) ||
      DEFAULT_BORDER_COLOR;

    const html = buildTableHtml({
      rows,
      cols,
      includeHeader: tableIncludeHeader.checked,
      tableWidth,
      columnWidths: colWidths,
      borderStyle: tableBorderStyleSelect.value,
      borderColor: (tableBorderColorInput && tableBorderColorInput.value) || DEFAULT_BORDER_COLOR,
      showPlaceholders: !tablePlaceholderCheckbox || tablePlaceholderCheckbox.checked,
      fontSize: Number.isFinite(fontSize) ? fontSize : undefined,
      headerBgColor: headerBg,
      headerUnderlineWidth: headerLineWidth,
      headerUnderlineColor: headerLineColor,
    });

    const targetTable =
      tableModalTarget && document.body.contains(tableModalTarget) ? tableModalTarget : null;
    const originalContent = targetTable ? tableModalOriginalContent : null;
    if (targetTable) {
      replaceTableWithHtml(targetTable, html, originalContent);
    } else {
      restoreSelection();
      document.execCommand('insertHTML', false, html);
      markChanged();
      debouncedUpdate();
    }
    rteArea.focus();
    closeTableModal();
    showToast('Table inserted. Replace placeholders with your content.', 'info');
    tableModalTarget = null;
  };
}

// Helper functions for table detection
function getSelectionTableCell() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!range) return null;
  let node = range.startContainer;
  if (node.nodeType === 3) {
    node = node.parentElement;
  }
  if (!(node instanceof Element)) return null;
  return node.closest('td, th');
}

function getSelectionTable() {
  const cell = getSelectionTableCell();
  if (!cell) return null;
  return cell.closest('table');
}

function getTableColumnCount(table) {
  const firstRow = table.querySelector('tr');
  return firstRow ? firstRow.children.length : 1;
}

function ensureTableBody(table) {
  let tbody = table.tBodies && table.tBodies.length ? table.tBodies[0] : null;
  if (!tbody) {
    tbody = document.createElement('tbody');
    Array.from(table.querySelectorAll('tr')).forEach((tr) => {
      if (!tr.parentElement || tr.parentElement.tagName === 'THEAD') {
        return;
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
  }
  return tbody;
}

function applyCellStyle(sourceCell, targetCell, fallbackStyle) {
  if (sourceCell && sourceCell.getAttribute && sourceCell.getAttribute('style')) {
    targetCell.setAttribute('style', sourceCell.getAttribute('style'));
  } else if (fallbackStyle) {
    targetCell.setAttribute('style', fallbackStyle);
  }
}

function rgbToHex(colorString, fallback = DEFAULT_BORDER_COLOR) {
  if (!colorString) return fallback;
  const normalized = colorString.trim().toLowerCase();
  if (normalized === 'transparent') return fallback;
  const directRgba = normalized.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/i);
  if (directRgba && parseFloat(directRgba[1]) === 0) {
    return fallback;
  }
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = normalized;
  const computed = ctx.fillStyle;
  if (computed.startsWith('#')) return computed;
  const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/i);
  if (!match) return fallback;
  if (match[4] !== undefined && parseFloat(match[4]) === 0) {
    return fallback;
  }
  const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
  const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
  const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

let currentTableToolbar = null;

function removeTableToolbar() {
  if (currentTableToolbar && currentTableToolbar.parentElement) {
    currentTableToolbar.parentElement.removeChild(currentTableToolbar);
  }
  currentTableToolbar = null;
  toolbarCleanupHandlers.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('Failed to cleanup toolbar handler', err);
    }
  });
  toolbarCleanupHandlers = [];
  if (toolbarHost && toolbarHostOriginalPosition !== null) {
    toolbarHost.style.position = toolbarHostOriginalPosition || '';
  }
  toolbarHost = null;
  toolbarHostOriginalPosition = null;
}

function createTableToolbar(table) {
  removeTableToolbar();
  if (!table || !table.parentElement) return;

  const host = table.parentElement;
  toolbarHost = host;
  const hostStyle = window.getComputedStyle(host);
  if (hostStyle.position === 'static') {
    toolbarHostOriginalPosition = host.style.position;
    host.style.position = 'relative';
  } else {
    toolbarHostOriginalPosition = null;
  }

  const toolbar = document.createElement('div');
  toolbar.className = 'tableToolbar';
  toolbar.innerHTML = `
    <button data-action="add-row">+ Row</button>
    <button data-action="add-col">+ Column</button>
    <button data-action="del-row">Delete Row</button>
    <button data-action="del-col">Delete Column</button>
    <button data-action="clear-cell">Clear Cell</button>
    <button data-action="format-cell">Format Cell</button>
    <button data-action="open-modal">Open Table Modal</button>
  `;

  toolbar.addEventListener('mousedown', (e) => e.preventDefault());
  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    e.preventDefault();
    handleTableToolbarAction(btn.dataset.action);
  });

  host.appendChild(toolbar);
  currentTableToolbar = toolbar;
  positionToolbarRelativeToTable(table);

  const updatePosition = () => {
    if (!currentTableToolbar) return;
    positionToolbarRelativeToTable(table);
  };
  window.addEventListener('resize', updatePosition);
  if (host !== document.body) {
    host.addEventListener('scroll', updatePosition, true);
  }
  toolbarCleanupHandlers = [
    () => window.removeEventListener('resize', updatePosition),
    () => host.removeEventListener('scroll', updatePosition, true),
  ];
}

document.addEventListener('selectionchange', () => {
  const table = getSelectionTable();
  if (table) {
    currentTableElement = table;
    currentTableCell = getSelectionTableCell();
    if (pointerDown) {
      pendingToolbarTable = table;
    } else {
      createTableToolbar(table);
    }
  } else {
    currentTableElement = null;
    currentTableCell = null;
    pendingToolbarTable = null;
    removeTableToolbar();
  }
});

document.addEventListener('pointerdown', (e) => {
  pointerDown = true;
  const table = e.target instanceof Element ? e.target.closest('table') : null;
  if (table) {
    pendingToolbarTable = table;
    removeTableToolbar();
  } else {
    pendingToolbarTable = null;
  }
});

document.addEventListener('pointerup', () => {
  pointerDown = false;
  if (pendingToolbarTable) {
    createTableToolbar(pendingToolbarTable);
    pendingToolbarTable = null;
  }
});

function handleTableToolbarAction(action) {
  const cell = getSelectionTableCell();
  const table = getSelectionTable();
  if (!table) {
    showToast('Place cursor inside a table first.', 'info');
    return;
  }

  const row = cell ? cell.parentElement : null;
  let modified = false;
  switch (action) {
    case 'add-row': {
      const colCount = getTableColumnCount(table);
      const targetBody = ensureTableBody(table);
      const referenceRow =
        row && row.parentElement === targetBody ? row : targetBody.querySelector('tr');
      const newRow = document.createElement('tr');
      for (let i = 0; i < colCount; i += 1) {
        const newCell = document.createElement('td');
        const referenceCell = referenceRow ? referenceRow.children[i] : null;
        applyCellStyle(referenceCell, newCell, TABLE_DEFAULT_CELL_STYLE);
        if (referenceCell) {
          newCell.style.textAlign =
            referenceCell.style.textAlign ||
            referenceCell.style.getPropertyValue('text-align') ||
            '';
          newCell.style.fontSize = referenceCell.style.fontSize || '';
          newCell.style.fontWeight = referenceCell.style.fontWeight || '';
          newCell.style.color = referenceCell.style.color || '';
          newCell.style.backgroundColor = referenceCell.style.backgroundColor || '';
          newCell.style.fontFamily = referenceCell.style.fontFamily || '';
        }
        newCell.innerHTML = '';
        newRow.appendChild(newCell);
      }
      const insertPosition = row && row.parentElement === targetBody ? row.nextSibling : null;
      targetBody.insertBefore(newRow, insertPosition);
      modified = true;
      break;
    }
    case 'add-col': {
      const allRows = Array.from(table.querySelectorAll('tr'));
      allRows.forEach((tr) => {
        const cellTag = tr.parentElement && tr.parentElement.tagName === 'THEAD' ? 'th' : 'td';
        const newCell = document.createElement(cellTag);
        const referenceCell = tr.children.length ? tr.children[tr.children.length - 1] : null;
        applyCellStyle(
          referenceCell,
          newCell,
          cellTag === 'th' ? TABLE_DEFAULT_HEADER_STYLE : TABLE_DEFAULT_CELL_STYLE
        );
        if (referenceCell) {
          newCell.style.textAlign =
            referenceCell.style.textAlign ||
            referenceCell.style.getPropertyValue('text-align') ||
            '';
          newCell.style.fontSize = referenceCell.style.fontSize || '';
          newCell.style.fontWeight = referenceCell.style.fontWeight || '';
          newCell.style.color = referenceCell.style.color || '';
          newCell.style.backgroundColor = referenceCell.style.backgroundColor || '';
          newCell.style.fontFamily = referenceCell.style.fontFamily || '';
        }
        newCell.innerHTML = '';
        tr.appendChild(newCell);
      });
      modified = true;
      break;
    }
    case 'del-row': {
      if (row) {
        row.remove();
        modified = true;
      }
      break;
    }
    case 'del-col': {
      if (!cell) break;
      const colIndex = Array.from(cell.parentElement.children).indexOf(cell);
      Array.from(table.querySelectorAll('tr')).forEach((tr) => {
        const target = tr.children[colIndex];
        if (target) target.remove();
      });
      modified = true;
      break;
    }
    case 'clear-cell': {
      if (cell) cell.innerHTML = '';
      modified = true;
      break;
    }
    case 'format-cell': {
      const targetCell = cell || currentTableCell || getSelectionTableCell();
      if (!targetCell) {
        showToast('Place cursor inside a table cell first.', 'info');
        return;
      }
      openTableCellModal(targetCell);
      break;
    }
    case 'open-modal': {
      saveSelection();
      tableModalTarget = table;
      openTableModal(table);
      break;
    }
    default:
      break;
  }

  if (modified) {
    markChanged();
    debouncedUpdate();
  }
}

function replaceCurrentTableWithHtml(html) {
  const table = getSelectionTable();
  if (!table) {
    showToast('Place cursor inside a table before updating.', 'error');
    return;
  }
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const newTable = temp.querySelector('table');
  if (!newTable) return;
  table.replaceWith(newTable);
  const selection = window.getSelection();
  if (selection && newTable.querySelector('td, th')) {
    const cell = newTable.querySelector('td, th');
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  markChanged();
  debouncedUpdate();
}

function saveSelection() {
  savedSelectionRange = null;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    savedSelectionRange = sel.getRangeAt(0).cloneRange();
  }
}

function restoreSelection() {
  if (!savedSelectionRange) return;
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(savedSelectionRange);
}

const DEFAULT_BORDER_COLOR = '#dddddd';
const TABLE_DEFAULT_CELL_STYLE = `padding:8px 10px; border:1px solid ${DEFAULT_BORDER_COLOR}; text-align:left;`;
const TABLE_DEFAULT_HEADER_STYLE = `padding:8px 10px; border:1px solid ${DEFAULT_BORDER_COLOR}; background-color:#f4f4f4; text-align:left; font-weight:bold;`;

function replaceTableWithHtml(targetTable, html, originalContent = null) {
  if (!targetTable) {
    showToast('Place cursor inside a table before updating.', 'error');
    return;
  }
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const newTable = temp.querySelector('table');
  if (!newTable) return;
  if (originalContent) {
    applyOriginalContent(newTable, originalContent);
  }
  targetTable.replaceWith(newTable);
  const selection = window.getSelection();
  if (selection && newTable.querySelector('td, th')) {
    const cell = newTable.querySelector('td, th');
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  markChanged();
  debouncedUpdate();
}

function prefillTableModalFromTable(table) {
  if (!table) {
    tableModalOriginalContent = null;
    return;
  }

  const snapshot = snapshotOriginalTable(table);
  tableModalOriginalContent = extractTableContent(snapshot);

  const headerLen = tableModalOriginalContent.header.length;
  const bodyLen = tableModalOriginalContent.body.length;
  const totalRows = headerLen + bodyLen;
  const referenceRow =
    tableModalOriginalContent.header[0] || tableModalOriginalContent.body[0] || [];
  const totalCols = referenceRow.length || getTableColumnCount(table);

  if (tableRowsInput) {
    tableRowsInput.value = String(totalRows || table.querySelectorAll('tr').length || 1);
  }
  if (tableColsInput) {
    tableColsInput.value = String(totalCols || 2);
  }
}

function extractTableContent(table) {
  const content = {
    header: [],
    body: [],
  };

  const headerRows = table.querySelectorAll('thead tr');
  if (headerRows.length) {
    headerRows.forEach((row) => {
      content.header.push(Array.from(row.children).map((cell) => cell.innerHTML));
    });
  }

  let bodyRows = table.querySelectorAll('tbody tr');
  if (!bodyRows.length) {
    bodyRows = table.querySelectorAll('tr');
    if (content.header.length) {
      // skip header row already captured
      const skip = content.header.length;
      bodyRows = Array.from(bodyRows).slice(skip);
    }
  }
  bodyRows.forEach((row) => {
    content.body.push(Array.from(row.children).map((cell) => cell.innerHTML));
  });

  return content;
}

function applyOriginalContent(newTable, originalContent) {
  if (!originalContent) return;

  const headerRows = newTable.querySelectorAll('thead tr');
  headerRows.forEach((row, rowIndex) => {
    const originalRow = originalContent.header[rowIndex];
    if (!originalRow) return;
    Array.from(row.children).forEach((cell, cellIndex) => {
      if (originalRow[cellIndex] !== undefined) {
        cell.innerHTML = originalRow[cellIndex];
      }
    });
  });

  const bodyRows = newTable.querySelectorAll('tbody tr');
  bodyRows.forEach((row, rowIndex) => {
    const originalRow = originalContent.body[rowIndex];
    if (!originalRow) return;
    Array.from(row.children).forEach((cell, cellIndex) => {
      if (originalRow[cellIndex] !== undefined) {
        cell.innerHTML = originalRow[cellIndex];
      }
    });
  });
}

function openTableCellModal(cell) {
  if (!tableCellModal || !cell) {
    return;
  }
  initColorPalettes(tableCellModal);
  tableCellTarget = cell;
  const computed = window.getComputedStyle(cell);
  if (cellTextColorInput) {
    cellTextColorInput.value = rgbToHex(computed.color, '#000000');
  }
  if (cellBgColorInput) {
    cellBgColorInput.value = rgbToHex(computed.backgroundColor, '#FFFFFF');
  }
  if (cellFontSizeInput) {
    const size = parseInt(computed.fontSize, 10);
    cellFontSizeInput.value = Number.isFinite(size) ? size : 16;
  }
  if (cellFontWeightSelect) {
    const weight = parseInt(computed.fontWeight, 10);
    cellFontWeightSelect.value = weight >= 600 ? '700' : '400';
  }
  if (cellFontFamilySelect) {
    const computedFamily = (computed.fontFamily || '').toLowerCase().replace(/["']/g, '');
    let matchedFamily = '';
    TABLE_FONT_OPTIONS.forEach((opt) => {
      if (!opt.value) return;
      const normalizedOption = opt.value.toLowerCase().replace(/["']/g, '');
      if (
        computedFamily.startsWith(normalizedOption) ||
        normalizedOption.startsWith(computedFamily)
      ) {
        matchedFamily = opt.value;
      }
    });
    cellFontFamilySelect.value = matchedFamily;
  }
  if (cellTextAlignSelect) {
    cellTextAlignSelect.value = computed.textAlign || 'left';
  }
  if (cellApplyScopeSelect) {
    cellApplyScopeSelect.value = 'cell';
  }
  tableCellModal.classList.remove('hidden');
}

function closeTableCellModal() {
  if (tableCellModal) {
    tableCellModal.classList.add('hidden');
  }
  tableCellTarget = null;
}

function applyStylesToCell(cell, styles) {
  if (!cell) return;
  const { textColor, backgroundColor, fontSize, fontWeight, textAlign, fontFamily } = styles;

  if (textColor) cell.style.color = textColor;
  if (backgroundColor) cell.style.backgroundColor = backgroundColor;
  if (fontSize) cell.style.fontSize = `${fontSize}px`;
  if (fontWeight) cell.style.fontWeight = fontWeight;
  if (textAlign) {
    cell.style.textAlign = textAlign;
  } else if (!cell.style.textAlign) {
    cell.style.textAlign = 'left';
  }
  if (fontFamily !== undefined) {
    if (fontFamily) {
      cell.style.fontFamily = fontFamily;
    } else {
      cell.style.fontFamily = '';
    }
  }
}

if (tableCellClose) {
  tableCellClose.onclick = closeTableCellModal;
}
if (tableCellCancel) {
  tableCellCancel.onclick = closeTableCellModal;
}
if (tableCellModal) {
  tableCellModal.addEventListener('click', (e) => {
    if (e.target === tableCellModal) {
      closeTableCellModal();
    }
  });
}
if (tableCellApply) {
  tableCellApply.onclick = () => {
    if (!tableCellTarget) {
      closeTableCellModal();
      return;
    }

    const textColor = cellTextColorInput?.value || '';
    const backgroundColor = cellBgColorInput?.value || '';
    const fontSizeValue = cellFontSizeInput
      ? parseInt(cellFontSizeInput.value || '16', 10)
      : undefined;
    const fontSize = Number.isFinite(fontSizeValue) ? fontSizeValue : undefined;
    const fontFamily = cellFontFamilySelect ? cellFontFamilySelect.value : '';
    const fontWeight = cellFontWeightSelect?.value || '400';
    const textAlign = cellTextAlignSelect?.value || 'left';
    const scope = cellApplyScopeSelect?.value || 'cell';

    const styles = {
      textColor,
      backgroundColor,
      fontSize,
      fontWeight,
      textAlign,
      fontFamily,
    };

    const table = tableCellTarget.closest('table');
    if (!table) {
      closeTableCellModal();
      return;
    }

    if (scope === 'row') {
      const row = tableCellTarget.parentElement;
      Array.from(row.children).forEach((c) => applyStylesToCell(c, styles));
    } else if (scope === 'column') {
      const colIndex = Array.from(tableCellTarget.parentElement.children).indexOf(tableCellTarget);
      Array.from(table.querySelectorAll('tr')).forEach((tr) => {
        const target = tr.children[colIndex];
        if (target) applyStylesToCell(target, styles);
      });
    } else {
      applyStylesToCell(tableCellTarget, styles);
    }

    const sel = window.getSelection();
    if (sel) {
      const focusCell = tableCellTarget;
      const range = document.createRange();
      range.selectNodeContents(focusCell);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    markChanged();
    debouncedUpdate();
    closeTableCellModal();
  };
}

const WSU_COLOR_PALETTE = [
  { label: 'Crimson', value: '#A60F2D' },
  { label: 'Gray', value: '#4D4D4D' },
  { label: 'Red', value: '#CA1237' },
  { label: 'Black', value: '#000000' },
  { label: 'White', value: '#FFFFFF' },
  { label: 'Light Panel', value: '#F7F7F7' },
  { label: 'Card Gray', value: '#F4F4F4' },
  { label: 'Divider Gray', value: '#E0E0E0' },
  { label: 'Black 80%', value: '#333333' },
  { label: 'Black 70%', value: '#4D4D4D' },
  { label: 'Black 60%', value: '#666666' },
  { label: 'Black 50%', value: '#808080' },
  { label: 'Black 40%', value: '#999999' },
  { label: 'Black 30%', value: '#B3B3B3' },
  { label: 'Autumn', value: '#FF6727' },
  { label: 'Goldfinch', value: '#F3E700' },
  { label: 'Vineyard', value: '#AADC24' },
  { label: 'Pacific Sky', value: '#5BC3F5' },
  { label: 'Midnight', value: '#002D61' },
];

const TABLE_FONT_OPTIONS = [
  { label: 'Match section font', value: '' },
  { label: 'Open Sans', value: "'Open Sans', Arial, sans-serif" },
  { label: 'Arial / Helvetica', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia / Times New Roman', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Tahoma', value: "'Tahoma', Geneva, sans-serif" },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
];

function attachColorPalette(input) {
  if (!input || input.dataset.paletteAttached) return;
  const container = document.createElement('div');
  container.className = 'colorPalette';

  WSU_COLOR_PALETTE.forEach((color) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'colorSwatch';
    swatch.style.backgroundColor = color.value;
    swatch.title = `${color.label} (${color.value})`;
    swatch.addEventListener('click', () => {
      input.value = color.value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    container.appendChild(swatch);
  });

  input.parentElement.appendChild(container);
  input.dataset.paletteAttached = 'true';
}

function initColorPalettes(scope = document) {
  const colorInputs = scope.querySelectorAll('input[type="color"][data-wsu-palette]');
  colorInputs.forEach((input) => {
    if (!input.parentElement.querySelector('.colorPalette')) {
      attachColorPalette(input);
    }
  });
}

function snapshotOriginalTable(table) {
  const clone = table.cloneNode(true);
  clone.querySelectorAll('.tableToolbar').forEach((el) => el.remove());
  return clone;
}

function positionToolbarRelativeToTable(table) {
  if (!currentTableToolbar || !toolbarHost) return;
  const toolbarHeight = currentTableToolbar.offsetHeight || 32;
  let top = table.offsetTop - toolbarHeight - 6;
  if (top < 0) {
    top = table.offsetTop + table.offsetHeight + 6;
  }
  const left = table.offsetLeft;
  currentTableToolbar.style.top = `${top}px`;
  currentTableToolbar.style.left = `${left}px`;
}
