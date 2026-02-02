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
let keyLabels = {
    outcomes: '',
    translateInput: '',
    translateOutput: '',
    wsu: ''
};

document.addEventListener('DOMContentLoaded', function() {
    setupFileUploads();
    setupColumnSelection();
    setupValidateButton();
    setupGenerateButton();
    setupDownloadButton();
    setupResetButton();
    setupNameCompareControls();
    setupShowAllErrorsToggle();
});

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

        if (outcomesReady && wsuReady) {
            populateKeySelection(outcomesColumns, translateColumns, wsuOrgColumns);
            populateColumnSelection(outcomesColumns, wsuOrgColumns);
            populateNameCompareOptions(outcomesColumns, wsuOrgColumns);
            document.getElementById('column-selection').classList.remove('hidden');
        }

        const validateBtn = document.getElementById('validate-btn');
        const validateMessage = document.getElementById('validation-message');
        if (outcomesReady && translateReady && wsuReady) {
            validateBtn.disabled = false;
            validateBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
            validateBtn.classList.add('bg-wsu-crimson', 'hover:bg-red-800', 'cursor-pointer');
            validateMessage.textContent = 'Ready to validate!';
        } else {
            validateBtn.disabled = true;
            validateBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
            validateBtn.classList.remove('bg-wsu-crimson', 'hover:bg-red-800', 'cursor-pointer');
            validateMessage.textContent = 'Upload Outcomes, Translation, and myWSU to validate.';
        }

        const generateBtn = document.getElementById('generate-btn');
        const generateMessage = document.getElementById('generate-message');
        if (outcomesReady && wsuReady) {
            generateBtn.disabled = false;
            generateBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
            generateBtn.classList.add('bg-wsu-crimson', 'hover:bg-red-800', 'cursor-pointer');
            generateMessage.textContent = 'Ready to generate a clean translation table.';
        } else {
            generateBtn.disabled = true;
            generateBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
            generateBtn.classList.remove('bg-wsu-crimson', 'hover:bg-red-800', 'cursor-pointer');
            generateMessage.textContent = 'Upload Outcomes + myWSU to generate a translation table.';
        }

    } catch (error) {
        console.error('Error processing files:', error);
        alert('Error processing files. Please try again.');
    }
}

function populateColumnSelection(outcomesColumns, wsuOrgColumns) {
    const defaultOutcomes = ['name', 'mdb_code', 'state', 'country'];
    const defaultWsuOrg = ['Org ID', 'Descr', 'City', 'State', 'Country'];

    const outcomesDiv = document.getElementById('outcomes-columns');
    outcomesDiv.innerHTML = '';
    selectedColumns.outcomes = [];
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

    const wsuOrgDiv = document.getElementById('wsu-org-columns');
    wsuOrgDiv.innerHTML = '';
    selectedColumns.wsu_org = [];
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

    outcomesColumns.forEach(col => {
        outcomesSelect.insertAdjacentHTML(
            'beforeend',
            `<option value="${col}">${col}</option>`
        );
    });
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
    wsuOrgColumns.forEach(col => {
        wsuSelect.insertAdjacentHTML(
            'beforeend',
            `<option value="${col}">${col}</option>`
        );
    });

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
    const enabledCheckbox = document.getElementById('name-compare-enabled');
    const fields = document.getElementById('name-compare-fields');
    if (!enabledCheckbox || !fields) return;

    enabledCheckbox.addEventListener('change', function() {
        updateNameCompareState();
    });
}

function updateNameCompareState() {
    const enabledCheckbox = document.getElementById('name-compare-enabled');
    const fields = document.getElementById('name-compare-fields');
    if (!enabledCheckbox || !fields) return;

    const controls = fields.querySelectorAll('select, input');
    controls.forEach(control => {
        control.disabled = !enabledCheckbox.checked;
    });
    fields.classList.toggle('opacity-50', !enabledCheckbox.checked);
}

function populateNameCompareOptions(outcomesColumns, wsuOrgColumns) {
    const outcomesSelect = document.getElementById('name-compare-outcomes');
    const wsuSelect = document.getElementById('name-compare-wsu');
    const thresholdInput = document.getElementById('name-compare-threshold');
    const enabledCheckbox = document.getElementById('name-compare-enabled');

    if (!outcomesSelect || !wsuSelect || !thresholdInput || !enabledCheckbox) return;

    outcomesSelect.innerHTML = '<option value="">Select column</option>';
    wsuSelect.innerHTML = '<option value="">Select column</option>';

    outcomesColumns.forEach(col => {
        outcomesSelect.insertAdjacentHTML(
            'beforeend',
            `<option value="${col}">${col}</option>`
        );
    });
    wsuOrgColumns.forEach(col => {
        wsuSelect.insertAdjacentHTML(
            'beforeend',
            `<option value="${col}">${col}</option>`
        );
    });

    const defaultOutcomes = outcomesColumns.includes('name') ? 'name' : '';
    const defaultWsu = wsuOrgColumns.includes('Descr') ? 'Descr' : '';
    if (defaultOutcomes) outcomesSelect.value = defaultOutcomes;
    if (defaultWsu) wsuSelect.value = defaultWsu;

    enabledCheckbox.checked = Boolean(defaultOutcomes && defaultWsu);
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

async function runValidation() {
    try {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('results').classList.add('hidden');

        await new Promise(resolve => setTimeout(resolve, 100));

        updateKeyConfig();
        if (!keyConfig.outcomes || !keyConfig.translateInput || !keyConfig.translateOutput || !keyConfig.wsu) {
            alert('Select all key columns before validating.');
            document.getElementById('loading').classList.add('hidden');
            return;
        }

        const nameCompareEnabled = document.getElementById('name-compare-enabled')?.checked;
        const nameCompareOutcomes = document.getElementById('name-compare-outcomes')?.value || '';
        const nameCompareWsu = document.getElementById('name-compare-wsu')?.value || '';
        const nameCompareThreshold = parseFloat(
            document.getElementById('name-compare-threshold')?.value || '0.5'
        );

        if (nameCompareEnabled && (!nameCompareOutcomes || !nameCompareWsu)) {
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
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('results').classList.add('hidden');

        await new Promise(resolve => setTimeout(resolve, 100));

        updateKeyConfig();
        if (!keyConfig.outcomes || !keyConfig.wsu) {
            alert('Select Outcomes and myWSU key columns before generating.');
            document.getElementById('loading').classList.add('hidden');
            return;
        }

        const generated = generateTranslationTable(
            loadedData.outcomes,
            loadedData.wsu_org,
            keyConfig
        );

        await createGeneratedTranslationExcel(generated.cleanRows, generated.errorRows);

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
            map.set(normalized, raw);
        }
    });
    return map;
}

function generateTranslationTable(outcomes, wsuOrg, keyConfig) {
    const outcomesMap = buildKeyValueMap(outcomes, keyConfig.outcomes);
    const wsuMap = buildKeyValueMap(wsuOrg, keyConfig.wsu);
    const allKeys = new Set([...outcomesMap.keys(), ...wsuMap.keys()]);

    const cleanRows = [];
    const errorRows = [];

    Array.from(allKeys)
        .sort((a, b) => String(a).localeCompare(String(b)))
        .forEach(key => {
            const inputRaw = outcomesMap.get(key) ?? '';
            const outputRaw = wsuMap.get(key) ?? '';

            cleanRows.push({
                input: inputRaw,
                output: outputRaw
            });

            if (!outcomesMap.has(key)) {
                errorRows.push({
                    normalized_key: key,
                    missing_in: 'Outcomes',
                    input: '',
                    output: outputRaw
                });
            }
            if (!wsuMap.has(key)) {
                errorRows.push({
                    normalized_key: key,
                    missing_in: 'myWSU',
                    input: inputRaw,
                    output: ''
                });
            }
        });

    return { cleanRows, errorRows };
}

async function createGeneratedTranslationExcel(cleanRows, errorRows) {
    const workbook = new ExcelJS.Workbook();

    const inputHeader = keyLabels.outcomes || 'Outcomes Key';
    const outputHeader = keyLabels.wsu || 'myWSU Key';

    const cleanSheet = workbook.addWorksheet('Clean_Translation_Table');
    cleanSheet.addRow([`${inputHeader} (Input)`, `${outputHeader} (Output)`]);
    cleanSheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    });
    cleanRows.forEach(row => {
        cleanSheet.addRow([row.input, row.output]);
    });
    cleanSheet.views = [{ state: 'frozen', ySplit: 1 }];
    cleanSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 2 } };
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
    const errorHeaders = ['Normalized Key', 'Missing In', `${inputHeader} (Input)`, `${outputHeader} (Output)`];
    errorSheet.addRow(errorHeaders);
    errorSheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
    });
    errorRows.forEach(row => {
        errorSheet.addRow([row.normalized_key, row.missing_in, row.input, row.output]);
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
