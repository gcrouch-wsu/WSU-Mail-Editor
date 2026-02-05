let filesUploaded = {
    outcomes: false,
    translate: false,
    wsu_org: false
};

let fileObjects = {
    outcomes: null,
    translate: null,
    wsu_org: null
};

let loadedData = {
    outcomes: [],
    translate: [],
    wsu_org: []
};

let validatedData = [];
let missingData = [];
let stats = {};
let selectedColumns = {
    outcomes: [],
    wsu_org: []
};
let showAllErrors = false;
let keyConfig = {
    outcomes: '',
    translateInput: '',
    translateOutput: '',
    wsu: ''
};
let currentMode = 'validate';
let matchMethod = 'key';
let keyLabels = {
    outcomes: '',
    translateInput: '',
    translateOutput: '',
    wsu: ''
};
let matchMethodTouched = false;
let debugState = {
    outcomes: null,
    translate: null,
    wsu_org: null
};

document.addEventListener('DOMContentLoaded', function() {
    setupModeSelector();
    setupFileUploads();
    setupColumnSelection();
    setupValidateButton();
    setupGenerateButton();
    setupMatchMethodControls();
    setupDebugToggle();
    setupDownloadButton();
    setupResetButton();
    setupNameCompareControls();
    setupShowAllErrorsToggle();
    updateModeUI();
});

function setupModeSelector() {
    const validateRadio = document.getElementById('mode-validate');
    const createRadio = document.getElementById('mode-create');
    if (!validateRadio || !createRadio) return;

    const handleModeChange = () => {
        currentMode = validateRadio.checked ? 'validate' : 'create';
        updateModeUI();
        processAvailableFiles();
    };

    validateRadio.addEventListener('change', handleModeChange);
    createRadio.addEventListener('change', handleModeChange);
}

function updateModeUI() {
    const translateCard = document.getElementById('translate-upload-card');
    const outcomesCard = document.getElementById('outcomes-upload-card');
    const validateAction = document.getElementById('validate-action');
    const generateAction = document.getElementById('generate-action');
    const instructionsValidate = document.getElementById('instructions-validate');
    const instructionsCreate = document.getElementById('instructions-create');
    const columnSelection = document.getElementById('column-selection');
    const nameCompare = document.getElementById('name-compare');
    const matchMethodSection = document.getElementById('match-method');
    const toggleColumns = document.getElementById('toggle-columns');
    const columnCheckboxes = document.getElementById('column-checkboxes');
    const translateInputGroup = document.getElementById('translate-input-group');
    const translateOutputGroup = document.getElementById('translate-output-group');
    const keyMatchFields = document.getElementById('key-match-fields');

    if (translateCard) {
        translateCard.classList.toggle('hidden', currentMode === 'create');
    }
    if (outcomesCard) {
        outcomesCard.classList.remove('hidden');
    }
    if (validateAction) {
        validateAction.classList.toggle('hidden', currentMode === 'create');
    }
    if (generateAction) {
        generateAction.classList.toggle('hidden', currentMode === 'validate');
    }
    if (instructionsValidate && instructionsCreate) {
        instructionsValidate.classList.toggle('hidden', currentMode === 'create');
        instructionsCreate.classList.toggle('hidden', currentMode === 'validate');
    }
    if (columnSelection) {
        if (currentMode === 'create') {
            columnSelection.classList.remove('hidden');
        }
    }
    if (nameCompare) {
        nameCompare.classList.remove('hidden');
    }
    if (matchMethodSection) {
        matchMethodSection.classList.toggle('hidden', currentMode !== 'create');
    }
    if (translateInputGroup) {
        translateInputGroup.classList.toggle('hidden', currentMode === 'create');
    }
    if (translateOutputGroup) {
        translateOutputGroup.classList.toggle('hidden', currentMode === 'create');
    }
    if (toggleColumns) toggleColumns.classList.remove('hidden');
    if (columnCheckboxes) columnCheckboxes.classList.remove('hidden');
    if (keyMatchFields && currentMode !== 'create') {
        keyMatchFields.classList.remove('hidden');
    }
    updateMatchMethodUI();
    renderDebugPanel();
}

function setupFileUploads() {
    const fileInputs = [
        { id: 'outcomes-file', key: 'outcomes' },
        { id: 'translate-file', key: 'translate' },
        { id: 'wsu-org-file', key: 'wsu_org' }
    ];

    fileInputs.forEach(input => {
        const element = document.getElementById(input.id);
        element.addEventListener('change', async function(e) {
            await handleFileSelect(e, input.key);
        });
    });
}

function setupDebugToggle() {
    const toggle = document.getElementById('debug-toggle');
    const previewToggle = document.getElementById('debug-preview-toggle');
    if (!toggle) return;
    toggle.addEventListener('change', renderDebugPanel);
    if (previewToggle) {
        previewToggle.addEventListener('change', renderDebugPanel);
    }
}

function renderDebugPanel() {
    const toggle = document.getElementById('debug-toggle');
    const panel = document.getElementById('debug-panel');
    const previewToggle = document.getElementById('debug-preview-toggle');
    if (!toggle || !panel) return;
    panel.classList.toggle('hidden', !toggle.checked);
    if (!toggle.checked) return;
    const showPreview = previewToggle ? previewToggle.checked : true;

    const format = (entry) => {
        if (!entry) return 'No data loaded.';
        const lines = [
            `File: ${entry.filename || 'Unknown'}`,
            `Rows: ${entry.rows}`,
            `Columns: ${entry.columns.join(', ') || 'None'}`
        ];
        if (showPreview) {
            lines.push('Preview:', JSON.stringify(entry.preview, null, 2));
        }
        return lines.join('\n');
    };

    const outcomesEl = document.getElementById('debug-outcomes');
    const translateEl = document.getElementById('debug-translate');
    const wsuEl = document.getElementById('debug-wsu');
    if (outcomesEl) outcomesEl.textContent = format(debugState.outcomes);
    if (translateEl) translateEl.textContent = format(debugState.translate);
    if (wsuEl) wsuEl.textContent = format(debugState.wsu_org);
}

function updateDebugState(fileKey, file, data) {
    const columns = Object.keys(data[0] || {}).filter(col => !col.startsWith('Unnamed'));
    const preview = data.slice(0, 5);
    debugState[fileKey] = {
        filename: file?.name || '',
        rows: data.length,
        columns,
        preview
    };
    renderDebugPanel();
}

async function handleFileSelect(event, fileKey) {
    const file = event.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById(`${fileKey.replace('_', '-')}-status`);
    const filenameSpan = document.getElementById(`${fileKey.replace('_', '-')}-filename`);
    const rowsSpan = document.getElementById(`${fileKey.replace('_', '-')}-rows`);

    try {
        filenameSpan.textContent = file.name;
        statusDiv.classList.remove('hidden');

        const data = await loadFile(file);

        fileObjects[fileKey] = file;
        loadedData[fileKey] = data;
        filesUploaded[fileKey] = true;
        updateDebugState(fileKey, file, data);

        rowsSpan.textContent = `${data.length} rows`;

        processAvailableFiles();

    } catch (error) {
        console.error(`Error loading ${fileKey}:`, error);
        alert(`Error loading file: ${error.message}`);
        statusDiv.classList.add('hidden');
        filesUploaded[fileKey] = false;
    }
}

function processAvailableFiles() {
    try {
        const outcomesReady = filesUploaded.outcomes;
        const translateReady = filesUploaded.translate;
        const wsuReady = filesUploaded.wsu_org;

        if (!outcomesReady && !translateReady && !wsuReady) {
            return;
        }

        const outcomesColumns = outcomesReady
            ? Object.keys(loadedData.outcomes[0] || {}).filter(col => !col.startsWith('Unnamed'))
            : [];
        const translateColumns = translateReady
            ? Object.keys(loadedData.translate[0] || {}).filter(col => !col.startsWith('Unnamed'))
            : [];
        const wsuOrgColumns = wsuReady
            ? Object.keys(loadedData.wsu_org[0] || {}).filter(col => !col.startsWith('Unnamed'))
            : [];

        if (outcomesReady || translateReady || wsuReady) {
            populateKeySelection(outcomesColumns, translateColumns, wsuOrgColumns);
        }
        if (outcomesReady || wsuReady) {
            populateColumnSelection(outcomesColumns, wsuOrgColumns);
            populateNameCompareOptions(outcomesColumns, wsuOrgColumns);
            document.getElementById('column-selection').classList.remove('hidden');
            applyCreateDefaults(outcomesColumns, wsuOrgColumns);
        } else if (currentMode === 'create') {
            document.getElementById('column-selection').classList.remove('hidden');
        }

        const validateBtn = document.getElementById('validate-btn');
        const validateMessage = document.getElementById('validation-message');
        if (currentMode === 'validate' && outcomesReady && translateReady && wsuReady) {
            validateBtn.disabled = false;
            validateBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
            validateBtn.classList.add('bg-wsu-crimson', 'hover:bg-red-800', 'cursor-pointer');
            validateMessage.textContent = 'Ready to validate!';
        } else {
            validateBtn.disabled = true;
            validateBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
            validateBtn.classList.remove('bg-wsu-crimson', 'hover:bg-red-800', 'cursor-pointer');
            validateMessage.textContent = currentMode === 'validate'
                ? 'Upload Outcomes, Translation, and myWSU to validate.'
                : 'Switch to Validate mode to run validation.';
        }

        const generateBtn = document.getElementById('generate-btn');
        const generateMessage = document.getElementById('generate-message');
        if (currentMode === 'create' && outcomesReady && wsuReady) {
            generateBtn.disabled = false;
            generateBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
            generateBtn.classList.add('bg-wsu-crimson', 'hover:bg-red-800', 'cursor-pointer');
            generateMessage.textContent = 'Choose match method and columns, then generate.';
        } else {
            generateBtn.disabled = true;
            generateBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
            generateBtn.classList.remove('bg-wsu-crimson', 'hover:bg-red-800', 'cursor-pointer');
            generateMessage.textContent = currentMode === 'create'
                ? 'Upload Outcomes + myWSU to populate match options.'
                : 'Switch to Create mode to generate a translation table.';
        }

    } catch (error) {
        console.error('Error processing files:', error);
        alert('Error processing files. Please try again.');
    }
}

function applyCreateDefaults(outcomesColumns, wsuOrgColumns) {
    if (currentMode !== 'create') {
        return;
    }
    if (matchMethodTouched) {
        return;
    }
    const keyRadio = document.getElementById('match-method-key');
    const nameRadio = document.getElementById('match-method-name');
    if (!keyRadio || !nameRadio) {
        return;
    }
    const hasKeyDefaults = Boolean(keyConfig.outcomes && keyConfig.wsu);
    const hasNameDefaults = Boolean(
        outcomesColumns.includes('name') &&
        wsuOrgColumns.includes('Descr')
    );
    if (!hasKeyDefaults && hasNameDefaults) {
        nameRadio.checked = true;
        keyRadio.checked = false;
        matchMethod = 'name';
        updateNameCompareState();
        updateMatchMethodUI();
    }
}

function populateColumnSelection(outcomesColumns, wsuOrgColumns) {
    const defaultOutcomes = ['name', 'mdb_code', 'state', 'country'];
    const defaultWsuOrg = ['Org ID', 'Descr', 'City', 'State', 'Country'];

    const outcomesDiv = document.getElementById('outcomes-columns');
    outcomesDiv.innerHTML = '';
    selectedColumns.outcomes = [];
    if (!outcomesColumns.length) {
        outcomesDiv.innerHTML = '<p class="text-xs text-gray-500">Upload Outcomes to see columns.</p>';
    } else {
        outcomesColumns.forEach(col => {
            const isChecked = defaultOutcomes.includes(col);
            const label = document.createElement('label');
            label.className = 'flex items-center';
            label.innerHTML = `
                <input type="checkbox" name="outcomes-col" value="${col}" ${isChecked ? 'checked' : ''}
                       class="rounded border-gray-300 text-wsu-crimson focus:ring-wsu-crimson">
                <span class="ml-2 text-sm text-gray-700">${col}</span>
            `;
            outcomesDiv.appendChild(label);

            if (isChecked) {
                selectedColumns.outcomes.push(col);
            }
        });
    }

    const wsuOrgDiv = document.getElementById('wsu-org-columns');
    wsuOrgDiv.innerHTML = '';
    selectedColumns.wsu_org = [];
    if (!wsuOrgColumns.length) {
        wsuOrgDiv.innerHTML = '<p class="text-xs text-gray-500">Upload myWSU to see columns.</p>';
    } else {
        wsuOrgColumns.forEach(col => {
            const isChecked = defaultWsuOrg.includes(col);
            const label = document.createElement('label');
            label.className = 'flex items-center';
            label.innerHTML = `
                <input type="checkbox" name="wsu-org-col" value="${col}" ${isChecked ? 'checked' : ''}
                       class="rounded border-gray-300 text-wsu-crimson focus:ring-wsu-crimson">
                <span class="ml-2 text-sm text-gray-700">${col}</span>
            `;
            wsuOrgDiv.appendChild(label);

            if (isChecked) {
                selectedColumns.wsu_org.push(col);
            }
        });
    }

    document.querySelectorAll('input[name="outcomes-col"]').forEach(cb => {
        cb.addEventListener('change', updateSelectedColumns);
    });
    document.querySelectorAll('input[name="wsu-org-col"]').forEach(cb => {
        cb.addEventListener('change', updateSelectedColumns);
    });
}

function populateKeySelection(outcomesColumns, translateColumns, wsuOrgColumns) {
    const outcomesSelect = document.getElementById('key-outcomes');
    const translateInputSelect = document.getElementById('key-translate-input');
    const translateOutputSelect = document.getElementById('key-translate-output');
    const wsuSelect = document.getElementById('key-wsu');

    if (!outcomesSelect || !translateInputSelect || !translateOutputSelect || !wsuSelect) {
        return;
    }

    outcomesSelect.innerHTML = '<option value="">Select column</option>';
    translateInputSelect.innerHTML = '<option value="">Select column</option>';
    translateOutputSelect.innerHTML = '<option value="">Select column</option>';
    wsuSelect.innerHTML = '<option value="">Select column</option>';

    if (outcomesColumns.length) {
        outcomesColumns.forEach(col => {
            outcomesSelect.insertAdjacentHTML(
                'beforeend',
                `<option value="${col}">${col}</option>`
            );
        });
        outcomesSelect.disabled = false;
    } else {
        outcomesSelect.insertAdjacentHTML(
            'beforeend',
            '<option value="">Upload Outcomes to select</option>'
        );
        outcomesSelect.disabled = true;
    }
    if (translateColumns.length) {
        translateColumns.forEach(col => {
            translateInputSelect.insertAdjacentHTML(
                'beforeend',
                `<option value="${col}">${col}</option>`
            );
            translateOutputSelect.insertAdjacentHTML(
                'beforeend',
                `<option value="${col}">${col}</option>`
            );
        });
        translateInputSelect.disabled = false;
        translateOutputSelect.disabled = false;
    } else {
        translateInputSelect.insertAdjacentHTML(
            'beforeend',
            '<option value="">Upload translation table to select</option>'
        );
        translateOutputSelect.insertAdjacentHTML(
            'beforeend',
            '<option value="">Upload translation table to select</option>'
        );
        translateInputSelect.disabled = true;
        translateOutputSelect.disabled = true;
    }
    if (wsuOrgColumns.length) {
        wsuOrgColumns.forEach(col => {
            wsuSelect.insertAdjacentHTML(
                'beforeend',
                `<option value="${col}">${col}</option>`
            );
        });
        wsuSelect.disabled = false;
    } else {
        wsuSelect.insertAdjacentHTML(
            'beforeend',
            '<option value="">Upload myWSU to select</option>'
        );
        wsuSelect.disabled = true;
    }

    const findColumn = (columns, candidates) => {
        const lowerMap = new Map(columns.map(col => [col.toLowerCase(), col]));
        for (const candidate of candidates) {
            const match = lowerMap.get(candidate.toLowerCase());
            if (match) return match;
        }
        return '';
    };

    const defaultOutcomes = findColumn(outcomesColumns, [
        'mdb_code',
        'state',
        'outcomes_state',
        'outcomes state',
        'input'
    ]) || (outcomesColumns[0] || '');

    const defaultTranslateInput = translateColumns.length
        ? (findColumn(translateColumns, [
            'input',
            'mdb_code',
            'outcomes_state',
            'outcomes state',
            'state'
        ]) || (translateColumns[0] || ''))
        : '';

    const defaultTranslateOutput = translateColumns.length
        ? (findColumn(translateColumns, [
            'output',
            'org id',
            'mywsu_state',
            'mywsu state',
            'state'
        ]) || (translateColumns[1] || translateColumns[0] || ''))
        : '';

    const defaultWsu = findColumn(wsuOrgColumns, [
        'org id',
        'state',
        'mywsu_state',
        'mywsu state'
    ]) || (wsuOrgColumns[0] || '');

    outcomesSelect.value = defaultOutcomes;
    translateInputSelect.value = defaultTranslateInput;
    translateOutputSelect.value = defaultTranslateOutput;
    wsuSelect.value = defaultWsu;

    keyConfig = {
        outcomes: defaultOutcomes,
        translateInput: defaultTranslateInput,
        translateOutput: defaultTranslateOutput,
        wsu: defaultWsu
    };

    keyLabels = {
        outcomes: defaultOutcomes,
        translateInput: defaultTranslateInput,
        translateOutput: defaultTranslateOutput,
        wsu: defaultWsu
    };

    [outcomesSelect, translateInputSelect, translateOutputSelect, wsuSelect].forEach(select => {
        select.addEventListener('change', updateKeyConfig);
    });
}

function updateKeyConfig() {
    const outcomesSelect = document.getElementById('key-outcomes');
    const translateInputSelect = document.getElementById('key-translate-input');
    const translateOutputSelect = document.getElementById('key-translate-output');
    const wsuSelect = document.getElementById('key-wsu');

    keyConfig = {
        outcomes: outcomesSelect?.value || '',
        translateInput: translateInputSelect?.value || '',
        translateOutput: translateOutputSelect?.value || '',
        wsu: wsuSelect?.value || ''
    };

    keyLabels = {
        outcomes: keyConfig.outcomes,
        translateInput: keyConfig.translateInput,
        translateOutput: keyConfig.translateOutput,
        wsu: keyConfig.wsu
    };
}

function updateSelectedColumns() {
    selectedColumns.outcomes = Array.from(document.querySelectorAll('input[name="outcomes-col"]:checked'))
        .map(cb => cb.value);
    selectedColumns.wsu_org = Array.from(document.querySelectorAll('input[name="wsu-org-col"]:checked'))
        .map(cb => cb.value);
}

function setupNameCompareControls() {
    const fields = document.getElementById('name-compare-fields');
    if (!fields) return;
    updateNameCompareState();
}

function updateNameCompareState() {
    const fields = document.getElementById('name-compare-fields');
    if (!fields) return;

    const controls = fields.querySelectorAll('select, input');
    controls.forEach(control => {
        control.disabled = false;
    });
    fields.classList.remove('opacity-50');
}

function populateNameCompareOptions(outcomesColumns, wsuOrgColumns) {
    const outcomesSelect = document.getElementById('name-compare-outcomes');
    const wsuSelect = document.getElementById('name-compare-wsu');
    const thresholdInput = document.getElementById('name-compare-threshold');

    if (!outcomesSelect || !wsuSelect || !thresholdInput) return;

    outcomesSelect.innerHTML = '<option value="">Select column</option>';
    wsuSelect.innerHTML = '<option value="">Select column</option>';

    if (outcomesColumns.length) {
        outcomesColumns.forEach(col => {
            outcomesSelect.insertAdjacentHTML(
                'beforeend',
                `<option value="${col}">${col}</option>`
            );
        });
        outcomesSelect.disabled = false;
    } else {
        outcomesSelect.insertAdjacentHTML(
            'beforeend',
            '<option value="">Upload Outcomes to select</option>'
        );
        outcomesSelect.disabled = true;
    }
    if (wsuOrgColumns.length) {
        wsuOrgColumns.forEach(col => {
            wsuSelect.insertAdjacentHTML(
                'beforeend',
                `<option value="${col}">${col}</option>`
            );
        });
        wsuSelect.disabled = false;
    } else {
        wsuSelect.insertAdjacentHTML(
            'beforeend',
            '<option value="">Upload myWSU to select</option>'
        );
        wsuSelect.disabled = true;
    }

    const defaultOutcomes = outcomesColumns.includes('name') ? 'name' : '';
    const defaultWsu = wsuOrgColumns.includes('Descr') ? 'Descr' : '';
    if (defaultOutcomes) outcomesSelect.value = defaultOutcomes;
    if (defaultWsu) wsuSelect.value = defaultWsu;

    thresholdInput.value = '0.5';
    updateNameCompareState();
}

function setupColumnSelection() {
    const toggleBtn = document.getElementById('toggle-columns');
    const checkboxesDiv = document.getElementById('column-checkboxes');
    if (!toggleBtn || !checkboxesDiv) return;

    checkboxesDiv.classList.remove('hidden');
    const svg = toggleBtn.querySelector('svg');
    if (svg) {
        svg.classList.add('rotate-180');
    }

    toggleBtn.addEventListener('click', function() {
        checkboxesDiv.classList.toggle('hidden');
        const svg = toggleBtn.querySelector('svg');
        if (svg) {
            svg.classList.toggle('rotate-180');
        }
    });
}

function setupShowAllErrorsToggle() {
    const checkbox = document.getElementById('show-all-errors');
    if (!checkbox) return;
    checkbox.addEventListener('change', function() {
        showAllErrors = checkbox.checked;
        if (validatedData.length > 0) {
            const limit = showAllErrors ? 0 : 10;
            displayErrorDetails(getErrorSamples(validatedData, limit));
        }
    });
}

function setupValidateButton() {
    const validateBtn = document.getElementById('validate-btn');
    validateBtn.addEventListener('click', runValidation);
}

function setupGenerateButton() {
    const generateBtn = document.getElementById('generate-btn');
    if (!generateBtn) return;
    generateBtn.addEventListener('click', runGeneration);
}

function setupMatchMethodControls() {
    const keyRadio = document.getElementById('match-method-key');
    const nameRadio = document.getElementById('match-method-name');
    if (!keyRadio || !nameRadio) return;

    const syncMethod = () => {
        matchMethodTouched = true;
        matchMethod = nameRadio.checked ? 'name' : 'key';
        updateMatchMethodUI();
    };

    keyRadio.addEventListener('change', syncMethod);
    nameRadio.addEventListener('change', syncMethod);
}

function updateMatchMethodUI() {
    if (currentMode !== 'create') {
        return;
    }
    const keyMatchFields = document.getElementById('key-match-fields');
    const nameCompare = document.getElementById('name-compare');
    if (keyMatchFields) {
        keyMatchFields.classList.toggle('hidden', matchMethod === 'name');
    }
    if (nameCompare) {
        nameCompare.classList.toggle('hidden', matchMethod === 'key');
    }
}

async function runValidation() {
    try {
        if (currentMode !== 'validate') {
            alert('Switch to Validate mode to run validation.');
            return;
        }
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('results').classList.add('hidden');

        await new Promise(resolve => setTimeout(resolve, 100));

        updateKeyConfig();
        if (!keyConfig.outcomes || !keyConfig.translateInput || !keyConfig.translateOutput || !keyConfig.wsu) {
            alert('Select all key columns before validating.');
            document.getElementById('loading').classList.add('hidden');
            return;
        }

        const nameCompareOutcomes = document.getElementById('name-compare-outcomes')?.value || '';
        const nameCompareWsu = document.getElementById('name-compare-wsu')?.value || '';
        const nameCompareThreshold = parseFloat(
            document.getElementById('name-compare-threshold')?.value || '0.5'
        );

        const nameCompareEnabled = Boolean(nameCompareOutcomes && nameCompareWsu);
        if (!nameCompareEnabled && (nameCompareOutcomes || nameCompareWsu)) {
            alert('Select both name columns or disable name comparison.');
            document.getElementById('loading').classList.add('hidden');
            return;
        }

        const merged = mergeData(
            loadedData.outcomes,
            loadedData.translate,
            loadedData.wsu_org,
            keyConfig
        );

        validatedData = validateMappings(
            merged,
            loadedData.translate,
            loadedData.outcomes,
            loadedData.wsu_org,
            keyConfig,
            {
                enabled: Boolean(nameCompareEnabled),
                outcomes_column: nameCompareOutcomes,
                wsu_column: nameCompareWsu,
                threshold: Number.isNaN(nameCompareThreshold) ? 0.5 : nameCompareThreshold
            }
        );

        missingData = detectMissingMappings(
            loadedData.outcomes,
            loadedData.translate,
            keyConfig
        );

        stats = generateSummaryStats(validatedData, loadedData.outcomes, loadedData.translate, loadedData.wsu_org);

    const limit = showAllErrors ? 0 : 10;
    const errorSamples = getErrorSamples(validatedData, limit);

        document.getElementById('loading').classList.add('hidden');

        displayResults(stats, errorSamples);

    } catch (error) {
        console.error('Validation error:', error);
        alert(`Error running validation: ${error.message}`);
        document.getElementById('loading').classList.add('hidden');
    }
}

async function runGeneration() {
    try {
        if (currentMode !== 'create') {
            alert('Switch to Create mode to generate a translation table.');
            return;
        }
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('results').classList.add('hidden');

        await new Promise(resolve => setTimeout(resolve, 100));

        updateKeyConfig();

        const nameCompareOutcomes = document.getElementById('name-compare-outcomes')?.value || '';
        const nameCompareWsu = document.getElementById('name-compare-wsu')?.value || '';
        const nameCompareThreshold = parseFloat(
            document.getElementById('name-compare-threshold')?.value || '0.5'
        );

        const nameCompareEnabled = Boolean(nameCompareOutcomes && nameCompareWsu);
        const hasKeyConfig = Boolean(keyConfig.outcomes && keyConfig.wsu);
        const canNameMatch = Boolean(nameCompareEnabled && nameCompareOutcomes && nameCompareWsu);
        const forceNameMatch = matchMethod === 'name';

        if ((forceNameMatch && !canNameMatch) || (!forceNameMatch && !hasKeyConfig && !canNameMatch)) {
            alert('Select key columns or enable name comparison to generate a table.');
            document.getElementById('loading').classList.add('hidden');
            return;
        }

        if (nameCompareEnabled && (!nameCompareOutcomes || !nameCompareWsu)) {
            alert('Select both name columns or disable name comparison.');
            document.getElementById('loading').classList.add('hidden');
            return;
        }

        const generated = generateTranslationTable(
            loadedData.outcomes,
            loadedData.wsu_org,
            keyConfig,
            {
                enabled: Boolean(nameCompareEnabled),
                outcomes_column: nameCompareOutcomes,
                wsu_column: nameCompareWsu,
                threshold: Number.isNaN(nameCompareThreshold) ? 0.5 : nameCompareThreshold
            },
            {
                forceNameMatch
            }
        );

        await createGeneratedTranslationExcel(
            generated.cleanRows,
            generated.errorRows,
            generated.selectedColumns,
            generated.headerLabels
        );

        document.getElementById('loading').classList.add('hidden');
    } catch (error) {
        console.error('Generation error:', error);
        alert(`Error generating translation table: ${error.message}`);
        document.getElementById('loading').classList.add('hidden');
    }
}

function buildKeyValueMap(rows, keyField) {
    const map = new Map();
    rows.forEach(row => {
        const raw = row[keyField];
        const normalized = normalizeKeyValue(raw);
        if (!normalized) {
            return;
        }
        if (!map.has(normalized)) {
            map.set(normalized, row);
        }
    });
    return map;
}

function findBestNameMatch(sourceName, targetEntries, nameField, threshold, usedKeys) {
    if (!sourceName) return null;
    let best = null;
    let bestScore = -1;
    targetEntries.forEach(({ key, row }) => {
        if (usedKeys.has(key)) return;
        const targetName = row[nameField];
        if (!targetName) return;
        const score = calculateNameSimilarity(sourceName, targetName);
        if (score > bestScore) {
            bestScore = score;
            best = { key, row, score };
        }
    });
    if (!best || best.score < threshold) {
        return null;
    }
    return best;
}

function generateTranslationTable(outcomes, wsuOrg, keyConfig, nameCompare = {}, options = {}) {
    const nameCompareEnabled = Boolean(nameCompare.enabled);
    const outcomesNameField = nameCompare.outcomes_column || '';
    const wsuNameField = nameCompare.wsu_column || '';
    const threshold = typeof nameCompare.threshold === 'number' ? nameCompare.threshold : 0.5;
    const canNameMatch = nameCompareEnabled && outcomesNameField && wsuNameField;
    const forceNameMatch = Boolean(options.forceNameMatch);

    const headerLabels = {
        input: keyLabels.outcomes || outcomesNameField || 'Outcomes Key',
        output: keyLabels.wsu || wsuNameField || 'myWSU Key'
    };

    const cleanRows = [];
    const errorRows = [];

    if (forceNameMatch || !keyConfig.outcomes || !keyConfig.wsu) {
        if (!canNameMatch) {
            return { cleanRows, errorRows, selectedColumns, headerLabels };
        }

        const wsuEntries = wsuOrg.map((row, idx) => ({ key: `w${idx}`, row }));
        const usedWsu = new Set();

        outcomes.forEach((outcomesRow, idx) => {
            const match = findBestNameMatch(
                outcomesRow[outcomesNameField],
                wsuEntries,
                wsuNameField,
                threshold,
                usedWsu
            );
            const wsuRow = match ? match.row : null;
            if (match) {
                usedWsu.add(match.key);
            }

            const inputRaw = outcomesRow[outcomesNameField] ?? '';
            const outputRaw = wsuRow ? wsuRow[wsuNameField] ?? '' : '';

            const rowData = {
                input: inputRaw,
                output: outputRaw,
                match_method: match ? 'Name' : 'Unmatched'
            };

            selectedColumns.outcomes.forEach(col => {
                rowData[`outcomes_${col}`] = outcomesRow[col] ?? '';
            });
            selectedColumns.wsu_org.forEach(col => {
                rowData[`wsu_${col}`] = wsuRow ? wsuRow[col] ?? '' : '';
            });

            cleanRows.push(rowData);

            if (!wsuRow) {
                const errorRow = {
                    normalized_key: inputRaw,
                    missing_in: 'myWSU',
                    input: inputRaw,
                    output: ''
                };
                selectedColumns.outcomes.forEach(col => {
                    errorRow[`outcomes_${col}`] = outcomesRow[col] ?? '';
                });
                selectedColumns.wsu_org.forEach(col => {
                    errorRow[`wsu_${col}`] = '';
                });
                errorRows.push(errorRow);
            }
        });

        wsuEntries.forEach(entry => {
            if (usedWsu.has(entry.key)) {
                return;
            }
            const wsuRow = entry.row;
            const outputRaw = wsuRow[wsuNameField] ?? '';
            const errorRow = {
                normalized_key: outputRaw,
                missing_in: 'Outcomes',
                input: '',
                output: outputRaw
            };
            selectedColumns.outcomes.forEach(col => {
                errorRow[`outcomes_${col}`] = '';
            });
            selectedColumns.wsu_org.forEach(col => {
                errorRow[`wsu_${col}`] = wsuRow[col] ?? '';
            });
            errorRows.push(errorRow);
        });

        return { cleanRows, errorRows, selectedColumns, headerLabels };
    }

    const outcomesMap = buildKeyValueMap(outcomes, keyConfig.outcomes);
    const wsuMap = buildKeyValueMap(wsuOrg, keyConfig.wsu);
    const allKeys = new Set([...outcomesMap.keys(), ...wsuMap.keys()]);

    const outcomesEntries = Array.from(outcomesMap.entries()).map(([key, row]) => ({ key, row }));
    const wsuEntries = Array.from(wsuMap.entries()).map(([key, row]) => ({ key, row }));
    const usedOutcomes = new Set();
    const usedWsu = new Set();

    Array.from(allKeys)
        .sort((a, b) => String(a).localeCompare(String(b)))
        .forEach(key => {
            let outcomesRow = outcomesMap.get(key) || null;
            let wsuRow = wsuMap.get(key) || null;
            let matchMethod = '';

            if (outcomesRow) {
                usedOutcomes.add(key);
            }
            if (wsuRow) {
                usedWsu.add(key);
            }

            if (outcomesRow && wsuRow) {
                matchMethod = 'Key';
            } else if (canNameMatch) {
                if (outcomesRow && !wsuRow) {
                    const match = findBestNameMatch(
                        outcomesRow[outcomesNameField],
                        wsuEntries,
                        wsuNameField,
                        threshold,
                        usedWsu
                    );
                    if (match) {
                        wsuRow = match.row;
                        usedWsu.add(match.key);
                        matchMethod = 'Name';
                    }
                } else if (!outcomesRow && wsuRow) {
                    const match = findBestNameMatch(
                        wsuRow[wsuNameField],
                        outcomesEntries,
                        outcomesNameField,
                        threshold,
                        usedOutcomes
                    );
                    if (match) {
                        outcomesRow = match.row;
                        usedOutcomes.add(match.key);
                        matchMethod = 'Name';
                    }
                }
            }

            const inputRaw = outcomesRow ? outcomesRow[keyConfig.outcomes] : '';
            const outputRaw = wsuRow ? wsuRow[keyConfig.wsu] : '';

            const rowData = {
                input: inputRaw,
                output: outputRaw,
                match_method: matchMethod || (inputRaw || outputRaw ? 'Key' : '')
            };

            selectedColumns.outcomes.forEach(col => {
                rowData[`outcomes_${col}`] = outcomesRow ? outcomesRow[col] ?? '' : '';
            });
            selectedColumns.wsu_org.forEach(col => {
                rowData[`wsu_${col}`] = wsuRow ? wsuRow[col] ?? '' : '';
            });

            cleanRows.push(rowData);

            if (!outcomesRow) {
                const errorRow = {
                    normalized_key: key,
                    missing_in: 'Outcomes',
                    input: '',
                    output: outputRaw
                };
                selectedColumns.outcomes.forEach(col => {
                    errorRow[`outcomes_${col}`] = '';
                });
                selectedColumns.wsu_org.forEach(col => {
                    errorRow[`wsu_${col}`] = wsuRow ? wsuRow[col] ?? '' : '';
                });
                errorRows.push(errorRow);
            }
            if (!wsuRow) {
                const errorRow = {
                    normalized_key: key,
                    missing_in: 'myWSU',
                    input: inputRaw,
                    output: ''
                };
                selectedColumns.outcomes.forEach(col => {
                    errorRow[`outcomes_${col}`] = outcomesRow ? outcomesRow[col] ?? '' : '';
                });
                selectedColumns.wsu_org.forEach(col => {
                    errorRow[`wsu_${col}`] = '';
                });
                errorRows.push(errorRow);
            }
        });

    return { cleanRows, errorRows, selectedColumns, headerLabels };
}

async function createGeneratedTranslationExcel(cleanRows, errorRows, selectedCols, headerLabels) {
    const workbook = new ExcelJS.Workbook();

    const inputHeader = headerLabels?.input || keyLabels.outcomes || 'Outcomes Key';
    const outputHeader = headerLabels?.output || keyLabels.wsu || 'myWSU Key';

    const cleanSheet = workbook.addWorksheet('Clean_Translation_Table');
    const cleanHeaders = [
        `${inputHeader} (Input)`,
        `${outputHeader} (Output)`,
        'Match Method'
    ];
    selectedCols.outcomes.forEach(col => {
        cleanHeaders.push(`Outcomes: ${col}`);
    });
    selectedCols.wsu_org.forEach(col => {
        cleanHeaders.push(`myWSU: ${col}`);
    });
    cleanSheet.addRow(cleanHeaders);
    cleanSheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    });
    cleanRows.forEach(row => {
        const rowData = [
            row.input,
            row.output,
            row.match_method
        ];
        selectedCols.outcomes.forEach(col => {
            rowData.push(row[`outcomes_${col}`] ?? '');
        });
        selectedCols.wsu_org.forEach(col => {
            rowData.push(row[`wsu_${col}`] ?? '');
        });
        cleanSheet.addRow(rowData);
    });
    cleanSheet.views = [{ state: 'frozen', ySplit: 1 }];
    cleanSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: cleanHeaders.length }
    };
    cleanSheet.columns.forEach((column, idx) => {
        let maxLength = cleanSheet.getRow(1).getCell(idx + 1).value.toString().length;
        cleanSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const value = String(row.getCell(idx + 1).value || '');
            if (value.length > maxLength) {
                maxLength = value.length;
            }
        });
        column.width = Math.min(maxLength + 2, 50);
    });

    const errorSheet = workbook.addWorksheet('Generation_Errors');
    const errorHeaders = [
        'Normalized Key',
        'Missing In',
        `${inputHeader} (Input)`,
        `${outputHeader} (Output)`
    ];
    selectedCols.outcomes.forEach(col => {
        errorHeaders.push(`Outcomes: ${col}`);
    });
    selectedCols.wsu_org.forEach(col => {
        errorHeaders.push(`myWSU: ${col}`);
    });
    errorSheet.addRow(errorHeaders);
    errorSheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
    });
    errorRows.forEach(row => {
        const rowData = [
            row.normalized_key,
            row.missing_in,
            row.input,
            row.output
        ];
        selectedCols.outcomes.forEach(col => {
            rowData.push(row[`outcomes_${col}`] ?? '');
        });
        selectedCols.wsu_org.forEach(col => {
            rowData.push(row[`wsu_${col}`] ?? '');
        });
        errorSheet.addRow(rowData);
    });
    errorSheet.views = [{ state: 'frozen', ySplit: 1 }];
    errorSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: errorHeaders.length } };
    errorSheet.columns.forEach((column, idx) => {
        let maxLength = errorHeaders[idx].length;
        errorSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const value = String(row.getCell(idx + 1).value || '');
            if (value.length > maxLength) {
                maxLength = value.length;
            }
        });
        column.width = Math.min(maxLength + 2, 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Generated_Translation_Table.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function displayResults(stats, errorSamples) {
    document.getElementById('total-mappings').textContent = stats.validation.total_mappings.toLocaleString();
    document.getElementById('valid-count').textContent = stats.validation.valid_count.toLocaleString();
    document.getElementById('valid-percentage').textContent = stats.validation.valid_percentage + '%';
    document.getElementById('error-count').textContent = stats.validation.error_count.toLocaleString();
    document.getElementById('error-percentage').textContent = stats.validation.error_percentage + '%';
    document.getElementById('quality-score').textContent = stats.validation.valid_percentage + '%';

    createErrorChart(stats.errors);

    displayErrorDetails(errorSamples);

    document.getElementById('results').classList.remove('hidden');

    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function createErrorChart(errors) {
    const ctx = document.getElementById('error-chart').getContext('2d');

    if (window.errorChart) {
        window.errorChart.destroy();
    }

    const data = {
        labels: [
            'Missing Inputs',
            'Missing Outputs',
            'Inputs Not Found',
            'Outputs Not Found',
            'Duplicate Target Keys',
            'Duplicate Source Keys'
        ],
        datasets: [{
            label: 'Error Count',
            data: [
                errors.missing_inputs,
                errors.missing_outputs,
                errors.input_not_found,
                errors.output_not_found,
                errors.duplicate_targets,
                errors.duplicate_sources
            ],
            backgroundColor: [
                'rgba(239, 68, 68, 0.8)',   // Red
                'rgba(249, 115, 22, 0.8)',  // Orange
                'rgba(251, 191, 36, 0.8)',  // Yellow
                'rgba(59, 130, 246, 0.8)',  // Blue
                'rgba(14, 116, 144, 0.8)',  // Teal
                'rgba(94, 234, 212, 0.8)'   // Cyan
            ],
            borderColor: [
                'rgb(239, 68, 68)',
                'rgb(249, 115, 22)',
                'rgb(251, 191, 36)',
                'rgb(59, 130, 246)',
                'rgb(14, 116, 144)',
                'rgb(94, 234, 212)'
            ],
            borderWidth: 2
        }]
    };

    window.errorChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' errors';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function displayErrorDetails(errorSamples) {
    const detailsDiv = document.getElementById('error-details');
    detailsDiv.innerHTML = '';

    const errorTypes = [
        { key: 'Missing_Input', title: 'Missing Inputs', color: 'red' },
        { key: 'Missing_Output', title: 'Missing Outputs', color: 'red' },
        { key: 'Input_Not_Found', title: 'Inputs Not Found in Outcomes', color: 'orange' },
        { key: 'Output_Not_Found', title: 'Outputs Not Found in myWSU', color: 'orange' },
        { key: 'Duplicate_Target', title: 'Duplicate Target Keys (Many-to-One Errors)', color: 'yellow' },
        { key: 'Duplicate_Source', title: 'Duplicate Source Keys', color: 'yellow' },
        { key: 'Name_Mismatch', title: 'Name Mismatches (Possible Wrong Mappings)', color: 'yellow' },
    ];

    errorTypes.forEach(errorType => {
        const sample = errorSamples[errorType.key];
        if (sample && sample.count > 0) {
            const card = createErrorCard(errorType.title, sample, errorType.color);
            detailsDiv.innerHTML += card;
        }
    });
}

function createErrorCard(title, sample, color) {
    const colorClasses = {
        red: 'border-red-500 bg-red-50',
        orange: 'border-orange-500 bg-orange-50',
        yellow: 'border-yellow-500 bg-yellow-50'
    };

    const explanations = {
        'Missing Inputs': {
            icon: '🔴',
            text: 'The translation table row is missing the input/source key.',
            impact: 'Critical - Mapping cannot be used'
        },
        'Missing Outputs': {
            icon: '🔴',
            text: 'The translation table row is missing the output/target key.',
            impact: 'Critical - Mapping cannot be used'
        },
        'Inputs Not Found in Outcomes': {
            icon: '🔴',
            text: 'Translation inputs do not exist in the Outcomes source data.',
            impact: 'Critical - Must be fixed to enable data sync'
        },
        'Outputs Not Found in myWSU': {
            icon: '🔴',
            text: 'Translation outputs do not exist in the myWSU data.',
            impact: 'Critical - Must be fixed to enable data sync'
        },
        'Duplicate Target Keys (Many-to-One Errors)': {
            icon: '🟠',
            text: 'Multiple different source keys map to the SAME target key. Multiple Outcomes records are pointing to one myWSU record.',
            impact: 'Critical - Multiple Outcomes records will be merged into one target record'
        },
        'Duplicate Source Keys': {
            icon: '',
            text: 'The same source key maps to multiple target keys. This creates conflicting mappings for a single Outcomes record.',
            impact: 'Critical - Fix conflicting mappings for the same source record'
        },
        'Name Mismatches (Possible Wrong Mappings)': {
            icon: '⚠️',
            text: 'Names do not match between Outcomes and myWSU (below similarity threshold). These may be incorrect mappings that need review.',
            impact: 'Warning - Review these mappings to ensure correct records'
        },
    };

    const explanation = explanations[title] || { icon: '', text: '', impact: '' };

    const rowsHtml = sample.rows.map(row => `
        <tr class="border-b">
            <td class="py-2 px-4 text-sm">${row.translate_input}</td>
            <td class="py-2 px-4 text-sm">${row.translate_output}</td>
            <td class="py-2 px-4 text-sm">${row.Error_Description}</td>
        </tr>
    `).join('');

    const showingLine = sample.showing < sample.count
        ? `Showing first ${sample.showing} of ${sample.count} errors - download Excel for complete list`
        : `Showing all ${sample.count} errors`;

    return `
        <div class="bg-white rounded-lg shadow-md p-6 border-l-4 ${colorClasses[color]}">
            <div class="flex items-start justify-between mb-4">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-1">${explanation.icon} ${title}</h3>
                    <p class="text-sm text-gray-700 mb-2">${explanation.text}</p>
                    <p class="text-xs font-semibold text-${color}-700 uppercase">${explanation.impact}</p>
                </div>
                <div class="bg-${color}-100 rounded-full px-4 py-2">
                    <span class="text-2xl font-bold text-${color}-700">${sample.count}</span>
                </div>
            </div>
            <p class="text-xs text-gray-500 mb-4">${showingLine}</p>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="py-2 px-4 text-left text-xs font-medium text-gray-700 uppercase">${keyLabels.translateInput || 'Source key'}</th>
                            <th class="py-2 px-4 text-left text-xs font-medium text-gray-700 uppercase">${keyLabels.translateOutput || 'Target key'}</th>
                            <th class="py-2 px-4 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function setupDownloadButton() {
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.addEventListener('click', async function() {
        if (validatedData.length === 0) {
            alert('Please run validation first.');
            return;
        }

        try {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Generating...';

            await createExcelOutput(validatedData, missingData, selectedColumns);

            downloadBtn.disabled = false;
            downloadBtn.innerHTML = `
                <svg class="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Download Full Report
            `;

        } catch (error) {
            console.error('Download error:', error);
            alert(`Error generating Excel: ${error.message}`);
            downloadBtn.disabled = false;
        }
    });
}

async function createExcelOutput(validated, missing, selectedCols) {
    const workbook = new ExcelJS.Workbook();
    const normalizeKeyValue = (value) => {
        if (value === null || value === undefined) return '';
        const raw = String(value).trim();
        if (raw === '') return '';
        if (/^\d+$/.test(raw)) {
            const cleaned = raw.replace(/^0+/, '');
            return cleaned === '' ? '0' : cleaned;
        }
        return raw.toLowerCase();
    };

    const sheet1 = workbook.addWorksheet('Errors_in_Translate');

    const outputColumns = ['Error_Type', 'Error_Description', 'Duplicate_Group', 'translate_input', 'translate_output'];

    selectedCols.outcomes.forEach(col => {
        outputColumns.push(`outcomes_${col}`);
    });

    selectedCols.wsu_org.forEach(col => {
        outputColumns.push(`wsu_${col}`);
    });

    const dataRows = validated.map(row => {
        const rowData = {};
        outputColumns.forEach(col => {
            rowData[col] = row[col] !== undefined ? row[col] : '';
        });
        return rowData;
    });

    const headers = outputColumns.map(col => {
        if (col === 'translate_input') return `${keyLabels.translateInput || 'Source key'} (Translate Input)`;
        if (col === 'translate_output') return `${keyLabels.translateOutput || 'Target key'} (Translate Output)`;
        if (col === 'outcomes_name') return 'School Name (Outcomes)';
        if (col === `outcomes_${keyLabels.outcomes}` && keyLabels.outcomes) {
            return `${keyLabels.outcomes} (Outcomes Key)`;
        }
        if (col === 'outcomes_mdb_code') return 'Outcomes Key';
        if (col === 'wsu_Descr') return 'Organization Name (myWSU)';
        if (col === `wsu_${keyLabels.wsu}` && keyLabels.wsu) {
            return `${keyLabels.wsu} (myWSU Key)`;
        }
        if (col === 'wsu_Org ID') return 'myWSU Key';
        return col;
    });

    sheet1.addRow(headers);

    headers.forEach((header, idx) => {
        const cell = sheet1.getCell(1, idx + 1);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };

        const errorCols = ['Error_Type', 'Error_Description', 'Duplicate_Group'];
        const translateCols = [
            `${keyLabels.translateInput || 'Source key'} (Translate Input)`,
            `${keyLabels.translateOutput || 'Target key'} (Translate Output)`
        ];

        if (errorCols.includes(header)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // Red
        } else if (translateCols.includes(header)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // Blue
        } else if (outputColumns[idx].startsWith('outcomes_')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } }; // Green
        } else if (outputColumns[idx].startsWith('wsu_')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } }; // Orange
        } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF981e32' } }; // WSU Crimson
        }
    });

    const sourceFillByColumn = outputColumns.map(col => {
        if (['Error_Type', 'Error_Description', 'Duplicate_Group'].includes(col)) {
            return { argb: 'FFFEE2E2' };
        }
        if (['translate_input', 'translate_output'].includes(col)) {
            return { argb: 'FFDBEAFE' };
        }
        if (col.startsWith('outcomes_')) {
            return { argb: 'FFDCFCE7' };
        }
        if (col.startsWith('wsu_')) {
            return { argb: 'FFFFEDD5' };
        }
        return { argb: 'FFFFFFFF' };
    });

    const rowBorderByError = {
        Missing_Input: 'FFEF4444',
        Missing_Output: 'FFEF4444',
        Input_Not_Found: 'FFEF4444',
        Output_Not_Found: 'FFEF4444',
        Duplicate_Target: 'FFF59E0B',
        Duplicate_Source: 'FFF59E0B',
        Name_Mismatch: 'FFF59E0B',
        Valid: 'FF16A34A'
    };

    dataRows.forEach(row => {
        const rowData = outputColumns.map(col => row[col]);
        const excelRow = sheet1.addRow(rowData);

        excelRow.eachCell((cell, colNumber) => {
            const fill = sourceFillByColumn[colNumber - 1];
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: fill };
        });

        const errorType = row.Error_Type;
        const borderColor = rowBorderByError[errorType];
        if (borderColor) {
            const indicatorCell = excelRow.getCell(1);
            indicatorCell.border = {
                left: { style: 'medium', color: { argb: borderColor } }
            };
        }
    });

    sheet1.views = [{ state: 'frozen', ySplit: 1 }];
    sheet1.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length }
    };

    sheet1.columns.forEach((column, idx) => {
        let maxLength = headers[idx].length;
        dataRows.forEach(row => {
            const value = String(row[outputColumns[idx]] || '');
            if (value.length > maxLength) {
                maxLength = value.length;
            }
        });
        column.width = Math.min(maxLength + 2, 50);
    });

    const sheet2 = workbook.addWorksheet('In_Outcomes_Not_In_Translate');

    const missingColumns = [keyLabels.outcomes || 'Outcomes Key'];
    selectedCols.outcomes.forEach(col => {
        if (col !== keyLabels.outcomes) {
            missingColumns.push(col);
        }
    });

    const missingRows = missing.map(row => {
        const rowData = {};
        missingColumns.forEach(col => {
            rowData[col] = row[col] !== undefined ? row[col] : '';
        });
        return rowData;
    });

    sheet2.addRow(missingColumns);

    missingColumns.forEach((header, idx) => {
        const cell = sheet2.getCell(1, idx + 1);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }; // Blue
    });

    missingRows.forEach(row => {
        const rowData = missingColumns.map(col => row[col]);
        const excelRow = sheet2.addRow(rowData);

        excelRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // Light blue
        });
    });

    sheet2.views = [{ state: 'frozen', ySplit: 1 }];
    sheet2.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: missingColumns.length }
    };

    sheet2.columns.forEach((column, idx) => {
        let maxLength = missingColumns[idx].length;
        missingRows.forEach(row => {
            const value = String(row[missingColumns[idx]] || '');
            if (value.length > maxLength) {
                maxLength = value.length;
            }
        });
        column.width = Math.min(maxLength + 2, 50);
    });

    const validRows = validated.filter(row => row.Error_Type === 'Valid');
    const sheet3 = workbook.addWorksheet('Valid_Mappings');
    sheet3.addRow(headers);
    headers.forEach((header, idx) => {
        const cell = sheet3.getCell(1, idx + 1);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };

        const errorCols = ['Error_Type', 'Error_Description', 'Duplicate_Group'];
        const translateCols = [
            `${keyLabels.translateInput || 'Source key'} (Translate Input)`,
            `${keyLabels.translateOutput || 'Target key'} (Translate Output)`
        ];

        if (errorCols.includes(header)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
        } else if (translateCols.includes(header)) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
        } else if (outputColumns[idx].startsWith('outcomes_')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
        } else if (outputColumns[idx].startsWith('wsu_')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } };
        } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF981e32' } };
        }
    });

    validRows.forEach(row => {
        const rowData = outputColumns.map(col => row[col]);
        const excelRow = sheet3.addRow(rowData);
        excelRow.eachCell((cell, colNumber) => {
            const fill = sourceFillByColumn[colNumber - 1];
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: fill };
        });
    });

    sheet3.views = [{ state: 'frozen', ySplit: 1 }];
    sheet3.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length }
    };
    sheet3.columns.forEach((column, idx) => {
        let maxLength = headers[idx].length;
        validRows.forEach(row => {
            const value = String(row[outputColumns[idx]] || '');
            if (value.length > maxLength) {
                maxLength = value.length;
            }
        });
        column.width = Math.min(maxLength + 2, 50);
    });

    const cleanSheet = workbook.addWorksheet('Clean_Translate_Table');
    const cleanHeaders = [
        keyLabels.translateInput || 'Translate Input',
        keyLabels.translateOutput || 'Translate Output',
        'Notes'
    ];
    cleanSheet.addRow(cleanHeaders);
    cleanHeaders.forEach((header, idx) => {
        const cell = cleanSheet.getCell(1, idx + 1);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    });

    const outcomesKeys = new Set(
        loadedData.outcomes
            .map(row => normalizeKeyValue(row[keyConfig.outcomes]))
            .filter(Boolean)
    );
    const wsuKeys = new Set(
        loadedData.wsu_org
            .map(row => normalizeKeyValue(row[keyConfig.wsu]))
            .filter(Boolean)
    );

    const translatePairs = new Set();
    const translateInputs = new Set();
    const translateOutputs = new Set();

    loadedData.translate.forEach(row => {
        const inputRaw = row[keyConfig.translateInput] ?? '';
        const outputRaw = row[keyConfig.translateOutput] ?? '';
        const inputNorm = normalizeKeyValue(inputRaw);
        const outputNorm = normalizeKeyValue(outputRaw);
        if (inputNorm) {
            translateInputs.add(inputNorm);
        }
        if (outputNorm) {
            translateOutputs.add(outputNorm);
        }
        if (inputNorm && outputNorm) {
            translatePairs.add(`${inputNorm}::${outputNorm}`);
        }

        const inputDisplay = inputNorm && outcomesKeys.has(inputNorm) ? inputRaw : 'Not in Outcomes';
        const outputDisplay = outputNorm && wsuKeys.has(outputNorm) ? outputRaw : '(Not in myWSU)';
        const notes = [];
        if (!inputNorm) notes.push('Missing input');
        if (!outputNorm) notes.push('Missing output');
        if (inputNorm && !outcomesKeys.has(inputNorm)) notes.push('Input not in Outcomes');
        if (outputNorm && !wsuKeys.has(outputNorm)) notes.push('Output not in myWSU');
        cleanSheet.addRow([inputDisplay, outputDisplay, notes.join(' | ')]);
    });

    const extraRows = [];
    outcomesKeys.forEach(key => {
        if (wsuKeys.has(key) && !translateInputs.has(key) && !translateOutputs.has(key)) {
            extraRows.push([key, key, 'Present in Outcomes + myWSU; missing from translate']);
        }
    });
    extraRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    extraRows.forEach(row => cleanSheet.addRow(row));

    cleanSheet.views = [{ state: 'frozen', ySplit: 1 }];
    cleanSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: cleanHeaders.length }
    };
    cleanSheet.columns.forEach((column, idx) => {
        let maxLength = cleanHeaders[idx].length;
        cleanSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const value = String(row.getCell(idx + 1).value || '');
            if (value.length > maxLength) {
                maxLength = value.length;
            }
        });
        column.width = Math.min(maxLength + 2, 50);
    });

    const missingWsu = [];
    const wsuAllKeys = new Set(
        loadedData.wsu_org
            .map(row => normalizeKeyValue(row[keyConfig.wsu]))
            .filter(Boolean)
    );
    const translateOutputsForMissing = new Set(
        loadedData.translate
            .map(row => normalizeKeyValue(row[keyConfig.translateOutput]))
            .filter(Boolean)
    );
    wsuAllKeys.forEach(key => {
        if (!translateOutputsForMissing.has(key)) {
            missingWsu.push(key);
        }
    });

    const sheet4 = workbook.addWorksheet('In_myWSU_Not_In_Translate');
    const wsuMissingHeader = [keyLabels.wsu || 'myWSU Key'];
    sheet4.addRow(wsuMissingHeader);
    wsuMissingHeader.forEach((header, idx) => {
        const cell = sheet4.getCell(1, idx + 1);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    });
    missingWsu.sort((a, b) => String(a).localeCompare(String(b))).forEach(key => {
        sheet4.addRow([key]);
    });
    sheet4.views = [{ state: 'frozen', ySplit: 1 }];
    sheet4.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: wsuMissingHeader.length }
    };
    sheet4.columns.forEach((column, idx) => {
        let maxLength = wsuMissingHeader[idx].length;
        missingWsu.forEach(value => {
            const text = String(value || '');
            if (text.length > maxLength) {
                maxLength = text.length;
            }
        });
        column.width = Math.min(maxLength + 2, 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'WSU_Mapping_Validation_Report.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function setupResetButton() {
    const resetBtn = document.getElementById('reset-btn');
    resetBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to start over? This will clear all uploaded files and results.')) {
            location.reload();
        }
    });
}
