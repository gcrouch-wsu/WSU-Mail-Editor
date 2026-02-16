/* global normalizeKeyValue, calculateNameSimilarity, similarityRatio, tokenizeName, getInformativeTokens */
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
const MAX_VALIDATE_DYNAMIC_REVIEW_FORMULA_ROWS = 5000;

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
    if (col === undefined || col === null) return style.defaultHeaderColor || 'FF1E3A8A';
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
    return style.defaultHeaderColor || 'FF1E3A8A';
}

function getBodyFill(col, style) {
    if (col === undefined || col === null) return style.defaultBodyColor || 'FFF3F4F6';
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

/** Ensure cell value is ExcelJS-safe (primitive or formula object). Avoids "reading '0'" from raw objects. */
function sanitizeCellValue(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
    if (v && typeof v === 'object' && 'formula' in v) return v;
    return String(v);
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
        groupColumn,
        freezeConfig,
        columnLayoutByKey
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

    const sourceFillByColumn = outputColumns.map(col => ({ argb: getBodyFill(col, style) || 'FFF3F4F6' }));
    const defaultFill = { argb: 'FFF3F4F6' };
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

        const rowData = outputColumns.map(col => sanitizeCellValue(row[col]));
        const excelRow = sheet.addRow(rowData);
        excelRow.eachCell((cell, colNumber) => {
            const fill = sourceFillByColumn[colNumber - 1] ?? sourceFillByColumn[0] ?? defaultFill;
            const argb = (fill && fill.argb) ? fill.argb : 'FFF3F4F6';
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
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

    sheet.views = freezeConfig
        ? [{ state: 'frozen', xSplit: freezeConfig.xSplit || 0, ySplit: freezeConfig.ySplit ?? 1 }]
        : [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length }
    };
    const layoutByKey = columnLayoutByKey || {};
    sheet.columns.forEach((column, idx) => {
        const colKey = outputColumns[idx];
        const layout = colKey ? layoutByKey[colKey] : null;
        if (layout && typeof layout.width === 'number') {
            column.width = layout.width;
        } else {
            const headerStr = String(headers[idx] != null ? headers[idx] : '');
            let maxLength = headerStr.length;
            rows.forEach(row => {
                const val = colKey != null ? row[colKey] : '';
                const value = String(sanitizeCellValue(val));
                if (value.length > maxLength) maxLength = value.length;
            });
            column.width = Math.min(maxLength + 2, 70);
        }
        if (layout && Object.prototype.hasOwnProperty.call(layout, 'hidden')) {
            column.hidden = Boolean(layout.hidden);
        }
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
        if (col === 'outcomes_school') return 'Outcomes Name';
        if (col === 'wsu_school') return 'myWSU Name';
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

function buildMappingLogicRow(row, normalizedErrorType, nameCompareConfig, idfTable = null) {
    const threshold = Number.isFinite(nameCompareConfig?.threshold)
        ? nameCompareConfig.threshold
        : 0.8;
    const outcomesNameKey = nameCompareConfig?.outcomes ? `outcomes_${nameCompareConfig.outcomes}` : '';
    const wsuNameKey = nameCompareConfig?.wsu ? `wsu_${nameCompareConfig.wsu}` : '';
    const outcomesName = outcomesNameKey ? (row[outcomesNameKey] || row.outcomes_name || '') : (row.outcomes_name || '');
    const wsuName = wsuNameKey ? (row[wsuNameKey] || row.wsu_Descr || '') : (row.wsu_Descr || '');
    const similarity = (outcomesName && wsuName && typeof calculateNameSimilarity === 'function')
        ? calculateNameSimilarity(outcomesName, wsuName, idfTable)
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
    workbook.calcProperties = {
        ...(workbook.calcProperties || {}),
        fullCalcOnLoad: true
    };
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
    const getResolutionTypeForErrorRow = (row) => {
        if (row.missing_in === 'Ambiguous Match') return 'Ambiguous candidate set';
        if (row.missing_in === 'myWSU') return 'Missing in myWSU';
        if (row.missing_in === 'Outcomes') return 'Missing in Outcomes';
        return 'Matched 1:1';
    };
    const getAmbiguityScope = (row) => {
        const hasOutcomesRecord = Boolean(toText(row.outcomes_record_id));
        const hasWsuRecord = Boolean(toText(row.wsu_record_id));
        if (hasOutcomesRecord && !hasWsuRecord) {
            return 'Outcomes row with multiple myWSU candidates';
        }
        if (!hasOutcomesRecord && hasWsuRecord) {
            return 'myWSU row with multiple Outcomes candidates';
        }
        return 'Multiple plausible matches';
    };
    const getReviewPathForErrorRow = (row) => {
        if (row.missing_in === 'Ambiguous Match') {
            return 'Review Alt 1-3 and choose best candidate, or mark No Match';
        }
        if (row.missing_in === 'myWSU') {
            return 'No myWSU candidate found. Research target key, then set Decision';
        }
        if (row.missing_in === 'Outcomes') {
            return 'Reference only: no Outcomes source row for this myWSU record';
        }
        return 'Verify and confirm 1:1 mapping';
    };
    const getReviewPathForSourceStatus = (sourceStatus) => {
        if (sourceStatus === 'Ambiguous Match') {
            return 'Choose Alternate (Alt 1-3) or mark No Match';
        }
        if (sourceStatus === 'Missing in myWSU') {
            return 'No candidate found. Research key, then set No Match until resolved';
        }
        return 'Verify proposed match and confirm Decision';
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
            const col = columns[idx - 1] || {};
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: headerColor[col.group || 'meta'] || headerColor.meta }
            };
        });

        rows.forEach(row => {
            const rowData = columns.map(col => sanitizeCellValue(row[col.key]));
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
        ['Ambiguous candidates', ambiguousRows.length, 'Rows with multiple plausible matches; choose from Alt candidates'],
        ['Missing in myWSU', missingInMyWsuRows.length, 'Outcomes rows with no candidate target match in myWSU'],
        ['Missing in Outcomes', missingInOutcomesRows.length, 'myWSU rows without a source row'],
        ['Review_Decisions rows', cleanSorted.length + missingInMyWsuRows.length + ambiguousOutcomesCount, 'One row per Outcomes record'],
        ['Workflow note', '', 'Use Review_Decisions for actions. Ambiguous rows need candidate selection; Missing in myWSU rows need research/manual mapping.']
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
            resolution_type: getResolutionTypeForErrorRow(row),
            review_path: getReviewPathForErrorRow(row),
            ambiguity_scope: getAmbiguityScope(row),
            candidate_count: alternates.length,
            proposed_wsu_key: row.proposed_wsu_key || '',
            proposed_wsu_name: row.proposed_wsu_name || '',
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
        { key: 'resolution_type', header: 'Resolution Type', group: 'meta' },
        { key: 'review_path', header: 'Review Path', group: 'meta' },
        { key: 'ambiguity_scope', header: 'Ambiguity Scope', group: 'meta' },
        { key: 'candidate_count', header: 'Candidate Count', group: 'meta' },
        { key: 'proposed_wsu_key', header: 'Top Suggested myWSU Key', group: 'decision' },
        { key: 'proposed_wsu_name', header: 'Top Suggested myWSU Name', group: 'decision' },
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
    const missingInMyWsuRowsMapped = missingInMyWsuRows.map(row => ({
        ...row,
        resolution_type: getResolutionTypeForErrorRow(row),
        review_path: getReviewPathForErrorRow(row)
    }));
    const missingMyWsuColumns = [
        { key: 'outcomes_record_id', header: 'Outcomes Record ID', group: 'meta' },
        { key: 'outcomes_display_name', header: 'Outcomes Name', group: 'meta' },
        { key: 'missing_in', header: 'Missing In', group: 'meta' },
        { key: 'resolution_type', header: 'Resolution Type', group: 'meta' },
        { key: 'review_path', header: 'Review Path', group: 'meta' }
    ];
    outcomesCols.forEach(col => {
        missingMyWsuColumns.push({ key: `outcomes_${col}`, header: `Outcomes: ${col}`, group: 'outcomes' });
    });
    addSheetFromObjects('Missing_In_myWSU', missingMyWsuColumns, missingInMyWsuRowsMapped);

    const missingInOutcomesRowsMapped = missingInOutcomesRows.map(row => ({
        ...row,
        resolution_type: getResolutionTypeForErrorRow(row),
        review_path: getReviewPathForErrorRow(row)
    }));
    const missingOutcomesColumns = [
        { key: 'wsu_record_id', header: 'myWSU Record ID', group: 'meta' },
        { key: 'wsu_display_name', header: 'myWSU Name', group: 'meta' },
        { key: 'missing_in', header: 'Missing In', group: 'meta' },
        { key: 'resolution_type', header: 'Resolution Type', group: 'meta' },
        { key: 'review_path', header: 'Review Path', group: 'meta' }
    ];
    wsuCols.forEach(col => {
        missingOutcomesColumns.push({ key: `wsu_${col}`, header: `myWSU: ${col}`, group: 'wsu' });
    });
    addSheetFromObjects('Missing_In_Outcomes', missingOutcomesColumns, missingInOutcomesRowsMapped);

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
            resolution_type: 'Matched 1:1',
            review_path: getReviewPathForSourceStatus('Matched'),
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
            resolution_type: getResolutionTypeForErrorRow(row),
            review_path: getReviewPathForSourceStatus(row.missing_in === 'Ambiguous Match' ? 'Ambiguous Match' : 'Missing in myWSU'),
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
                resolution_type: row.resolution_type || '',
                review_path: row.review_path || '',
                candidate_count: alternates.length,
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
        { key: 'resolution_type', header: 'Resolution Type', group: 'meta' },
        { key: 'review_path', header: 'Review Path', group: 'meta' },
        { key: 'candidate_count', header: 'Candidate Count', group: 'meta' },
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
        { key: '_dup_final_key_count', header: '_Dup Final Key Count', group: 'decision' },
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
    const colSourceStatus = reviewColLetterByKey.source_status;
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
    const colDupFinalKeyCount = reviewColLetterByKey._dup_final_key_count;
    const reviewDecisionLastRow = Math.max(2, reviewSheet.rowCount);
    const reviewDecisionFinalKeyRange = `$${colFinalKey}$2:$${colFinalKey}$${reviewDecisionLastRow}`;
    for (let rowNum = 2; rowNum <= reviewSheet.rowCount; rowNum += 1) {
        reviewSheet.getCell(`${colFinalKey}${rowNum}`).value = {
            formula: `IF($${colDecision}${rowNum}="Accept",$${colPropKey}${rowNum},IF($${colDecision}${rowNum}="Choose Alternate",IF($${colAltChoice}${rowNum}="Alt 1",$${colAlt1Key}${rowNum},IF($${colAltChoice}${rowNum}="Alt 2",$${colAlt2Key}${rowNum},IF($${colAltChoice}${rowNum}="Alt 3",$${colAlt3Key}${rowNum},""))),""))`
        };
        reviewSheet.getCell(`${colFinalName}${rowNum}`).value = {
            formula: `IF($${colDecision}${rowNum}="Accept",$${colPropName}${rowNum},IF($${colDecision}${rowNum}="Choose Alternate",IF($${colAltChoice}${rowNum}="Alt 1",$${colAlt1Name}${rowNum},IF($${colAltChoice}${rowNum}="Alt 2",$${colAlt2Name}${rowNum},IF($${colAltChoice}${rowNum}="Alt 3",$${colAlt3Name}${rowNum},""))),""))`
        };
        reviewSheet.getCell(`${colDupFinalKeyCount}${rowNum}`).value = {
            formula: `IF($${colFinalKey}${rowNum}="","",COUNTIF(${reviewDecisionFinalKeyRange},$${colFinalKey}${rowNum}))`
        };
    }
    const dupCountColumn = reviewSheet.getColumn(reviewColIndexByKey._dup_final_key_count);
    if (dupCountColumn) {
        dupCountColumn.hidden = true;
        dupCountColumn.width = 4;
    }
    if (reviewSheet.rowCount > 1) {
        reviewSheet.dataValidations.add(
            `${colDecision}2:${colDecision}${reviewSheet.rowCount}`,
            {
                type: 'list',
                allowBlank: true,
                formulae: ['"Accept,Choose Alternate,No Match"']
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
        const reviewLastColLetter = columnIndexToLetter(reviewColumns.length);
        const reviewDataRef = `A2:${reviewLastColLetter}${reviewSheet.rowCount}`;
        reviewSheet.addConditionalFormatting({
            ref: reviewDataRef,
            rules: [
                {
                    type: 'expression',
                    formulae: [`$${colSourceStatus}2="Ambiguous Match"`],
                    style: {
                        fill: {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFEF3C7' }
                        }
                    }
                },
                {
                    type: 'expression',
                    formulae: [`$${colSourceStatus}2="Missing in myWSU"`],
                    style: {
                        fill: {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFEE2E2' }
                        }
                    }
                },
                {
                    type: 'expression',
                    formulae: [`AND($${colDecision}2="",OR($${colSourceStatus}2="Ambiguous Match",$${colSourceStatus}2="Missing in myWSU"))`],
                    style: {
                        border: {
                            left: { style: 'medium', color: { argb: 'FFF59E0B' } }
                        }
                    }
                }
            ]
        });
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
    const approvedRelativeRows = `(ROW(Review_Decisions!$${colDecision}$2:$${colDecision}$${reviewLastRow})-ROW(Review_Decisions!$${colDecision}$2)+1)`;
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
    const reviewFinalKeyRange = `Review_Decisions!$${colFinalKey}$2:$${colFinalKey}$${reviewLastRow}`;
    const reviewDupFinalKeyRange = `Review_Decisions!$${colDupFinalKeyCount}$2:$${colDupFinalKeyCount}$${reviewLastRow}`;
    const qaRows = [
        ['Check', 'Count', 'Status', 'Detail'],
        ['Unresolved count', `=COUNTIF(${decisionRange},"")+COUNTIF(${decisionRange},"No Match")`, '=IF(B2=0,"PASS","CHECK")', 'Blank or No Match decisions'],
        ['Blank final key with approved decision', `=COUNTIFS(${decisionRange},"Accept",${reviewFinalKeyRange},"")+COUNTIFS(${decisionRange},"Choose Alternate",${reviewFinalKeyRange},"")`, '=IF(B3=0,"PASS","FAIL")', 'Approved rows should produce final keys'],
        ['Duplicate final keys (approved)', `=SUMPRODUCT(((${decisionRange}="Accept")+(${decisionRange}="Choose Alternate"))*(${reviewFinalKeyRange}<>"")*(${reviewDupFinalKeyRange}>1))/2`, '=IF(B4=0,"PASS","CHECK")', 'Duplicates among approved final keys'],
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

    reportProgress('Building review instructions...', 90);
    const createInstructionsSheet = workbook.addWorksheet('Review_Instructions_Create', {
        properties: { tabColor: { argb: 'FF1E3A8A' } }
    });
    const createInstructionsRows = [
        ['Section', 'Guidance'],
        ['Primary action sheet', 'Use Review_Decisions to set Decision values for each Outcomes row.'],
        ['Source Status: Matched', 'Verify the proposed key/name and keep Accept unless correction is needed.'],
        ['Source Status: Ambiguous Match', 'Use Alt 1-3 candidates and Alternate Choice to resolve low-confidence mapping.'],
        ['Source Status: Missing in myWSU', 'No target candidate found. Research key and use No Match until resolved.'],
        ['Ambiguous_Candidates tab', 'Reference tab with candidate options, ambiguity scope, and review path guidance.'],
        ['Missing_In_myWSU tab', 'Reference tab listing Outcomes rows that currently have no myWSU target row.'],
        ['Final_Translation_Table', 'Publishes only Accept and Choose Alternate decisions from Review_Decisions.'],
        ['QA_Checks', 'Review unresolved count, blank finals, and duplicate final keys before publishing.']
    ];
    createInstructionsRows.forEach(row => createInstructionsSheet.addRow(row));
    createInstructionsSheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor.meta } };
    });
    createInstructionsSheet.columns = [{ width: 34 }, { width: 110 }];
    createInstructionsSheet.views = [{ state: 'frozen', ySplit: 1 }];

    reportProgress('Finalizing Excel file...', 94);
    const buffer = toArrayBuffer(await workbook.xlsx.writeBuffer());
    reportProgress('Saving file...', 100);
    return {
        buffer,
        filename: 'Generated_Translation_Table.xlsx'
    };
}

async function buildValidationExport(payload) {
    const { validated = [], selectedCols = {}, options = {}, context = {} } = payload || {};
    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties = {
        ...(workbook.calcProperties || {}),
        fullCalcOnLoad: true
    };
    const includeSuggestions = Boolean(options.includeSuggestions);
    const showMappingLogic = Boolean(options.showMappingLogic);
    const nameCompareConfig = options.nameCompareConfig || {};
    const loadedData = context.loadedData || { outcomes: [], translate: [], wsu_org: [] };
    const columnRoles = context.columnRoles || { outcomes: {}, wsu_org: {} };
    const keyConfig = context.keyConfig || {};
    const keyLabels = context.keyLabels || {};

    reportProgress('Building export...', 5);

    const outcomesColumns = (selectedCols.outcomes || []).map(col => `outcomes_${col}`);
    const wsuColumns = (selectedCols.wsu_org || []).map(col => `wsu_${col}`);
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
    const reviewSuggestionColumns = [
        'Suggested_Key',
        'Suggested_School',
        'Suggested_City',
        'Suggested_State',
        'Suggested_Country',
        'Suggestion_Score'
    ];

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
        const keyCandidates = [];
        if (prefix) {
            keyCandidates.push(`${prefix}${roleColumn}`);
        }
        keyCandidates.push(roleColumn);
        if (!prefix) {
            keyCandidates.push(`outcomes_${roleColumn}`, `wsu_${roleColumn}`);
        }
        for (const key of keyCandidates) {
            const value = row?.[key];
            if (value !== undefined && value !== null && value !== '') {
                return value;
            }
        }
        for (const key of keyCandidates) {
            const value = row?.[key];
            if (value !== undefined && value !== null) {
                return value;
            }
        }
        return '';
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
    const getNameTokens = (nameValue) => {
        const raw = String(nameValue || '').trim();
        if (!raw) return [];
        if (typeof getInformativeTokens === 'function' && typeof tokenizeName === 'function') {
            return getInformativeTokens(tokenizeName(raw));
        }
        return raw
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(token => token.length > 1);
    };
    const buildTokenIDFLocal = (allNames) => {
        const names = Array.isArray(allNames) ? allNames : [];
        if (!names.length) return {};
        const df = {};
        names.forEach(name => {
            const tokens = new Set(getNameTokens(name));
            tokens.forEach(token => {
                df[token] = (df[token] || 0) + 1;
            });
        });
        const idf = {};
        const docCount = names.length;
        Object.keys(df).forEach(token => {
            idf[token] = Math.log((docCount + 1) / (df[token] + 1)) + 1;
        });
        const values = Object.values(idf).sort((a, b) => a - b);
        const medianIDF = values.length ? values[Math.floor(values.length / 2)] : 0;
        try {
            Object.defineProperty(idf, '__median', {
                value: medianIDF,
                writable: true,
                enumerable: false,
                configurable: true
            });
        } catch (error) {
            idf.__median = medianIDF;
        }
        return idf;
    };
    const buildTokenIndex = (candidates, idf, minIdf) => {
        const index = {};
        candidates.forEach((candidate, idx) => {
            const tokens = new Set(getNameTokens(candidate.name));
            tokens.forEach(token => {
                if ((idf[token] || 0) >= minIdf) {
                    if (!index[token]) {
                        index[token] = [];
                    }
                    index[token].push(idx);
                }
            });
        });
        return index;
    };
    const getBlockedCandidateIndices = (queryName, tokenIndex, idf, minCandidates = 5, maxTokens = 3) => {
        const queryTokens = Array.from(new Set(getNameTokens(queryName)));
        if (!queryTokens.length) return null;
        queryTokens.sort((a, b) => (idf[b] || 0) - (idf[a] || 0));
        const blocked = new Set();
        queryTokens.slice(0, maxTokens).forEach(token => {
            (tokenIndex[token] || []).forEach(idx => blocked.add(idx));
        });
        if (blocked.size < minCandidates) {
            return null;
        }
        return Array.from(blocked);
    };

    const MIN_KEY_SUGGESTION_SCORE = 0.6;
    const MIN_NAME_SUGGESTION_DISPLAY_SCORE = 0.4;
    const canSuggestNames = Boolean(
        includeSuggestions &&
        nameCompareConfig.enabled &&
        nameCompareConfig.outcomes &&
        nameCompareConfig.wsu
    );
    const outcomesSuggestionCityColumn = nameCompareConfig.city_outcomes || roleMapOutcomes.City || getFallbackRoleColumn(selectedCols.outcomes || [], 'city');
    const outcomesSuggestionStateColumn = nameCompareConfig.state_outcomes || roleMapOutcomes.State || getFallbackRoleColumn(selectedCols.outcomes || [], 'state');
    const outcomesSuggestionCountryColumn = nameCompareConfig.country_outcomes || roleMapOutcomes.Country || getFallbackRoleColumn(selectedCols.outcomes || [], 'country');
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
    const outcomesNameCandidates = canSuggestNames
        ? (loadedData.outcomes || [])
            .map(row => ({
                key: row[keyConfig.outcomes],
                name: row[nameCompareConfig.outcomes],
                normName: normalizeValue(row[nameCompareConfig.outcomes]),
                city: outcomesSuggestionCityColumn ? (row[outcomesSuggestionCityColumn] ?? '') : '',
                state: outcomesSuggestionStateColumn ? (row[outcomesSuggestionStateColumn] ?? '') : '',
                country: outcomesSuggestionCountryColumn ? (row[outcomesSuggestionCountryColumn] ?? '') : '',
                row
            }))
            .filter(entry => entry.normName)
        : [];
    const suggestionIDFTable = canSuggestNames
        ? buildTokenIDFLocal([
            ...wsuNameCandidates.map(candidate => candidate.name),
            ...outcomesNameCandidates.map(candidate => candidate.name)
        ])
        : {};
    const suggestionMedianIDF = typeof suggestionIDFTable.__median === 'number'
        ? suggestionIDFTable.__median
        : 0;
    const wsuNameTokenIndex = canSuggestNames
        ? buildTokenIndex(wsuNameCandidates, suggestionIDFTable, suggestionMedianIDF)
        : {};
    const outcomesNameTokenIndex = canSuggestNames
        ? buildTokenIndex(outcomesNameCandidates, suggestionIDFTable, suggestionMedianIDF)
        : {};
    const suggestionBlockStats = {
        forwardQueries: 0,
        reverseQueries: 0,
        forwardFallbacks: 0,
        reverseFallbacks: 0
    };

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
        suggestionBlockStats.forwardQueries += 1;
        const blockedIndices = getBlockedCandidateIndices(
            outcomesName,
            wsuNameTokenIndex,
            suggestionIDFTable
        );
        const scanCandidates = blockedIndices
            ? blockedIndices.map(idx => wsuNameCandidates[idx]).filter(Boolean)
            : wsuNameCandidates;
        if (!blockedIndices) {
            suggestionBlockStats.forwardFallbacks += 1;
        }
        scanCandidates.forEach(candidate => {
            const score = typeof calculateNameSimilarity === 'function'
                ? calculateNameSimilarity(outcomesName, candidate.name, suggestionIDFTable)
                : similarityScore(normalizeValue(outcomesName), candidate.normName);
            if (score >= MIN_NAME_SUGGESTION_DISPLAY_SCORE) {
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
    const getBestOutcomesNameSuggestion = (wsuName) => {
        if (!canSuggestNames || !wsuName) return null;
        const candidates = [];
        suggestionBlockStats.reverseQueries += 1;
        const blockedIndices = getBlockedCandidateIndices(
            wsuName,
            outcomesNameTokenIndex,
            suggestionIDFTable
        );
        const scanCandidates = blockedIndices
            ? blockedIndices.map(idx => outcomesNameCandidates[idx]).filter(Boolean)
            : outcomesNameCandidates;
        if (!blockedIndices) {
            suggestionBlockStats.reverseFallbacks += 1;
        }
        scanCandidates.forEach(candidate => {
            const score = typeof calculateNameSimilarity === 'function'
                ? calculateNameSimilarity(wsuName, candidate.name, suggestionIDFTable)
                : similarityScore(normalizeValue(wsuName), candidate.normName);
            if (score >= MIN_NAME_SUGGESTION_DISPLAY_SCORE) {
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
                ? getBestOutcomesNameSuggestion(row[`wsu_${nameCompareConfig.wsu}`] || row.wsu_Descr || '')
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
                // One-to-many review defaults to output-side (myWSU) suggestions.
                const outputSuggestion = canSuggestNames
                    ? getBestNameSuggestion(outcomesName)
                    : getBestKeySuggestion(row.translate_output, wsuKeyCandidates);
                if (outputSuggestion) {
                    fillSuggestedFields(
                        rowData,
                        outputSuggestion.row,
                        roleMapWsu,
                        selectedCols.wsu_org,
                        outputSuggestion.key,
                        ''
                    );
                    applySuggestionFallbacks(rowData, row, outputSuggestion);
                    rowData.Suggestion_Score = formatSuggestionScore(outputSuggestion.score);
                } else {
                    const currentOutputKey = row[`wsu_${keyLabels.wsu}`] || row.translate_output;
                    fillSuggestedFields(rowData, row, roleMapWsu, selectedCols.wsu_org, currentOutputKey, 'wsu_');
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
                    ? calculateNameSimilarity(outcomesName, wsuName, suggestionIDFTable)
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

    const validatedList = Array.isArray(validated) ? validated : [];
    const errorRows = validatedList.filter(row => (
        row.Error_Type !== 'Valid' && row.Error_Type !== 'High_Confidence_Match'
    ));
    const translateErrorRows = errorRows.filter(row => !['Duplicate_Target', 'Duplicate_Source'].includes(row.Error_Type));
    const oneToManyRows = errorRows.filter(row => ['Duplicate_Target', 'Duplicate_Source'].includes(row.Error_Type));
    const highConfidenceRows = validatedList.filter(row => row.Error_Type === 'High_Confidence_Match');
    const validRows = validatedList.filter(row => row.Error_Type === 'Valid');

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
            rowData.Mapping_Logic = buildMappingLogicRow(row, rowData.Error_Type, nameCompareConfig, suggestionIDFTable);
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
            rowData.Mapping_Logic = buildMappingLogicRow(row, row.Error_Type, nameCompareConfig, suggestionIDFTable);
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
            rowData.Mapping_Logic = buildMappingLogicRow(row, 'Valid', nameCompareConfig, suggestionIDFTable);
        }
        return rowData;
    });

    const highConfidenceDataRows = highConfidenceRows.map(row => {
        const rowData = {};
        highConfidenceColumns.forEach(col => {
            rowData[col] = row[col] !== undefined ? row[col] : '';
        });
        if (showMappingLogic) {
            rowData.Mapping_Logic = buildMappingLogicRow(row, 'High_Confidence_Match', nameCompareConfig, suggestionIDFTable);
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

            const similarity = calculateNameSimilarity(outcomesEntry.name, wsuEntry.name, suggestionIDFTable);
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
                threshold,
                suggestionIDFTable
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
    const defaultDecisionThreshold = Number.isFinite(nameCompareConfig?.threshold)
        ? nameCompareConfig.threshold
        : 0.85;
    const getDefaultDecision = (row) => {
        const rawType = row._rawErrorType || row.Error_Type || '';
        const rawSub = String(row._rawErrorSubtype || row.Error_Subtype || '');
        const suggestedKey = String(row.Suggested_Key || '').trim();
        const scoreVal = row.Suggestion_Score;
        const score = Number.isFinite(scoreVal) ? scoreVal : (typeof scoreVal === 'string' ? parseFloat(scoreVal) : NaN);
        const hasSuggestion = suggestedKey !== '' || (Number.isFinite(score) && score >= defaultDecisionThreshold);
        if (rawType === 'Name_Mismatch' && Number.isFinite(score) && score >= defaultDecisionThreshold) return 'Keep As-Is';
        if (rawType === 'Output_Not_Found') {
            if (rawSub === EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.NO_REPLACEMENT) return 'Ignore';
            if (rawSub === EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.LIKELY_STALE_KEY && hasSuggestion) return 'Use Suggestion';
        }
        if (rawType === 'Missing_Mapping') return 'Keep As-Is';
        if ((rawType === 'Duplicate_Source' || rawType === 'Duplicate_Target') && hasSuggestion) return 'Use Suggestion';
        if (rawType === 'Input_Not_Found' && hasSuggestion) return 'Use Suggestion';
        return '';
    };
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
            Decision: getDefaultDecision(row) || '',
            Owner: '',
            Status: '',
            Resolution_Note: '',
            Resolved_Date: '',
            Reviewer: '',
            Review_Date: '',
            Reason_Code: '',
            Notes: ''
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
            Decision: getDefaultDecision({ ...row, _rawErrorType: row.Error_Type }) || 'Allow One-to-Many',
            Owner: '',
            Status: '',
            Resolution_Note: '',
            Resolved_Date: '',
            Reviewer: '',
            Review_Date: '',
            Reason_Code: '',
            Notes: ''
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
            Decision: getDefaultDecision({ ...row, _rawErrorType: 'Missing_Mapping' }) || 'Keep As-Is',
            Owner: '',
            Status: '',
            Resolution_Note: '',
            Resolved_Date: '',
            Reviewer: '',
            Review_Date: '',
            Reason_Code: '',
            Notes: ''
        };
    });
    const actionQueueFromErrorsWithMissing = actionQueueFromErrors.map(row => ({
        ...row,
        Missing_In: row.Missing_In ?? '',
        Similarity: row.Similarity ?? row.Suggestion_Score ?? ''
    }));
    const actionQueueRowsUnstable = [...actionQueueFromErrorsWithMissing, ...actionQueueFromOneToMany, ...actionQueueFromMissing]
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
    const inferKeyUpdateSide = (row) => {
        const rawType = row._rawErrorType || '';
        if (rawType === 'Input_Not_Found' || rawType === 'Missing_Input') {
            return 'Input';
        }
        if (rawType === 'Output_Not_Found' || rawType === 'Missing_Output') {
            return 'Output';
        }
        if (rawType === 'Missing_Mapping') {
            const missing = String(row.Missing_In || '');
            if (missing.includes('Input and Output')) return 'Both';
            if (missing.includes('Input')) return 'Input';
            if (missing.includes('Output')) return 'Output';
        }
        if (rawType === 'Duplicate_Source') return 'Output';
        if (rawType === 'Duplicate_Target') return 'Input';
        return 'None';
    };
    const sanitizeIdPart = (value) => String(normalizeValue(value || '')).replace(/\|/g, '/');
    const buildStableReviewId = (row) => {
        const outcomesKeyValue = keyLabels.outcomes ? row[`outcomes_${keyLabels.outcomes}`] : '';
        const wsuKeyValue = keyLabels.wsu ? row[`wsu_${keyLabels.wsu}`] : '';
        return [
            sanitizeIdPart(row.Source_Sheet || ''),
            sanitizeIdPart(row._rawErrorType || row.Error_Type || ''),
            sanitizeIdPart(row.translate_input || ''),
            sanitizeIdPart(row.translate_output || ''),
            sanitizeIdPart(outcomesKeyValue || ''),
            sanitizeIdPart(wsuKeyValue || ''),
            sanitizeIdPart(row.Missing_In || ''),
            sanitizeIdPart(row.Duplicate_Group || '')
        ].join('|');
    };
    const actionQueueRows = actionQueueRowsUnstable.map(row => ({
        ...row,
        Suggested_Key: row.Suggested_Key ?? '',
        Suggested_School: row.Suggested_School ?? '',
        Suggested_City: row.Suggested_City ?? '',
        Suggested_State: row.Suggested_State ?? '',
        Suggested_Country: row.Suggested_Country ?? '',
        Suggestion_Score: row.Suggestion_Score ?? '',
        Current_Input: row.translate_input ?? '',
        Current_Output: row.translate_output ?? '',
        Key_Update_Side: inferKeyUpdateSide(row),
        Review_Row_ID: buildStableReviewId(row),
        Final_Input: '',
        Final_Output: '',
        Publish_Eligible: '',
        Approval_Source: '',
        Has_Update: ''
    }));
    const reviewIdCount = new Map();
    actionQueueRows.forEach(row => {
        const baseId = row.Review_Row_ID;
        const seen = (reviewIdCount.get(baseId) || 0) + 1;
        reviewIdCount.set(baseId, seen);
        if (seen > 1) {
            row.Review_Row_ID = `${baseId}#${seen}`;
        }
    });
    const actionQueueBaseCols = [
        'Review_Row_ID',
        'Priority',
        'Recommended_Action',
        'Error_Type',
        'Error_Subtype',
        'Source_Sheet',
        'Key_Update_Side',
        'Is_Stale_Key',
        'Missing_In',
        'Similarity',
        ...errorColumns.filter(c => !['Error_Type', 'Error_Subtype', '_rawErrorType', '_rawErrorSubtype'].includes(c)),
        ...reviewSuggestionColumns,
        'Decision',
        'Owner',
        'Status',
        'Resolution_Note',
        'Resolved_Date',
        'Reviewer',
        'Review_Date',
        'Reason_Code',
        'Notes'
    ];
    const actionQueueColumns = actionQueueBaseCols.filter((v, i, arr) => arr.indexOf(v) === i);
    const actionQueueHeaders = buildHeaders(actionQueueColumns, keyLabels).map((h, i) => {
        const col = actionQueueColumns[i];
        if (col === 'Review_Row_ID') return 'Review Row ID';
        if (col === 'Recommended_Action') return 'Recommended Action';
        if (col === 'Source_Sheet') return 'Source Sheet';
        if (col === 'Key_Update_Side') return 'Update Side';
        if (col === 'Is_Stale_Key') return 'Stale Key (1=yes)';
        if (col === 'Resolution_Note') return 'Resolution Note';
        if (col === 'Resolved_Date') return 'Resolved Date';
        if (col === 'Review_Date') return 'Review Date';
        if (col === 'Reason_Code') return 'Reason Code';
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
    if (aqSheet) {
        // Internal staging sheet; keep workbook navigation focused on reviewer tabs.
        aqSheet.state = 'hidden';
    }
    if (aqSheet && actionQueueRows.length > 0) {
        aqSheet.dataValidations.add(
            `${colDecisionAq}2:${colDecisionAq}${actionQueueRows.length + 1}`,
            {
                type: 'list',
                allowBlank: true,
                formulae: ['"Keep As-Is,Use Suggestion,Allow One-to-Many,Ignore"']
            }
        );
    }

    reportProgress('Building Review_Workbench...', 82);
    const reviewOutcomesKeyContextKey = keyLabels.outcomes ? `outcomes_${keyLabels.outcomes}` : 'outcomes_key';
    const reviewOutcomesNameCandidates = [
        nameCompareConfig.outcomes ? `outcomes_${nameCompareConfig.outcomes}` : '',
        ...outcomesColumns
    ].filter(Boolean);
    const reviewOutcomesNameContextKey = reviewOutcomesNameCandidates.find(key => key !== reviewOutcomesKeyContextKey) || reviewOutcomesNameCandidates[0] || 'outcomes_name';
    const reviewWsuKeyContextKey = keyLabels.wsu ? `wsu_${keyLabels.wsu}` : 'wsu_key';
    const reviewWsuNameCandidates = [
        nameCompareConfig.wsu ? `wsu_${nameCompareConfig.wsu}` : '',
        ...wsuColumns
    ].filter(Boolean);
    const reviewWsuNameContextKey = reviewWsuNameCandidates.find(key => key !== reviewWsuKeyContextKey) || reviewWsuNameCandidates[0] || 'wsu_name';
    const outcomesStateKey = outcomesStateColumn ? `outcomes_${outcomesStateColumn}` : null;
    const outcomesCountryKey = outcomesCountryColumn ? `outcomes_${outcomesCountryColumn}` : null;
    const wsuCityKey = wsuCityColumn ? `wsu_${wsuCityColumn}` : null;
    const wsuStateKey = wsuStateColumn ? `wsu_${wsuStateColumn}` : null;
    const wsuCountryKey = wsuCountryColumn ? `wsu_${wsuCountryColumn}` : null;
    const sourceContextKeys = [outcomesStateKey, outcomesCountryKey, wsuCityKey, wsuStateKey, wsuCountryKey].filter(Boolean);
    const reviewWorkbenchColumns = [
        'Decision',
        'Error_Type',
        'Error_Subtype',
        ...outcomesColumns.filter(k => k && k !== reviewOutcomesKeyContextKey),
        reviewOutcomesKeyContextKey,
        ...wsuColumns.filter(k => k && k !== reviewWsuKeyContextKey),
        reviewWsuKeyContextKey,
        'translate_input',
        'translate_output',
        'Suggested_Key',
        'Suggested_School',
        'Suggested_City',
        'Suggested_State',
        'Suggested_Country',
        'Current_Input',
        'Current_Output',
        'Final_Input',
        'Final_Output',
        'Decision_Warning',
        'Review_Row_ID',
        'Priority',
        'Source_Sheet',
        'Key_Update_Side',
        'Is_Stale_Key',
        'Missing_In',
        'Similarity',
        ...mappingColumns,
        'Recommended_Action',
        'Publish_Eligible',
        'Approval_Source',
        'Has_Update'
        // De-duplicate to guard against rare source-column name collisions.
    ].filter((v, i, arr) => arr.indexOf(v) === i);
    const reviewColumnWidths = {
        Decision: 20,
        Error_Type: 20,
        Error_Subtype: 20,
        translate_input: 24,
        translate_output: 24,
        Suggested_Key: 22,
        Suggested_School: 28,
        Suggested_City: 18,
        Suggested_State: 14,
        Suggested_Country: 14,
        Current_Input: 24,
        Current_Output: 24,
        Final_Input: 24,
        Final_Output: 24,
        Decision_Warning: 36
    };
    const hiddenReviewColumns = new Set([
        'Review_Row_ID',
        'Priority',
        'Source_Sheet',
        'Key_Update_Side',
        'Is_Stale_Key',
        'Missing_In',
        'Similarity',
        'Recommended_Action',
        'Current_Input',
        'Current_Output',
        'Publish_Eligible',
        'Approval_Source',
        'Has_Update'
    ]);
    const reviewColumnLayoutByKey = {};
    reviewWorkbenchColumns.forEach(col => {
        reviewColumnLayoutByKey[col] = {
            width: reviewColumnWidths[col] || 22,
            hidden: hiddenReviewColumns.has(col)
        };
    });
    const reviewWorkbenchHeaders = buildHeaders(reviewWorkbenchColumns, keyLabels).map((h, i) => {
        const col = reviewWorkbenchColumns[i];
        if (col === 'Review_Row_ID') return 'Review Row ID';
        if (col === 'Recommended_Action') return 'Recommended Action';
        if (col === 'Source_Sheet') return 'Source Sheet';
        if (col === 'Key_Update_Side') return 'Update Side';
        if (col === 'Is_Stale_Key') return 'Stale Key (1=yes)';
        if (col === 'Current_Input') return 'Current Translate Input';
        if (col === 'Current_Output') return 'Current Translate Output';
        if (col === 'Final_Input') return 'Final Translate Input';
        if (col === 'Final_Output') return 'Final Translate Output';
        if (col === 'Publish_Eligible') return 'Publish Eligible (1=yes)';
        if (col === 'Approval_Source') return 'Approval Source';
        if (col === 'Has_Update') return 'Has Update (1=yes)';
        if (col === 'Decision_Warning') return 'Decision Warning';
        if (col === 'Decision') return 'Decision';
        if (col === reviewOutcomesNameContextKey) return 'Outcomes Name';
        if (col === reviewOutcomesKeyContextKey) return 'Outcomes Key';
        if (outcomesStateKey && col === outcomesStateKey) return 'Outcomes State';
        if (outcomesCountryKey && col === outcomesCountryKey) return 'Outcomes Country';
        if (col === reviewWsuNameContextKey) return 'myWSU Name';
        if (col === reviewWsuKeyContextKey) return 'myWSU Key';
        if (wsuCityKey && col === wsuCityKey) return 'myWSU City';
        if (wsuStateKey && col === wsuStateKey) return 'myWSU State';
        if (wsuCountryKey && col === wsuCountryKey) return 'myWSU Country';
        if (col === 'Suggested_Key') return 'Suggested Key';
        if (col === 'Suggested_School') return 'Suggested School';
        if (col === 'Suggested_City') return 'Suggested City';
        if (col === 'Suggested_State') return 'Suggested State';
        if (col === 'Suggested_Country') return 'Suggested Country';
        return h || col;
    });
    addSheetWithRows(workbook, {
        sheetName: 'Review_Workbench',
        outputColumns: reviewWorkbenchColumns,
        rows: actionQueueRows,
        style: baseStyle,
        headers: reviewWorkbenchHeaders,
        rowBorderByError: null,
        columnLayoutByKey: reviewColumnLayoutByKey
    });
    const reviewSheet = workbook.getWorksheet('Review_Workbench');
    const reviewColIndex = {};
    reviewWorkbenchColumns.forEach((col, idx) => {
        reviewColIndex[col] = idx + 1;
    });
    const reviewColLetter = {};
    Object.keys(reviewColIndex).forEach(key => {
        reviewColLetter[key] = columnIndexToLetter(reviewColIndex[key]);
    });
    const decisionListFormula = '"Keep As-Is,Use Suggestion,Allow One-to-Many,Ignore"';
    if (reviewSheet && actionQueueRows.length > 0) {
        const rowEnd = actionQueueRows.length + 1;
        reviewSheet.dataValidations.add(
            `${reviewColLetter.Decision}2:${reviewColLetter.Decision}${rowEnd}`,
            {
                type: 'list',
                allowBlank: true,
                formulae: [decisionListFormula]
            }
        );
        for (let rowNum = 2; rowNum <= rowEnd; rowNum += 1) {
            reviewSheet.getCell(`${reviewColLetter.Final_Input}${rowNum}`).value = {
                formula: `IF(OR($${reviewColLetter.Decision}${rowNum}="Keep As-Is",$${reviewColLetter.Decision}${rowNum}="Allow One-to-Many"),$${reviewColLetter.Current_Input}${rowNum},IF($${reviewColLetter.Decision}${rowNum}="Use Suggestion",IF(OR($${reviewColLetter.Key_Update_Side}${rowNum}="Input",$${reviewColLetter.Key_Update_Side}${rowNum}="Both"),$${reviewColLetter.Suggested_Key}${rowNum},$${reviewColLetter.Current_Input}${rowNum}),""))`
            };
            reviewSheet.getCell(`${reviewColLetter.Final_Output}${rowNum}`).value = {
                formula: `IF(OR($${reviewColLetter.Decision}${rowNum}="Keep As-Is",$${reviewColLetter.Decision}${rowNum}="Allow One-to-Many"),$${reviewColLetter.Current_Output}${rowNum},IF($${reviewColLetter.Decision}${rowNum}="Use Suggestion",IF(OR($${reviewColLetter.Key_Update_Side}${rowNum}="Output",$${reviewColLetter.Key_Update_Side}${rowNum}="Both"),$${reviewColLetter.Suggested_Key}${rowNum},$${reviewColLetter.Current_Output}${rowNum}),""))`
            };
            reviewSheet.getCell(`${reviewColLetter.Publish_Eligible}${rowNum}`).value = {
                formula: `IF(AND(OR($${reviewColLetter.Decision}${rowNum}="Keep As-Is",$${reviewColLetter.Decision}${rowNum}="Use Suggestion",$${reviewColLetter.Decision}${rowNum}="Allow One-to-Many"),$${reviewColLetter.Final_Input}${rowNum}<>"",$${reviewColLetter.Final_Output}${rowNum}<>""),1,0)`
            };
            reviewSheet.getCell(`${reviewColLetter.Approval_Source}${rowNum}`).value = {
                formula: `IF($${reviewColLetter.Publish_Eligible}${rowNum}=1,"Review Decision","")`
            };
            reviewSheet.getCell(`${reviewColLetter.Has_Update}${rowNum}`).value = {
                formula: `IF(OR($${reviewColLetter.Current_Input}${rowNum}<>$${reviewColLetter.Final_Input}${rowNum},$${reviewColLetter.Current_Output}${rowNum}<>$${reviewColLetter.Final_Output}${rowNum}),1,0)`
            };
            reviewSheet.getCell(`${reviewColLetter.Decision_Warning}${rowNum}`).value = {
                formula: `IF(AND($${reviewColLetter.Decision}${rowNum}="Use Suggestion",$${reviewColLetter.Suggested_Key}${rowNum}=""),"Use Suggestion needs Suggested_Key",IF(AND($${reviewColLetter.Decision}${rowNum}="Use Suggestion",$${reviewColLetter.Key_Update_Side}${rowNum}="None"),"Use Suggestion needs valid Update Side",IF(AND(OR($${reviewColLetter.Decision}${rowNum}="Keep As-Is",$${reviewColLetter.Decision}${rowNum}="Use Suggestion",$${reviewColLetter.Decision}${rowNum}="Allow One-to-Many"),OR($${reviewColLetter.Final_Input}${rowNum}="",$${reviewColLetter.Final_Output}${rowNum}="")),"Approved but blank final","")))`
            };
        }
        const editableCols = ['Decision'];
        editableCols.forEach(col => {
            const letter = reviewColLetter[col];
            if (!letter) return;
            for (let rowNum = 2; rowNum <= rowEnd; rowNum += 1) {
                reviewSheet.getCell(`${letter}${rowNum}`).protection = { locked: false };
            }
        });
        try {
            await reviewSheet.protect('', {
                selectLockedCells: true,
                selectUnlockedCells: true
            });
        } catch (error) {
            // Protection is best-effort; continue export if the runtime lacks support.
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                console.warn('Review_Workbench protection skipped:', error?.message || String(error));
            }
        }
        const decCol = reviewColLetter.Decision;
        const decRef = `${decCol}2:${decCol}${rowEnd}`;
        const fullDataRef = `A2:${columnIndexToLetter(reviewWorkbenchColumns.length)}${rowEnd}`;
        const warningCol = reviewColLetter.Decision_Warning;
        const staleCol = reviewColLetter.Is_Stale_Key;
        const sourceCol = reviewColLetter.Source_Sheet;
        try {
            reviewSheet.addConditionalFormatting({
                ref: decRef,
                rules: [
                    { type: 'containsText', operator: 'containsText', text: 'Keep As-Is', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } } } },
                    { type: 'containsText', operator: 'containsText', text: 'Use Suggestion', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } } } },
                    { type: 'containsText', operator: 'containsText', text: 'Allow One-to-Many', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } } } },
                    { type: 'containsText', operator: 'containsText', text: 'Ignore', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } } } }
                ]
            });
            const cfDec = reviewColLetter.Decision;
            const cfStale = reviewColLetter.Is_Stale_Key;
            const cfSource = reviewColLetter.Source_Sheet;
            const ruleStale = {
                type: 'expression',
                formulae: ['AND($' + cfDec + '2="",$' + cfStale + '2=1)'],
                style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } } }
            };
            const ruleOneToMany = {
                type: 'expression',
                formulae: ['AND($' + cfDec + '2="",$' + cfSource + '2="One_to_Many")'],
                style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } } }
            };
            const ruleBlankDec = {
                type: 'expression',
                formulae: ['$' + cfDec + '2=""'],
                style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } } }
            };
            reviewSheet.addConditionalFormatting({
                ref: fullDataRef,
                rules: [ruleStale, ruleOneToMany, ruleBlankDec]
            });
            reviewSheet.addConditionalFormatting({
                ref: `${warningCol}2:${warningCol}${rowEnd}`,
                rules: [
                    { type: 'containsText', operator: 'containsText', text: 'Use Suggestion needs', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } } } },
                    { type: 'containsText', operator: 'containsText', text: 'valid Update Side', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } } } },
                    { type: 'containsText', operator: 'containsText', text: 'Approved but blank', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } } } }
                ]
            });
        } catch (cfError) {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                console.warn('Review_Workbench conditional formatting skipped:', cfError?.message || String(cfError));
            }
        }
    }

    // Keep reviewer navigation focused on the primary validate workflow tabs.
    const hideValidateSheet = (sheetName) => {
        const sheet = workbook.getWorksheet(sheetName);
        if (sheet) {
            sheet.state = 'hidden';
        }
    };
    [
        'Errors_in_Translate',
        'Output_Not_Found_Ambiguous',
        'Output_Not_Found_No_Replacement',
        'One_to_Many',
        'Missing_Mappings',
        'High_Confidence_Matches',
        'Valid_Mappings'
    ].forEach(hideValidateSheet);

    reportProgress('Building Approved_Mappings...', 84);
    const buildAutoApprovedRow = (row, sourceSheet, sourceType) => {
        const outcomesKeyValue = keyLabels.outcomes ? row[`outcomes_${keyLabels.outcomes}`] : '';
        const wsuKeyValue = keyLabels.wsu ? row[`wsu_${keyLabels.wsu}`] : '';
        return {
            Review_Row_ID: [
                'auto',
                sanitizeIdPart(sourceType),
                sanitizeIdPart(row.translate_input || ''),
                sanitizeIdPart(row.translate_output || ''),
                sanitizeIdPart(outcomesKeyValue || ''),
                sanitizeIdPart(wsuKeyValue || '')
            ].join('|'),
            Source_Sheet: sourceSheet,
            Error_Type: sourceType,
            ...Object.fromEntries(outcomesColumns.map(col => [col, row[col] ?? ''])),
            translate_input: row.translate_input ?? '',
            translate_output: row.translate_output ?? '',
            ...Object.fromEntries(wsuColumns.map(col => [col, row[col] ?? ''])),
            Suggested_Key: row.Suggested_Key ?? '',
            Suggested_School: row.Suggested_School ?? '',
            Suggested_City: row.Suggested_City ?? '',
            Suggested_State: row.Suggested_State ?? '',
            Suggested_Country: row.Suggested_Country ?? '',
            Suggestion_Score: row.Suggestion_Score ?? '',
            Current_Input: row.translate_input ?? '',
            Current_Output: row.translate_output ?? '',
            Decision: 'Auto Approve',
            Owner: '',
            Status: 'Auto',
            Resolution_Note: sourceType === 'High_Confidence_Match'
                ? 'Auto-approved high-confidence mapping'
                : 'Auto-approved valid mapping',
            Resolved_Date: '',
            Reviewer: '',
            Review_Date: '',
            Reason_Code: 'AUTO',
            Notes: '',
            Final_Input: row.translate_input ?? '',
            Final_Output: row.translate_output ?? '',
            Publish_Eligible: 1,
            Approval_Source: sourceType === 'High_Confidence_Match' ? 'High_Confidence_Matches' : 'Valid_Mappings',
            Has_Update: 0
        };
    };
    const autoApprovedRows = [
        ...validDataRows.map(row => buildAutoApprovedRow(row, 'Valid_Mappings', 'Valid')),
        ...highConfidenceDataRows.map(row => buildAutoApprovedRow(row, 'High_Confidence_Matches', 'High_Confidence_Match'))
    ];
    const approvedColumns = [
        'Review_Row_ID',
        'Approval_Source',
        'Source_Sheet',
        'Error_Type',
        ...outcomesColumns,
        'translate_input',
        'translate_output',
        ...wsuColumns,
        ...mappingColumns,
        ...reviewSuggestionColumns,
        'Current_Input',
        'Current_Output',
        'Decision',
        'Owner',
        'Status',
        'Resolution_Note',
        'Resolved_Date',
        'Reviewer',
        'Review_Date',
        'Reason_Code',
        'Notes',
        'Final_Input',
        'Final_Output',
        'Publish_Eligible',
        'Has_Update'
    ].filter((v, i, arr) => arr.indexOf(v) === i);
    const approvedRows = [...autoApprovedRows];
    const reviewRowCount = actionQueueRows.length;
    const cappedReviewFormulaRows = Math.min(reviewRowCount, MAX_VALIDATE_DYNAMIC_REVIEW_FORMULA_ROWS);
    const reviewLastRow = Math.max(2, reviewRowCount + 1);
    const reviewPublishCellRef = (rowNum) => `Review_Workbench!$${reviewColLetter.Publish_Eligible}$${rowNum}`;
    const reviewApprovedValue = (key, rowNum) => {
        const letter = reviewColLetter[key];
        if (!letter) return '""';
        return `IF(${reviewPublishCellRef(rowNum)}=1,Review_Workbench!$${letter}$${rowNum},"")`;
    };
    for (let outputIndex = 1; outputIndex <= cappedReviewFormulaRows; outputIndex += 1) {
        const reviewRowNum = outputIndex + 1;
        const formulaRow = {};
        approvedColumns.forEach(col => {
            if (col === 'Approval_Source') {
                formulaRow[col] = { formula: `IF(${reviewPublishCellRef(reviewRowNum)}=1,"Review Decision","")` };
                return;
            }
            if (reviewColLetter[col]) {
                formulaRow[col] = { formula: reviewApprovedValue(col, reviewRowNum) };
                return;
            }
            formulaRow[col] = '';
        });
        approvedRows.push(formulaRow);
    }
    const approvedHeaders = buildHeaders(approvedColumns, keyLabels).map((h, i) => {
        const col = approvedColumns[i];
        if (col === 'Review_Row_ID') return 'Review Row ID';
        if (col === 'Approval_Source') return 'Approval Source';
        if (col === 'Source_Sheet') return 'Source Sheet';
        if (col === 'Current_Input') return 'Current Translate Input';
        if (col === 'Current_Output') return 'Current Translate Output';
        if (col === 'Final_Input') return 'Final Translate Input';
        if (col === 'Final_Output') return 'Final Translate Output';
        if (col === 'Publish_Eligible') return 'Publish Eligible (1=yes)';
        if (col === 'Has_Update') return 'Has Update (1=yes)';
        if (col === 'Resolution_Note') return 'Resolution Note';
        if (col === 'Resolved_Date') return 'Resolved Date';
        if (col === 'Review_Date') return 'Review Date';
        if (col === 'Reason_Code') return 'Reason Code';
        return h || col;
    });
    addSheetWithRows(workbook, {
        sheetName: 'Approved_Mappings',
        outputColumns: approvedColumns,
        rows: approvedRows,
        style: baseStyle,
        headers: approvedHeaders,
        rowBorderByError: null
    });
    const approvedSheet = workbook.getWorksheet('Approved_Mappings');
    if (approvedSheet) {
        // Internal staging sheet; keep workbook navigation focused on reviewer tabs.
        approvedSheet.state = 'hidden';
    }

    reportProgress('Building Final_Translation_Table...', 87);
    const finalSheet = workbook.addWorksheet('Final_Translation_Table');
    const outcomesKeyContextKey = keyLabels.outcomes ? `outcomes_${keyLabels.outcomes}` : 'outcomes_key';
    const finalOutcomesNameCandidates = [
        nameCompareConfig.outcomes ? `outcomes_${nameCompareConfig.outcomes}` : '',
        ...outcomesColumns
    ].filter(Boolean);
    const outcomesNameContextKey = finalOutcomesNameCandidates.find(key => key !== outcomesKeyContextKey) || finalOutcomesNameCandidates[0] || 'outcomes_name';
    const wsuKeyContextKey = keyLabels.wsu ? `wsu_${keyLabels.wsu}` : 'wsu_key';
    const finalWsuNameCandidates = [
        nameCompareConfig.wsu ? `wsu_${nameCompareConfig.wsu}` : '',
        ...wsuColumns
    ].filter(Boolean);
    const wsuNameContextKey = finalWsuNameCandidates.find(key => key !== wsuKeyContextKey) || finalWsuNameCandidates[0] || 'wsu_name';
    const finalOutcomesCols = outcomesColumns
        .filter(k => k && k !== outcomesKeyContextKey)
        .map(k => ({ key: k, header: buildHeaders([k], keyLabels)[0] || k }));
    const finalWsuCols = wsuColumns
        .filter(k => k && k !== wsuKeyContextKey)
        .map(k => ({ key: k, header: buildHeaders([k], keyLabels)[0] || k }));
    const finalColumns = [
        { key: 'Review_Row_ID', header: 'Review Row ID' },
        { key: 'Decision', header: 'Decision' },
        ...finalOutcomesCols,
        { key: 'translate_input', header: 'Translate Input' },
        { key: 'translate_output', header: 'Translate Output' },
        ...finalWsuCols
    ].filter(Boolean);
    const finalColIndex = {};
    finalColumns.forEach((col, idx) => {
        finalColIndex[col.key] = idx + 1;
    });
    const finalColLetter = {};
    Object.keys(finalColIndex).forEach(key => {
        finalColLetter[key] = columnIndexToLetter(finalColIndex[key]);
    });
    const mapFinalSourceKey = (finalKey) => (
        finalKey === 'translate_input'
            ? 'Final_Input'
            : finalKey === 'translate_output'
                ? 'Final_Output'
                : finalKey
    );
    const getFinalValueFromRow = (row, finalKey) => {
        const sourceKey = mapFinalSourceKey(finalKey);
        if (Object.prototype.hasOwnProperty.call(row, sourceKey)) return row[sourceKey] ?? '';
        if (Object.prototype.hasOwnProperty.call(row, finalKey)) return row[finalKey] ?? '';
        return '';
    };
    const buildFinalAutoRow = (row) => finalColumns.map(col => sanitizeCellValue(getFinalValueFromRow(row, col.key)));
    const reviewPublishedCell = (rowNum) => `${reviewPublishCellRef(rowNum)}=1`;
    const reviewFinalValueFormula = (sourceKey, rowNum) => {
        const letter = reviewColLetter[sourceKey];
        if (!letter) return '';
        return { formula: `IF(${reviewPublishedCell(rowNum)},Review_Workbench!$${letter}$${rowNum},"")` };
    };
    const reviewFinalValueFormulaWithSuggestionFallback = (sourceKey, suggestionKey, suggestionWhenSide, rowNum) => {
        const letter = reviewColLetter[sourceKey];
        const sugLetter = reviewColLetter[suggestionKey];
        const decLetter = reviewColLetter.Decision;
        const sideLetter = reviewColLetter.Key_Update_Side;
        if (!letter) return '';
        const valueExpr = (decLetter && sideLetter && sugLetter)
            ? `IF(AND(Review_Workbench!$${decLetter}$${rowNum}="Use Suggestion",OR(Review_Workbench!$${sideLetter}$${rowNum}="${suggestionWhenSide}",Review_Workbench!$${sideLetter}$${rowNum}="Both")),Review_Workbench!$${sugLetter}$${rowNum},Review_Workbench!$${letter}$${rowNum})`
            : `Review_Workbench!$${letter}$${rowNum}`;
        return { formula: `IF(${reviewPublishedCell(rowNum)},${valueExpr},"")` };
    };
    const roleToSuggestion = { School: 'Suggested_School', City: 'Suggested_City', State: 'Suggested_State', Country: 'Suggested_Country' };
    const buildContextFallbacksForCols = (cols, rolesKey, prefix, side) => {
        const fallbacks = {};
        const roles = columnRoles[rolesKey] || {};
        cols.forEach(col => {
            const baseCol = col.key.replace(new RegExp(`^${prefix}_`), '');
            const role = roles[baseCol];
            const sugKey = role && roleToSuggestion[role];
            if (sugKey) fallbacks[col.key] = [sugKey, side];
        });
        return fallbacks;
    };
    const outcomesContextFallbacks = buildContextFallbacksForCols(finalOutcomesCols, 'outcomes', 'outcomes', 'Input');
    const wsuContextFallbacks = buildContextFallbacksForCols(finalWsuCols, 'wsu_org', 'wsu', 'Output');
    if (outcomesNameContextKey && !outcomesContextFallbacks[outcomesNameContextKey]) {
        outcomesContextFallbacks[outcomesNameContextKey] = ['Suggested_School', 'Input'];
    }
    if (wsuNameContextKey && !wsuContextFallbacks[wsuNameContextKey]) {
        wsuContextFallbacks[wsuNameContextKey] = ['Suggested_School', 'Output'];
    }
    const contextFallbacks = { ...outcomesContextFallbacks, ...wsuContextFallbacks };
    const finalFormulaRows = autoApprovedRows.length + cappedReviewFormulaRows;

    const stagingSheet = workbook.addWorksheet('Final_Staging');
    stagingSheet.state = 'hidden';
    stagingSheet.addRow(finalColumns.map(col => col.header));
    autoApprovedRows.forEach(row => stagingSheet.addRow(buildFinalAutoRow(row)));
    for (let reviewIndex = 1; reviewIndex <= cappedReviewFormulaRows; reviewIndex += 1) {
        const reviewRowNum = reviewIndex + 1;
        const rowValues = finalColumns.map(col => {
            const sourceColKey = mapFinalSourceKey(col.key);
            const fallback = contextFallbacks[col.key];
            if (fallback) {
                return reviewFinalValueFormulaWithSuggestionFallback(sourceColKey, fallback[0], fallback[1], reviewRowNum);
            }
            return reviewFinalValueFormula(sourceColKey, reviewRowNum);
        });
        stagingSheet.addRow(rowValues);
    }

    finalSheet.addRow(finalColumns.map(col => col.header));
    finalSheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B7285' } };
    });
    const qaCap = 10000;
    const stagingLastRow = Math.max(2, finalFormulaRows + 1);
    const refLastRow = Math.max(qaCap, stagingLastRow);
    const stagingLastCol = columnIndexToLetter(finalColumns.length);
    const filterCol = finalColLetter.translate_input;
    const filterFormula = `_xlfn._xlws.FILTER(Final_Staging!A2:${stagingLastCol}${stagingLastRow},Final_Staging!$${filterCol}$2:$${filterCol}$${stagingLastRow}<>"","")`;
    finalSheet.getCell('A2').value = {
        formula: filterFormula,
        shareType: 'array',
        ref: `A2:${stagingLastCol}${refLastRow}`
    };

    const finalColumnWidths = {
        translate_input: 24,
        translate_output: 24,
        Review_Row_ID: 56,
        Decision: 22
    };
    sourceContextKeys.forEach(k => { finalColumnWidths[k] = 18; });
    finalSheet.columns = finalColumns.map(col => ({
        width: finalColumnWidths[col.key] || 22,
        hidden: col.key === 'Decision'
    }));
    finalSheet.autoFilter = {
        from: 'A1',
        to: `${stagingLastCol}${refLastRow}`
    };

    reportProgress('Building Translation_Key_Updates...', 89);
    const updatesSheet = workbook.addWorksheet('Translation_Key_Updates');
    const updatesColumns = [
        { key: 'Review_Row_ID', header: 'Review Row ID' },
        { key: 'Current_Input', header: 'Current Translate Input' },
        { key: 'Current_Output', header: 'Current Translate Output' },
        { key: 'Final_Input', header: 'Final Translate Input' },
        { key: 'Final_Output', header: 'Final Translate Output' },
        { key: 'Decision', header: 'Decision' },
        { key: 'Source_Sheet', header: 'Source Sheet' },
        { key: 'Owner', header: 'Owner' },
        { key: 'Resolution_Note', header: 'Resolution Note' }
    ];
    updatesSheet.addRow(updatesColumns.map(col => col.header));
    updatesSheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C2D12' } };
    });
    const updateSourceValueFormula = (sourceKey, rowNum, includeExpr) => {
        const letter = reviewColLetter[sourceKey];
        if (!letter) return '';
        return { formula: `IF(${includeExpr},Review_Workbench!$${letter}$${rowNum},"")` };
    };
    // Has_Update is reviewer-driven; auto-approved rows are intentionally excluded (always 0).
    const updateFormulaRows = Math.max(1, cappedReviewFormulaRows);
    for (let outputIndex = 1; outputIndex <= updateFormulaRows; outputIndex += 1) {
        const rowNum = outputIndex + 1;
        const includeExpr = `AND(${reviewPublishedCell(rowNum)},Review_Workbench!$${reviewColLetter.Has_Update}$${rowNum}=1)`;
        updatesSheet.addRow([
            updateSourceValueFormula('Review_Row_ID', rowNum, includeExpr),
            updateSourceValueFormula('Current_Input', rowNum, includeExpr),
            updateSourceValueFormula('Current_Output', rowNum, includeExpr),
            updateSourceValueFormula('Final_Input', rowNum, includeExpr),
            updateSourceValueFormula('Final_Output', rowNum, includeExpr),
            updateSourceValueFormula('Decision', rowNum, includeExpr),
            updateSourceValueFormula('Source_Sheet', rowNum, includeExpr),
            updateSourceValueFormula('Owner', rowNum, includeExpr),
            updateSourceValueFormula('Resolution_Note', rowNum, includeExpr)
        ]);
    }
    updatesSheet.columns = [
        { width: 56 },
        { width: 24 },
        { width: 24 },
        { width: 24 },
        { width: 24 },
        { width: 22 },
        { width: 22 },
        { width: 18 },
        { width: 46 }
    ];

    reportProgress('Building QA_Checks_Validate...', 91);
    const qaValidateSheet = workbook.addWorksheet('QA_Checks_Validate');
    const decisionRange = `Review_Workbench!$${reviewColLetter.Decision}$2:$${reviewColLetter.Decision}$${reviewLastRow}`;
    const reviewPublishRangeRef = `Review_Workbench!$${reviewColLetter.Publish_Eligible}$2:$${reviewColLetter.Publish_Eligible}$${reviewLastRow}`;
    const reviewFinalInputRange = `Review_Workbench!$${reviewColLetter.Final_Input}$2:$${reviewColLetter.Final_Input}$${reviewLastRow}`;
    const reviewFinalOutputRange = `Review_Workbench!$${reviewColLetter.Final_Output}$2:$${reviewColLetter.Final_Output}$${reviewLastRow}`;
    const reviewStaleRange = `Review_Workbench!$${reviewColLetter.Is_Stale_Key}$2:$${reviewColLetter.Is_Stale_Key}$${reviewLastRow}`;
    const reviewSourceRange = `Review_Workbench!$${reviewColLetter.Source_Sheet}$2:$${reviewColLetter.Source_Sheet}$${reviewLastRow}`;
    const reviewSuggestedKeyRange = `Review_Workbench!$${reviewColLetter.Suggested_Key}$2:$${reviewColLetter.Suggested_Key}$${reviewLastRow}`;
    const reviewKeyUpdateSideRange = `Review_Workbench!$${reviewColLetter.Key_Update_Side}$2:$${reviewColLetter.Key_Update_Side}$${reviewLastRow}`;
    const finalLastRow = refLastRow;
    const finalInputRange = `Final_Translation_Table!$${finalColLetter.translate_input}$2:$${finalColLetter.translate_input}$${finalLastRow}`;
    const finalOutputRange = `Final_Translation_Table!$${finalColLetter.translate_output}$2:$${finalColLetter.translate_output}$${finalLastRow}`;
    const finalDecisionRange = `Final_Translation_Table!$${finalColLetter.Decision}$2:$${finalColLetter.Decision}$${finalLastRow}`;
    const getQAEmptyRows = (typeof ValidationExportHelpers !== 'undefined' && ValidationExportHelpers &&
        typeof ValidationExportHelpers.getQAValidateRowsForEmptyQueue === 'function')
        ? ValidationExportHelpers.getQAValidateRowsForEmptyQueue
        : () => [
            ['Check', 'Count', 'Status', 'Detail'],
            ['Unresolved actions', 0, 'PASS', 'Rows without a decision'],
            ['Approved for update', 0, 'PASS', 'Keep As-Is or Use Suggestion decisions'],
            ['Stale-key rows lacking decision', 0, 'PASS', 'Likely stale key rows without decision'],
            ['Duplicate conflict rows lacking decision', 0, 'PASS', 'One-to-many rows without decision']
        ];
    const qaRows = actionQueueRows.length > 0
        ? [
            ['Check', 'Count', 'Status', 'Detail'],
            ['Unresolved actions', `=COUNTIF(${decisionRange},"")+COUNTIF(${decisionRange},"Ignore")`, '=IF(B2=0,"PASS","CHECK")', 'Blank or Ignore'],
            ['Approved review rows', `=COUNTIF(${decisionRange},"Keep As-Is")+COUNTIF(${decisionRange},"Use Suggestion")+COUNTIF(${decisionRange},"Allow One-to-Many")`, '=IF(B3>0,"PASS","CHECK")', 'Rows approved from Review_Workbench'],
            ['Approved rows beyond formula capacity', `=MAX(0,B3-${cappedReviewFormulaRows})`, '=IF(B4=0,"PASS","CHECK")', `Rows above ${cappedReviewFormulaRows} approved review decisions exceed formula row capacity`],
            ['Blank final keys on publish-eligible rows (sanity)', `=COUNTIFS(${reviewPublishRangeRef},1,${reviewFinalInputRange},"")+COUNTIFS(${reviewPublishRangeRef},1,${reviewFinalOutputRange},"")`, '=IF(B5=0,"PASS","FAIL")', 'Sanity check: publish-eligible rows should already enforce non-blank finals'],
            ['Use Suggestion without Suggested_Key', `=COUNTIFS(${decisionRange},"Use Suggestion",${reviewSuggestedKeyRange},"")`, '=IF(B6=0,"PASS","FAIL")', 'Use Suggestion chosen but Suggested_Key blank; fix or change decision'],
            ['Use Suggestion with invalid Update Side', `=COUNTIFS(${decisionRange},"Use Suggestion",${reviewKeyUpdateSideRange},"None")`, '=IF(B7=0,"PASS","FAIL")', 'Use Suggestion chosen but Update Side is None; fix or change decision'],
            ['Stale-key rows lacking decision', `=COUNTIFS(${reviewStaleRange},1,${decisionRange},"")`, '=IF(B8=0,"PASS","CHECK")', 'Likely stale key rows without decision (advisory)'],
            ['One-to-many rows lacking decision', `=COUNTIFS(${reviewSourceRange},"One_to_Many",${decisionRange},"")`, '=IF(B9=0,"PASS","CHECK")', 'One-to-many rows without decision (advisory)'],
            ['Duplicate final input keys (excluding Allow One-to-Many)', `=SUMPRODUCT((${finalInputRange}<>"")*(${finalDecisionRange}<>"Allow One-to-Many")*(COUNTIFS(${finalInputRange},${finalInputRange},${finalDecisionRange},"<>Allow One-to-Many")>1))/2`, '=IF(B10=0,"PASS","CHECK")', 'Duplicates in Final_Translation_Table input keys excluding approved one-to-many rows'],
            ['Duplicate final output keys (excluding Allow One-to-Many)', `=SUMPRODUCT((${finalOutputRange}<>"")*(${finalDecisionRange}<>"Allow One-to-Many")*(COUNTIFS(${finalOutputRange},${finalOutputRange},${finalDecisionRange},"<>Allow One-to-Many")>1))/2`, '=IF(B11=0,"PASS","CHECK")', 'Duplicates in Final_Translation_Table output keys excluding approved one-to-many rows'],
            ['Publish gate', `=IF(AND(B2=0,B4=0,B5=0,B6=0,B7=0,B10=0,B11=0),"PASS","HOLD")`, '', 'Final publish gate status (B8/B9 are advisory). Diagnostic tabs are hidden; right-click tab bar and choose Unhide if needed.']
        ]
        : getQAEmptyRows();
    qaRows.forEach(row => qaValidateSheet.addRow(row));
    qaValidateSheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    });
    qaValidateSheet.columns = [{ width: 42 }, { width: 26 }, { width: 14 }, { width: 70 }];
    if (canSuggestNames && typeof console !== 'undefined' && typeof console.log === 'function') {
        const forwardFallbackRate = suggestionBlockStats.forwardQueries > 0
            ? suggestionBlockStats.forwardFallbacks / suggestionBlockStats.forwardQueries
            : 0;
        const reverseFallbackRate = suggestionBlockStats.reverseQueries > 0
            ? suggestionBlockStats.reverseFallbacks / suggestionBlockStats.reverseQueries
            : 0;
        console.log(
            'Suggestion blocking stats:',
            JSON.stringify({
                forwardQueries: suggestionBlockStats.forwardQueries,
                reverseQueries: suggestionBlockStats.reverseQueries,
                forwardFallbacks: suggestionBlockStats.forwardFallbacks,
                reverseFallbacks: suggestionBlockStats.reverseFallbacks,
                forwardFallbackRate: Number(forwardFallbackRate.toFixed(4)),
                reverseFallbackRate: Number(reverseFallbackRate.toFixed(4))
            })
        );
    }

    // Open workbook focused on Review_Workbench so it is the first visible reviewer tab.
    const workbookSheets = Array.isArray(workbook.worksheets)
        ? workbook.worksheets
        : (Array.isArray(workbook._worksheets) ? workbook._worksheets : []);
    const reviewSheetIndex = workbookSheets.findIndex(sheet => sheet && sheet.name === 'Review_Workbench');
    if (reviewSheetIndex >= 0) {
        workbook.views = [{ activeTab: reviewSheetIndex, firstSheet: reviewSheetIndex }];
    }

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
        let msg = error?.message || String(error);
        if (msg.includes("reading '0'")) {
            msg += ' (cell values may contain objects; try exporting with fewer columns or check source data)';
        }
        self.postMessage({
            type: 'error',
            message: msg,
            stack: error?.stack || ''
        });
    }
};
