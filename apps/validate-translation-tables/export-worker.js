/* global normalizeKeyValue, calculateNameSimilarity, similarityRatio */
importScripts('validation.js');
importScripts('https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js');

const EXPORT_TOTAL = 100;
const EXPORT_OUTPUT_NOT_FOUND_SUBTYPE = {
    LIKELY_STALE_KEY: 'Output_Not_Found_Likely_Stale_Key',
    AMBIGUOUS_REPLACEMENT: 'Output_Not_Found_Ambiguous_Replacement',
    NO_REPLACEMENT: 'Output_Not_Found_No_Replacement'
};

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
    const { cleanRows, errorRows, selectedCols } = payload;
    const workbook = new ExcelJS.Workbook();

    reportProgress('Building clean sheet...', 15);
    const cleanSheet = workbook.addWorksheet('Clean_Translation_Table');
    const cleanHeaders = [];
    selectedCols.outcomes.forEach(col => cleanHeaders.push(`Outcomes: ${col}`));
    selectedCols.wsu_org.forEach(col => cleanHeaders.push(`myWSU: ${col}`));
    cleanHeaders.push('Similarity %');
    cleanSheet.addRow(cleanHeaders);
    cleanSheet.getRow(1).eachCell((cell, colNumber) => {
        const header = cleanHeaders[colNumber - 1] || '';
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        if (header.startsWith('Outcomes:')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
        } else if (header.startsWith('myWSU:')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } };
        } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
        }
    });
    cleanRows.forEach(row => {
        const rowData = [];
        selectedCols.outcomes.forEach(col => rowData.push(row[`outcomes_${col}`] ?? ''));
        selectedCols.wsu_org.forEach(col => rowData.push(row[`wsu_${col}`] ?? ''));
        rowData.push(row.match_similarity ?? '');
        cleanSheet.addRow(rowData);
    });
    cleanSheet.views = [{ state: 'frozen', ySplit: 1 }];
    cleanSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: cleanHeaders.length }
    };
    cleanSheet.columns.forEach((column, idx) => {
        let maxLength = String(cleanHeaders[idx] || '').length;
        cleanRows.forEach(row => {
            let value = '';
            if (idx < selectedCols.outcomes.length) {
                value = row[`outcomes_${selectedCols.outcomes[idx]}`] ?? '';
            } else if (idx < selectedCols.outcomes.length + selectedCols.wsu_org.length) {
                const wsuIdx = idx - selectedCols.outcomes.length;
                value = row[`wsu_${selectedCols.wsu_org[wsuIdx]}`] ?? '';
            } else {
                value = row.match_similarity ?? '';
            }
            const length = String(value || '').length;
            if (length > maxLength) maxLength = length;
        });
        column.width = Math.min(maxLength + 2, 70);
    });

    reportProgress('Building error sheet...', 55);
    const errorSheet = workbook.addWorksheet('Generation_Errors');
    const errorHeaders = ['Normalized Key', 'Missing In'];
    selectedCols.outcomes.forEach(col => errorHeaders.push(`Outcomes: ${col}`));
    selectedCols.wsu_org.forEach(col => errorHeaders.push(`myWSU: ${col}`));
    errorSheet.addRow(errorHeaders);
    errorSheet.getRow(1).eachCell((cell, colNumber) => {
        const header = errorHeaders[colNumber - 1] || '';
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        if (header.startsWith('Outcomes:')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
        } else if (header.startsWith('myWSU:')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } };
        } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
        }
    });
    errorRows.forEach(row => {
        const rowData = [row.normalized_key, row.missing_in];
        selectedCols.outcomes.forEach(col => rowData.push(row[`outcomes_${col}`] ?? ''));
        selectedCols.wsu_org.forEach(col => rowData.push(row[`wsu_${col}`] ?? ''));
        errorSheet.addRow(rowData);
    });
    errorSheet.views = [{ state: 'frozen', ySplit: 1 }];
    errorSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: errorHeaders.length } };
    errorSheet.columns.forEach((column, idx) => {
        let maxLength = String(errorHeaders[idx] || '').length;
        errorRows.forEach(row => {
            let value = '';
            if (idx === 0) value = row.normalized_key || '';
            else if (idx === 1) value = row.missing_in || '';
            else if (idx <= 1 + selectedCols.outcomes.length) {
                const outIdx = idx - 2;
                value = row[`outcomes_${selectedCols.outcomes[outIdx]}`] ?? '';
            } else {
                const wsuIdx = idx - 2 - selectedCols.outcomes.length;
                value = row[`wsu_${selectedCols.wsu_org[wsuIdx]}`] ?? '';
            }
            const length = String(value || '').length;
            if (length > maxLength) maxLength = length;
        });
        column.width = Math.min(maxLength + 2, 70);
    });

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
        return columns.find(col => String(col).toLowerCase().includes(roleLower)) || '';
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
                candidates.push({ row: candidate.row, key: candidate.key, score });
            }
        });
        if (!candidates.length) return null;
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0];
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
                rowData.Suggestion_Score = formatSuggestionScore(suggestion.score);
            }
        } else if (errorType === 'Output_Not_Found') {
            if (
                row.Error_Subtype === EXPORT_OUTPUT_NOT_FOUND_SUBTYPE.LIKELY_STALE_KEY &&
                hasPresetSuggestion
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
                rowData.Suggestion_Score = formatSuggestionScore(suggestion.score);
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
        'Input does not exist in Outcomes': 'FFEF4444',
        'Output does not exist in myWSU': 'FFEF4444'
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
