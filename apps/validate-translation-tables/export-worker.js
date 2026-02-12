/* global normalizeKeyValue, calculateNameSimilarity, similarityRatio */
importScripts('validation.js');
importScripts('validation-export-helpers.js');
importScripts('https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js');

const EXPORT_TOTAL = 100;
const EXPORT_OUTPUT_NOT_FOUND_SUBTYPE = (typeof ValidationExportHelpers !== 'undefined' && ValidationExportHelpers)
    ? ValidationExportHelpers.OUTPUT_NOT_FOUND_SUBTYPE
    : {
        LIKELY_STALE_KEY: 'Output_Not_Found_Likely_Stale_Key',
        AMBIGUOUS_REPLACEMENT: 'Output_Not_Found_Ambiguous_Replacement',
        NO_REPLACEMENT: 'Output_Not_Found_No_Replacement'
    };
const getActionPriority = (typeof ValidationExportHelpers !== 'undefined' && ValidationExportHelpers)
    ? ValidationExportHelpers.getPriority
    : () => 99;
const getRecommendedAction = (typeof ValidationExportHelpers !== 'undefined' && ValidationExportHelpers)
    ? ValidationExportHelpers.getRecommendedAction
    : () => 'Review and resolve';

function reportProgress(stage, processed) {
    self.postMessage({
        type: 'progress',
        stage,
        processed,
        total: EXPORT_TOTAL
    });
}

function toArrayBuffer(bufferLike) {
    if (bufferLike instanceof ArrayBuffer) {
        return bufferLike;
    }
    if (bufferLike?.buffer instanceof ArrayBuffer) {
        const start = bufferLike.byteOffset || 0;
        const end = start + (bufferLike.byteLength || bufferLike.length || 0);
        return bufferLike.buffer.slice(start, end);
    }
    throw new Error('Unable to convert workbook buffer to ArrayBuffer');
}

function downloadSafeFileName(name, fallback) {
    const raw = String(name || '').trim();
    return raw || fallback;
}

function getHeaderFill(col, style) {
    if (col === 'Error_Type') return style.errorHeaderColor;
    if (col === 'Error_Subtype') return style.errorHeaderColor;
    if (col === 'Duplicate_Group') return style.groupHeaderColor;
    if (col === 'Mapping_Logic') return style.logicHeaderColor;
    if (['translate_input', 'translate_output'].includes(col)) return style.translateHeaderColor;
    if (col.startsWith('outcomes_')) return style.outcomesHeaderColor;
    if (col.startsWith('wsu_')) return style.wsuHeaderColor;
    if (col.startsWith('Suggested_') || col === 'Suggestion_Score') {
        return style.suggestionHeaderColor;
    }
    return style.defaultHeaderColor;
}

function getBodyFill(col, style) {
    if (col === 'Error_Type') return style.errorBodyColor;
    if (col === 'Error_Subtype') return style.errorBodyColor;
    if (col === 'Duplicate_Group') return style.groupBodyColor;
    if (col === 'Mapping_Logic') return style.logicBodyColor;
    if (['translate_input', 'translate_output'].includes(col)) return style.translateBodyColor;
    if (col.startsWith('outcomes_')) return style.outcomesBodyColor;
    if (col.startsWith('wsu_')) return style.wsuBodyColor;
    if (col.startsWith('Suggested_') || col === 'Suggestion_Score') {
        return style.suggestionBodyColor;
    }
    return style.defaultBodyColor;
}

function columnIndexToLetter(index) {
    let result = '';
    let current = index;
    while (current > 0) {
        const remainder = (current - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        current = Math.floor((current - 1) / 26);
    }
    return result;
}

function addSheetWithRows(workbook, config) {
    const {
        sheetName,
        outputColumns,
        rows,
        style,
        headers,
        rowBorderByError,
        groupColumn
    } = config;
    const sheet = workbook.addWorksheet(sheetName);
    sheet.addRow(headers);
    headers.forEach((header, idx) => {
        const cell = sheet.getCell(1, idx + 1);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: getHeaderFill(outputColumns[idx], style) }
        };
    });

    const sourceFillByColumn = outputColumns.map(col => ({ argb: getBodyFill(col, style) }));
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
        column.width = Math.min(maxLength + 2, 70);
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
}

function formatScore(score) {
    if (!Number.isFinite(score)) return '';
    return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`;
}

function normalizeErrorType(row) {
    if (row.Error_Type === 'Input_Not_Found') return 'Input key not found in Outcomes';
    if (row.Error_Type === 'Output_Not_Found') return 'Output key not found in myWSU';
    if (row.Error_Type === 'Missing_Input') return 'Input key is blank in Translate';
    if (row.Error_Type === 'Missing_Output') return 'Output key is blank in Translate';
    if (row.Error_Type === 'Name_Mismatch') return 'Name mismatch';
    if (row.Error_Type === 'Ambiguous_Match') return 'Ambiguous name match';
    return row.Error_Type || '';
}

function normalizeErrorSubtype(subtype) {
    if (subtype === EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.LIKELY_STALE_KEY) {
        return 'Likely stale key (high-confidence replacement found)';
    }
    if (subtype === EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.AMBIGUOUS_REPLACEMENT) {
        return 'Ambiguous replacement (multiple high-confidence candidates)';
    }
    if (subtype === EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.NO_REPLACEMENT) {
        return 'No high-confidence replacement found';
    }
    return subtype || '';
}

function buildHeaders(outputColumns, keyLabels) {
    return outputColumns.map(col => {
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
        if (col === 'Error_Subtype') return 'Error Subtype';
        if (col === 'Missing_In') return 'Missing In';
        if (col === 'Similarity') return 'Similarity';
        if (col === 'Mapping_Logic') return 'Mapping Logic';
        if (col === 'Suggested_Key') return 'Suggested Key';
        if (col === 'Suggested_School') return 'Suggested School';
        if (col === 'Suggested_City') return 'Suggested City';
        if (col === 'Suggested_State') return 'Suggested State';
        if (col === 'Suggested_Country') return 'Suggested Country';
        if (col === 'Suggestion_Score') return 'Suggestion Score';
        return col;
    });
}

function buildMappingLogicRow(row, normalizedErrorType, nameCompareConfig) {
    const threshold = Number.isFinite(nameCompareConfig?.threshold)
        ? nameCompareConfig.threshold
        : 0.8;
    const outcomesNameKey = nameCompareConfig?.outcomes ? `outcomes_${nameCompareConfig.outcomes}` : '';
    const wsuNameKey = nameCompareConfig?.wsu ? `wsu_${nameCompareConfig.wsu}` : '';
    const outcomesName = outcomesNameKey ? (row[outcomesNameKey] || row.outcomes_name || '') : (row.outcomes_name || '');
    const wsuName = wsuNameKey ? (row[wsuNameKey] || row.wsu_Descr || '') : (row.wsu_Descr || '');
    const similarity = (outcomesName && wsuName && typeof calculateNameSimilarity === 'function')
        ? calculateNameSimilarity(outcomesName, wsuName)
        : null;
    const similarityText = Number.isFinite(similarity) ? formatScore(similarity) : '';
    const thresholdText = formatScore(threshold);

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
        if (row.Error_Subtype === EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.LIKELY_STALE_KEY) {
            const suggested = row.Suggested_Key
                ? ` Suggested replacement key: ${row.Suggested_Key}.`
                : '';
            return `Key lookup failed: translate output key was not found in myWSU keys. Likely stale key.${suggested}`;
        }
        if (row.Error_Subtype === EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.AMBIGUOUS_REPLACEMENT) {
            return 'Key lookup failed: translate output key was not found in myWSU keys. Multiple high-confidence replacement candidates were found.';
        }
        if (row.Error_Subtype === EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.NO_REPLACEMENT) {
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
        return normalizedErrorType
            ? `Classified as "${normalizedErrorType}" by validation rules.`
            : (row.Error_Description || 'Classified by validation rules.');
    }
}

async function buildGenerationExport(payload) {
    const {
        cleanRows = [],
        errorRows = [],
        selectedCols = { outcomes: [], wsu_org: [] },
        generationConfig = {}
    } = payload;
    const workbook = new ExcelJS.Workbook();
    const outcomesCols = selectedCols.outcomes || [];
    const wsuCols = selectedCols.wsu_org || [];
    const threshold = Number.isFinite(generationConfig.threshold)
        ? Math.max(0, Math.min(1, generationConfig.threshold))
        : 0.8;

    const headerColor = {
        meta: 'FF1E3A8A',
        outcomes: 'FF166534',
        wsu: 'FFC2410C',
        decision: 'FF7C3AED',
        qa: 'FF0F766E'
    };

    const toText = (value) => (value === null || value === undefined ? '' : String(value).trim());
    const parseSimilarity = (value) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
    };
    const confidenceOrder = { high: 3, medium: 2, low: 1, '': 0 };
    const normalizeTier = (row) => {
        const raw = String(row.confidence_tier || '').trim().toLowerCase();
        if (raw === 'high' || raw === 'medium' || raw === 'low') {
            return raw;
        }
        const similarity = parseSimilarity(row.match_similarity);
        if (!Number.isFinite(similarity)) {
            return '';
        }
        // `threshold` is 0-1; `match_similarity` is exported as 0-100.
        if (similarity >= 90) return 'high';
        if (similarity >= 80) return 'medium';
        if (similarity >= threshold * 100) return 'low';
        return 'low';
    };
    const getOutcomeSortName = (row) => {
        const direct = toText(row.outcomes_display_name);
        if (direct) return direct.toLowerCase();
        for (const col of outcomesCols) {
            const value = toText(row[`outcomes_${col}`]);
            if (value) return value.toLowerCase();
        }
        return '';
    };

    const setSheetFormats = (sheet, columns, rows, options = {}) => {
        const freezeHeader = options.freezeHeader !== false;
        const autoFilter = options.autoFilter !== false;
        const maxWidth = options.maxWidth || 70;
        if (freezeHeader) {
            sheet.views = [{ state: 'frozen', ySplit: 1 }];
        }
        if (autoFilter && columns.length > 0) {
            sheet.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: 1, column: columns.length }
            };
        }
        sheet.columns.forEach((column, idx) => {
            const header = columns[idx]?.header || '';
            let maxLength = String(header).length;
            rows.forEach(row => {
                const key = columns[idx]?.key;
                const value = row?.[key];
                const length = String(value?.formula || value || '').length;
                if (length > maxLength) {
                    maxLength = length;
                }
            });
            column.width = Math.min(maxLength + 2, maxWidth);
        });
    };

    const addSheetFromObjects = (sheetName, columns, rows) => {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.addRow(columns.map(col => col.header));
        sheet.getRow(1).eachCell((cell, idx) => {
            const col = columns[idx - 1];
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: headerColor[col.group || 'meta'] || headerColor.meta }
            };
        });

        rows.forEach(row => {
            const rowData = columns.map(col => row[col.key] ?? '');
            sheet.addRow(rowData);
        });

        setSheetFormats(sheet, columns, rows);
        return sheet;
    };

    const cleanSorted = [...cleanRows]
        .map(row => ({
            ...row,
            confidence_tier: normalizeTier(row)
        }))
        .sort((a, b) => {
            const tierDiff = (confidenceOrder[b.confidence_tier] || 0) - (confidenceOrder[a.confidence_tier] || 0);
            if (tierDiff !== 0) return tierDiff;
            const simA = parseSimilarity(a.match_similarity);
            const simB = parseSimilarity(b.match_similarity);
            const simDiff = (Number.isFinite(simB) ? simB : -1) - (Number.isFinite(simA) ? simA : -1);
            if (simDiff !== 0) return simDiff;
            return getOutcomeSortName(a).localeCompare(getOutcomeSortName(b));
        });

    const ambiguousRows = errorRows.filter(row => row.missing_in === 'Ambiguous Match');
    const missingInMyWsuRows = errorRows.filter(row => row.missing_in === 'myWSU');
    const missingInOutcomesRows = errorRows.filter(row => row.missing_in === 'Outcomes');
    const ambiguousOutcomesCount = ambiguousRows.filter(
        row => row.outcomes_row_index !== '' && row.outcomes_row_index !== null && row.outcomes_row_index !== undefined
    ).length;

    reportProgress('Building summary sheet...', 10);
    const summarySheet = workbook.addWorksheet('Summary');
    const summaryRows = [
        ['Metric', 'Count', 'Notes'],
        ['Matched 1:1 rows', cleanSorted.length, 'Rows with a single assigned match'],
        ['Ambiguous candidates', ambiguousRows.length, 'Rows requiring manual match choice'],
        ['Missing in myWSU', missingInMyWsuRows.length, 'Outcomes rows without a target match'],
        ['Missing in Outcomes', missingInOutcomesRows.length, 'myWSU rows without a source row'],
        ['Review_Decisions rows', cleanSorted.length + missingInMyWsuRows.length + ambiguousOutcomesCount, 'One row per Outcomes record']
    ];
    summaryRows.forEach(row => summarySheet.addRow(row));
    summarySheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor.meta } };
    });
    summarySheet.columns = [
        { width: 34 },
        { width: 16 },
        { width: 70 }
    ];

    reportProgress('Building matched sheet...', 22);
    const newTranslationColumns = [
        { key: 'outcomes_record_id', header: 'Outcomes Record ID', group: 'meta' },
        { key: 'outcomes_display_name', header: 'Outcomes Name', group: 'meta' },
        { key: 'proposed_wsu_key', header: 'Proposed myWSU Key', group: 'meta' },
        { key: 'proposed_wsu_name', header: 'Proposed myWSU Name', group: 'meta' },
        { key: 'match_similarity', header: 'Similarity %', group: 'meta' },
        { key: 'confidence_tier', header: 'Confidence Tier', group: 'meta' }
    ];
    outcomesCols.forEach(col => {
        newTranslationColumns.push({ key: `outcomes_${col}`, header: `Outcomes: ${col}`, group: 'outcomes' });
    });
    wsuCols.forEach(col => {
        newTranslationColumns.push({ key: `wsu_${col}`, header: `myWSU: ${col}`, group: 'wsu' });
    });
    addSheetFromObjects('New_Translation_Candidates', newTranslationColumns, cleanSorted);

    reportProgress('Building ambiguous sheet...', 34);
    const ambiguousRowsMapped = ambiguousRows.map(row => {
        const alternates = Array.isArray(row.alternate_candidates) ? row.alternate_candidates : [];
        const alt = (index) => alternates[index] || {};
        return {
            ...row,
            Alt_1_Key: alt(0).key || '',
            Alt_1_Name: alt(0).name || '',
            Alt_1_Similarity: alt(0).similarity ?? '',
            Alt_2_Key: alt(1).key || '',
            Alt_2_Name: alt(1).name || '',
            Alt_2_Similarity: alt(1).similarity ?? '',
            Alt_3_Key: alt(2).key || '',
            Alt_3_Name: alt(2).name || '',
            Alt_3_Similarity: alt(2).similarity ?? ''
        };
    });
    const ambiguousColumns = [
        { key: 'outcomes_record_id', header: 'Outcomes Record ID', group: 'meta' },
        { key: 'outcomes_display_name', header: 'Outcomes Name', group: 'meta' },
        { key: 'missing_in', header: 'Missing In', group: 'meta' },
        { key: 'Alt_1_Key', header: 'Alt 1 Key', group: 'decision' },
        { key: 'Alt_1_Name', header: 'Alt 1 Name', group: 'decision' },
        { key: 'Alt_1_Similarity', header: 'Alt 1 Similarity %', group: 'decision' },
        { key: 'Alt_2_Key', header: 'Alt 2 Key', group: 'decision' },
        { key: 'Alt_2_Name', header: 'Alt 2 Name', group: 'decision' },
        { key: 'Alt_2_Similarity', header: 'Alt 2 Similarity %', group: 'decision' },
        { key: 'Alt_3_Key', header: 'Alt 3 Key', group: 'decision' },
        { key: 'Alt_3_Name', header: 'Alt 3 Name', group: 'decision' },
        { key: 'Alt_3_Similarity', header: 'Alt 3 Similarity %', group: 'decision' }
    ];
    outcomesCols.forEach(col => {
        ambiguousColumns.push({ key: `outcomes_${col}`, header: `Outcomes: ${col}`, group: 'outcomes' });
    });
    wsuCols.forEach(col => {
        ambiguousColumns.push({ key: `wsu_${col}`, header: `myWSU: ${col}`, group: 'wsu' });
    });
    addSheetFromObjects('Ambiguous_Candidates', ambiguousColumns, ambiguousRowsMapped);

    reportProgress('Building missing sheets...', 46);
    const missingMyWsuColumns = [
        { key: 'outcomes_record_id', header: 'Outcomes Record ID', group: 'meta' },
        { key: 'outcomes_display_name', header: 'Outcomes Name', group: 'meta' },
        { key: 'missing_in', header: 'Missing In', group: 'meta' }
    ];
    outcomesCols.forEach(col => {
        missingMyWsuColumns.push({ key: `outcomes_${col}`, header: `Outcomes: ${col}`, group: 'outcomes' });
    });
    addSheetFromObjects('Missing_In_myWSU', missingMyWsuColumns, missingInMyWsuRows);

    const missingOutcomesColumns = [
        { key: 'wsu_record_id', header: 'myWSU Record ID', group: 'meta' },
        { key: 'wsu_display_name', header: 'myWSU Name', group: 'meta' },
        { key: 'missing_in', header: 'Missing In', group: 'meta' }
    ];
    wsuCols.forEach(col => {
        missingOutcomesColumns.push({ key: `wsu_${col}`, header: `myWSU: ${col}`, group: 'wsu' });
    });
    addSheetFromObjects('Missing_In_Outcomes', missingOutcomesColumns, missingInOutcomesRows);

    reportProgress('Building review decisions...', 60);
    const reviewIndexMap = new Map();
    cleanSorted.forEach(row => {
        if (row.outcomes_row_index === '' || row.outcomes_row_index === null || row.outcomes_row_index === undefined) {
            return;
        }
        const idx = Number(row.outcomes_row_index);
        if (!Number.isFinite(idx)) return;
        reviewIndexMap.set(idx, {
            ...row,
            source_status: 'Matched',
            confidence_tier: normalizeTier(row)
        });
    });
    errorRows.forEach(row => {
        if (row.outcomes_row_index === '' || row.outcomes_row_index === null || row.outcomes_row_index === undefined) {
            return;
        }
        const idx = Number(row.outcomes_row_index);
        if (!Number.isFinite(idx) || reviewIndexMap.has(idx)) {
            return;
        }
        reviewIndexMap.set(idx, {
            ...row,
            source_status: row.missing_in === 'Ambiguous Match' ? 'Ambiguous Match' : 'Missing in myWSU',
            confidence_tier: normalizeTier(row)
        });
    });
    const reviewRows = Array.from(reviewIndexMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, row]) => {
            const alternates = Array.isArray(row.alternate_candidates) ? row.alternate_candidates : [];
            const alt = (index) => alternates[index] || {};
            const defaultDecision = row.source_status === 'Matched' && row.confidence_tier === 'high'
                ? 'Accept'
                : '';
            return {
                outcomes_row_index: row.outcomes_row_index,
                outcomes_record_id: row.outcomes_record_id || '',
                outcomes_display_name: row.outcomes_display_name || '',
                proposed_wsu_key: row.proposed_wsu_key || '',
                proposed_wsu_name: row.proposed_wsu_name || '',
                match_similarity: row.match_similarity ?? '',
                confidence_tier: row.confidence_tier || '',
                source_status: row.source_status || '',
                Alt_1_Key: alt(0).key || '',
                Alt_1_Name: alt(0).name || '',
                Alt_1_Similarity: alt(0).similarity ?? '',
                Alt_2_Key: alt(1).key || '',
                Alt_2_Name: alt(1).name || '',
                Alt_2_Similarity: alt(1).similarity ?? '',
                Alt_3_Key: alt(2).key || '',
                Alt_3_Name: alt(2).name || '',
                Alt_3_Similarity: alt(2).similarity ?? '',
                Decision: defaultDecision,
                Alternate_Choice: '',
                Final_myWSU_Key: '',
                Final_myWSU_Name: '',
                Reason_Code: '',
                Reviewer: '',
                Review_Date: '',
                Notes: ''
            };
        });

    const reviewColumns = [
        { key: 'outcomes_row_index', header: 'Outcomes Row #', group: 'meta' },
        { key: 'outcomes_record_id', header: 'Outcomes Record ID', group: 'meta' },
        { key: 'outcomes_display_name', header: 'Outcomes Name', group: 'meta' },
        { key: 'proposed_wsu_key', header: 'Proposed myWSU Key', group: 'meta' },
        { key: 'proposed_wsu_name', header: 'Proposed myWSU Name', group: 'meta' },
        { key: 'match_similarity', header: 'Similarity %', group: 'meta' },
        { key: 'confidence_tier', header: 'Confidence Tier', group: 'meta' },
        { key: 'source_status', header: 'Source Status', group: 'meta' },
        { key: 'Alt_1_Key', header: 'Alt 1 Key', group: 'decision' },
        { key: 'Alt_1_Name', header: 'Alt 1 Name', group: 'decision' },
        { key: 'Alt_1_Similarity', header: 'Alt 1 Similarity %', group: 'decision' },
        { key: 'Alt_2_Key', header: 'Alt 2 Key', group: 'decision' },
        { key: 'Alt_2_Name', header: 'Alt 2 Name', group: 'decision' },
        { key: 'Alt_2_Similarity', header: 'Alt 2 Similarity %', group: 'decision' },
        { key: 'Alt_3_Key', header: 'Alt 3 Key', group: 'decision' },
        { key: 'Alt_3_Name', header: 'Alt 3 Name', group: 'decision' },
        { key: 'Alt_3_Similarity', header: 'Alt 3 Similarity %', group: 'decision' },
        { key: 'Decision', header: 'Decision', group: 'decision' },
        { key: 'Alternate_Choice', header: 'Alternate Choice', group: 'decision' },
        { key: 'Final_myWSU_Key', header: 'Final myWSU Key', group: 'decision' },
        { key: 'Final_myWSU_Name', header: 'Final myWSU Name', group: 'decision' },
        { key: 'Reason_Code', header: 'Reason Code', group: 'decision' },
        { key: 'Reviewer', header: 'Reviewer', group: 'decision' },
        { key: 'Review_Date', header: 'Review Date', group: 'decision' },
        { key: 'Notes', header: 'Notes', group: 'decision' }
    ];
    const reviewSheet = addSheetFromObjects('Review_Decisions', reviewColumns, reviewRows);

    const reviewColIndexByKey = {};
    reviewColumns.forEach((col, idx) => {
        reviewColIndexByKey[col.key] = idx + 1;
    });
    const reviewColLetterByKey = {};
    Object.keys(reviewColIndexByKey).forEach(key => {
        reviewColLetterByKey[key] = columnIndexToLetter(reviewColIndexByKey[key]);
    });

    const colDecision = reviewColLetterByKey.Decision;
    const colAltChoice = reviewColLetterByKey.Alternate_Choice;
    const colPropKey = reviewColLetterByKey.proposed_wsu_key;
    const colPropName = reviewColLetterByKey.proposed_wsu_name;
    const colAlt1Key = reviewColLetterByKey.Alt_1_Key;
    const colAlt1Name = reviewColLetterByKey.Alt_1_Name;
    const colAlt2Key = reviewColLetterByKey.Alt_2_Key;
    const colAlt2Name = reviewColLetterByKey.Alt_2_Name;
    const colAlt3Key = reviewColLetterByKey.Alt_3_Key;
    const colAlt3Name = reviewColLetterByKey.Alt_3_Name;
    const colFinalKey = reviewColLetterByKey.Final_myWSU_Key;
    const colFinalName = reviewColLetterByKey.Final_myWSU_Name;
    for (let rowNum = 2; rowNum <= reviewSheet.rowCount; rowNum += 1) {
        reviewSheet.getCell(`${colFinalKey}${rowNum}`).value = {
            formula: `IF($${colDecision}${rowNum}="Accept",$${colPropKey}${rowNum},IF($${colDecision}${rowNum}="Choose Alternate",IF($${colAltChoice}${rowNum}="Alt 1",$${colAlt1Key}${rowNum},IF($${colAltChoice}${rowNum}="Alt 2",$${colAlt2Key}${rowNum},IF($${colAltChoice}${rowNum}="Alt 3",$${colAlt3Key}${rowNum},""))),""))`
        };
        reviewSheet.getCell(`${colFinalName}${rowNum}`).value = {
            formula: `IF($${colDecision}${rowNum}="Accept",$${colPropName}${rowNum},IF($${colDecision}${rowNum}="Choose Alternate",IF($${colAltChoice}${rowNum}="Alt 1",$${colAlt1Name}${rowNum},IF($${colAltChoice}${rowNum}="Alt 2",$${colAlt2Name}${rowNum},IF($${colAltChoice}${rowNum}="Alt 3",$${colAlt3Name}${rowNum},""))),""))`
        };
    }
    if (reviewSheet.rowCount > 1) {
        reviewSheet.dataValidations.add(
            `${colDecision}2:${colDecision}${reviewSheet.rowCount}`,
            {
                type: 'list',
                allowBlank: true,
                formulae: ['"Accept,Choose Alternate,No Match,Needs Research"']
            }
        );
        reviewSheet.dataValidations.add(
            `${colAltChoice}2:${colAltChoice}${reviewSheet.rowCount}`,
            {
                type: 'list',
                allowBlank: true,
                formulae: ['"Alt 1,Alt 2,Alt 3"']
            }
        );
    }

    reportProgress('Building final translation sheet...', 74);
    const finalColumns = [
        { key: 'outcomes_record_id', header: 'Outcomes Record ID', group: 'meta' },
        { key: 'outcomes_display_name', header: 'Outcomes Name', group: 'meta' },
        { key: 'final_wsu_key', header: 'Final myWSU Key', group: 'meta' },
        { key: 'final_wsu_name', header: 'Final myWSU Name', group: 'meta' },
        { key: 'decision', header: 'Decision', group: 'decision' },
        { key: 'confidence_tier', header: 'Confidence Tier', group: 'meta' },
        { key: 'similarity', header: 'Similarity %', group: 'meta' }
    ];
    const finalSheet = workbook.addWorksheet('Final_Translation_Table');
    finalSheet.addRow(finalColumns.map(col => col.header));
    finalSheet.getRow(1).eachCell((cell, idx) => {
        const col = finalColumns[idx - 1];
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: headerColor[col.group || 'meta'] || headerColor.meta }
        };
    });
    const reviewLastRow = Math.max(2, reviewSheet.rowCount);
    const approvedMask = `( (Review_Decisions!$${colDecision}$2:$${colDecision}$${reviewLastRow}="Accept") + (Review_Decisions!$${colDecision}$2:$${colDecision}$${reviewLastRow}="Choose Alternate") )`;
    const approvedRelativeRows = `ROW(Review_Decisions!$${colDecision}$2:$${colDecision}$${reviewLastRow})-ROW(Review_Decisions!$${colDecision}$2)+1`;
    const approvedPick = (k) => `AGGREGATE(15,6,${approvedRelativeRows}/(${approvedMask}),${k})`;
    const indexApproved = (colLetter, k) => (
        `IFERROR(INDEX(Review_Decisions!$${colLetter}$2:$${colLetter}$${reviewLastRow},${approvedPick(k)}),"")`
    );
    const finalFormulaRows = Math.max(1, reviewSheet.rowCount - 1);
    for (let outputIndex = 1; outputIndex <= finalFormulaRows; outputIndex += 1) {
        finalSheet.addRow([
            { formula: indexApproved(reviewColLetterByKey.outcomes_record_id, outputIndex) },
            { formula: indexApproved(reviewColLetterByKey.outcomes_display_name, outputIndex) },
            { formula: indexApproved(reviewColLetterByKey.Final_myWSU_Key, outputIndex) },
            { formula: indexApproved(reviewColLetterByKey.Final_myWSU_Name, outputIndex) },
            { formula: indexApproved(reviewColLetterByKey.Decision, outputIndex) },
            { formula: indexApproved(reviewColLetterByKey.confidence_tier, outputIndex) },
            { formula: indexApproved(reviewColLetterByKey.match_similarity, outputIndex) }
        ]);
    }
    setSheetFormats(finalSheet, finalColumns, [], { maxWidth: 60 });

    reportProgress('Building QA sheet...', 86);
    const qaSheet = workbook.addWorksheet('QA_Checks');
    const decisionRange = `Review_Decisions!$${colDecision}$2:$${colDecision}$${reviewLastRow}`;
    const finalKeyRange = `Review_Decisions!$${colFinalKey}$2:$${colFinalKey}$${reviewLastRow}`;
    const firstFinalKeyCell = `Review_Decisions!$${colFinalKey}$2`;
    const finalKeyRowOffset = `ROW(${finalKeyRange})-ROW(${firstFinalKeyCell})+1`;
    const perRowFinalKey = `INDEX(${finalKeyRange},${finalKeyRowOffset})`;
    const qaRows = [
        ['Check', 'Count', 'Status', 'Detail'],
        ['Unresolved count', `=COUNTIF(${decisionRange},"")+COUNTIF(${decisionRange},"No Match")+COUNTIF(${decisionRange},"Needs Research")`, '=IF(B2=0,"PASS","CHECK")', 'Blank, No Match, or Needs Research decisions'],
        ['Blank final key with approved decision', `=COUNTIFS(${decisionRange},"Accept",${finalKeyRange},"")+COUNTIFS(${decisionRange},"Choose Alternate",${finalKeyRange},"")`, '=IF(B3=0,"PASS","FAIL")', 'Approved rows should produce final keys'],
        ['Duplicate final keys (approved)', `=SUMPRODUCT(((${decisionRange}="Accept")+(${decisionRange}="Choose Alternate"))*(${finalKeyRange}<>"")*((COUNTIFS(${finalKeyRange},${perRowFinalKey},${decisionRange},"Accept")+COUNTIFS(${finalKeyRange},${perRowFinalKey},${decisionRange},"Choose Alternate"))>1))/2`, '=IF(B4=0,"PASS","CHECK")', 'Duplicates among approved final keys'],
        ['Approved total', `=COUNTIF(${decisionRange},"Accept")+COUNTIF(${decisionRange},"Choose Alternate")`, '', 'Rows that will publish to final translation table']
    ];
    qaRows.forEach(row => qaSheet.addRow(row));
    qaSheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor.qa } };
    });
    qaSheet.columns = [
        { width: 42 },
        { width: 26 },
        { width: 14 },
        { width: 70 }
    ];

    reportProgress('Finalizing Excel file...', 92);
    const buffer = toArrayBuffer(await workbook.xlsx.writeBuffer());
    reportProgress('Saving file...', 100);
    return {
        buffer,
        filename: 'Generated_Translation_Table.xlsx'
    };
}

async function buildValidationExport(payload) {
    const { validated, selectedCols, options = {}, context = {} } = payload;
    const workbook = new ExcelJS.Workbook();
    const includeSuggestions = Boolean(options.includeSuggestions);
    const showMappingLogic = Boolean(options.showMappingLogic);
    const nameCompareConfig = options.nameCompareConfig || {};
    const loadedData = context.loadedData || { outcomes: [], translate: [], wsu_org: [] };
    const columnRoles = context.columnRoles || { outcomes: {}, wsu_org: {} };
    const keyConfig = context.keyConfig || {};
    const keyLabels = context.keyLabels || {};

    reportProgress('Building export...', 5);

    const outcomesColumns = selectedCols.outcomes.map(col => `outcomes_${col}`);
    const wsuColumns = selectedCols.wsu_org.map(col => `wsu_${col}`);
    const mappingColumns = showMappingLogic ? ['Mapping_Logic'] : [];
    const suggestionColumns = includeSuggestions
        ? [
            'Suggested_Key',
            'Suggested_School',
            'Suggested_City',
            'Suggested_State',
            'Suggested_Country',
            'Suggestion_Score'
        ]
        : [];

    const roleOrder = ['School', 'City', 'State', 'Country', 'Other'];
    const getRoleMap = (sourceKey) => {
        const roles = columnRoles[sourceKey] || {};
        const roleMap = {};
        roleOrder.forEach(role => {
            Object.keys(roles).forEach(col => {
                if (roles[col] === role && !roleMap[role]) {
                    roleMap[role] = col;
                }
            });
        });
        return roleMap;
    };

    const roleMapOutcomes = getRoleMap('outcomes');
    const roleMapWsu = getRoleMap('wsu_org');
    const getFallbackRoleColumn = (columns, roleName) => {
        const roleLower = roleName.toLowerCase();
        const hints = roleLower === 'school'
            ? ['school', 'descr', 'name']
            : [roleLower];
        for (const hint of hints) {
            const found = columns.find(col => String(col).toLowerCase().includes(hint));
            if (found) {
                return found;
            }
        }
        return '';
    };
    const getRoleValue = (row, roleMap, fallbackColumns, roleName, prefix) => {
        const roleColumn = roleMap[roleName] || getFallbackRoleColumn(fallbackColumns, roleName);
        if (!roleColumn) return '';
        const key = prefix ? `${prefix}${roleColumn}` : roleColumn;
        return row?.[key] ?? '';
    };
    const fillSuggestedFields = (rowData, row, roleMap, fallbackColumns, keyValue, prefix) => {
        rowData.Suggested_Key = keyValue || '';
        rowData.Suggested_School = getRoleValue(row, roleMap, fallbackColumns, 'School', prefix);
        rowData.Suggested_City = getRoleValue(row, roleMap, fallbackColumns, 'City', prefix);
        rowData.Suggested_State = getRoleValue(row, roleMap, fallbackColumns, 'State', prefix);
        rowData.Suggested_Country = getRoleValue(row, roleMap, fallbackColumns, 'Country', prefix);
    };

    const normalizeValue = (value) => (
        typeof normalizeKeyValue === 'function'
            ? normalizeKeyValue(value)
            : String(value || '').trim().toLowerCase()
    );
    const similarityScore = (valueA, valueB) => (
        typeof similarityRatio === 'function'
            ? similarityRatio(valueA, valueB)
            : (valueA && valueB && valueA === valueB ? 1 : 0)
    );

    const MIN_KEY_SUGGESTION_SCORE = 0.6;
    const minNameScore = Number.isFinite(nameCompareConfig.threshold) ? nameCompareConfig.threshold : 0.8;
    const canSuggestNames = Boolean(
        includeSuggestions &&
        nameCompareConfig.enabled &&
        nameCompareConfig.outcomes &&
        nameCompareConfig.wsu
    );
    const wsuSuggestionCityColumn = nameCompareConfig.city_wsu || roleMapWsu.City || getFallbackRoleColumn(selectedCols.wsu_org || [], 'city');
    const wsuSuggestionStateColumn = nameCompareConfig.state_wsu || roleMapWsu.State || getFallbackRoleColumn(selectedCols.wsu_org || [], 'state');
    const wsuSuggestionCountryColumn = nameCompareConfig.country_wsu || roleMapWsu.Country || getFallbackRoleColumn(selectedCols.wsu_org || [], 'country');

    const outcomesKeyCandidates = (loadedData.outcomes || [])
        .map(row => ({
            raw: row[keyConfig.outcomes],
            norm: normalizeValue(row[keyConfig.outcomes]),
            row
        }))
        .filter(entry => entry.norm);

    const wsuKeyCandidates = (loadedData.wsu_org || [])
        .map(row => ({
            raw: row[keyConfig.wsu],
            norm: normalizeValue(row[keyConfig.wsu]),
            row
        }))
        .filter(entry => entry.norm);

    const wsuNameCandidates = canSuggestNames
        ? (loadedData.wsu_org || [])
            .map(row => ({
                key: row[keyConfig.wsu],
                name: row[nameCompareConfig.wsu],
                normName: normalizeValue(row[nameCompareConfig.wsu]),
                city: wsuSuggestionCityColumn ? (row[wsuSuggestionCityColumn] ?? '') : '',
                state: wsuSuggestionStateColumn ? (row[wsuSuggestionStateColumn] ?? '') : '',
                country: wsuSuggestionCountryColumn ? (row[wsuSuggestionCountryColumn] ?? '') : '',
                row
            }))
            .filter(entry => entry.normName)
        : [];

    const formatSuggestionScore = (score) => (
        Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : null
    );

    const getBestKeySuggestion = (value, candidates) => {
        const normalized = normalizeValue(value);
        if (!normalized) return null;
        let best = null;
        candidates.forEach(candidate => {
            const score = similarityScore(normalized, candidate.norm);
            if (!best || score > best.score) {
                best = { key: candidate.raw, score, row: candidate.row };
            }
        });
        if (!best || best.score < MIN_KEY_SUGGESTION_SCORE) return null;
        return best;
    };

    const getBestNameSuggestion = (outcomesName) => {
        if (!canSuggestNames || !outcomesName) return null;
        const candidates = [];
        wsuNameCandidates.forEach(candidate => {
            const score = typeof calculateNameSimilarity === 'function'
                ? calculateNameSimilarity(outcomesName, candidate.name)
                : similarityScore(normalizeValue(outcomesName), candidate.normName);
            if (score >= minNameScore) {
                candidates.push({
                    row: candidate.row,
                    key: candidate.key,
                    name: candidate.name,
                    city: candidate.city,
                    state: candidate.state,
                    country: candidate.country,
                    score
                });
            }
        });
        if (!candidates.length) return null;
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0];
    };
    const applySuggestionFallbacks = (rowData, sourceRow, suggestion) => {
        const source = sourceRow || {};
        const candidate = suggestion || {};
        if (!rowData.Suggested_School) {
            rowData.Suggested_School = source.Suggested_School || candidate.name || '';
        }
        if (!rowData.Suggested_City) {
            rowData.Suggested_City = source.Suggested_City || candidate.city || '';
        }
        if (!rowData.Suggested_State) {
            rowData.Suggested_State = source.Suggested_State || candidate.state || '';
        }
        if (!rowData.Suggested_Country) {
            rowData.Suggested_Country = source.Suggested_Country || candidate.country || '';
        }
    };

    const applySuggestionColumns = (row, rowData, errorType) => {
        if (!includeSuggestions) return;
        rowData.Suggested_Key = row.Suggested_Key ?? '';
        rowData.Suggested_School = row.Suggested_School ?? '';
        rowData.Suggested_City = row.Suggested_City ?? '';
        rowData.Suggested_State = row.Suggested_State ?? '';
        rowData.Suggested_Country = row.Suggested_Country ?? '';
        rowData.Suggestion_Score = row.Suggestion_Score ?? '';

        const hasPresetSuggestion = Boolean(
            rowData.Suggested_Key ||
            rowData.Suggested_School ||
            rowData.Suggested_City ||
            rowData.Suggested_State ||
            rowData.Suggested_Country ||
            rowData.Suggestion_Score !== ''
        );
        const hasCompletePresetSuggestion = Boolean(
            rowData.Suggested_Key &&
            rowData.Suggested_School &&
            rowData.Suggestion_Score !== ''
        );

        if (errorType === 'Input_Not_Found') {
            const nameSuggestion = canSuggestNames
                ? getBestNameSuggestion(row[`outcomes_${nameCompareConfig.outcomes}`] || row.outcomes_name || '')
                : null;
            const suggestion = canSuggestNames
                ? nameSuggestion
                : getBestKeySuggestion(row.translate_input, outcomesKeyCandidates);
            if (suggestion) {
                fillSuggestedFields(
                    rowData,
                    suggestion.row,
                    roleMapOutcomes,
                    selectedCols.outcomes,
                    suggestion.key,
                    ''
                );
                applySuggestionFallbacks(rowData, row, suggestion);
                rowData.Suggestion_Score = formatSuggestionScore(suggestion.score);
            }
        } else if (errorType === 'Output_Not_Found') {
            if (
                row.Error_Subtype === EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.LIKELY_STALE_KEY &&
                hasCompletePresetSuggestion
            ) {
                return;
            }
            const nameSuggestion = canSuggestNames
                ? getBestNameSuggestion(row[`outcomes_${nameCompareConfig.outcomes}`] || row.outcomes_name || '')
                : null;
            const suggestion = canSuggestNames
                ? nameSuggestion
                : getBestKeySuggestion(row.translate_output, wsuKeyCandidates);
            if (suggestion) {
                fillSuggestedFields(
                    rowData,
                    suggestion.row,
                    roleMapWsu,
                    selectedCols.wsu_org,
                    suggestion.key,
                    ''
                );
                applySuggestionFallbacks(rowData, row, suggestion);
                rowData.Suggestion_Score = formatSuggestionScore(suggestion.score);
            } else if (
                row.Error_Subtype === EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.LIKELY_STALE_KEY &&
                hasPresetSuggestion
            ) {
                applySuggestionFallbacks(rowData, row, null);
            }
        } else if (
            errorType === 'Name_Mismatch' ||
            errorType === 'Ambiguous_Match' ||
            errorType === 'Duplicate_Target' ||
            errorType === 'Duplicate_Source' ||
            errorType === 'High_Confidence_Match'
        ) {
            const outcomesName = row[`outcomes_${nameCompareConfig.outcomes}`] || row.outcomes_name || '';
            const wsuName = row[`wsu_${nameCompareConfig.wsu}`] || row.wsu_Descr || '';
            if (errorType === 'Duplicate_Target' || errorType === 'Duplicate_Source') {
                if (errorType === 'Duplicate_Target') {
                    const outcomesKeyValue = row[`outcomes_${keyLabels.outcomes}`] || row.translate_input;
                    fillSuggestedFields(
                        rowData,
                        row,
                        roleMapOutcomes,
                        selectedCols.outcomes,
                        outcomesKeyValue,
                        'outcomes_'
                    );
                } else {
                    const wsuKeyValue = row[`wsu_${keyLabels.wsu}`] || row.translate_output;
                    fillSuggestedFields(
                        rowData,
                        row,
                        roleMapWsu,
                        selectedCols.wsu_org,
                        wsuKeyValue,
                        'wsu_'
                    );
                }
            } else if (errorType === 'High_Confidence_Match') {
                const wsuKeyValue = row[`wsu_${keyLabels.wsu}`] || row.translate_output;
                fillSuggestedFields(
                    rowData,
                    row,
                    roleMapWsu,
                    selectedCols.wsu_org,
                    wsuKeyValue,
                    'wsu_'
                );
                const similarity = typeof calculateNameSimilarity === 'function'
                    ? calculateNameSimilarity(outcomesName, wsuName)
                    : null;
                if (typeof similarity === 'number') {
                    rowData.Suggestion_Score = formatSuggestionScore(similarity);
                }
            } else {
                const suggestion = getBestNameSuggestion(outcomesName);
                if (suggestion) {
                    fillSuggestedFields(
                        rowData,
                        suggestion.row,
                        roleMapWsu,
                        selectedCols.wsu_org,
                        suggestion.key,
                        ''
                    );
                    applySuggestionFallbacks(rowData, row, suggestion);
                    rowData.Suggestion_Score = formatSuggestionScore(suggestion.score);
                }
            }
        }
    };

    const threshold = Number.isFinite(nameCompareConfig.threshold)
        ? nameCompareConfig.threshold
        : 0.8;
    const ambiguityGap = Number.isFinite(nameCompareConfig.ambiguity_gap)
        ? nameCompareConfig.ambiguity_gap
        : 0.03;
    const resolvePreferredColumn = (preferred, roleMap, selected, priorityHints = []) => {
        if (preferred && selected.includes(preferred)) return preferred;
        if (roleMap && roleMap.School && selected.includes(roleMap.School)) return roleMap.School;
        for (const hint of priorityHints) {
            const match = selected.find(col => String(col || '').toLowerCase().includes(hint));
            if (match) return match;
        }
        return selected[0] || '';
    };
    const outcomesNameColumn = resolvePreferredColumn(
        nameCompareConfig.outcomes,
        roleMapOutcomes,
        selectedCols.outcomes || [],
        ['school', 'name']
    );
    const wsuNameColumn = resolvePreferredColumn(
        nameCompareConfig.wsu,
        roleMapWsu,
        selectedCols.wsu_org || [],
        ['descr', 'name', 'school']
    );
    const outcomesStateColumn = roleMapOutcomes.State || getFallbackRoleColumn(selectedCols.outcomes || [], 'state');
    const wsuStateColumn = roleMapWsu.State || getFallbackRoleColumn(selectedCols.wsu_org || [], 'state');
    const outcomesCityColumn = roleMapOutcomes.City || getFallbackRoleColumn(selectedCols.outcomes || [], 'city');
    const wsuCityColumn = roleMapWsu.City || getFallbackRoleColumn(selectedCols.wsu_org || [], 'city');
    const outcomesCountryColumn = roleMapOutcomes.Country || getFallbackRoleColumn(selectedCols.outcomes || [], 'country');
    const wsuCountryColumn = roleMapWsu.Country || getFallbackRoleColumn(selectedCols.wsu_org || [], 'country');
    const getCell = (row, col) => (col ? (row?.[col] ?? '') : '');

    const outcomesEntriesForMissing = (loadedData.outcomes || [])
        .map((row, idx) => ({
            idx,
            row,
            keyRaw: row[keyConfig.outcomes],
            keyNorm: normalizeKeyValue(row[keyConfig.outcomes]),
            name: getCell(row, outcomesNameColumn),
            state: getCell(row, outcomesStateColumn),
            city: getCell(row, outcomesCityColumn),
            country: getCell(row, outcomesCountryColumn)
        }))
        .filter(entry => entry.keyNorm && entry.name);

    const wsuEntriesForMissing = (loadedData.wsu_org || [])
        .map((row, idx) => ({
            idx,
            row,
            keyRaw: row[keyConfig.wsu],
            keyNorm: normalizeKeyValue(row[keyConfig.wsu]),
            name: getCell(row, wsuNameColumn),
            state: getCell(row, wsuStateColumn),
            city: getCell(row, wsuCityColumn),
            country: getCell(row, wsuCountryColumn)
        }))
        .filter(entry => entry.keyNorm && entry.name);

    const translateInputs = new Set(
        (loadedData.translate || [])
            .map(row => normalizeKeyValue(row[keyConfig.translateInput]))
            .filter(Boolean)
    );
    const translateOutputs = new Set(
        (loadedData.translate || [])
            .map(row => normalizeKeyValue(row[keyConfig.translateOutput]))
            .filter(Boolean)
    );

    const rowBorderByError = {
        'Input key not found in Outcomes': 'FFEF4444',
        'Output key not found in myWSU': 'FFEF4444'
    };

    const errorRows = validated.filter(row => (
        row.Error_Type !== 'Valid' && row.Error_Type !== 'High_Confidence_Match'
    ));
    const translateErrorRows = errorRows.filter(row => !['Duplicate_Target', 'Duplicate_Source'].includes(row.Error_Type));
    const oneToManyRows = errorRows.filter(row => ['Duplicate_Target', 'Duplicate_Source'].includes(row.Error_Type));
    const highConfidenceRows = validated.filter(row => row.Error_Type === 'High_Confidence_Match');
    const validRows = validated.filter(row => row.Error_Type === 'Valid');

    const errorColumns = [
        'Error_Type',
        'Error_Subtype',
        ...outcomesColumns,
        'translate_input',
        'translate_output',
        ...wsuColumns,
        ...mappingColumns,
        ...suggestionColumns
    ];
    const oneToManyColumns = [
        ...outcomesColumns,
        'translate_input',
        'translate_output',
        ...wsuColumns,
        ...mappingColumns,
        ...suggestionColumns
    ];
    const validColumns = [
        ...outcomesColumns,
        'translate_input',
        'translate_output',
        ...wsuColumns,
        ...mappingColumns
    ];
    const highConfidenceColumns = [
        ...outcomesColumns,
        'translate_input',
        'translate_output',
        ...wsuColumns,
        ...mappingColumns,
        ...suggestionColumns
    ];

    const errorDataRows = translateErrorRows.map(row => {
        const rowData = {};
        errorColumns.forEach(col => {
            rowData[col] = row[col] !== undefined ? row[col] : '';
        });
        rowData.Error_Type = normalizeErrorType(row) || row.Error_Type;
        rowData.Error_Subtype = normalizeErrorSubtype(row.Error_Subtype);
        rowData._rawErrorType = row.Error_Type;
        rowData._rawErrorSubtype = row.Error_Subtype;
        if (showMappingLogic) {
            rowData.Mapping_Logic = buildMappingLogicRow(row, rowData.Error_Type, nameCompareConfig);
        }
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
        if (showMappingLogic) {
            rowData.Mapping_Logic = buildMappingLogicRow(row, row.Error_Type, nameCompareConfig);
        }
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
        if (showMappingLogic) {
            rowData.Mapping_Logic = buildMappingLogicRow(row, 'Valid', nameCompareConfig);
        }
        return rowData;
    });

    const highConfidenceDataRows = highConfidenceRows.map(row => {
        const rowData = {};
        highConfidenceColumns.forEach(col => {
            rowData[col] = row[col] !== undefined ? row[col] : '';
        });
        if (showMappingLogic) {
            rowData.Mapping_Logic = buildMappingLogicRow(row, 'High_Confidence_Match', nameCompareConfig);
        }
        applySuggestionColumns(row, rowData, row.Error_Type);
        return rowData;
    });

    const baseStyle = {
        errorHeaderColor: 'FF991B1B',
        errorBodyColor: 'FFFEE2E2',
        groupHeaderColor: 'FFF59E0B',
        groupBodyColor: 'FFFEF3C7',
        logicHeaderColor: 'FF374151',
        logicBodyColor: 'FFF3F4F6',
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

    reportProgress('Building Errors_in_Translate...', 20);
    addSheetWithRows(workbook, {
        sheetName: 'Errors_in_Translate',
        outputColumns: errorColumns,
        rows: errorDataRows,
        style: baseStyle,
        headers: buildHeaders(errorColumns, keyLabels),
        rowBorderByError
    });

    const filterBySubtype = (typeof ValidationExportHelpers !== 'undefined' && ValidationExportHelpers &&
        typeof ValidationExportHelpers.filterOutputNotFoundBySubtype === 'function')
        ? ValidationExportHelpers.filterOutputNotFoundBySubtype
        : (rows, subtype) => rows.filter(row =>
            row._rawErrorType === 'Output_Not_Found' && row._rawErrorSubtype === subtype
        );
    const outputNotFoundAmbiguousFiltered = filterBySubtype(errorDataRows, EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.AMBIGUOUS_REPLACEMENT);
    const outputNotFoundNoReplacementFiltered = filterBySubtype(errorDataRows, EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.NO_REPLACEMENT);

    reportProgress('Building Output_Not_Found_Ambiguous...', 28);
    if (outputNotFoundAmbiguousFiltered.length > 0) {
        addSheetWithRows(workbook, {
            sheetName: 'Output_Not_Found_Ambiguous',
            outputColumns: errorColumns,
            rows: outputNotFoundAmbiguousFiltered,
            style: baseStyle,
            headers: buildHeaders(errorColumns, keyLabels),
            rowBorderByError
        });
    }
    reportProgress('Building Output_Not_Found_No_Replacement...', 32);
    if (outputNotFoundNoReplacementFiltered.length > 0) {
        addSheetWithRows(workbook, {
            sheetName: 'Output_Not_Found_No_Replacement',
            outputColumns: errorColumns,
            rows: outputNotFoundNoReplacementFiltered,
            style: baseStyle,
            headers: buildHeaders(errorColumns, keyLabels),
            rowBorderByError
        });
    }

    reportProgress('Building One_to_Many...', 35);
    addSheetWithRows(workbook, {
        sheetName: 'One_to_Many',
        outputColumns: oneToManyColumns,
        rows: oneToManyDataRows,
        style: baseStyle,
        headers: buildHeaders(oneToManyColumns, keyLabels),
        rowBorderByError,
        groupColumn: 'Duplicate_Group'
    });

    reportProgress('Building High_Confidence_Matches...', 50);
    addSheetWithRows(workbook, {
        sheetName: 'High_Confidence_Matches',
        outputColumns: highConfidenceColumns,
        rows: highConfidenceDataRows,
        style: baseStyle,
        headers: buildHeaders(highConfidenceColumns, keyLabels),
        rowBorderByError
    });

    reportProgress('Building Valid_Mappings...', 62);
    addSheetWithRows(workbook, {
        sheetName: 'Valid_Mappings',
        outputColumns: validColumns,
        rows: validDataRows,
        style: {
            ...baseStyle,
            errorHeaderColor: 'FF16A34A',
            errorBodyColor: 'FFDCFCE7'
        },
        headers: buildHeaders(validColumns, keyLabels),
        rowBorderByError
    });

    reportProgress('Building Missing_Mappings...', 74);
    const highConfidenceCandidates = [];
    outcomesEntriesForMissing.forEach(outcomesEntry => {
        let best = null;
        let secondBest = null;
        wsuEntriesForMissing.forEach(wsuEntry => {
            if (
                outcomesEntry.country && wsuEntry.country &&
                !countriesMatch(outcomesEntry.country, wsuEntry.country)
            ) {
                return;
            }
            const stateComparable = Boolean(
                outcomesEntry.state &&
                wsuEntry.state &&
                String(outcomesEntry.state).trim().toLowerCase() !== 'ot' &&
                String(wsuEntry.state).trim().toLowerCase() !== 'ot'
            );
            if (
                stateComparable &&
                outcomesEntry.country &&
                wsuEntry.country &&
                countriesMatch(outcomesEntry.country, wsuEntry.country) &&
                !statesMatch(outcomesEntry.state, wsuEntry.state)
            ) {
                return;
            }

            const similarity = calculateNameSimilarity(outcomesEntry.name, wsuEntry.name);
            const highConfidence = isHighConfidenceNameMatch(
                outcomesEntry.name,
                wsuEntry.name,
                outcomesEntry.state,
                wsuEntry.state,
                outcomesEntry.city,
                wsuEntry.city,
                outcomesEntry.country,
                wsuEntry.country,
                similarity,
                threshold
            );
            if (!highConfidence) {
                return;
            }
            const candidate = {
                outcomesEntry,
                wsuEntry,
                score: similarity
            };
            if (!best || candidate.score > best.score) {
                secondBest = best;
                best = candidate;
            } else if (!secondBest || candidate.score > secondBest.score) {
                secondBest = candidate;
            }
        });
        if (!best) {
            return;
        }
        if (secondBest && (best.score - secondBest.score) < ambiguityGap) {
            return;
        }
        highConfidenceCandidates.push(best);
    });

    highConfidenceCandidates.sort((a, b) => b.score - a.score);
    const usedOutcomes = new Set();
    const usedWsu = new Set();
    const highConfidencePairs = [];
    highConfidenceCandidates.forEach(candidate => {
        const outcomesId = candidate.outcomesEntry.idx;
        const wsuId = candidate.wsuEntry.idx;
        if (usedOutcomes.has(outcomesId) || usedWsu.has(wsuId)) {
            return;
        }
        usedOutcomes.add(outcomesId);
        usedWsu.add(wsuId);
        highConfidencePairs.push(candidate);
    });

    const missingMappingColumns = [
        'Missing_In',
        ...outcomesColumns,
        'translate_input',
        'translate_output',
        ...wsuColumns,
        'Similarity',
        ...mappingColumns
    ];

    const missingMappingsRows = highConfidencePairs
        .map(pair => {
            const outcomesEntry = pair.outcomesEntry;
            const wsuEntry = pair.wsuEntry;
            const inputPresent = translateInputs.has(outcomesEntry.keyNorm);
            const outputPresent = translateOutputs.has(wsuEntry.keyNorm);
            if (inputPresent && outputPresent) {
                return null;
            }

            const rowData = {};
            rowData.Missing_In = (!inputPresent && !outputPresent)
                ? 'Input and Output missing in Translate'
                : (!inputPresent ? 'Input missing in Translate' : 'Output missing in Translate');
            selectedCols.outcomes.forEach(col => {
                rowData[`outcomes_${col}`] = outcomesEntry.row[col] ?? '';
            });
            rowData.translate_input = outcomesEntry.keyRaw ?? outcomesEntry.keyNorm;
            rowData.translate_output = wsuEntry.keyRaw ?? wsuEntry.keyNorm;
            selectedCols.wsu_org.forEach(col => {
                rowData[`wsu_${col}`] = wsuEntry.row[col] ?? '';
            });
            rowData.Similarity = formatSuggestionScore(pair.score);
            if (showMappingLogic) {
                rowData.Mapping_Logic = `High-confidence Outcomes<->myWSU name/location match (${formatScore(pair.score)}); ${rowData.Missing_In.toLowerCase()}.`;
            }
            return rowData;
        })
        .filter(Boolean)
        .sort((a, b) => {
            const missingOrder = { 'Input and Output missing in Translate': 0, 'Input missing in Translate': 1, 'Output missing in Translate': 2 };
            const orderA = missingOrder[a.Missing_In] ?? 99;
            const orderB = missingOrder[b.Missing_In] ?? 99;
            if (orderA !== orderB) return orderA - orderB;
            return String(a.translate_input || '').localeCompare(String(b.translate_input || ''));
        });

    addSheetWithRows(workbook, {
        sheetName: 'Missing_Mappings',
        outputColumns: missingMappingColumns,
        rows: missingMappingsRows,
        style: baseStyle,
        headers: buildHeaders(missingMappingColumns, keyLabels),
        rowBorderByError
    });

    reportProgress('Building Action_Queue...', 78);
    const actionQueueFromErrors = errorDataRows.map(row => {
        const rawType = row._rawErrorType || row.Error_Type;
        const rawSub = row._rawErrorSubtype || row.Error_Subtype;
        const priority = getActionPriority(rawType, rawSub);
        const action = getRecommendedAction(rawType, rawSub);
        return {
            ...row,
            Is_Stale_Key: row._rawErrorSubtype === EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.LIKELY_STALE_KEY ? 1 : 0,
            Priority: priority,
            Recommended_Action: action,
            Source_Sheet: 'Errors_in_Translate',
            Decision: '',
            Owner: '',
            Status: '',
            Resolution_Note: '',
            Resolved_Date: ''
        };
    });
    const actionQueueFromOneToMany = oneToManyDataRows.map(row => {
        const rawType = row.Error_Type || '';
        const priority = getActionPriority(rawType, '');
        const action = getRecommendedAction(rawType, '');
        return {
            ...row,
            _rawErrorType: rawType,
            _rawErrorSubtype: '',
            Is_Stale_Key: 0,
            Priority: priority,
            Recommended_Action: action,
            Source_Sheet: 'One_to_Many',
            Error_Type: row.Error_Type,
            Error_Subtype: '',
            Missing_In: '',
            Similarity: '',
            Decision: '',
            Owner: '',
            Status: '',
            Resolution_Note: '',
            Resolved_Date: ''
        };
    });
    const actionQueueFromMissing = missingMappingsRows.map(row => {
        const priority = getActionPriority('Missing_Mapping', row.Missing_In);
        const action = getRecommendedAction('Missing_Mapping', row.Missing_In);
        return {
            ...row,
            _rawErrorType: 'Missing_Mapping',
            _rawErrorSubtype: row.Missing_In || '',
            Is_Stale_Key: 0,
            Error_Type: 'Missing_Mapping',
            Error_Subtype: row.Missing_In || '',
            Priority: priority,
            Recommended_Action: action,
            Source_Sheet: 'Missing_Mappings',
            Missing_In: row.Missing_In || '',
            Similarity: row.Similarity ?? '',
            Decision: '',
            Owner: '',
            Status: '',
            Resolution_Note: '',
            Resolved_Date: ''
        };
    });
    const actionQueueFromErrorsWithMissing = actionQueueFromErrors.map(row => ({
        ...row,
        Missing_In: row.Missing_In ?? '',
        Similarity: row.Similarity ?? row.Suggestion_Score ?? ''
    }));
    const actionQueueRows = [...actionQueueFromErrorsWithMissing, ...actionQueueFromOneToMany, ...actionQueueFromMissing]
        .sort((a, b) => {
            const pa = a.Priority ?? 99;
            const pb = b.Priority ?? 99;
            if (pa !== pb) return pa - pb;
            const sa = a.Source_Sheet || '';
            const sb = b.Source_Sheet || '';
            if (sa !== sb) return sa.localeCompare(sb);
            const ea = a.Error_Type || '';
            const eb = b.Error_Type || '';
            if (ea !== eb) return ea.localeCompare(eb);
            const tiA = String(a.translate_input || '');
            const tiB = String(b.translate_input || '');
            if (tiA !== tiB) return tiA.localeCompare(tiB);
            const toA = String(a.translate_output || '');
            const toB = String(b.translate_output || '');
            return toA.localeCompare(toB);
        });
    const actionQueueBaseCols = [
        'Priority',
        'Recommended_Action',
        'Error_Type',
        'Error_Subtype',
        'Source_Sheet',
        'Is_Stale_Key',
        'Missing_In',
        'Similarity',
        ...errorColumns.filter(c => !['Error_Type', 'Error_Subtype', '_rawErrorType', '_rawErrorSubtype'].includes(c)),
        'Decision',
        'Owner',
        'Status',
        'Resolution_Note',
        'Resolved_Date'
    ];
    const actionQueueColumns = actionQueueBaseCols.filter((v, i, arr) => arr.indexOf(v) === i);
    const actionQueueHeaders = buildHeaders(actionQueueColumns, keyLabels).map((h, i) => {
        const col = actionQueueColumns[i];
        if (col === 'Recommended_Action') return 'Recommended Action';
        if (col === 'Source_Sheet') return 'Source Sheet';
        if (col === 'Is_Stale_Key') return 'Stale Key (1=yes)';
        if (col === 'Resolution_Note') return 'Resolution Note';
        if (col === 'Resolved_Date') return 'Resolved Date';
        return h || col;
    });
    addSheetWithRows(workbook, {
        sheetName: 'Action_Queue',
        outputColumns: actionQueueColumns,
        rows: actionQueueRows,
        style: baseStyle,
        headers: actionQueueHeaders,
        rowBorderByError: null
    });
    const colDecisionAq = columnIndexToLetter(actionQueueColumns.indexOf('Decision') + 1);
    const aqSheet = workbook.getWorksheet('Action_Queue');
    if (aqSheet && actionQueueRows.length > 0) {
        aqSheet.dataValidations.add(
            `${colDecisionAq}2:${colDecisionAq}${actionQueueRows.length + 1}`,
            {
                type: 'list',
                allowBlank: true,
                formulae: ['"Accept,Update Key,No Change,Needs Research"']
            }
        );
    }

    reportProgress('Building QA_Checks_Validate...', 84);
    const qaValidateSheet = workbook.addWorksheet('QA_Checks_Validate');
    const aqLastRow = Math.max(2, actionQueueRows.length + 1);
    const colDecision = columnIndexToLetter(actionQueueColumns.indexOf('Decision') + 1);
    const colIsStaleKey = columnIndexToLetter(actionQueueColumns.indexOf('Is_Stale_Key') + 1);
    const colSource = columnIndexToLetter(actionQueueColumns.indexOf('Source_Sheet') + 1);
    const decisionRange = `Action_Queue!$${colDecision}$2:$${colDecision}$${aqLastRow}`;
    const isStaleKeyRange = `Action_Queue!$${colIsStaleKey}$2:$${colIsStaleKey}$${aqLastRow}`;
    const sourceRange = `Action_Queue!$${colSource}$2:$${colSource}$${aqLastRow}`;
    const getQAEmptyRows = (typeof ValidationExportHelpers !== 'undefined' && ValidationExportHelpers &&
        typeof ValidationExportHelpers.getQAValidateRowsForEmptyQueue === 'function')
        ? ValidationExportHelpers.getQAValidateRowsForEmptyQueue
        : () => [
            ['Check', 'Count', 'Status', 'Detail'],
            ['Unresolved actions', 0, 'PASS', 'Rows without a decision'],
            ['Approved for update', 0, 'PASS', 'Accept or Update Key decisions'],
            ['Stale-key rows lacking decision', 0, 'PASS', 'Likely stale key rows without decision'],
            ['Duplicate conflict rows lacking decision', 0, 'PASS', 'One-to-many rows without decision']
        ];
    const qaRows = actionQueueRows.length > 0
        ? [
            ['Check', 'Count', 'Status', 'Detail'],
            ['Unresolved actions', `=COUNTIF(${decisionRange},"")`, '=IF(B2=0,"PASS","CHECK")', 'Rows without a decision'],
            ['Approved for update', `=COUNTIF(${decisionRange},"Accept")+COUNTIF(${decisionRange},"Update Key")`, '', 'Accept or Update Key decisions'],
            ['Stale-key rows lacking decision', `=COUNTIFS(${isStaleKeyRange},1,${decisionRange},"")`, '=IF(B4=0,"PASS","CHECK")', 'Likely stale key rows without decision'],
            ['Duplicate conflict rows lacking decision', `=COUNTIFS(${sourceRange},"One_to_Many",${decisionRange},"")`, '=IF(B5=0,"PASS","CHECK")', 'One-to-many rows without decision']
        ]
        : getQAEmptyRows();
    qaRows.forEach(row => qaValidateSheet.addRow(row));
    qaValidateSheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    });
    qaValidateSheet.columns = [{ width: 42 }, { width: 26 }, { width: 14 }, { width: 70 }];

    reportProgress('Finalizing Excel file...', 92);
    const buffer = toArrayBuffer(await workbook.xlsx.writeBuffer());
    reportProgress('Saving file...', 100);
    return {
        buffer,
        filename: downloadSafeFileName(options.fileName, 'WSU_Mapping_Validation_Report.xlsx')
    };
}

self.onmessage = async (event) => {
    const { type, payload } = event.data || {};
    try {
        if (type === 'build_generation_export') {
            const result = await buildGenerationExport(payload || {});
            self.postMessage({ type: 'result', result }, [result.buffer]);
            return;
        }
        if (type === 'build_validation_export') {
            const result = await buildValidationExport(payload || {});
            self.postMessage({ type: 'result', result }, [result.buffer]);
            return;
        }
        throw new Error(`Unknown export task: ${type}`);
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error?.message || String(error)
        });
    }
};
