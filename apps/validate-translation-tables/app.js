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

document.addEventListener('DOMContentLoaded', function() {
    setupFileUploads();
    setupColumnSelection();
    setupValidateButton();
    setupDownloadButton();
    setupResetButton();
    setupNameCompareControls();
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

        const data = await loadFile(file, {
            expectedHeaders: fileKey === 'wsu_org' ? ['Org ID'] : []
        });

        fileObjects[fileKey] = file;
        loadedData[fileKey] = data;
        filesUploaded[fileKey] = true;

        rowsSpan.textContent = `${data.length} rows`;

        if (filesUploaded.outcomes && filesUploaded.translate && filesUploaded.wsu_org) {
            processAllFiles();
        }

    } catch (error) {
        console.error(`Error loading ${fileKey}:`, error);
        alert(`Error loading file: ${error.message}`);
        statusDiv.classList.add('hidden');
        filesUploaded[fileKey] = false;
    }
}

function processAllFiles() {
    try {
        const outcomesColumns = Object.keys(loadedData.outcomes[0] || {})
            .filter(col => !col.startsWith('Unnamed'));
        const wsuOrgColumns = Object.keys(loadedData.wsu_org[0] || {})
            .filter(col => !col.startsWith('Unnamed'));

        populateColumnSelection(outcomesColumns, wsuOrgColumns);
        populateNameCompareOptions(outcomesColumns, wsuOrgColumns);

        document.getElementById('column-selection').classList.remove('hidden');

        const validateBtn = document.getElementById('validate-btn');
        validateBtn.disabled = false;
        validateBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
        validateBtn.classList.add('bg-wsu-crimson', 'hover:bg-red-800', 'cursor-pointer');

        document.getElementById('validation-message').textContent = 'Ready to validate!';

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

    toggleBtn.addEventListener('click', function() {
        checkboxesDiv.classList.toggle('hidden');
        const svg = toggleBtn.querySelector('svg');
        svg.classList.toggle('rotate-180');
    });
}

function setupValidateButton() {
    const validateBtn = document.getElementById('validate-btn');
    validateBtn.addEventListener('click', runValidation);
}

async function runValidation() {
    try {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('results').classList.add('hidden');

        await new Promise(resolve => setTimeout(resolve, 100));

    const nameCompareEnabled = document.getElementById('name-compare-enabled')?.checked;
    const nameCompareOutcomes = document.getElementById('name-compare-outcomes')?.value || '';
    const nameCompareWsu = document.getElementById('name-compare-wsu')?.value || '';
    const nameCompareThreshold = parseFloat(
        document.getElementById('name-compare-threshold')?.value || '0.5'
    );

    if (nameCompareEnabled && (!nameCompareOutcomes || !nameCompareWsu)) {
        alert('Select both name columns or disable name comparison.');
        return;
    }

    const merged = mergeData(loadedData.outcomes, loadedData.translate, loadedData.wsu_org);

    validatedData = validateMappings(
        merged,
        loadedData.translate,
        loadedData.outcomes,
        loadedData.wsu_org,
        {
            enabled: Boolean(nameCompareEnabled),
            outcomes_column: nameCompareOutcomes,
            wsu_column: nameCompareWsu,
            threshold: Number.isNaN(nameCompareThreshold) ? 0.5 : nameCompareThreshold
        }
    );

        missingData = detectMissingMappings(loadedData.outcomes, loadedData.translate);

        stats = generateSummaryStats(validatedData, loadedData.outcomes, loadedData.translate, loadedData.wsu_org);

        const errorSamples = getErrorSamples(validatedData);

        document.getElementById('loading').classList.add('hidden');

        displayResults(stats, errorSamples);

    } catch (error) {
        console.error('Validation error:', error);
        alert(`Error running validation: ${error.message}`);
        document.getElementById('loading').classList.add('hidden');
    }
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
            'Invalid Org IDs',
            'Duplicate Org IDs',
            'Duplicate mdb_codes',
            'Orphaned Mappings'
        ],
        datasets: [{
            label: 'Error Count',
            data: [
                errors.invalid_org_ids,
                errors.duplicate_org_ids,
                errors.duplicate_mdb_codes,
                errors.orphaned_mappings
            ],
            backgroundColor: [
                'rgba(239, 68, 68, 0.8)',   // Red
                'rgba(249, 115, 22, 0.8)',  // Orange
                'rgba(251, 191, 36, 0.8)',  // Yellow
                'rgba(59, 130, 246, 0.8)'   // Blue
            ],
            borderColor: [
                'rgb(239, 68, 68)',
                'rgb(249, 115, 22)',
                'rgb(251, 191, 36)',
                'rgb(59, 130, 246)'
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
        { key: 'Invalid_OrgID', title: 'Invalid Org IDs', color: 'red' },
        { key: 'Duplicate_OrgID', title: 'Duplicate Org IDs (Many-to-One Errors)', color: 'orange' },
        { key: 'Duplicate_mdb', title: 'Duplicate mdb_codes', color: 'red' },
        { key: 'Name_Mismatch', title: 'Name Mismatches (Possible Wrong Mappings)', color: 'yellow' },
        { key: 'Orphaned_Mapping', title: 'Orphaned Mappings', color: 'yellow' }
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
        'Invalid Org IDs': {
            icon: '🔴',
            text: 'These mappings point to WSU Org IDs that do not exist in WSU_org.xlsx. Integration will fail for these schools.',
            impact: 'Critical - Must be fixed to enable data sync'
        },
        'Duplicate Org IDs (Many-to-One Errors)': {
            icon: '🟠',
            text: 'Multiple different mdb_codes map to the SAME WSU Org ID. Multiple schools are pointing to one organization.',
            impact: 'Critical - Multiple schools\' data will be merged into one organization'
        },
        'Duplicate mdb_codes': {
            icon: '',
            text: 'The same mdb_code maps to multiple WSU Org IDs. This creates conflicting mappings for a single Outcomes school.',
            impact: 'Critical - Fix conflicting mappings for the same school'
        },
        'Name Mismatches (Possible Wrong Mappings)': {
            icon: '⚠️',
            text: 'School names do not match between Outcomes and WSU (less than 50% similarity). These may be incorrect mappings that need review.',
            impact: 'Warning - Review these mappings to ensure correct organizations'
        },
        'Orphaned Mappings': {
            icon: '🟡',
            text: 'These mappings reference mdb_codes that no longer exist in Outcomes.csv. Clean up recommended.',
            impact: 'Warning - Clean up old data to maintain quality'
        }
    };

    const explanation = explanations[title] || { icon: '', text: '', impact: '' };

    const rowsHtml = sample.rows.map(row => `
        <tr class="border-b">
            <td class="py-2 px-4 text-sm">${row.mdb_code}</td>
            <td class="py-2 px-4 text-sm">${row.Org_ID_raw}</td>
            <td class="py-2 px-4 text-sm">${row.Error_Description}</td>
        </tr>
    `).join('');

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
            <p class="text-xs text-gray-500 mb-4">Showing first 10 of ${sample.count} errors - download Excel for complete list</p>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="py-2 px-4 text-left text-xs font-medium text-gray-700 uppercase">mdb_code</th>
                            <th class="py-2 px-4 text-left text-xs font-medium text-gray-700 uppercase">Org ID</th>
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

    const sheet1 = workbook.addWorksheet('Errors_in_Translate');

    const outputColumns = ['Error_Type', 'Error_Description', 'Duplicate_Group', 'mdb_code', 'Org_ID_raw'];

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
        if (col === 'mdb_code') return 'mdb_code (Input)';
        if (col === 'Org_ID_raw') return 'Org ID (Output)';
        if (col === 'outcomes_name') return 'School Name (Outcomes)';
        if (col === 'outcomes_mdb_code') return 'mdb_code (Outcomes)';
        if (col === 'wsu_Descr') return 'Organization Name (WSU)';
        if (col === 'wsu_Org ID') return 'Org ID (WSU)';
        return col;
    });

    sheet1.addRow(headers);

    headers.forEach((header, idx) => {
        const cell = sheet1.getCell(1, idx + 1);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };

        const errorCols = ['Error_Type', 'Error_Description', 'Duplicate_Group'];
        const translateCols = ['mdb_code (Input)', 'Org ID (Output)'];

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
        if (['mdb_code', 'Org_ID_raw'].includes(col)) {
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
        Invalid_OrgID: 'FFEF4444',
        Duplicate_OrgID: 'FFEF4444',
        Duplicate_mdb: 'FFEF4444',
        Orphaned_Mapping: 'FFF59E0B',
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

    const sheet2 = workbook.addWorksheet('Missing_from_Translate');

    const missingColumns = ['mdb_code'];
    selectedCols.outcomes.forEach(col => {
        if (col !== 'mdb_code') {
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
