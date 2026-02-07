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
let columnRoles = {
    outcomes: {},
    wsu_org: {}
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
let validateNameMode = 'key';
let lastNameCompareConfig = {
    enabled: false,
    outcomes: '',
    wsu: '',
    threshold: 0.8
};
let debugState = {
    outcomes: null,
    translate: null,
    wsu_org: null
};
let activeWorker = null;

document.addEventListener('DOMContentLoaded', function() {
    setupModeSelector();
    setupFileUploads();
    setupColumnSelection();
    setupValidateButton();
    setupGenerateButton();
    setupMatchMethodControls();
    setupValidateNameModeControls();
    setupDebugToggle();
    setupDownloadButton();
    setupResetButton();
    setupNameCompareControls();
    setupShowAllErrorsToggle();
    updateModeUI();
});

function runWorkerTask(type, payload, onProgress) {
    return new Promise((resolve, reject) => {
        if (activeWorker) {
            activeWorker.terminate();
        }
        const worker = new Worker('worker.js');
        activeWorker = worker;

        worker.onmessage = (event) => {
            const message = event.data || {};
            if (message.type === 'progress') {
                if (onProgress) onProgress(message.stage, message.processed, message.total);
                return;
            }
            if (message.type === 'result') {
                worker.terminate();
                activeWorker = null;
                resolve(message.result);
                return;
            }
            if (message.type === 'error') {
                worker.terminate();
                activeWorker = null;
                reject(new Error(message.message));
            }
        };
        worker.onerror = (event) => {
            worker.terminate();
            activeWorker = null;
            reject(new Error(event.message || 'Worker error'));
        };
        worker.postMessage({ type, payload });
    });
}

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
    const validateNameModeSection = document.getElementById('validate-name-mode');
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
    if (validateNameModeSection) {
        validateNameModeSection.classList.toggle('hidden', currentMode !== 'validate');
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
    updateValidateNameModeUI();
    renderDebugPanel();
}

const encodingSelectIds = {
    outcomes: 'outcomes-encoding',
    translate: 'translate-encoding',
    wsu_org: 'wsu-org-encoding'
};

function getFileEncoding(fileKey) {
    const select = document.getElementById(encodingSelectIds[fileKey]);
    return select ? select.value : 'auto';
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

        const encodingSelect = document.getElementById(encodingSelectIds[input.key]);
        if (encodingSelect) {
            encodingSelect.addEventListener('change', async function() {
                if (fileObjects[input.key]) {
                    await reparseFile(input.key);
                }
            });
        }
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

        const data = await loadFile(file, { encoding: getFileEncoding(fileKey) });

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

async function reparseFile(fileKey) {
    const file = fileObjects[fileKey];
    if (!file) return;

    const statusDiv = document.getElementById(`${fileKey.replace('_', '-')}-status`);
    const rowsSpan = document.getElementById(`${fileKey.replace('_', '-')}-rows`);

    try {
        const data = await loadFile(file, { encoding: getFileEncoding(fileKey) });
        loadedData[fileKey] = data;
        filesUploaded[fileKey] = true;
        updateDebugState(fileKey, file, data);
        rowsSpan.textContent = `${data.length} rows`;
        processAvailableFiles();
    } catch (error) {
        console.error(`Error re-parsing ${fileKey}:`, error);
        alert(`Error re-parsing file with selected encoding: ${error.message}`);
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

        const filterSourceColumns = (columns) => {
            const excluded = new Set([
                'Error_Type',
                'Error_Description',
                'Duplicate_Group',
                'translate_input',
                'translate_output',
                'translate_input_norm',
                'translate_output_norm',
                'normalized_key',
                'missing_in',
                'match_similarity'
            ]);
            return columns.filter(col => !excluded.has(col));
        };

        const outcomesColumns = outcomesReady
            ? filterSourceColumns(
                Object.keys(loadedData.outcomes[0] || {}).filter(col => !col.startsWith('Unnamed'))
            )
            : [];
        const translateColumns = translateReady
            ? Object.keys(loadedData.translate[0] || {}).filter(col => !col.startsWith('Unnamed'))
            : [];
        const wsuOrgColumns = wsuReady
            ? filterSourceColumns(
                Object.keys(loadedData.wsu_org[0] || {}).filter(col => !col.startsWith('Unnamed'))
            )
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

function findColumn(columns, candidates) {
    const lowerMap = new Map(columns.map(col => [col.toLowerCase(), col]));
    for (const candidate of candidates) {
        const match = lowerMap.get(candidate.toLowerCase());
        if (match) return match;
    }
    return '';
}

function populateColumnSelection(outcomesColumns, wsuOrgColumns) {
    const defaultOutcomes = ['name', 'mdb_code', 'state', 'country'];
    const defaultWsuOrg = ['Org ID', 'Descr', 'City', 'State', 'Country'];
    const roleOptions = [
        { value: '', label: 'None' },
        { value: 'School', label: 'School' },
        { value: 'City', label: 'City' },
        { value: 'State', label: 'State' },
        { value: 'Country', label: 'Country' },
        { value: 'Other', label: 'Other' }
    ];

    const guessRole = (col) => {
        const normalized = String(col || '').toLowerCase();
        if (normalized.includes('name') || normalized.includes('school')) return 'School';
        if (normalized.includes('city')) return 'City';
        if (normalized.includes('state')) return 'State';
        if (normalized.includes('country')) return 'Country';
        return '';
    };

    const defaultOutcomesKey = keyConfig.outcomes || findColumn(outcomesColumns, [
        'mdb_code',
        'mdb code',
        'outcomes_state',
        'outcomes state',
        'state'
    ]) || (outcomesColumns[0] || '');

    const defaultWsuKey = keyConfig.wsu || findColumn(wsuOrgColumns, [
        'org id',
        'state',
        'mywsu_state',
        'mywsu state'
    ]) || (wsuOrgColumns[0] || '');

    const outcomesDiv = document.getElementById('outcomes-columns');
    outcomesDiv.innerHTML = '';
    selectedColumns.outcomes = [];
    columnRoles.outcomes = {};
    if (!outcomesColumns.length) {
        outcomesDiv.innerHTML = '<p class="text-xs text-gray-500">Upload Outcomes to see columns.</p>';
    } else {
        outcomesColumns.forEach(col => {
            const isChecked = defaultOutcomes.includes(col);
            const row = document.createElement('div');
            row.className = 'grid grid-cols-4 gap-2 items-center';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'text-sm text-gray-700 truncate';
            nameSpan.title = col;
            nameSpan.textContent = col;

            const includeInput = document.createElement('input');
            includeInput.type = 'checkbox';
            includeInput.name = 'outcomes-include';
            includeInput.value = col;
            includeInput.checked = isChecked;
            includeInput.className = 'rounded border-gray-300 text-wsu-crimson focus:ring-wsu-crimson';

            const keyInput = document.createElement('input');
            keyInput.type = 'radio';
            keyInput.name = 'outcomes-key';
            keyInput.value = col;
            keyInput.checked = col === defaultOutcomesKey;
            keyInput.className = 'text-wsu-crimson focus:ring-wsu-crimson';

            const roleSelect = document.createElement('select');
            roleSelect.name = 'outcomes-role';
            roleSelect.dataset.col = col;
            roleSelect.className = 'w-full border border-gray-300 rounded-md p-1 text-xs';
            roleOptions.forEach(optionData => {
                const option = document.createElement('option');
                option.value = optionData.value;
                option.textContent = optionData.label;
                roleSelect.appendChild(option);
            });
            const guessedRole = guessRole(col);
            roleSelect.value = guessedRole;
            columnRoles.outcomes[col] = guessedRole;

            row.appendChild(nameSpan);
            row.appendChild(includeInput);
            row.appendChild(keyInput);
            row.appendChild(roleSelect);
            outcomesDiv.appendChild(row);

            if (isChecked) {
                selectedColumns.outcomes.push(col);
            }
        });
    }

    const wsuOrgDiv = document.getElementById('wsu-org-columns');
    wsuOrgDiv.innerHTML = '';
    selectedColumns.wsu_org = [];
    columnRoles.wsu_org = {};
    if (!wsuOrgColumns.length) {
        wsuOrgDiv.innerHTML = '<p class="text-xs text-gray-500">Upload myWSU to see columns.</p>';
    } else {
        wsuOrgColumns.forEach(col => {
            const isChecked = defaultWsuOrg.includes(col);
            const row = document.createElement('div');
            row.className = 'grid grid-cols-4 gap-2 items-center';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'text-sm text-gray-700 truncate';
            nameSpan.title = col;
            nameSpan.textContent = col;

            const includeInput = document.createElement('input');
            includeInput.type = 'checkbox';
            includeInput.name = 'wsu-include';
            includeInput.value = col;
            includeInput.checked = isChecked;
            includeInput.className = 'rounded border-gray-300 text-wsu-crimson focus:ring-wsu-crimson';

            const keyInput = document.createElement('input');
            keyInput.type = 'radio';
            keyInput.name = 'wsu-key';
            keyInput.value = col;
            keyInput.checked = col === defaultWsuKey;
            keyInput.className = 'text-wsu-crimson focus:ring-wsu-crimson';

            const roleSelect = document.createElement('select');
            roleSelect.name = 'wsu-role';
            roleSelect.dataset.col = col;
            roleSelect.className = 'w-full border border-gray-300 rounded-md p-1 text-xs';
            roleOptions.forEach(optionData => {
                const option = document.createElement('option');
                option.value = optionData.value;
                option.textContent = optionData.label;
                roleSelect.appendChild(option);
            });
            const guessedRole = guessRole(col);
            roleSelect.value = guessedRole;
            columnRoles.wsu_org[col] = guessedRole;

            row.appendChild(nameSpan);
            row.appendChild(includeInput);
            row.appendChild(keyInput);
            row.appendChild(roleSelect);
            wsuOrgDiv.appendChild(row);

            if (isChecked) {
                selectedColumns.wsu_org.push(col);
            }
        });
    }

    document.querySelectorAll('input[name="outcomes-include"], input[name="wsu-include"], input[name="outcomes-key"], input[name="wsu-key"]').forEach(input => {
        input.addEventListener('change', updateSelectedColumns);
    });
    document.querySelectorAll('select[name="outcomes-role"], select[name="wsu-role"]').forEach(select => {
        select.addEventListener('change', updateSelectedColumns);
    });

    updateSelectedColumns();
}

function populateKeySelection(outcomesColumns, translateColumns, wsuOrgColumns) {
    const translateInputSelect = document.getElementById('key-translate-input');
    const translateOutputSelect = document.getElementById('key-translate-output');

    if (!translateInputSelect || !translateOutputSelect) {
        return;
    }

    translateInputSelect.innerHTML = '<option value="">Select column</option>';
    translateOutputSelect.innerHTML = '<option value="">Select column</option>';
    if (translateColumns.length) {
        translateColumns.forEach(col => {
            const inputOption = document.createElement('option');
            inputOption.value = col;
            inputOption.textContent = col;
            translateInputSelect.appendChild(inputOption);
            const outputOption = document.createElement('option');
            outputOption.value = col;
            outputOption.textContent = col;
            translateOutputSelect.appendChild(outputOption);
        });
        translateInputSelect.disabled = false;
        translateOutputSelect.disabled = false;
    } else {
        const inputOption = document.createElement('option');
        inputOption.value = '';
        inputOption.textContent = 'Upload translation table to select';
        translateInputSelect.appendChild(inputOption);
        const outputOption = document.createElement('option');
        outputOption.value = '';
        outputOption.textContent = 'Upload translation table to select';
        translateOutputSelect.appendChild(outputOption);
        translateInputSelect.disabled = true;
        translateOutputSelect.disabled = true;
    }
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

    translateInputSelect.value = defaultTranslateInput;
    translateOutputSelect.value = defaultTranslateOutput;

    keyConfig = {
        outcomes: keyConfig.outcomes || '',
        translateInput: defaultTranslateInput,
        translateOutput: defaultTranslateOutput,
        wsu: keyConfig.wsu || ''
    };

    keyLabels = {
        outcomes: keyConfig.outcomes,
        translateInput: defaultTranslateInput,
        translateOutput: defaultTranslateOutput,
        wsu: keyConfig.wsu
    };

    [translateInputSelect, translateOutputSelect].forEach(select => {
        select.addEventListener('change', updateKeyConfig);
    });
}

function updateKeyConfig() {
    const translateInputSelect = document.getElementById('key-translate-input');
    const translateOutputSelect = document.getElementById('key-translate-output');
    const outcomesKey = document.querySelector('input[name="outcomes-key"]:checked')?.value || '';
    const wsuKey = document.querySelector('input[name="wsu-key"]:checked')?.value || '';

    keyConfig = {
        outcomes: outcomesKey,
        translateInput: translateInputSelect?.value || '',
        translateOutput: translateOutputSelect?.value || '',
        wsu: wsuKey
    };

    keyLabels = {
        outcomes: keyConfig.outcomes,
        translateInput: keyConfig.translateInput,
        translateOutput: keyConfig.translateOutput,
        wsu: keyConfig.wsu
    };
}

function updateSelectedColumns() {
    selectedColumns.outcomes = Array.from(document.querySelectorAll('input[name="outcomes-include"]:checked'))
        .map(cb => cb.value);
    selectedColumns.wsu_org = Array.from(document.querySelectorAll('input[name="wsu-include"]:checked'))
        .map(cb => cb.value);

    columnRoles.outcomes = {};
    columnRoles.wsu_org = {};

    document.querySelectorAll('select[name="outcomes-role"]').forEach(select => {
        const col = select.dataset.col;
        if (col) {
            columnRoles.outcomes[col] = select.value || '';
        }
    });
    document.querySelectorAll('select[name="wsu-role"]').forEach(select => {
        const col = select.dataset.col;
        if (col) {
            columnRoles.wsu_org[col] = select.value || '';
        }
    });

    updateKeyConfig();
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
    const ambiguityInput = document.getElementById('name-compare-ambiguity-gap');

    if (!outcomesSelect || !wsuSelect || !thresholdInput || !ambiguityInput) return;

    outcomesSelect.innerHTML = '<option value="">Select column</option>';
    wsuSelect.innerHTML = '<option value="">Select column</option>';

    if (outcomesColumns.length) {
        outcomesColumns.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            outcomesSelect.appendChild(option);
        });
        outcomesSelect.disabled = false;
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Upload Outcomes to select';
        outcomesSelect.appendChild(option);
        outcomesSelect.disabled = true;
    }
    if (wsuOrgColumns.length) {
        wsuOrgColumns.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            wsuSelect.appendChild(option);
        });
        wsuSelect.disabled = false;
    } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Upload myWSU to select';
        wsuSelect.appendChild(option);
        wsuSelect.disabled = true;
    }

    const defaultOutcomes = outcomesColumns.includes('name') ? 'name' : '';
    const defaultWsu = wsuOrgColumns.includes('Descr') ? 'Descr' : '';
    if (defaultOutcomes) outcomesSelect.value = defaultOutcomes;
    if (defaultWsu) wsuSelect.value = defaultWsu;

    thresholdInput.value = '0.8';
    ambiguityInput.value = '0.03';
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

function setupValidateNameModeControls() {
    const keyOnlyRadio = document.getElementById('validate-key-only');
    const keyNameRadio = document.getElementById('validate-key-name');
    if (!keyOnlyRadio || !keyNameRadio) return;

    const syncMode = () => {
        validateNameMode = keyNameRadio.checked ? 'key+name' : 'key';
        updateValidateNameModeUI();
    };

    keyOnlyRadio.addEventListener('change', syncMode);
    keyNameRadio.addEventListener('change', syncMode);
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

function updateValidateNameModeUI() {
    if (currentMode !== 'validate') {
        return;
    }
    const nameCompare = document.getElementById('name-compare');
    if (nameCompare) {
        nameCompare.classList.toggle('hidden', validateNameMode !== 'key+name');
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
        document.getElementById('loading-message').textContent = 'Analyzing mappings...';
        const progressWrap = document.getElementById('loading-progress');
        const progressStage = document.getElementById('loading-stage');
        const progressPercent = document.getElementById('loading-percent');
        const progressBar = document.getElementById('loading-bar');
        if (progressWrap && progressStage && progressPercent && progressBar) {
            progressWrap.classList.remove('hidden');
            progressStage.textContent = 'Preparing...';
            progressPercent.textContent = '0%';
            progressBar.style.width = '0%';
        }

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
            document.getElementById('name-compare-threshold')?.value || '0.8'
        );
        const nameCompareGap = parseFloat(
            document.getElementById('name-compare-ambiguity-gap')?.value || '0.03'
        );
        const resolvedThreshold = Number.isNaN(nameCompareThreshold)
            ? 0.8
            : Math.max(0, Math.min(1, nameCompareThreshold));
        const resolvedGap = Number.isNaN(nameCompareGap)
            ? 0.03
            : Math.max(0, Math.min(0.2, nameCompareGap));

        const wantsNameCompare = validateNameMode === 'key+name';
        const nameCompareEnabled = wantsNameCompare && Boolean(nameCompareOutcomes && nameCompareWsu);
        if (wantsNameCompare && !nameCompareEnabled) {
            if (nameCompareOutcomes || nameCompareWsu) {
                alert('Select both name columns or disable name comparison.');
            } else {
                alert('Select name columns or switch to key-only validation.');
            }
            document.getElementById('loading').classList.add('hidden');
            return;
        }

        lastNameCompareConfig = {
            enabled: Boolean(nameCompareEnabled),
            outcomes: nameCompareOutcomes,
            wsu: nameCompareWsu,
            threshold: resolvedThreshold
        };

        const result = await runWorkerTask(
            'validate',
            {
                outcomes: loadedData.outcomes,
                translate: loadedData.translate,
                wsu_org: loadedData.wsu_org,
                keyConfig,
                nameCompare: {
                    enabled: Boolean(nameCompareEnabled),
                    outcomes_column: nameCompareOutcomes,
                    wsu_column: nameCompareWsu,
                    threshold: resolvedThreshold,
                    ambiguity_gap: resolvedGap
                }
            },
            (stage, processed, total) => {
                if (progressStage && progressPercent && progressBar) {
                    const percent = total ? Math.round((processed / total) * 100) : 0;
                    if (stage === 'merge') {
                        progressStage.textContent = 'Merging data...';
                    } else if (stage === 'validate') {
                        progressStage.textContent = 'Validating mappings...';
                    } else {
                        progressStage.textContent = 'Analyzing mappings...';
                    }
                    progressPercent.textContent = `${percent}%`;
                    progressBar.style.width = `${percent}%`;
                }
                const message = stage === 'merge'
                    ? 'Merging data...'
                    : stage === 'validate'
                        ? 'Validating mappings...'
                        : 'Analyzing mappings...';
                document.getElementById('loading-message').textContent = message;
            }
        );

        validatedData = result.validatedData;
        missingData = result.missingData;
        stats = result.stats;

        const limit = showAllErrors ? 0 : 10;
        const errorSamples = getErrorSamples(validatedData, limit);

        document.getElementById('loading').classList.add('hidden');
        if (progressWrap) {
            progressWrap.classList.add('hidden');
        }

        displayResults(stats, errorSamples);

    } catch (error) {
        console.error('Validation error:', error);
        alert(`Error running validation: ${error.message}`);
        document.getElementById('loading').classList.add('hidden');
        const progressWrap = document.getElementById('loading-progress');
        if (progressWrap) {
            progressWrap.classList.add('hidden');
        }
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
        document.getElementById('loading-message').textContent = 'Generating translation table...';
        const progressWrap = document.getElementById('loading-progress');
        const progressStage = document.getElementById('loading-stage');
        const progressPercent = document.getElementById('loading-percent');
        const progressBar = document.getElementById('loading-bar');
        if (progressWrap && progressStage && progressPercent && progressBar) {
            progressWrap.classList.remove('hidden');
            progressStage.textContent = 'Preparing...';
            progressPercent.textContent = '0%';
            progressBar.style.width = '0%';
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        updateKeyConfig();

        const nameCompareOutcomes = document.getElementById('name-compare-outcomes')?.value || '';
        const nameCompareWsu = document.getElementById('name-compare-wsu')?.value || '';
        const nameCompareThreshold = parseFloat(
            document.getElementById('name-compare-threshold')?.value || '0.8'
        );
        const nameCompareGap = parseFloat(
            document.getElementById('name-compare-ambiguity-gap')?.value || '0.03'
        );
        const resolvedThreshold = Number.isNaN(nameCompareThreshold)
            ? 0.8
            : Math.max(0, Math.min(1, nameCompareThreshold));
        const resolvedGap = Number.isNaN(nameCompareGap)
            ? 0.03
            : Math.max(0, Math.min(0.2, nameCompareGap));

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

        const generated = await runWorkerTask('generate', {
            outcomes: loadedData.outcomes,
            wsu_org: loadedData.wsu_org,
            keyConfig,
            nameCompare: {
                enabled: Boolean(nameCompareEnabled),
                outcomes_column: nameCompareOutcomes,
                wsu_column: nameCompareWsu,
                threshold: resolvedThreshold,
                ambiguity_gap: resolvedGap
            },
            options: {
                forceNameMatch
            },
            selectedColumns,
            keyLabels
        }, (stage, processed, total) => {
            if (!progressStage || !progressPercent || !progressBar) {
                return;
            }
            const percent = total ? Math.round((processed / total) * 100) : 0;
            if (stage === 'match_candidates') {
                progressStage.textContent = 'Scoring name matches...';
                document.getElementById('loading-message').textContent =
                    `Scoring name matches... ${processed.toLocaleString()} / ${total.toLocaleString()} (${percent}%)`;
            } else if (stage === 'build_rows') {
                progressStage.textContent = 'Building output rows...';
                document.getElementById('loading-message').textContent =
                    `Building output rows... ${processed.toLocaleString()} / ${total.toLocaleString()} (${percent}%)`;
            } else {
                progressStage.textContent = 'Generating translation table...';
                document.getElementById('loading-message').textContent = 'Generating translation table...';
            }
            progressPercent.textContent = `${percent}%`;
            progressBar.style.width = `${percent}%`;
        });

        await createGeneratedTranslationExcel(
            generated.cleanRows,
            generated.errorRows,
            generated.selectedColumns,
            generated.headerLabels
        );

        document.getElementById('loading').classList.add('hidden');
        if (progressWrap) {
            progressWrap.classList.add('hidden');
        }
    } catch (error) {
        console.error('Generation error:', error);
        alert(`Error generating translation table: ${error.message}`);
        document.getElementById('loading').classList.add('hidden');
        const progressWrap = document.getElementById('loading-progress');
        if (progressWrap) {
            progressWrap.classList.add('hidden');
        }
    }
}

async function createGeneratedTranslationExcel(cleanRows, errorRows, selectedCols, headerLabels) {
    const workbook = new ExcelJS.Workbook();

    const cleanSheet = workbook.addWorksheet('Clean_Translation_Table');
    const cleanHeaders = [];
    selectedCols.outcomes.forEach(col => {
        cleanHeaders.push(`Outcomes: ${col}`);
    });
    selectedCols.wsu_org.forEach(col => {
        cleanHeaders.push(`myWSU: ${col}`);
    });
    cleanHeaders.push('Similarity %');
    cleanSheet.addRow(cleanHeaders);
    cleanSheet.getRow(1).eachCell((cell, colNumber) => {
        const header = cleanHeaders[colNumber - 1] || '';
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        if (header.startsWith('Outcomes:')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } }; // Green
        } else if (header.startsWith('myWSU:')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } }; // Orange
        } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // Blue
        }
    });
    cleanRows.forEach(row => {
        const rowData = [];
        selectedCols.outcomes.forEach(col => {
            rowData.push(row[`outcomes_${col}`] ?? '');
        });
        selectedCols.wsu_org.forEach(col => {
            rowData.push(row[`wsu_${col}`] ?? '');
        });
        rowData.push(row.match_similarity ?? '');
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
        'Missing In'
    ];
    selectedCols.outcomes.forEach(col => {
        errorHeaders.push(`Outcomes: ${col}`);
    });
    selectedCols.wsu_org.forEach(col => {
        errorHeaders.push(`myWSU: ${col}`);
    });
    errorSheet.addRow(errorHeaders);
    errorSheet.getRow(1).eachCell((cell, colNumber) => {
        const header = errorHeaders[colNumber - 1] || '';
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        if (header.startsWith('Outcomes:')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } }; // Green
        } else if (header.startsWith('myWSU:')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } }; // Orange
        } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // Red
        }
    });
    errorRows.forEach(row => {
        const rowData = [
            row.normalized_key,
            row.missing_in
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
    const duplicateCount = (stats.errors.duplicate_targets || 0) + (stats.errors.duplicate_sources || 0);
    const displayErrorCount = Math.max(0, stats.validation.error_count - duplicateCount);
    const displayErrorPercentage = stats.validation.total_mappings
        ? Math.round((displayErrorCount / stats.validation.total_mappings) * 1000) / 10
        : 0;
    document.getElementById('error-count').textContent = displayErrorCount.toLocaleString();
    document.getElementById('error-percentage').textContent = `${displayErrorPercentage}%`;
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
            'Duplicate Source Keys',
            'Name Mismatches',
            'Ambiguous Matches'
        ],
        datasets: [{
            label: 'Error Count',
            data: [
                errors.missing_inputs,
                errors.missing_outputs,
                errors.input_not_found,
                errors.output_not_found,
                errors.duplicate_targets,
                errors.duplicate_sources,
                errors.name_mismatches,
                errors.ambiguous_matches
            ],
            backgroundColor: [
                'rgba(239, 68, 68, 0.8)',   // Red
                'rgba(249, 115, 22, 0.8)',  // Orange
                'rgba(251, 191, 36, 0.8)',  // Yellow
                'rgba(59, 130, 246, 0.8)',  // Blue
                'rgba(14, 116, 144, 0.8)',  // Teal
                'rgba(94, 234, 212, 0.8)',  // Cyan
                'rgba(234, 179, 8, 0.8)',   // Amber
                'rgba(168, 85, 247, 0.8)'   // Purple
            ],
            borderColor: [
                'rgb(239, 68, 68)',
                'rgb(249, 115, 22)',
                'rgb(251, 191, 36)',
                'rgb(59, 130, 246)',
                'rgb(14, 116, 144)',
                'rgb(94, 234, 212)',
                'rgb(202, 138, 4)',
                'rgb(147, 51, 234)'
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
        { key: 'Ambiguous_Match', title: 'Ambiguous Matches (Check Alternatives)', color: 'yellow' },
    ];

    errorTypes.forEach(errorType => {
        const sample = errorSamples[errorType.key];
        if (sample && sample.count > 0) {
            const card = createErrorCard(errorType.title, sample, errorType.color);
            detailsDiv.innerHTML += card;
        }
    });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
        'Ambiguous Matches (Check Alternatives)': {
            icon: '⚠️',
            text: 'Name match is ambiguous (another candidate is within the ambiguity gap). Review alternatives before accepting.',
            impact: 'Warning - Review ambiguous matches to confirm correctness'
        },
    };

    const explanation = explanations[title] || { icon: '', text: '', impact: '' };

    const rowsHtml = sample.rows.map(row => `
        <tr class="border-b">
            <td class="py-2 px-4 text-sm">${escapeHtml(row.translate_input)}</td>
            <td class="py-2 px-4 text-sm">${escapeHtml(row.translate_output)}</td>
            <td class="py-2 px-4 text-sm">${escapeHtml(row.Error_Description)}</td>
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

            const includeSuggestions = Boolean(
                document.getElementById('include-suggestions')?.checked
            );
            await createExcelOutput(
                validatedData,
                missingData,
                selectedColumns,
                {
                    includeSuggestions,
                    nameCompareConfig: lastNameCompareConfig
                }
            );

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

async function createExcelOutput(validated, missing, selectedCols, options = {}) {
    const workbook = new ExcelJS.Workbook();
    const includeSuggestions = Boolean(options.includeSuggestions);
    const nameCompareConfig = options.nameCompareConfig || {};
    const canSuggestNames = Boolean(
        includeSuggestions &&
        nameCompareConfig.enabled &&
        nameCompareConfig.outcomes &&
        nameCompareConfig.wsu
    );

    const outcomesColumns = selectedCols.outcomes.map(col => `outcomes_${col}`);
    const wsuColumns = selectedCols.wsu_org.map(col => `wsu_${col}`);
    const suggestionColumns = includeSuggestions
        ? ['Suggested_Match', 'Suggestion_Score']
        : [];
    const roleOrder = ['School', 'City', 'State', 'Country', 'Other'];
    const getRoleColumns = (sourceKey) => {
        const roles = columnRoles[sourceKey] || {};
        const ordered = [];
        roleOrder.forEach(role => {
            Object.keys(roles).forEach(col => {
                if (roles[col] === role && !ordered.includes(col)) {
                    ordered.push(col);
                }
            });
        });
        return ordered;
    };

    const normalizeValue = (value) => {
        if (typeof normalizeKeyValue === 'function') {
            return normalizeKeyValue(value);
        }
        return String(value || '').trim().toLowerCase();
    };

    const similarityScore = (valueA, valueB) => {
        if (typeof similarityRatio === 'function') {
            return similarityRatio(valueA, valueB);
        }
        return valueA && valueB && valueA === valueB ? 1 : 0;
    };

    const MIN_KEY_SUGGESTION_SCORE = 0.6;
    const minNameScore = Number.isFinite(nameCompareConfig.threshold)
        ? nameCompareConfig.threshold
        : 0.8;

    const outcomesKeyCandidates = loadedData.outcomes
        .map(row => ({
            raw: row[keyConfig.outcomes],
            norm: normalizeValue(row[keyConfig.outcomes]),
            row
        }))
        .filter(entry => entry.norm);

    const wsuKeyCandidates = loadedData.wsu_org
        .map(row => ({
            raw: row[keyConfig.wsu],
            norm: normalizeValue(row[keyConfig.wsu]),
            row
        }))
        .filter(entry => entry.norm);

    const wsuNameCandidates = canSuggestNames
        ? loadedData.wsu_org
            .map(row => ({
                key: row[keyConfig.wsu],
                name: row[nameCompareConfig.wsu],
                normName: normalizeValue(row[nameCompareConfig.wsu]),
                row
            }))
            .filter(entry => entry.normName)
        : [];

    const formatSuggestionScore = (score) => (
        Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : null
    );

    const buildSourceSummary = (row, roleColumns, fallbackColumns, keyLabel, keyValue) => {
        if (!row) return '';
        const parts = [];
        if (keyValue) {
            parts.push(`${keyLabel || 'Key'}: ${keyValue}`);
        }
        const columns = roleColumns.length ? roleColumns : fallbackColumns;
        columns.forEach(col => {
            const value = row[col];
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                parts.push(`${col}: ${value}`);
            }
        });
        return parts.join(' | ');
    };

    const buildPrefixedSummary = (row, roleColumns, fallbackColumns, prefix) => {
        const parts = [];
        const columns = roleColumns.length ? roleColumns : fallbackColumns;
        columns.forEach(col => {
            const value = row[`${prefix}${col}`];
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                parts.push(`${col}: ${value}`);
            }
        });
        return parts.join(' | ');
    };

    const roleColumnsOutcomes = getRoleColumns('outcomes');
    const roleColumnsWsu = getRoleColumns('wsu_org');

    const getBestKeySuggestion = (value, candidates, roleColumns, fallbackColumns, keyLabel) => {
        const normalized = normalizeValue(value);
        if (!normalized) return null;
        let best = null;
        candidates.forEach(candidate => {
            const score = similarityScore(normalized, candidate.norm);
            if (!best || score > best.score) {
                best = { match: candidate.raw, score, row: candidate.row };
            }
        });
        if (!best || best.score < MIN_KEY_SUGGESTION_SCORE) {
            return null;
        }
        const details = buildSourceSummary(best.row, roleColumns, fallbackColumns, keyLabel, best.match);
        return { match: details || best.match, score: best.score };
    };

    const getTopNameSuggestions = (outcomesName, limit = 2) => {
        if (!canSuggestNames || !outcomesName) return [];
        const candidates = [];
        wsuNameCandidates.forEach(candidate => {
            const score = typeof calculateNameSimilarity === 'function'
                ? calculateNameSimilarity(outcomesName, candidate.name)
                : similarityScore(normalizeValue(outcomesName), candidate.normName);
            if (score >= minNameScore) {
                candidates.push({ match: candidate, score });
            }
        });
        candidates.sort((a, b) => b.score - a.score);
        return candidates.slice(0, limit).map(item => {
            const label = buildSourceSummary(
                item.match.row,
                roleColumnsWsu,
                selectedCols.wsu_org,
                keyLabels.wsu || 'myWSU Key',
                item.match.key
            );
            return { match: label || item.match.name || item.match.key || '', score: item.score };
        });
    };

    const buildSuggestionList = (suggestions) => {
        if (!suggestions.length) return { matchText: '', scoreValue: null };
        const matchText = suggestions
            .map((item, idx) => `${idx + 1}) ${item.match} (${Math.round(item.score * 100)}%)`)
            .join(' | ');
        return { matchText, scoreValue: suggestions[0]?.score ?? null };
    };

    const normalizeErrorType = (row) => {
        if (row.Error_Type === 'Input_Not_Found') {
            return 'Input does not exist in Outcomes';
        }
        if (row.Error_Type === 'Output_Not_Found') {
            return 'Output does not exist in myWSU';
        }
        if (row.Error_Type === 'Missing_Input') {
            return 'Input is missing in Translate';
        }
        if (row.Error_Type === 'Missing_Output') {
            return 'Output is missing in Translate';
        }
        if (row.Error_Type === 'Name_Mismatch') {
            return 'Name mismatch';
        }
        if (row.Error_Type === 'Ambiguous_Match') {
            return 'Ambiguous name match';
        }
        return row.Error_Type || '';
    };

    const applySuggestionColumns = (row, rowData, errorType) => {
        if (!includeSuggestions) {
            return;
        }
        rowData.Suggested_Match = '';
        rowData.Suggestion_Score = '';

        if (errorType === 'Input_Not_Found') {
            const suggestion = getBestKeySuggestion(
                row.translate_input,
                outcomesKeyCandidates,
                roleColumnsOutcomes,
                selectedCols.outcomes,
                keyLabels.outcomes || 'Outcomes Key'
            );
            if (suggestion) {
                rowData.Suggested_Match = suggestion.match;
                rowData.Suggestion_Score = formatSuggestionScore(suggestion.score);
            }
        } else if (errorType === 'Output_Not_Found') {
            const suggestion = getBestKeySuggestion(
                row.translate_output,
                wsuKeyCandidates,
                roleColumnsWsu,
                selectedCols.wsu_org,
                keyLabels.wsu || 'myWSU Key'
            );
            if (suggestion) {
                rowData.Suggested_Match = suggestion.match;
                rowData.Suggestion_Score = formatSuggestionScore(suggestion.score);
            }
        } else if (
            errorType === 'Name_Mismatch' ||
            errorType === 'Ambiguous_Match' ||
            errorType === 'Duplicate_Target' ||
            errorType === 'Duplicate_Source'
        ) {
            const outcomesName = row[`outcomes_${nameCompareConfig.outcomes}`] || row.outcomes_name || '';
            const wsuName = row[`wsu_${nameCompareConfig.wsu}`] || row.wsu_Descr || '';
            if (errorType === 'Duplicate_Target' || errorType === 'Duplicate_Source') {
                const outcomesSummary = buildPrefixedSummary(
                    row,
                    roleColumnsOutcomes,
                    selectedCols.outcomes,
                    'outcomes_'
                );
                const wsuSummary = buildPrefixedSummary(
                    row,
                    roleColumnsWsu,
                    selectedCols.wsu_org,
                    'wsu_'
                );
                const summary = [];
                if (outcomesSummary) summary.push(`Outcomes: ${outcomesSummary}`);
                if (wsuSummary) summary.push(`myWSU: ${wsuSummary}`);
                if (summary.length) rowData.Suggested_Match = summary.join(' | ');
            } else {
                const suggestions = getTopNameSuggestions(outcomesName, 2);
                if (suggestions.length) {
                    const formatted = buildSuggestionList(suggestions);
                    rowData.Suggested_Match = formatted.matchText;
                    rowData.Suggestion_Score = formatSuggestionScore(formatted.scoreValue);
                }
            }
        }
    };

    const buildHeaders = (outputColumns) => (
        outputColumns.map(col => {
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
            if (col === 'Error_Type') return 'Error Type';
            if (col === 'Suggested_Match') return 'Suggested Match';
            if (col === 'Suggestion_Score') return 'Suggestion Score';
            return col;
        })
    );

    const getHeaderFill = (col, style) => {
        if (col === 'Error_Type') return style.errorHeaderColor;
        if (col === 'Duplicate_Group') return style.groupHeaderColor;
        if (['translate_input', 'translate_output'].includes(col)) return style.translateHeaderColor;
        if (col.startsWith('outcomes_')) return style.outcomesHeaderColor;
        if (col.startsWith('wsu_')) return style.wsuHeaderColor;
        if (['Suggested_Match', 'Suggestion_Score'].includes(col)) {
            return style.suggestionHeaderColor;
        }
        return style.defaultHeaderColor;
    };

    const getBodyFill = (col, style) => {
        if (col === 'Error_Type') return style.errorBodyColor;
        if (col === 'Duplicate_Group') return style.groupBodyColor;
        if (['translate_input', 'translate_output'].includes(col)) return style.translateBodyColor;
        if (col.startsWith('outcomes_')) return style.outcomesBodyColor;
        if (col.startsWith('wsu_')) return style.wsuBodyColor;
        if (['Suggested_Match', 'Suggestion_Score'].includes(col)) {
            return style.suggestionBodyColor;
        }
        return style.defaultBodyColor;
    };

    const columnIndexToLetter = (index) => {
        let result = '';
        let current = index;
        while (current > 0) {
            const remainder = (current - 1) % 26;
            result = String.fromCharCode(65 + remainder) + result;
            current = Math.floor((current - 1) / 26);
        }
        return result;
    };

    const addSheetWithRows = (sheetName, outputColumns, rows, style, rowBorderByError, groupColumn) => {
        const sheet = workbook.addWorksheet(sheetName);
        const headers = buildHeaders(outputColumns);
        sheet.addRow(headers);
        headers.forEach((header, idx) => {
            const cell = sheet.getCell(1, idx + 1);
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: getHeaderFill(outputColumns[idx], style) } };
        });

        const sourceFillByColumn = outputColumns.map(col => ({
            argb: getBodyFill(col, style)
        }));

        let prevGroup = null;
        const groupBorderColor = 'FF9CA3AF';

        rows.forEach(row => {
            let isNewGroup = false;
            if (groupColumn) {
                const currentGroup = row[groupColumn] || '';
                if (prevGroup !== null && currentGroup !== prevGroup) {
                    isNewGroup = true;
                }
                prevGroup = currentGroup;
            }

            const rowData = outputColumns.map(col => row[col] ?? '');
            const excelRow = sheet.addRow(rowData);
            excelRow.eachCell((cell, colNumber) => {
                const fill = sourceFillByColumn[colNumber - 1];
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: fill };
                if (isNewGroup) {
                    const existingBorder = cell.border || {};
                    cell.border = {
                        ...existingBorder,
                        top: { style: 'medium', color: { argb: groupBorderColor } }
                    };
                }
                if (outputColumns[colNumber - 1] === 'Suggestion_Score') {
                    cell.numFmt = '0%';
                }
            });

            if (rowBorderByError && row.Error_Type) {
                const borderColor = rowBorderByError[row.Error_Type];
                if (borderColor) {
                    const indicatorCell = excelRow.getCell(1);
                    const existingBorder = indicatorCell.border || {};
                    indicatorCell.border = {
                        ...existingBorder,
                        left: { style: 'medium', color: { argb: borderColor } }
                    };
                }
            }
        });

        sheet.views = [{ state: 'frozen', ySplit: 1 }];
        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: headers.length }
        };
        sheet.columns.forEach((column, idx) => {
            let maxLength = headers[idx].length;
            rows.forEach(row => {
                const value = String(row[outputColumns[idx]] || '');
                if (value.length > maxLength) {
                    maxLength = value.length;
                }
            });
            column.width = Math.min(maxLength + 2, 50);
        });

        const suggestionIndex = outputColumns.indexOf('Suggestion_Score');
        if (suggestionIndex >= 0 && rows.length > 0) {
            const columnLetter = columnIndexToLetter(suggestionIndex + 1);
            const ref = `${columnLetter}2:${columnLetter}${sheet.rowCount}`;
            sheet.addConditionalFormatting({
                ref,
                rules: [
                    {
                        type: 'colorScale',
                        cfvo: [
                            { type: 'min' },
                            { type: 'percentile', value: 50 },
                            { type: 'max' }
                        ],
                        color: [
                            { argb: 'FFF87171' },
                            { argb: 'FFFACC15' },
                            { argb: 'FF4ADE80' }
                        ]
                    }
                ]
            });
        }
        return sheet;
    };

    const rowBorderByError = {
        'Input does not exist in Outcomes': 'FFEF4444',
        'Output does not exist in myWSU': 'FFEF4444'
    };

    const errorRows = validated.filter(row => row.Error_Type !== 'Valid');
    const translateErrorRows = errorRows.filter(row => !['Duplicate_Target', 'Duplicate_Source'].includes(row.Error_Type));
    const oneToManyRows = errorRows.filter(row => ['Duplicate_Target', 'Duplicate_Source'].includes(row.Error_Type));
    const validRows = validated.filter(row => row.Error_Type === 'Valid');

    const errorColumns = [
        'Error_Type',
        ...outcomesColumns,
        'translate_input',
        'translate_output',
        ...wsuColumns,
        ...suggestionColumns
    ];

    const oneToManyColumns = [
        ...outcomesColumns,
        'translate_input',
        'translate_output',
        ...wsuColumns,
        ...suggestionColumns
    ];

    const validColumns = [
        ...outcomesColumns,
        'translate_input',
        'translate_output',
        ...wsuColumns
    ];

    const errorDataRows = translateErrorRows.map(row => {
        const rowData = {};
        errorColumns.forEach(col => {
            rowData[col] = row[col] !== undefined ? row[col] : '';
        });
        rowData.Error_Type = normalizeErrorType(row) || row.Error_Type;
        applySuggestionColumns(row, rowData, row.Error_Type);
        return rowData;
    });

    const oneToManyDataRows = oneToManyRows.map(row => {
        const rowData = {};
        oneToManyColumns.forEach(col => {
            rowData[col] = row[col] !== undefined ? row[col] : '';
        });
        rowData.Error_Type = row.Error_Type;
        rowData.Duplicate_Group = row.Duplicate_Group || '';
        applySuggestionColumns(row, rowData, row.Error_Type);
        return rowData;
    });

    oneToManyDataRows.sort((a, b) => {
        const groupA = a.Duplicate_Group || '';
        const groupB = b.Duplicate_Group || '';
        if (groupA !== groupB) return groupA.localeCompare(groupB);
        const typeA = a.Error_Type || '';
        const typeB = b.Error_Type || '';
        return typeA.localeCompare(typeB);
    });

    const validDataRows = validRows.map(row => {
        const rowData = {};
        validColumns.forEach(col => {
            rowData[col] = row[col] !== undefined ? row[col] : '';
        });
        return rowData;
    });

    const baseStyle = {
        errorHeaderColor: 'FF991B1B',
        errorBodyColor: 'FFFEE2E2',
        groupHeaderColor: 'FFF59E0B',
        groupBodyColor: 'FFFEF3C7',
        translateHeaderColor: 'FF1E40AF',
        translateBodyColor: 'FFDBEAFE',
        outcomesHeaderColor: 'FF166534',
        outcomesBodyColor: 'FFDCFCE7',
        wsuHeaderColor: 'FFC2410C',
        wsuBodyColor: 'FFFFEDD5',
        suggestionHeaderColor: 'FF6D28D9',
        suggestionBodyColor: 'FFEDE9FE',
        defaultHeaderColor: 'FF981e32',
        defaultBodyColor: 'FFFFFFFF'
    };

    addSheetWithRows(
        'Errors_in_Translate',
        errorColumns,
        errorDataRows,
        baseStyle,
        rowBorderByError
    );
    addSheetWithRows(
        'Errors_One_to_Many',
        oneToManyColumns,
        oneToManyDataRows,
        baseStyle,
        rowBorderByError,
        'Duplicate_Group'
    );
    addSheetWithRows(
        'Valid_Mappings',
        validColumns,
        validDataRows,
        {
            ...baseStyle,
            errorHeaderColor: 'FF16A34A',
            errorBodyColor: 'FFDCFCE7'
        }
    );

    const outcomesRowsByKey = new Map();
    loadedData.outcomes.forEach(row => {
        const normalized = normalizeKeyValue(row[keyConfig.outcomes]);
        if (normalized && !outcomesRowsByKey.has(normalized)) {
            outcomesRowsByKey.set(normalized, row);
        }
    });

    const wsuRowsByKey = new Map();
    loadedData.wsu_org.forEach(row => {
        const normalized = normalizeKeyValue(row[keyConfig.wsu]);
        if (normalized && !wsuRowsByKey.has(normalized)) {
            wsuRowsByKey.set(normalized, row);
        }
    });

    const translateInputs = new Set(
        loadedData.translate
            .map(row => normalizeKeyValue(row[keyConfig.translateInput]))
            .filter(Boolean)
    );
    const translateOutputs = new Set(
        loadedData.translate
            .map(row => normalizeKeyValue(row[keyConfig.translateOutput]))
            .filter(Boolean)
    );

    const sharedOutcomesKeys = Array.from(outcomesRowsByKey.keys())
        .filter(key => wsuRowsByKey.has(key) && !translateInputs.has(key))
        .sort((a, b) => String(a).localeCompare(String(b)));

    const sharedWsuKeys = Array.from(wsuRowsByKey.keys())
        .filter(key => outcomesRowsByKey.has(key) && !translateOutputs.has(key))
        .sort((a, b) => String(a).localeCompare(String(b)));

    const missingPairColumns = [
        ...outcomesColumns,
        'translate_input',
        'translate_output',
        ...wsuColumns
    ];

    const missingOutcomesRows = sharedOutcomesKeys.map(key => {
        const outcomesRow = outcomesRowsByKey.get(key) || {};
        const wsuRow = wsuRowsByKey.get(key) || {};
        const rowData = {};
        selectedCols.outcomes.forEach(col => {
            rowData[`outcomes_${col}`] = outcomesRow[col] ?? '';
        });
        rowData.translate_input = outcomesRow[keyConfig.outcomes] ?? key;
        rowData.translate_output = wsuRow[keyConfig.wsu] ?? key;
        selectedCols.wsu_org.forEach(col => {
            rowData[`wsu_${col}`] = wsuRow[col] ?? '';
        });
        return rowData;
    });

    addSheetWithRows(
        'In_Outcomes_Not_In_Translate',
        missingPairColumns,
        missingOutcomesRows,
        baseStyle
    );

    const missingWsuRows = sharedWsuKeys.map(key => {
        const outcomesRow = outcomesRowsByKey.get(key) || {};
        const wsuRow = wsuRowsByKey.get(key) || {};
        const rowData = {};
        selectedCols.outcomes.forEach(col => {
            rowData[`outcomes_${col}`] = outcomesRow[col] ?? '';
        });
        rowData.translate_input = outcomesRow[keyConfig.outcomes] ?? key;
        rowData.translate_output = wsuRow[keyConfig.wsu] ?? key;
        selectedCols.wsu_org.forEach(col => {
            rowData[`wsu_${col}`] = wsuRow[col] ?? '';
        });
        return rowData;
    });

    addSheetWithRows(
        'In_myWSU_Not_In_Translate',
        missingPairColumns,
        missingWsuRows,
        baseStyle
    );

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
