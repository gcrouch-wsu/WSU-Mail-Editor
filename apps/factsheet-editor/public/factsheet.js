/* ========================================
   Fact sheet landing page - greg crouch
   ======================================== */
(function() {
    'use strict';

    const container = document.querySelector('.wsu-programs-container');
    if (!container) {
        return;
    }

    const BADGE_MAP = {
        'doctorate': { text: 'D', class: 'doctorate', label: 'Doctorate' },
        'masters': { text: 'M', class: 'masters', label: 'Masters' },
        'graduate-certificate': { text: 'GC', class: 'graduate-cert', label: 'Graduate Certificate' },
        'administrator-credentials': { text: 'C', class: 'credential', label: 'Administrator Credentials' },
        'professional-masters': { text: 'PM', class: 'professional-masters', label: 'Professional Masters' },
        'masters-4plus1': { text: '4+1', class: 'masters-entry', label: '4+1 Entry' },
        'global-campus': { text: 'G', class: 'global-campus', label: 'Global Campus' }
    };

    const CLASSIFICATION_ORDER = [
        'doctorate',
        'masters',
        'professional-masters',
        'masters-4plus1',
        'graduate-certificate',
        'global-campus',
        'administrator-credentials'
    ];

    const FILTER_DEFINITIONS = [
        { type: 'all', label: 'All Programs', badge: null },
        { type: 'doctorate', label: 'Doctorate', badge: 'D', badgeClass: 'doctorate' },
        { type: 'masters', label: 'Masters', badge: 'M', badgeClass: 'masters' },
        { type: 'professional-masters', label: 'Professional Masters', badge: 'PM', badgeClass: 'professional-masters' },
        { type: 'graduate-certificate', label: 'Graduate Certificate', badge: 'GC', badgeClass: 'graduate-cert' },
        { type: 'global-campus', label: 'Global Campus', badge: 'G', badgeClass: 'global-campus' },
        { type: 'administrator-credentials', label: 'Credentials', badge: 'C', badgeClass: 'credential' },
        { type: 'masters-4plus1', label: '4+1 Entry', badge: '4+1', badgeClass: 'masters-entry' }
    ];

    let badgeMap = BADGE_MAP;
    let classificationOrder = CLASSIFICATION_ORDER;
    let filterDefinitions = FILTER_DEFINITIONS;

    let currentFilter = 'all';
    let searchTerm = '';
    let programsData = [];
    let nestedData = [];

    function init() {
        applyConfig();
        programsData = loadProgramsData();

        if (!programsData || programsData.length === 0) {
            console.warn('Factsheet programs data not found');
            return;
        }

        nestedData = createNestedHierarchy(programsData);

        ensureStickyWorks();

        renderSidebar();
        renderMainContent();
        attachEventListeners();

        console.log(`Factsheet v4.0 initialized with ${Object.keys(nestedData).length} letters, containing programs`);
    }

    // Fix sticky sidebar when ancestors use overflow/transform.
    function ensureStickyWorks() {
        const sidebar = document.getElementById('wsuSidebar');
        if (!sidebar) return;

        function fixStickyAncestors() {
            let node = sidebar;
            let depth = 0;

            while (node && node !== document.documentElement && depth < 20) {
                const style = window.getComputedStyle(node);
                if (style) {
                    const overflow = style.overflow;
                    const overflowY = style.overflowY;
                    const overflowX = style.overflowX;
                    const transform = style.transform;
                    const filter = style.filter;
                    const perspective = style.perspective;
                    const willChange = style.willChange;

                    if (overflow === 'hidden' || overflow === 'auto' || overflow === 'scroll') {
                        node.style.setProperty('overflow', 'visible', 'important');
                    }
                    if (overflowY === 'hidden' || overflowY === 'auto' || overflowY === 'scroll') {
                        node.style.setProperty('overflow-y', 'visible', 'important');
                    }
                    if (overflowX === 'hidden' || overflowX === 'auto' || overflowX === 'scroll') {
                        node.style.setProperty('overflow-x', 'visible', 'important');
                    }

                    if (transform && transform !== 'none') {
                        node.style.setProperty('transform', 'none', 'important');
                    }
                    if (filter && filter !== 'none') {
                        node.style.setProperty('filter', 'none', 'important');
                    }
                    if (perspective && perspective !== 'none') {
                        node.style.setProperty('perspective', 'none', 'important');
                    }
                    if (willChange && willChange.indexOf('transform') !== -1) {
                        node.style.setProperty('will-change', 'auto', 'important');
                    }
                }
                node = node.parentElement;
                depth++;
            }

            sidebar.style.setProperty('position', 'sticky', 'important');
            sidebar.style.setProperty('top', '20px', 'important');
        }

        function updateStickyBehavior() {
            if (window.innerWidth < 1024) {
                sidebar.style.setProperty('position', 'static', 'important');
                sidebar.style.setProperty('top', 'auto', 'important');
                return;
            }

            fixStickyAncestors();
            setTimeout(fixStickyAncestors, 500);
            setTimeout(fixStickyAncestors, 1000);
        }

        updateStickyBehavior();
        window.addEventListener('resize', updateStickyBehavior);
    }

    function loadProgramsData() {
        let programs = [];

        if (container.dataset.programs) {
            const parsed = parseDatasetJson(container.dataset.programs);
            if (parsed) {
                programs = parsed;
            }
        }

        if (!programs || programs.length === 0) {
            programs = window.factsheetPrograms || [];
        }

        return programs;
    }

    function parseDatasetJson(value) {
        if (!value) return null;
        try {
            const jsonStr = value
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Error parsing dataset JSON:', e);
            return null;
        }
    }

    function applyConfig() {
        const config = parseDatasetJson(container.dataset.config) || {};
        if (config.badgeMap && typeof config.badgeMap === 'object') {
            badgeMap = { ...BADGE_MAP, ...config.badgeMap };
        } else {
            badgeMap = BADGE_MAP;
        }

        if (Array.isArray(config.classificationOrder) && config.classificationOrder.length) {
            classificationOrder = config.classificationOrder;
        } else {
            classificationOrder = CLASSIFICATION_ORDER;
        }

        if (Array.isArray(config.filterDefinitions) && config.filterDefinitions.length) {
            filterDefinitions = config.filterDefinitions;
        } else {
            filterDefinitions = FILTER_DEFINITIONS;
        }
    }

    function createNestedHierarchy(flatData) {
        const letterGroups = {};

        flatData.forEach(item => {
            const letter = item.letter || 'A';
            const programName = item.name || 'Unknown';
            const shortname = item.shortname || programName;

            if (!letterGroups[letter]) {
                letterGroups[letter] = {};
            }

            if (!letterGroups[letter][programName]) {
                letterGroups[letter][programName] = {
                    programName: programName,
                    shortnames: [],
                    allClassifications: []
                };
            }

            const shortnameData = {
                shortname: shortname,
                programName: programName,
                entries: item.entries || [],
                classifications: item.classifications || []
            };

            letterGroups[letter][programName].shortnames.push(shortnameData);

            const classifications = item.classifications || [];
            classifications.forEach(c => {
                if (!letterGroups[letter][programName].allClassifications.includes(c)) {
                    letterGroups[letter][programName].allClassifications.push(c);
                }
            });
        });

        return letterGroups;
    }

    function renderSidebar() {
        renderFilters();
    }

    function renderFilters() {
        const filtersContainer = document.getElementById('wsuDegreeTypeFilters');
        if (!filtersContainer) return;

        filtersContainer.innerHTML = '';

        filterDefinitions.forEach(filter => {
            const btn = document.createElement('button');
            btn.className = 'wsu-filter-btn';
            btn.dataset.filter = filter.type;
            btn.setAttribute('aria-pressed', filter.type === 'all' ? 'true' : 'false');

            if (filter.type === 'all') {
                btn.classList.add('active');
            }

            if (filter.badge) {
                const badge = document.createElement('span');
                const badgeClass = filter.badgeClass || filter.badge_class || '';
                badge.className = `wsu-badge ${badgeClass}`.trim();
                badge.textContent = filter.badge;
                btn.appendChild(badge);
            }

            const label = document.createElement('span');
            label.textContent = filter.label;
            btn.appendChild(label);

            filtersContainer.appendChild(btn);
        });
    }

    function renderMainContent() {
        const listContainer = document.getElementById('wsuProgramsList');
        const emptyState = document.getElementById('wsuEmptyState');
        const resultsCount = document.getElementById('wsuResultsCount');

        if (!listContainer) return;

        listContainer.innerHTML = '';

        const sortedLetters = Object.keys(nestedData).sort();
        let visibleProgramCount = 0;
        let totalProgramCount = 0;
        const visibleLetters = [];

        sortedLetters.forEach(letter => {
            const letterGroup = createLetterGroup(letter, nestedData[letter]);

            const programsInLetter = Object.keys(nestedData[letter]).length;
            totalProgramCount += programsInLetter;

            Object.keys(nestedData[letter]).forEach(programName => {
                if (isProgramVisible(nestedData[letter][programName])) {
                    visibleProgramCount++;
                }
            });

            if (letterGroup) {
                listContainer.appendChild(letterGroup);
                visibleLetters.push(letter);
            }
        });

        if (resultsCount) {
            resultsCount.textContent = `Showing ${visibleProgramCount} of ${totalProgramCount} programs`;
        }

        if (emptyState) {
            emptyState.style.display = visibleProgramCount === 0 ? 'block' : 'none';
        }

        listContainer.style.display = visibleProgramCount === 0 ? 'none' : 'block';
        renderAlphaNav(visibleLetters);
    }

    function createLetterGroup(letter, programs) {
        const hasVisiblePrograms = Object.keys(programs).some(programName =>
            isProgramVisible(programs[programName])
        );

        if (!hasVisiblePrograms) {
            return null;
        }

        const groupDiv = document.createElement('div');
        groupDiv.className = 'wsu-program-group';
        groupDiv.dataset.letter = letter;
        groupDiv.id = `wsu-letter-${letter}`;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'wsu-group-header';
        headerDiv.textContent = letter;
        groupDiv.appendChild(headerDiv);

        const sortedProgramNames = Object.keys(programs).sort();

        sortedProgramNames.forEach(programName => {
            const programData = programs[programName];

            if (!isProgramVisible(programData)) {
                return;
            }

            const programDiv = createProgramGroup(programName, programData);
            groupDiv.appendChild(programDiv);
        });

        return groupDiv;
    }

    function renderAlphaNav(letters) {
        const nav = document.getElementById('wsuAlphaNav');
        if (!nav) return;

        nav.innerHTML = '';
        letters.forEach(letter => {
            const link = document.createElement('a');
            link.className = 'wsu-alpha-link';
            link.href = `#wsu-letter-${letter}`;
            link.textContent = letter;
            nav.appendChild(link);
        });

        nav.style.display = letters.length > 1 ? 'flex' : 'none';
    }

    function createProgramGroup(programName, programData) {
        const programDiv = document.createElement('div');
        programDiv.className = 'wsu-program-name-group';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'wsu-program-name-header';
        headerDiv.setAttribute('role', 'button');
        headerDiv.setAttribute('aria-expanded', 'true');
        headerDiv.setAttribute('tabindex', '0');

        const titleDiv = document.createElement('div');
        titleDiv.className = 'wsu-program-name-title';

        const caret = document.createElement('span');
        caret.className = 'wsu-program-caret';
        caret.textContent = '▼';
        caret.setAttribute('aria-hidden', 'true');
        titleDiv.appendChild(caret);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'wsu-program-name-text';
        nameSpan.textContent = programName;
        titleDiv.appendChild(nameSpan);

        headerDiv.appendChild(titleDiv);

        programDiv.appendChild(headerDiv);

        const shortnamesList = document.createElement('div');
        shortnamesList.className = 'wsu-shortname-list expanded';

        programData.shortnames.forEach(shortnameData => {
            const cleanShortname = getCleanShortname(shortnameData.shortname, programName);

            const hasMatchingDegrees = shortnameData.entries.some(entry => {
                if (currentFilter === 'all') return true;
                const entryClassifications = entry.classifications || shortnameData.classifications || [];
                return entryClassifications.includes(currentFilter);
            });

            if (!hasMatchingDegrees) {
                return;
            }

            const shortnameGroup = document.createElement('div');
            shortnameGroup.className = 'wsu-shortname-group';

            const singleEntry = shortnameData.entries.length === 1;
            const entryTitle = singleEntry && shortnameData.entries[0] ? shortnameData.entries[0].title : '';
            const hideLabel = singleEntry && cleanShortname && entryTitle && cleanShortname === entryTitle;

            if (!hideLabel && cleanShortname && cleanShortname !== programName) {
                const shortnameLabel = document.createElement('div');
                shortnameLabel.className = 'wsu-shortname-label';
                shortnameLabel.textContent = cleanShortname;
                shortnameGroup.appendChild(shortnameLabel);
            }

            shortnameData.entries.forEach(entry => {
                if (currentFilter !== 'all') {
                    const entryClassifications = entry.classifications || shortnameData.classifications || [];
                    if (!entryClassifications.includes(currentFilter)) {
                        return;
                    }
                }

                const degreeEntry = document.createElement('div');
                degreeEntry.className = 'wsu-degree-item';

                const row = document.createElement('div');
                row.className = 'wsu-degree-row';

                const link = document.createElement('a');
                link.href = entry.url;
                link.textContent = entry.title;
                row.appendChild(link);

                const classifications = entry.classifications || [];
                const ordered = classificationOrder.filter(c => classifications.includes(c));
                classifications.forEach(c => {
                    if (!ordered.includes(c)) {
                        ordered.push(c);
                    }
                });

                if (ordered.length > 0) {
                    const badges = document.createElement('div');
                    badges.className = 'wsu-degree-badges';

                    ordered.forEach(classification => {
                        const badgeInfo = badgeMap[classification];
                        if (!badgeInfo) return;
                        const badge = document.createElement('span');
                        badge.className = `wsu-badge ${badgeInfo.class}`;
                        badge.textContent = badgeInfo.text;
                        badge.setAttribute('aria-label', badgeInfo.label);
                        badge.setAttribute('title', badgeInfo.label);
                        badges.appendChild(badge);
                    });

                    row.appendChild(badges);
                }

                degreeEntry.appendChild(row);

                shortnameGroup.appendChild(degreeEntry);
            });

            shortnamesList.appendChild(shortnameGroup);
        });

        programDiv.appendChild(shortnamesList);

        return programDiv;
    }

    function getCleanShortname(shortname, programName) {
        if (!shortname) return '';

        const prefix = programName + ' - ';
        if (shortname.startsWith(prefix)) {
            return shortname.substring(prefix.length);
        }

        return shortname;
    }

    function isProgramVisible(programData) {
        if (currentFilter !== 'all') {
            if (!programData.allClassifications.includes(currentFilter)) {
                return false;
            }
        }

        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const programNameMatch = programData.programName.toLowerCase().includes(searchLower);

            const shortnameMatch = programData.shortnames.some(shortname => {
                if (shortname.shortname.toLowerCase().includes(searchLower)) {
                    return true;
                }
                return shortname.entries.some(entry =>
                    entry.title.toLowerCase().includes(searchLower)
                );
            });

            if (!programNameMatch && !shortnameMatch) {
                return false;
            }
        }

        return true;
    }

    function applyFilters() {
        renderMainContent();
    }

    function attachEventListeners() {
        const filtersContainer = document.getElementById('wsuDegreeTypeFilters');
        if (filtersContainer) {
            filtersContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.wsu-filter-btn');
                if (!btn) return;

                const filterType = btn.dataset.filter;

                filtersContainer.querySelectorAll('.wsu-filter-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');

                currentFilter = filterType;
                applyFilters();
            });
        }

        const searchInput = document.getElementById('wsuSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchTerm = e.target.value.trim();
                applyFilters();
            });
        }

        const mobileToggle = document.getElementById('wsuMobileFilterToggle');
        const mobileContent = document.getElementById('wsuMobileFiltersContent');
        if (mobileToggle && mobileContent) {
            mobileToggle.addEventListener('click', () => {
                const expanded = mobileContent.classList.toggle('expanded');
                mobileToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                const icon = mobileToggle.querySelector('.wsu-mobile-toggle-icon');
                if (icon) {
                    icon.textContent = expanded ? '-' : '+';
                }
            });
        }

        const expandAllBtn = document.getElementById('wsuExpandAllBtn');
        const collapseAllBtn = document.getElementById('wsuCollapseAllBtn');

        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', expandAllGroups);
        }

        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', collapseAllGroups);
        }

        const listContainer = document.getElementById('wsuProgramsList');
        if (listContainer) {
            listContainer.addEventListener('click', (e) => {
                const header = e.target.closest('.wsu-program-name-header');
                if (!header) return;

                toggleProgramGroup(header);
            });

            listContainer.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const header = e.target.closest('.wsu-program-name-header');
                    if (!header) return;

                    e.preventDefault();
                    toggleProgramGroup(header);
                }
            });
        }
    }

    function toggleProgramGroup(header) {
        const programGroup = header.closest('.wsu-program-name-group');
        if (!programGroup) return;

        const degreesList = programGroup.querySelector('.wsu-shortname-list');
        if (!degreesList) return;

        const isExpanded = header.getAttribute('aria-expanded') === 'true';

        if (isExpanded) {
            header.setAttribute('aria-expanded', 'false');
            header.classList.add('collapsed');
            degreesList.classList.remove('expanded');
        } else {
            header.setAttribute('aria-expanded', 'true');
            header.classList.remove('collapsed');
            degreesList.classList.add('expanded');
        }
    }

    function expandAllGroups() {
        const headers = document.querySelectorAll('.wsu-program-name-header');
        const degreesLists = document.querySelectorAll('.wsu-shortname-list');

        headers.forEach(header => {
            header.setAttribute('aria-expanded', 'true');
            header.classList.remove('collapsed');
        });

        degreesLists.forEach(list => {
            list.classList.add('expanded');
        });
    }

    function collapseAllGroups() {
        const headers = document.querySelectorAll('.wsu-program-name-header');
        const degreesLists = document.querySelectorAll('.wsu-shortname-list');

        headers.forEach(header => {
            header.setAttribute('aria-expanded', 'false');
            header.classList.add('collapsed');
        });

        degreesLists.forEach(list => {
            list.classList.remove('expanded');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
