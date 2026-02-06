/* global mergeData, validateMappings, detectMissingMappings, generateSummaryStats, normalizeKeyValue, calculateNameSimilarity */
importScripts('validation.js');

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

function generateTranslationTableWorker(outcomes, wsuOrg, keyConfig, nameCompare, options, selectedColumns, keyLabels) {
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

        outcomes.forEach(outcomesRow => {
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

            if (wsuRow) {
                const rowData = {};
                selectedColumns.outcomes.forEach(col => {
                    rowData[`outcomes_${col}`] = outcomesRow[col] ?? '';
                });
                selectedColumns.wsu_org.forEach(col => {
                    rowData[`wsu_${col}`] = wsuRow[col] ?? '';
                });
                cleanRows.push(rowData);
            } else {
                const errorRow = {
                    normalized_key: outcomesRow[outcomesNameField] ?? '',
                    missing_in: 'myWSU'
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
            const errorRow = {
                normalized_key: wsuRow[wsuNameField] ?? '',
                missing_in: 'Outcomes'
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

            if (outcomesRow) usedOutcomes.add(key);
            if (wsuRow) usedWsu.add(key);

            if (!outcomesRow && wsuRow && canNameMatch) {
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
                }
            }
            if (outcomesRow && !wsuRow && canNameMatch) {
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
                }
            }

            if (outcomesRow && wsuRow) {
                const rowData = {};
                selectedColumns.outcomes.forEach(col => {
                    rowData[`outcomes_${col}`] = outcomesRow[col] ?? '';
                });
                selectedColumns.wsu_org.forEach(col => {
                    rowData[`wsu_${col}`] = wsuRow[col] ?? '';
                });
                cleanRows.push(rowData);
            } else if (!outcomesRow || !wsuRow) {
                const errorRow = {
                    normalized_key: key,
                    missing_in: outcomesRow ? 'myWSU' : 'Outcomes'
                };
                selectedColumns.outcomes.forEach(col => {
                    errorRow[`outcomes_${col}`] = outcomesRow ? outcomesRow[col] ?? '' : '';
                });
                selectedColumns.wsu_org.forEach(col => {
                    errorRow[`wsu_${col}`] = wsuRow ? wsuRow[col] ?? '' : '';
                });
                errorRows.push(errorRow);
            }
        });

    return { cleanRows, errorRows, selectedColumns, headerLabels };
}

self.onmessage = (event) => {
    const { type, payload } = event.data || {};
    try {
        if (type === 'validate') {
            const { outcomes, translate, wsu_org, keyConfig, nameCompare } = payload;
            self.postMessage({ type: 'progress', stage: 'merge' });
            const merged = mergeData(outcomes, translate, wsu_org, keyConfig);
            self.postMessage({ type: 'progress', stage: 'validate' });
            const validatedData = validateMappings(
                merged,
                translate,
                outcomes,
                wsu_org,
                keyConfig,
                nameCompare
            );
            const missingData = detectMissingMappings(outcomes, translate, keyConfig);
            const stats = generateSummaryStats(validatedData, outcomes, translate, wsu_org);
            self.postMessage({
                type: 'result',
                result: { validatedData, missingData, stats }
            });
            return;
        }
        if (type === 'generate') {
            const result = generateTranslationTableWorker(
                payload.outcomes,
                payload.wsu_org,
                payload.keyConfig,
                payload.nameCompare,
                payload.options,
                payload.selectedColumns,
                payload.keyLabels
            );
            self.postMessage({ type: 'result', result });
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error?.message || String(error)
        });
    }
};
