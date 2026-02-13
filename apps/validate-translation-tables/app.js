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
    threshold: 0.8,
    ambiguity_gap: 0.03,
    state_outcomes: '',
    state_wsu: '',
    city_outcomes: '',
    city_wsu: '',
    country_outcomes: '',
    country_wsu: ''
};
let debugState = {
    outcomes: null,
    translate: null,
    wsu_org: null
};
let activeWorker = null;
let activeWorkerReject = null;
let activeExportWorker = null;
let activeExportWorkerReject = null;
let pageBusy = false;
let runLocked = false;

function beforeUnloadHandler(event) {
    event.preventDefault();
    event.returnValue = '';
}

function setPageBusy(isBusy) {
    if (isBusy && !pageBusy) {
        window.addEventListener('beforeunload', beforeUnloadHandler);
        pageBusy = true;
        return;
    }
    if (!isBusy && pageBusy) {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
        pageBusy = false;
    }
}

function hideLoadingUI() {
    const loading = document.getElementById('loading');
    const progressWrap = document.getElementById('loading-progress');
    if (loading) {
        loading.classList.add('hidden');
    }
    if (progressWrap) {
        progressWrap.classList.add('hidden');
    }
}

function applyPrimaryActionDisabledState(button, disabled) {
    if (!button) return;
    button.disabled = disabled;
    if (disabled) {
        button.classList.add('bg-gray-400', 'cursor-not-allowed');
        button.classList.remove('bg-wsu-crimson', 'hover:bg-red-800', 'cursor-pointer');
        return;
    }
    button.classList.remove('bg-gray-400', 'cursor-not-allowed');
    button.classList.add('bg-wsu-crimson', 'hover:bg-red-800', 'cursor-pointer');
}

function setPrimaryActionsBusy(isBusy) {
    applyPrimaryActionDisabledState(document.getElementById('validate-btn'), isBusy);
    applyPrimaryActionDisabledState(document.getElementById('generate-btn'), isBusy);
}

function setRunLock(isLocked) {
    runLocked = Boolean(isLocked);
    setPrimaryActionsBusy(runLocked || pageBusy);
}

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
    setupMappingLogicPreviewToggle();
    setupMatchingRulesToggle();
    updateModeUI();
});

function runWorkerTask(type, payload, onProgress) {
    return new Promise((resolve, reject) => {
        if (activeWorker) {
            activeWorker.terminate();
            if (typeof activeWorkerReject === 'function') {
                activeWorkerReject(new Error('Previous task was cancelled.'));
            }
            activeWorkerReject = null;
            activeWorker = null;
        }
        const worker = new Worker('worker.js');
        activeWorker = worker;
        activeWorkerReject = reject;

        worker.onmessage = (event) => {
            const message = event.data || {};
            if (message.type === 'progress') {
                if (onProgress) onProgress(message.stage, message.processed, message.total);
                return;
            }
            if (message.type === 'result') {
                worker.terminate();
                activeWorker = null;
                activeWorkerReject = null;
                resolve(message.result);
                return;
            }
            if (message.type === 'error') {
                worker.terminate();
                activeWorker = null;
                activeWorkerReject = null;
                reject(new Error(message.message));
            }
        };
        worker.onerror = (event) => {
            worker.terminate();
            activeWorker = null;
            activeWorkerReject = null;
            reject(new Error(event.message || 'Worker error'));
        };
        worker.postMessage({ type, payload });
    });
}

function runExportWorkerTask(type, payload, onProgress) {
    return new Promise((resolve, reject) => {
        if (activeExportWorker) {
            activeExportWorker.terminate();
            if (typeof activeExportWorkerReject === 'function') {
                activeExportWorkerReject(new Error('Previous export task was cancelled.'));
            }
            activeExportWorkerReject = null;
            activeExportWorker = null;
        }
        const worker = new Worker('export-worker.js');
        activeExportWorker = worker;
        activeExportWorkerReject = reject;

        worker.onmessage = (event) => {
            const message = event.data || {};
            if (message.type === 'progress') {
                if (onProgress) onProgress(message.stage, message.processed, message.total);
                return;
            }
            if (message.type === 'result') {
                worker.terminate();
                activeExportWorker = null;
                activeExportWorkerReject = null;
                resolve(message.result);
                return;
            }
            if (message.type === 'error') {
                worker.terminate();
                activeExportWorker = null;
                activeExportWorkerReject = null;
                const err = new Error(message.message);
                if (message.stack) err.exportStack = message.stack;
                reject(err);
            }
        };
        worker.onerror = (event) => {
            worker.terminate();
            activeExportWorker = null;
            activeExportWorkerReject = null;
            reject(new Error(event.message || 'Export worker error'));
        };
        worker.postMessage({ type, payload });
    });
}

function downloadArrayBuffer(buffer, filename) {
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
            generateMessage.textContent = matchMethod === 'name'
                ? 'Name matching mode: key selections are optional and ignored.'
                : 'Choose match method and columns, then generate.';
        } else {
            generateBtn.disabled = true;
            generateBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
            generateBtn.classList.remove('bg-wsu-crimson', 'hover:bg-red-800', 'cursor-pointer');
            generateMessage.textContent = currentMode === 'create'
                ? 'Upload Outcomes + myWSU to populate match options.'
                : 'Switch to Create mode to generate a translation table.';
        }

        if (pageBusy || runLocked) {
            setPrimaryActionsBusy(true);
            if (validateMessage && currentMode === 'validate') {
                validateMessage.textContent = 'Validation is running. Please wait...';
            }
            if (generateMessage && currentMode === 'create') {
                generateMessage.textContent = 'Generation is running. Please wait...';
            }
        }

        if (currentMode === 'create') {
            syncCreateKeyControlsForMatchMethod();
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
        if (normalized.includes('school type')) return 'Other';
        if (normalized.includes('name') || normalized.includes('school name')) return 'School';
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
            if (guessedRole) {
                roleSelect.dataset.prevRole = guessedRole;
            }
            columnRoles.outcomes[col] = guessedRole;
            if (col === defaultOutcomesKey) {
                roleSelect.value = '';
                roleSelect.disabled = true;
            }

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
            if (guessedRole) {
                roleSelect.dataset.prevRole = guessedRole;
            }
            columnRoles.wsu_org[col] = guessedRole;
            if (col === defaultWsuKey) {
                roleSelect.value = '';
                roleSelect.disabled = true;
            }

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

    const previousTranslateInput = keyConfig.translateInput || translateInputSelect.value || '';
    const previousTranslateOutput = keyConfig.translateOutput || translateOutputSelect.value || '';

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

    const resolvedTranslateInput = translateColumns.includes(previousTranslateInput)
        ? previousTranslateInput
        : defaultTranslateInput;
    const resolvedTranslateOutput = translateColumns.includes(previousTranslateOutput)
        ? previousTranslateOutput
        : defaultTranslateOutput;

    translateInputSelect.value = resolvedTranslateInput;
    translateOutputSelect.value = resolvedTranslateOutput;

    keyConfig = {
        outcomes: keyConfig.outcomes || '',
        translateInput: resolvedTranslateInput,
        translateOutput: resolvedTranslateOutput,
        wsu: keyConfig.wsu || ''
    };

    keyLabels = {
        outcomes: keyConfig.outcomes,
        translateInput: resolvedTranslateInput,
        translateOutput: resolvedTranslateOutput,
        wsu: keyConfig.wsu
    };

    // Avoid duplicate listeners as this function runs each time files are (re)processed.
    translateInputSelect.onchange = updateKeyConfig;
    translateOutputSelect.onchange = updateKeyConfig;
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

    const ignoreKeysForCreateNameMode = currentMode === 'create' && matchMethod === 'name';
    const outcomesKey = ignoreKeysForCreateNameMode
        ? ''
        : (document.querySelector('input[name="outcomes-key"]:checked')?.value || '');
    const wsuKey = ignoreKeysForCreateNameMode
        ? ''
        : (document.querySelector('input[name="wsu-key"]:checked')?.value || '');

    document.querySelectorAll('select[name="outcomes-role"]').forEach(select => {
        const col = select.dataset.col;
        const wasDisabled = select.disabled;
        if (col === outcomesKey) {
            if (select.value && select.value !== '') {
                select.dataset.prevRole = select.value;
            }
            select.value = '';
            select.disabled = true;
        } else {
            select.disabled = false;
            // Restore previous role only when coming back from key-lock state.
            if (wasDisabled && !select.value && select.dataset.prevRole) {
                select.value = select.dataset.prevRole;
            }
        }
        if (col) {
            columnRoles.outcomes[col] = select.value || '';
        }
    });
    document.querySelectorAll('select[name="wsu-role"]').forEach(select => {
        const col = select.dataset.col;
        const wasDisabled = select.disabled;
        if (col === wsuKey) {
            if (select.value && select.value !== '') {
                select.dataset.prevRole = select.value;
            }
            select.value = '';
            select.disabled = true;
        } else {
            select.disabled = false;
            // Restore previous role only when coming back from key-lock state.
            if (wasDisabled && !select.value && select.dataset.prevRole) {
                select.value = select.dataset.prevRole;
            }
        }
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

function syncCreateKeyControlsForMatchMethod() {
    if (currentMode !== 'create') {
        return;
    }
    const useNameOnly = matchMethod === 'name';
    const keyHelp = document.getElementById('create-key-help');
    if (keyHelp) {
        keyHelp.classList.toggle('hidden', !useNameOnly);
    }

    const toggleGroup = (groupName) => {
        const inputs = Array.from(document.querySelectorAll(`input[name="${groupName}"]`));
        if (!inputs.length) return;
        if (useNameOnly) {
            inputs.forEach(input => {
                input.checked = false;
                input.disabled = true;
            });
            return;
        }
        inputs.forEach(input => {
            input.disabled = false;
        });
        const hasChecked = inputs.some(input => input.checked);
        if (!hasChecked) {
            inputs[0].checked = true;
        }
    };

    toggleGroup('outcomes-key');
    toggleGroup('wsu-key');
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

    const previousOutcomes = outcomesSelect.value;
    const previousWsu = wsuSelect.value;
    const previousThreshold = thresholdInput.value;
    const previousGap = ambiguityInput.value;

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
    const resolvedOutcomes = outcomesColumns.includes(previousOutcomes)
        ? previousOutcomes
        : defaultOutcomes;
    const resolvedWsu = wsuOrgColumns.includes(previousWsu)
        ? previousWsu
        : defaultWsu;
    if (resolvedOutcomes) outcomesSelect.value = resolvedOutcomes;
    if (resolvedWsu) wsuSelect.value = resolvedWsu;

    thresholdInput.value = previousThreshold || '0.8';
    ambiguityInput.value = previousGap || '0.03';
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
            renderMappingLogicPreview();
        }
    });
}

function setupMappingLogicPreviewToggle() {
    const checkbox = document.getElementById('show-logic-preview');
    if (!checkbox) return;
    checkbox.addEventListener('change', function() {
        renderMappingLogicPreview();
    });
}

function setupMatchingRulesToggle() {
    const checkbox = document.getElementById('show-matching-rules');
    if (!checkbox) return;
    checkbox.addEventListener('change', function() {
        renderMatchingRulesExamples();
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
    syncCreateKeyControlsForMatchMethod();
    updateSelectedColumns();
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
    if (runLocked) {
        return;
    }
    setRunLock(true);
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
        const outcomesStateRole = Object.keys(columnRoles.outcomes || {}).find(
            col => columnRoles.outcomes[col] === 'State'
        ) || '';
        const wsuStateRole = Object.keys(columnRoles.wsu_org || {}).find(
            col => columnRoles.wsu_org[col] === 'State'
        ) || '';
        const outcomesCityRole = Object.keys(columnRoles.outcomes || {}).find(
            col => columnRoles.outcomes[col] === 'City'
        ) || '';
        const wsuCityRole = Object.keys(columnRoles.wsu_org || {}).find(
            col => columnRoles.wsu_org[col] === 'City'
        ) || '';
        const outcomesCountryRole = Object.keys(columnRoles.outcomes || {}).find(
            col => columnRoles.outcomes[col] === 'Country'
        ) || '';
        const wsuCountryRole = Object.keys(columnRoles.wsu_org || {}).find(
            col => columnRoles.wsu_org[col] === 'Country'
        ) || '';
        const findFallbackColumn = (columns, token) => (
            columns.find(col => String(col).toLowerCase().includes(token)) || ''
        );
        const outcomesStateFallback = outcomesStateRole
            || findFallbackColumn(selectedColumns.outcomes, 'state');
        const wsuStateFallback = wsuStateRole
            || findFallbackColumn(selectedColumns.wsu_org, 'state');
        const outcomesCityFallback = outcomesCityRole
            || findFallbackColumn(selectedColumns.outcomes, 'city');
        const wsuCityFallback = wsuCityRole
            || findFallbackColumn(selectedColumns.wsu_org, 'city');
        const outcomesCountryFallback = outcomesCountryRole
            || findFallbackColumn(selectedColumns.outcomes, 'country');
        const wsuCountryFallback = wsuCountryRole
            || findFallbackColumn(selectedColumns.wsu_org, 'country');
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
            threshold: resolvedThreshold,
            ambiguity_gap: resolvedGap,
            state_outcomes: outcomesStateFallback,
            state_wsu: wsuStateFallback,
            city_outcomes: outcomesCityFallback,
            city_wsu: wsuCityFallback,
            country_outcomes: outcomesCountryFallback,
            country_wsu: wsuCountryFallback
        };

        const translateRows = loadedData.translate || [];
        const translateRowCount = translateRows.length;
        if (!translateRowCount) {
            alert('System check failed: Translate table has 0 rows. Re-upload and try again.');
            document.getElementById('loading').classList.add('hidden');
            if (progressWrap) {
                progressWrap.classList.add('hidden');
            }
            return;
        }

        const getValueText = (value) => String(value ?? '').trim();
        let missingInputs = 0;
        let missingOutputs = 0;
        translateRows.forEach(row => {
            if (!getValueText(row[keyConfig.translateInput])) {
                missingInputs += 1;
            }
            if (!getValueText(row[keyConfig.translateOutput])) {
                missingOutputs += 1;
            }
        });
        if (missingInputs > 0 || missingOutputs > 0) {
            alert(
                `System check failed: Translate table has ${missingInputs} blank input key cells and ` +
                `${missingOutputs} blank output key cells. Fix the file or key selection and try again.`
            );
            document.getElementById('loading').classList.add('hidden');
            if (progressWrap) {
                progressWrap.classList.add('hidden');
            }
            return;
        }

        if (progressStage && progressPercent && progressBar) {
            progressStage.textContent = `System check passed: ${translateRowCount.toLocaleString()} rows, no blank key cells`;
            progressPercent.textContent = '5%';
            progressBar.style.width = '5%';
        }
        document.getElementById('loading-message').textContent =
            `System check passed: ${translateRowCount.toLocaleString()} rows, no blank key cells`;

        let lastValidationPercent = 5;
        setPageBusy(true);
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
                    ambiguity_gap: resolvedGap,
                    state_outcomes: outcomesStateFallback,
                    state_wsu: wsuStateFallback,
                    city_outcomes: outcomesCityFallback,
                    city_wsu: wsuCityFallback,
                    country_outcomes: outcomesCountryFallback,
                    country_wsu: wsuCountryFallback
                }
            },
            (stage, processed, total) => {
                if (progressStage && progressPercent && progressBar) {
                    let percent = lastValidationPercent;
                    if (stage === 'merge') {
                        progressStage.textContent = 'Merging data...';
                        percent = Math.max(percent, 10);
                    } else if (stage === 'validate') {
                        progressStage.textContent = 'Validating mappings...';
                        const validatePercent = total
                            ? 10 + Math.round((processed / total) * 85)
                            : 10;
                        percent = Math.max(percent, validatePercent);
                    } else {
                        progressStage.textContent = 'Analyzing mappings...';
                        percent = Math.max(percent, 10);
                    }
                    lastValidationPercent = Math.min(percent, 100);
                    progressPercent.textContent = `${lastValidationPercent}%`;
                    progressBar.style.width = `${lastValidationPercent}%`;
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

        if (progressStage && progressPercent && progressBar) {
            progressStage.textContent = 'Complete';
            progressPercent.textContent = '100%';
            progressBar.style.width = '100%';
        }

        displayResults(stats, errorSamples);

    } catch (error) {
        console.error('Validation error:', error);
        alert(`Error running validation: ${error.message}`);
    } finally {
        hideLoadingUI();
        setPageBusy(false);
        setRunLock(false);
        processAvailableFiles();
    }
}

async function runGeneration() {
    if (runLocked) {
        return;
    }
    setRunLock(true);
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
        const outcomesStateRole = Object.keys(columnRoles.outcomes || {}).find(
            col => columnRoles.outcomes[col] === 'State'
        ) || '';
        const wsuStateRole = Object.keys(columnRoles.wsu_org || {}).find(
            col => columnRoles.wsu_org[col] === 'State'
        ) || '';
        const outcomesCityRole = Object.keys(columnRoles.outcomes || {}).find(
            col => columnRoles.outcomes[col] === 'City'
        ) || '';
        const wsuCityRole = Object.keys(columnRoles.wsu_org || {}).find(
            col => columnRoles.wsu_org[col] === 'City'
        ) || '';
        const outcomesCountryRole = Object.keys(columnRoles.outcomes || {}).find(
            col => columnRoles.outcomes[col] === 'Country'
        ) || '';
        const wsuCountryRole = Object.keys(columnRoles.wsu_org || {}).find(
            col => columnRoles.wsu_org[col] === 'Country'
        ) || '';
        const findFallbackColumn = (columns, token) => (
            columns.find(col => String(col).toLowerCase().includes(token)) || ''
        );
        const outcomesStateFallback = outcomesStateRole
            || findFallbackColumn(selectedColumns.outcomes, 'state');
        const wsuStateFallback = wsuStateRole
            || findFallbackColumn(selectedColumns.wsu_org, 'state');
        const outcomesCityFallback = outcomesCityRole
            || findFallbackColumn(selectedColumns.outcomes, 'city');
        const wsuCityFallback = wsuCityRole
            || findFallbackColumn(selectedColumns.wsu_org, 'city');
        const outcomesCountryFallback = outcomesCountryRole
            || findFallbackColumn(selectedColumns.outcomes, 'country');
        const wsuCountryFallback = wsuCountryRole
            || findFallbackColumn(selectedColumns.wsu_org, 'country');
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
            return;
        }

        if (nameCompareEnabled && (!nameCompareOutcomes || !nameCompareWsu)) {
            alert('Select both name columns or disable name comparison.');
            return;
        }

        setPageBusy(true);
        const generated = await runWorkerTask('generate', {
            outcomes: loadedData.outcomes,
            wsu_org: loadedData.wsu_org,
            keyConfig,
            nameCompare: {
                enabled: Boolean(nameCompareEnabled),
                outcomes_column: nameCompareOutcomes,
                wsu_column: nameCompareWsu,
                threshold: resolvedThreshold,
                ambiguity_gap: resolvedGap,
                state_outcomes: outcomesStateFallback,
                state_wsu: wsuStateFallback,
                city_outcomes: outcomesCityFallback,
                city_wsu: wsuCityFallback,
                country_outcomes: outcomesCountryFallback,
                country_wsu: wsuCountryFallback
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
            generated.headerLabels,
            generated.generationConfig,
            {
                onProgress: (stage, percent) => {
                    if (progressStage && progressPercent && progressBar) {
                        progressStage.textContent = stage;
                        progressPercent.textContent = `${percent}%`;
                        progressBar.style.width = `${percent}%`;
                    }
                    const loadingMessage = document.getElementById('loading-message');
                    if (loadingMessage) {
                        loadingMessage.textContent = stage;
                    }
                }
            }
        );

    } catch (error) {
        console.error('Generation error:', error);
        alert(`Error generating translation table: ${error.message}`);
    } finally {
        hideLoadingUI();
        setPageBusy(false);
        setRunLock(false);
        processAvailableFiles();
    }
}

async function createGeneratedTranslationExcel(
    cleanRows,
    errorRows,
    selectedCols,
    headerLabels,
    generationConfig = {},
    options = {}
) {
    const onProgress = typeof options.onProgress === 'function'
        ? options.onProgress
        : null;
    const result = await runExportWorkerTask(
        'build_generation_export',
        {
            cleanRows,
            errorRows,
            selectedCols,
            headerLabels,
            generationConfig
        },
        (stage, processed, total) => {
            if (!onProgress) return;
            const percent = total ? Math.round((processed / total) * 100) : 0;
            onProgress(stage, percent);
        }
    );
    downloadArrayBuffer(result.buffer, result.filename || 'Generated_Translation_Table.xlsx');
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

    renderRecommendedReviewOrder(stats.errors);
    displayErrorDetails(errorSamples);
    renderMappingLogicPreview();
    renderMatchingRulesExamples();

    document.getElementById('results').classList.remove('hidden');

    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function formatScorePercent(score) {
    if (!Number.isFinite(score)) return '';
    return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`;
}

function getConfiguredValue(row, prefix, fieldName) {
    if (!fieldName) return '';
    const key = `${prefix}_${fieldName}`;
    return row?.[key] ?? '';
}

function buildMatchingExample(row) {
    const threshold = Number.isFinite(lastNameCompareConfig?.threshold)
        ? lastNameCompareConfig.threshold
        : 0.8;
    const outcomesNameKey = lastNameCompareConfig?.outcomes
        ? `outcomes_${lastNameCompareConfig.outcomes}`
        : '';
    const wsuNameKey = lastNameCompareConfig?.wsu
        ? `wsu_${lastNameCompareConfig.wsu}`
        : '';
    const outcomesName = outcomesNameKey ? (row[outcomesNameKey] || row.outcomes_name || '') : (row.outcomes_name || '');
    const wsuName = wsuNameKey ? (row[wsuNameKey] || row.wsu_Descr || '') : (row.wsu_Descr || '');
    const normalizedOutcomes = typeof normalizeNameForCompare === 'function'
        ? normalizeNameForCompare(outcomesName)
        : outcomesName;
    const normalizedWsu = typeof normalizeNameForCompare === 'function'
        ? normalizeNameForCompare(wsuName)
        : wsuName;
    const similarity = (outcomesName && wsuName && typeof calculateNameSimilarity === 'function')
        ? calculateNameSimilarity(outcomesName, wsuName)
        : null;
    const similarityText = formatScorePercent(similarity);

    const outcomesState = getConfiguredValue(row, 'outcomes', lastNameCompareConfig?.state_outcomes);
    const wsuState = getConfiguredValue(row, 'wsu', lastNameCompareConfig?.state_wsu);
    const outcomesCity = getConfiguredValue(row, 'outcomes', lastNameCompareConfig?.city_outcomes);
    const wsuCity = getConfiguredValue(row, 'wsu', lastNameCompareConfig?.city_wsu);
    const outcomesCountry = getConfiguredValue(row, 'outcomes', lastNameCompareConfig?.country_outcomes);
    const wsuCountry = getConfiguredValue(row, 'wsu', lastNameCompareConfig?.country_wsu);

    const evidence = [];
    if (similarityText) {
        evidence.push(`Similarity ${similarityText} (threshold ${formatScorePercent(threshold)})`);
    }
    if (outcomesState && wsuState && typeof statesMatch === 'function' && statesMatch(outcomesState, wsuState)) {
        evidence.push(`State match: ${outcomesState} = ${wsuState}`);
    }
    if (outcomesCountry && wsuCountry && typeof countriesMatch === 'function' && countriesMatch(outcomesCountry, wsuCountry)) {
        evidence.push(`Country match: ${outcomesCountry} = ${wsuCountry}`);
    }
    if (typeof cityInName === 'function' && (cityInName(outcomesName, wsuCity) || cityInName(wsuName, outcomesCity))) {
        evidence.push('City name appears in the other side');
    }
    if (typeof locationInNameMatches === 'function' && (
        locationInNameMatches(outcomesName, wsuCity, wsuState) ||
        locationInNameMatches(wsuName, outcomesCity, outcomesState)
    )) {
        evidence.push('Parenthetical/hyphen location token matched');
    }
    if (row.Error_Type === 'High_Confidence_Match') {
        evidence.push('High-confidence override applied');
    }

    return `
        <div class="border border-gray-200 rounded p-3">
            <p class="text-sm"><strong>Outcomes:</strong> ${escapeHtml(outcomesName || '—')}</p>
            <p class="text-sm"><strong>myWSU:</strong> ${escapeHtml(wsuName || '—')}</p>
            <p class="text-xs text-gray-500 mt-2"><strong>Normalized:</strong> ${escapeHtml(normalizedOutcomes || '—')} ↔ ${escapeHtml(normalizedWsu || '—')}</p>
            <p class="text-xs text-gray-500 mt-1"><strong>Evidence:</strong> ${escapeHtml(evidence.join(' | ') || 'No evidence available')}</p>
            <p class="text-xs text-gray-500 mt-1"><strong>Decision:</strong> ${escapeHtml(normalizeErrorTypeForPreview(row.Error_Type) || row.Error_Type || '—')}</p>
        </div>
    `;
}

function renderMatchingRulesExamples() {
    const toggle = document.getElementById('show-matching-rules');
    const panel = document.getElementById('matching-rules-panel');
    const container = document.getElementById('matching-examples');
    if (!container || !panel || !toggle) return;
    if (!toggle.checked) {
        panel.classList.add('hidden');
        return;
    }
    panel.classList.remove('hidden');
    if (!validatedData.length) {
        container.innerHTML = '<p class="text-xs text-gray-500">Examples from this run will appear after validation.</p>';
        return;
    }

    const priority = [
        'High_Confidence_Match',
        'Name_Mismatch',
        'Ambiguous_Match',
        'Output_Not_Found',
        'Valid'
    ];
    const examples = [];
    priority.forEach(type => {
        if (examples.length >= 2) return;
        const match = validatedData.find(row => row.Error_Type === type && !examples.includes(row));
        if (match) examples.push(match);
    });
    if (examples.length < 2) {
        validatedData.slice(0, 2 - examples.length).forEach(row => examples.push(row));
    }

    const html = examples.map(example => buildMatchingExample(example)).join('');
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${html || '<p class="text-xs text-gray-500">No examples available.</p>'}
        </div>
    `;
}

function normalizeErrorTypeForPreview(errorType) {
    if (errorType === 'Input_Not_Found') return 'Input key not found in Outcomes';
    if (errorType === 'Output_Not_Found') return 'Output key not found in myWSU';
    if (errorType === 'Missing_Input') return 'Input key is blank in Translate';
    if (errorType === 'Missing_Output') return 'Output key is blank in Translate';
    if (errorType === 'Name_Mismatch') return 'Name mismatch';
    if (errorType === 'Ambiguous_Match') return 'Ambiguous name match';
    return errorType || '';
}

function buildMappingLogicPreviewText(row) {
    const threshold = Number.isFinite(lastNameCompareConfig?.threshold)
        ? lastNameCompareConfig.threshold
        : 0.8;
    const thresholdText = formatScorePercent(threshold);
    const outcomesNameKey = lastNameCompareConfig?.outcomes
        ? `outcomes_${lastNameCompareConfig.outcomes}`
        : '';
    const wsuNameKey = lastNameCompareConfig?.wsu
        ? `wsu_${lastNameCompareConfig.wsu}`
        : '';
    const outcomesName = outcomesNameKey ? (row[outcomesNameKey] || row.outcomes_name || '') : (row.outcomes_name || '');
    const wsuName = wsuNameKey ? (row[wsuNameKey] || row.wsu_Descr || '') : (row.wsu_Descr || '');
    const similarity = (outcomesName && wsuName && typeof calculateNameSimilarity === 'function')
        ? calculateNameSimilarity(outcomesName, wsuName)
        : null;
    const similarityText = formatScorePercent(similarity);

    switch (row.Error_Type) {
    case 'Valid':
        if (similarityText) {
            return `Valid: key checks passed and name similarity ${similarityText} met/exceeded threshold ${thresholdText}.`;
        }
        return 'Valid: key checks passed and no blocking validation rules fired.';
    case 'High_Confidence_Match':
        return similarityText
            ? `High confidence override: similarity ${similarityText} was below threshold ${thresholdText}, but alias/location/token rules confirmed this mapping.`
            : `High confidence override: alias/location/token rules confirmed this mapping below threshold ${thresholdText}.`;
    case 'Duplicate_Target':
        return 'Many-to-one duplicate: multiple source keys map to the same target key.';
    case 'Duplicate_Source':
        return 'One-to-many duplicate: one source key maps to multiple target keys.';
    case 'Input_Not_Found':
        return 'Key lookup failed: translate input key value is present but was not found in Outcomes keys.';
    case 'Output_Not_Found':
        if (row.Error_Subtype === 'Output_Not_Found_Likely_Stale_Key') {
            const suggested = row.Suggested_Key ? ` Suggested replacement key: ${row.Suggested_Key}.` : '';
            return `Key lookup failed: translate output key was not found in myWSU keys. Likely stale key.${suggested}`;
        }
        if (row.Error_Subtype === 'Output_Not_Found_Ambiguous_Replacement') {
            return 'Key lookup failed: translate output key was not found in myWSU keys. Multiple high-confidence replacement candidates were found.';
        }
        if (row.Error_Subtype === 'Output_Not_Found_No_Replacement') {
            return 'Key lookup failed: translate output key was not found in myWSU keys. No high-confidence replacement candidate was found.';
        }
        return 'Key lookup failed: translate output key value is present but was not found in myWSU keys.';
    case 'Missing_Input':
        return 'Translate row has a blank input key cell.';
    case 'Missing_Output':
        return 'Translate row has a blank output key cell.';
    case 'Name_Mismatch':
        return similarityText
            ? `Name comparison failed: similarity ${similarityText} is below threshold ${thresholdText}.`
            : 'Name comparison failed: below configured threshold.';
    case 'Ambiguous_Match':
        return 'Name comparison ambiguous: another candidate scored within the ambiguity gap.';
    default:
        return row.Error_Description || 'Classified by validation rules.';
    }
}

function renderMappingLogicPreview() {
    const toggle = document.getElementById('show-logic-preview');
    const panel = document.getElementById('logic-preview-panel');
    const body = document.getElementById('logic-preview-body');
    const summary = document.getElementById('logic-preview-summary');
    if (!toggle || !panel || !body || !summary) return;

    if (!toggle.checked || !validatedData.length) {
        panel.classList.add('hidden');
        body.innerHTML = '';
        summary.textContent = '';
        return;
    }

    const maxRows = 200;
    const rows = validatedData.slice(0, maxRows);
    const rowsHtml = rows.map((row, index) => {
        const subtype = row.Error_Subtype ? ` (${row.Error_Subtype})` : '';
        const classification = `${normalizeErrorTypeForPreview(row.Error_Type)}${subtype}`;
        const logicText = buildMappingLogicPreviewText(row);
        return `
            <tr class="border-b align-top">
                <td class="py-2 px-3 text-xs text-gray-500">${index + 1}</td>
                <td class="py-2 px-3 text-sm">${escapeHtml(row.translate_input)}</td>
                <td class="py-2 px-3 text-sm">${escapeHtml(row.translate_output)}</td>
                <td class="py-2 px-3 text-sm">${escapeHtml(classification)}</td>
                <td class="py-2 px-3 text-sm">${escapeHtml(logicText)}</td>
            </tr>
        `;
    }).join('');

    body.innerHTML = rowsHtml;
    summary.textContent = validatedData.length > maxRows
        ? `Showing first ${maxRows.toLocaleString()} of ${validatedData.length.toLocaleString()} rows.`
        : `Showing all ${validatedData.length.toLocaleString()} rows.`;
    panel.classList.remove('hidden');
}

function createErrorChart(errors) {
    const ctx = document.getElementById('error-chart').getContext('2d');

    if (window.errorChart) {
        window.errorChart.destroy();
    }

    const data = {
        labels: [
            'Input Keys Not Found in Outcomes',
            'Output Keys Not Found in myWSU',
            'Duplicate Target Keys',
            'Duplicate Source Keys',
            'Name Mismatches',
            'Ambiguous Matches',
            'High Confidence Matches'
        ],
        datasets: [{
            label: 'Error Count',
            data: [
                errors.input_not_found,
                errors.output_not_found,
                errors.duplicate_targets,
                errors.duplicate_sources,
                errors.name_mismatches,
                errors.ambiguous_matches,
                errors.high_confidence_matches || 0
            ],
            backgroundColor: [
                'rgba(239, 68, 68, 0.8)',   // Red
                'rgba(249, 115, 22, 0.8)',  // Orange
                'rgba(251, 191, 36, 0.8)',  // Yellow
                'rgba(59, 130, 246, 0.8)',  // Blue
                'rgba(14, 116, 144, 0.8)',  // Teal
                'rgba(234, 179, 8, 0.8)',   // Amber
                'rgba(168, 85, 247, 0.8)',  // Purple
                'rgba(74, 222, 128, 0.8)'   // Green
            ],
            borderColor: [
                'rgb(239, 68, 68)',
                'rgb(249, 115, 22)',
                'rgb(251, 191, 36)',
                'rgb(59, 130, 246)',
                'rgb(14, 116, 144)',
                'rgb(202, 138, 4)',
                'rgb(147, 51, 234)',
                'rgb(22, 163, 74)'
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

function renderRecommendedReviewOrder(errors) {
    const panel = document.getElementById('recommended-review-order');
    const list = document.getElementById('review-order-list');
    if (!panel || !list) return;

    const e = errors || {};
    const structural = (e.missing_inputs || 0) + (e.missing_outputs || 0) + (e.input_not_found || 0) + (e.output_not_found_no_replacement ?? 0);
    const duplicates = (e.duplicate_targets || 0) + (e.duplicate_sources || 0);
    const staleKey = e.output_not_found_likely_stale_key || 0;
    const nameWarnings = (e.name_mismatches || 0) + (e.ambiguous_matches || 0);
    const ambiguousReplacement = e.output_not_found_ambiguous_replacement || 0;

    const rawItems = [
        structural > 0 && `Structural/key failures (${structural})`,
        duplicates > 0 && `Duplicate conflicts (${duplicates})`,
        staleKey > 0 && `Stale-key candidates (${staleKey})`,
        ambiguousReplacement > 0 && `Ambiguous replacement (${ambiguousReplacement})`,
        nameWarnings > 0 && `Name warnings (${nameWarnings})`
    ].filter(Boolean);
    const items = rawItems.map((text, i) => `${i + 1}. ${text}`);

    if (items.length === 0) {
        panel.classList.add('hidden');
        list.innerHTML = '';
        return;
    }
    list.innerHTML = items.map(text => `<li>${escapeHtml(text)}</li>`).join('');
    panel.classList.remove('hidden');
}

function displayErrorDetails(errorSamples) {
    const detailsDiv = document.getElementById('error-details');
    detailsDiv.innerHTML = '';

    const errorTypes = [
        { key: 'Input_Not_Found', title: 'Input Keys Not Found in Outcomes', color: 'orange' },
        { key: 'Output_Not_Found', title: 'Output Keys Not Found in myWSU', color: 'orange' },
        { key: 'Output_Not_Found_Likely_Stale_Key', title: 'Likely Stale Output Keys (Suggested Replacements)', color: 'orange' },
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
        'Input Keys Not Found in Outcomes': {
            icon: '🔴',
            text: 'Translate input key value is present, but it does not exist in Outcomes keys.',
            impact: 'Critical - Data entry/config issue; mapping will fail'
        },
        'Output Keys Not Found in myWSU': {
            icon: '🔴',
            text: 'Translate output key value is present, but it does not exist in myWSU keys.',
            impact: 'Critical - Data entry/config issue; mapping will fail'
        },
        'Likely Stale Output Keys (Suggested Replacements)': {
            icon: '[!]',
            text: 'Output key value is not found in myWSU, but one high-confidence replacement key was found using name and location evidence.',
            impact: 'Critical - Likely stale key; verify then update translate output key'
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
    const progressWrap = document.getElementById('download-progress');
    const progressText = document.getElementById('download-progress-text');
    const progressBar = document.getElementById('download-progress-bar');
    downloadBtn.addEventListener('click', async function() {
        if (validatedData.length === 0) {
            alert('Please run validation first.');
            return;
        }

        try {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Generating...';
            if (progressWrap && progressText && progressBar) {
                progressWrap.classList.remove('hidden');
                progressText.textContent = 'Preparing export...';
                progressBar.style.width = '0%';
            }
            setPageBusy(true);

            const includeSuggestions = Boolean(
                document.getElementById('include-suggestions')?.checked
            );
            const showMappingLogic = Boolean(
                document.getElementById('show-mapping-logic')?.checked
            );
            await createExcelOutput(
                validatedData,
                missingData,
                selectedColumns,
                {
                    includeSuggestions,
                    showMappingLogic,
                    nameCompareConfig: lastNameCompareConfig,
                    onProgress: (stage, percent) => {
                        if (progressText && progressBar) {
                            progressText.textContent = stage;
                            progressBar.style.width = `${percent}%`;
                        }
                    }
                }
            );

            downloadBtn.disabled = false;
            downloadBtn.innerHTML = `
                <svg class="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Download Full Report
            `;
            if (progressWrap && progressText && progressBar) {
                progressText.textContent = 'Download ready.';
                progressBar.style.width = '100%';
                setTimeout(() => {
                    progressWrap.classList.add('hidden');
                }, 1500);
            }

        } catch (error) {
            console.error('Download error:', error);
            if (error.exportStack) {
                console.error('Export worker stack:', error.exportStack);
            }
            alert(`Error generating Excel: ${error.message}`);
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = `
                <svg class="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Download Full Report
            `;
            if (progressWrap) {
                progressWrap.classList.add('hidden');
            }
        } finally {
            setPageBusy(false);
        }
    });
}

async function createExcelOutput(validated, missing, selectedCols, options = {}) {
    const onProgressCb = typeof options.onProgress === 'function'
        ? options.onProgress
        : null;
    const result = await runExportWorkerTask(
        'build_validation_export',
        {
            validated,
            missing,
            selectedCols,
            options: {
                includeSuggestions: Boolean(options.includeSuggestions),
                showMappingLogic: Boolean(options.showMappingLogic),
                nameCompareConfig: options.nameCompareConfig || {}
            },
            context: {
                loadedData,
                columnRoles,
                keyConfig,
                keyLabels
            }
        },
        (stage, processed, total) => {
            if (!onProgressCb) return;
            const percent = total ? Math.round((processed / total) * 100) : 0;
            onProgressCb(stage, percent);
        }
    );
    downloadArrayBuffer(result.buffer, result.filename || 'WSU_Mapping_Validation_Report.xlsx');
    return;
}

function setupResetButton() {
    const resetBtn = document.getElementById('reset-btn');
    resetBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to start over? This will clear all uploaded files and results.')) {
            location.reload();
        }
    });
}
