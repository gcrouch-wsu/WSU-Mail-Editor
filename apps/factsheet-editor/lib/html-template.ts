// HTML template for factsheet output
// This is embedded CSS and HTML structure

export const HTML_TEMPLATE = `<style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

.wsu-programs-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: linear-gradient(180deg, #f7f4f1 0%, #efefef 100%);
    color: #2c2c2c;
    line-height: 1.65;
    padding: 48px 24px;
    min-height: 100vh;
}

.wsu-programs-inner {
    max-width: 1400px;
    margin: 0 auto;
}

.wsu-alpha-nav {
    position: sticky;
    top: 20px;
    align-self: start;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 14px;
    padding: 10px 8px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    z-index: 20;
}

.wsu-alpha-link {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: #981e32;
    text-decoration: none;
    transition: background 0.2s ease, color 0.2s ease;
}

.wsu-alpha-link:hover,
.wsu-alpha-link:focus {
    background: #fff5f6;
    color: #7a1728;
}

.wsu-header {
    text-align: center;
    margin-bottom: 40px;
    animation: fadeIn 0.6s ease-out;
}

.wsu-header h1 {
    font-size: 3.4rem;
    font-weight: 800;
    color: #981e32;
    margin-bottom: 12px;
    letter-spacing: -0.5px;
    line-height: 1.1;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}

.wsu-header p {
    font-size: 1.15rem;
    color: #555;
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.7;
}

.wsu-content-wrapper {
    display: grid;
    grid-template-columns: 300px 1fr 56px;
    gap: 40px;
    align-items: start;
}

.wsu-sidebar {
    position: sticky;
    top: 20px;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 16px;
    padding: 26px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.08);
    animation: slideUp 0.6s ease-out 0.2s both;
}

.wsu-mobile-filter-toggle {
    display: none;
}

.wsu-mobile-filters-content {
    display: block;
}

.wsu-search-box {
    position: relative;
    margin-bottom: 25px;
}

.wsu-search-box input {
    width: 100%;
    padding: 14px 40px 14px 16px;
    font-size: 0.95rem;
    border: 1px solid #d8d8d8;
    border-radius: 10px;
    transition: all 0.3s ease;
    background: #fdfdfd;
}

.wsu-search-box input::placeholder {
    color: #999;
}

.wsu-search-box input:focus {
    outline: none;
    border-color: #981e32;
    box-shadow: 0 0 0 4px rgba(152, 30, 50, 0.1);
    background: white;
}

.wsu-search-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #981e32;
    font-size: 18px;
    pointer-events: none;
}

.wsu-filter-section {
    margin-bottom: 25px;
}

.wsu-filter-label {
    font-weight: 600;
    color: #981e32;
    margin-bottom: 12px;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: block;
}

.wsu-degree-type-filters {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.wsu-filter-btn {
    padding: 12px 16px;
    border: 1px solid #e0e0e0;
    background: white;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    position: relative;
    overflow: hidden;
}

.wsu-filter-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(152, 30, 50, 0.1), transparent);
    transition: left 0.5s ease;
}

.wsu-filter-btn:hover::before {
    left: 100%;
}

.wsu-filter-btn:hover {
    border-color: #981e32;
    background: #fff5f6;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(152, 30, 50, 0.15);
}

.wsu-filter-btn:focus {
    outline: 2px solid #981e32;
    outline-offset: 2px;
}

.wsu-filter-btn.active {
    background: #981e32;
    color: white;
    border-color: #981e32;
    box-shadow: 0 2px 12px rgba(152, 30, 50, 0.3);
}

.wsu-filter-btn.active .wsu-badge {
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

.wsu-badge {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 700;
    color: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    flex-shrink: 0;
}

__BADGE_STYLES__

.wsu-main-content {
    min-width: 0; 
}

.wsu-list-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px 20px;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.wsu-expand-collapse-btns {
    display: flex;
    gap: 10px;
}

.wsu-control-btn {
    padding: 8px 16px;
    border: 2px solid #e0e0e0;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    color: #666;
    transition: all 0.2s ease;
}

.wsu-control-btn:hover {
    border-color: #981e32;
    color: #981e32;
    background: #fff5f6;
}

.wsu-control-btn:focus {
    outline: 2px solid #981e32;
    outline-offset: 2px;
}

.wsu-results-count {
    font-size: 0.9rem;
    color: #666;
    font-weight: 500;
}

.wsu-programs-list {
    animation: slideUp 0.6s ease-out 0.4s both;
}

.wsu-program-group {
    margin-bottom: 40px;
}

.wsu-group-header {
    font-size: 2rem;
    font-weight: 700;
    color: #981e32;
    margin-bottom: 20px;
    padding: 15px 20px;
    background: linear-gradient(180deg, rgba(152, 30, 50, 0.08) 0%, rgba(152, 30, 50, 0.02) 100%);
    border-radius: 10px;
    border-left: 6px solid #981e32;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.wsu-program-name-group {
    margin-bottom: 18px;
    background: #fff;
    border: 1px solid rgba(152, 30, 50, 0.06);
    border-radius: 14px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    transition: all 0.3s ease;
}

.wsu-program-name-group:hover {
    box-shadow: 0 10px 24px rgba(152, 30, 50, 0.12);
    transform: translateY(-1px);
}

.wsu-program-name-header {
    padding: 18px 22px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
    gap: 15px; 
}

.wsu-program-name-header:hover {
    background: rgba(152, 30, 50, 0.02);
}

.wsu-program-name-header.collapsed {
    border-bottom: none;
}

.wsu-program-name-title {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0; 
}

.wsu-program-caret {
    display: inline-block;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.8rem;
    color: #981e32;
    font-weight: bold;
    flex-shrink: 0; 
}

.wsu-program-name-header.collapsed .wsu-program-caret {
    transform: rotate(-90deg);
}

.wsu-program-name-text {
    font-size: 1.15rem;
    font-weight: 600;
    color: #981e32;
    overflow: hidden;
    text-overflow: ellipsis;
}

.wsu-program-badges {
    display: flex;
    gap: 6px;
    flex-shrink: 0; 
    align-items: center;
    flex-wrap: nowrap; 
}

.wsu-shortname-list {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.3s ease,
                padding 0.3s ease;
}

.wsu-shortname-list.expanded {
    max-height: 3000px;
    opacity: 1;
    padding: 10px 20px 15px 20px;
}

.wsu-shortname-entry {
    padding: 10px 16px;
    margin-bottom: 8px;
    border-left: 3px solid rgba(152, 30, 50, 0.18);
    transition: all 0.2s ease;
    position: relative;
    padding-left: 32px;
    border-radius: 10px;
    background: #fbfbfb;
}

.wsu-shortname-entry::before {
    content: '→';
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #981e32;
    font-weight: bold;
    opacity: 0.4;
    transition: all 0.2s ease;
}

.wsu-shortname-entry:hover {
    background: #fff5f6;
    border-left-color: #981e32;
}

.wsu-shortname-entry:hover::before {
    opacity: 1;
    left: 15px;
}

.wsu-shortname-entry:last-child {
    margin-bottom: 0;
}

.wsu-shortname-header {
    display: block; 
}

.wsu-shortname-title {
    display: block;
}

.wsu-shortname-title a,
.wsu-shortname-expand-btn {
    color: #111;
    text-decoration: none;
    font-size: 0.95rem;
    transition: color 0.2s ease;
    font-weight: 500;
}

.wsu-shortname-title a:hover {
    color: #981e32;
    text-decoration: underline;
}

.wsu-shortname-title a:focus {
    outline: 2px solid #981e32;
    outline-offset: 2px;
    border-radius: 2px;
}

.wsu-shortname-label {
    color: #111;
    font-size: 0.9rem;
    font-weight: 600;
    margin: 2px 0 6px;
}

.wsu-shortname-expand-btn {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}

.wsu-shortname-expand-btn:hover {
    color: #981e32;
}

.wsu-shortname-expand-btn:focus {
    outline: 2px solid #981e32;
    outline-offset: 2px;
    border-radius: 4px;
}

.wsu-shortname-caret {
    font-size: 0.7rem;
    display: inline-block;
    transition: transform 0.3s ease;
    color: #981e32;
}

.wsu-shortname-expand-btn.collapsed .wsu-shortname-caret {
    transform: rotate(-90deg);
}

.wsu-degrees-list {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, opacity 0.2s ease, margin 0.3s ease;
}

.wsu-degrees-list.expanded {
    max-height: 1000px;
    opacity: 1;
    margin-top: 8px;
}

.wsu-degree-item {
    padding: 8px 12px;
    margin-bottom: 6px;
    background: #fff;
    border: 1px solid rgba(152, 30, 50, 0.08);
    border-radius: 8px;
    margin-left: 20px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.wsu-degree-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.wsu-degree-badges {
    display: flex;
    gap: 6px;
    margin-left: auto;
    flex-wrap: nowrap;
}

.wsu-degree-item:hover {
    background: #fff5f6;
    border-color: rgba(152, 30, 50, 0.2);
    box-shadow: 0 4px 10px rgba(152, 30, 50, 0.12);
}

.wsu-degree-item:last-child {
    margin-bottom: 0;
}

.wsu-degree-item a {
    color: #111;
    text-decoration: none;
    font-size: 0.9rem;
    display: block;
    flex: 1;
    min-width: 0;
    transition: color 0.2s ease;
}

.wsu-degree-item a:hover {
    color: #981e32;
}

.wsu-degree-item a:focus {
    outline: 2px solid #981e32;
    outline-offset: 2px;
    border-radius: 2px;
}

.wsu-empty-state {
    text-align: center;
    padding: 60px 20px;
    background: white;
    border-radius: 12px;
    border: 2px dashed #e0e0e0;
    color: #666;
}

.wsu-empty-state p {
    font-size: 1.1rem;
    margin-bottom: 10px;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 1023px) {
    .wsu-content-wrapper {
        grid-template-columns: 240px 1fr;
        gap: 30px;
    }

    .wsu-sidebar {
        position: static;
        top: auto;
        padding: 20px;
    }

    .wsu-filter-btn {
        padding: 10px 14px;
        font-size: 0.85rem;
    }

    .wsu-alpha-nav {
        display: none;
    }
}

@media (max-width: 767px) {
    .wsu-programs-container {
        padding: 32px 16px;
    }

    .wsu-header h1 {
        font-size: 2.4rem;
    }

    .wsu-header p {
        font-size: 1rem;
    }
    
    .wsu-content-wrapper {
        grid-template-columns: 1fr;
        gap: 20px;
    }
    
    .wsu-sidebar {
        position: relative;
        top: 0;
        grid-column: 1;
        grid-row: 1;
    }

    .wsu-alpha-nav {
        display: flex;
        position: static;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        width: 100%;
        grid-column: 1;
        grid-row: 2;
        margin-bottom: 12px;
    }

    .wsu-main-content {
        grid-column: 1;
        grid-row: 3;
    }
    
    .wsu-mobile-filter-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 15px;
        background: #981e32;
        color: white;
        border-radius: 12px;
        cursor: pointer;
        margin-bottom: 15px;
        font-weight: 600;
    }

    .wsu-mobile-filter-toggle:hover {
        background: #c41e3a;
    }

    .wsu-mobile-filters-content {
        max-height: 0;
        opacity: 0;
        overflow: hidden;
        transition: max-height 0.4s ease, opacity 0.3s ease;
    }

    .wsu-mobile-filters-content.expanded {
        max-height: 2000px;
        opacity: 1;
    }
    
    .wsu-group-header {
        font-size: 1.6rem;
        padding: 12px 15px;
    }

    .wsu-program-name-text {
        font-size: 1.05rem;
    }

    .wsu-shortname-entry {
        padding-left: 25px;
    }

    .wsu-list-controls {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
    }

    .wsu-expand-collapse-btns {
        justify-content: center;
    }

    .wsu-degree-badges {
        display: none;
    }
}

@media (max-width: 480px) {
    .wsu-header h1 {
        font-size: 1.95rem;
    }

    .wsu-control-btn {
        padding: 8px 12px;
        font-size: 0.8rem;
    }

    .wsu-program-badges {
        gap: 4px;
    }

    .wsu-badge {
        width: 24px;
        height: 24px;
        font-size: 0.65rem;
    }
}

@media print {
    .wsu-programs-container {
        background: white;
        padding: 20px;
    }

    .wsu-sidebar,
    .wsu-list-controls,
    .wsu-alpha-nav {
        display: none;
    }

    .wsu-content-wrapper {
        grid-template-columns: 1fr;
    }

    .wsu-shortname-list,
    .wsu-degrees-list {
        max-height: none !important;
        opacity: 1 !important;
        padding: 10px 0 !important;
    }

    .wsu-program-name-group {
        page-break-inside: avoid;
        box-shadow: none;
        border: 1px solid #e0e0e0;
        margin-bottom: 10px;
    }

    a {
        color: #000;
        text-decoration: underline;
    }

    a::after {
        content: " (" attr(href) ")";
        font-size: 0.8em;
        color: #666;
    }
}

@media (prefers-contrast: high) {
    .wsu-filter-btn,
    .wsu-program-name-group {
        border-width: 3px;
    }

    .wsu-shortname-title a,
    .wsu-shortname-expand-btn {
        text-decoration: underline;
    }
}

@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

@supports selector(:focus-visible) {
    *:focus {
        outline: none;
    }

    *:focus-visible {
        outline: 2px solid #981e32;
        outline-offset: 2px;
    }
}
</style>

<div class="wsu-programs-container" data-programs="__PROGRAMS_JSON__" data-config="__CONFIG_JSON__">
    <div class="wsu-programs-inner">
        <div class="wsu-header">
            <h1>Degree Programs</h1>
            <p>Explore our comprehensive range of degree programs, certificates, and credentials. Find your path to success at WSU.</p>
        </div>

        <div class="wsu-content-wrapper">
            
            <div class="wsu-sidebar" id="wsuSidebar">
                <button class="wsu-mobile-filter-toggle" id="wsuMobileFilterToggle" type="button" aria-expanded="false">
                    <span>Search & Filters</span>
                    <span class="wsu-mobile-toggle-icon" aria-hidden="true">+</span>
                </button>

                <div class="wsu-mobile-filters-content" id="wsuMobileFiltersContent">
                    <div class="wsu-search-box">
                        <input
                            type="text"
                            id="wsuSearchInput"
                            placeholder="Search programs..."
                            aria-label="Search programs"
                        />
                        <span class="wsu-search-icon" aria-hidden="true"></span>
                    </div>

                    <div class="wsu-filter-section">
                        <span class="wsu-filter-label">Filter by Type</span>
                        <div class="wsu-degree-type-filters" id="wsuDegreeTypeFilters">
                            
                        </div>
                    </div>
                </div>
            </div>

            <div class="wsu-main-content">
                
                <div class="wsu-list-controls">
                    <div class="wsu-results-count" id="wsuResultsCount">
                        Loading...
                    </div>
                    <div class="wsu-expand-collapse-btns">
                        <button class="wsu-control-btn" id="wsuExpandAllBtn" aria-label="Expand all groups">
                            Expand All
                        </button>
                        <button class="wsu-control-btn" id="wsuCollapseAllBtn" aria-label="Collapse all groups">
                            Collapse All
                        </button>
                    </div>
                </div>

                
                <div class="wsu-programs-list" id="wsuProgramsList"></div>

                
                <div class="wsu-empty-state" id="wsuEmptyState" style="display: none;">
                    <p>No programs found matching your criteria.</p>
                    <p style="font-size: 0.9rem; color: #999; margin-top: 10px;">
                        Try adjusting your search or filters.
                    </p>
                </div>
            </div>
            <div class="wsu-alpha-nav" id="wsuAlphaNav" aria-label="Program jump list"></div>
        </div>
    </div>
</div>
`
