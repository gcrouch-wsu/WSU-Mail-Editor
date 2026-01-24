let outcomesData = [];
let translateData = [];
let wsuOrgData = [];

async function loadFile(file, options = {}) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const fileName = file.name.toLowerCase();
        const expectedHeaders = options.expectedHeaders || [];

        if (fileName.endsWith('.csv')) {
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    if (typeof XLSX !== 'undefined') {
                        const workbook = XLSX.read(text, { type: 'string' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const data = sheetToJsonWithHeaderDetection(firstSheet, expectedHeaders);
                        resolve(data);
                    } else {
                        const data = parseCSV(text);
                        resolve(data);
                    }
                } catch (error) {
                    reject(new Error(`Error parsing CSV: ${error.message}`));
                }
            };
            reader.onerror = () => reject(new Error('Error reading CSV file'));
            reader.readAsText(file, 'latin-1'); // Support special characters
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = sheetToJsonWithHeaderDetection(firstSheet, expectedHeaders);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error(`Error parsing Excel: ${error.message}`));
                }
            };
            reader.onerror = () => reject(new Error('Error reading Excel file'));
            reader.readAsArrayBuffer(file);
        } else {
            reject(new Error('Unsupported file format'));
        }
    });
}

function normalizeHeader(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function sheetToJsonWithHeaderDetection(sheet, expectedHeaders) {
    let jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
    if (!expectedHeaders.length || hasExpectedHeaders(jsonData, expectedHeaders)) {
        return jsonData;
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    if (!rows.length) {
        return jsonData;
    }

    const expectedNormalized = expectedHeaders.map(normalizeHeader);
    const headerRowIndex = rows.findIndex(row => {
        const normalizedRow = row.map(normalizeHeader);
        return expectedNormalized.every(header => normalizedRow.includes(header));
    });

    if (headerRowIndex === -1 || headerRowIndex === rows.length - 1) {
        return jsonData;
    }

    const headers = rows[headerRowIndex];
    const dataRows = rows.slice(headerRowIndex + 1);
    return rowsToObjects(headers, dataRows);
}

function hasExpectedHeaders(jsonData, expectedHeaders) {
    if (!jsonData.length) {
        return false;
    }
    const keys = Object.keys(jsonData[0]).map(normalizeHeader);
    const expectedNormalized = expectedHeaders.map(normalizeHeader);
    return expectedNormalized.every(header => keys.includes(header));
}

function rowsToObjects(headers, dataRows) {
    const cleanedHeaders = headers.map(header => String(header || '').trim());
    return dataRows.map(row => {
        const rowData = {};
        cleanedHeaders.forEach((header, index) => {
            if (header) {
                rowData[header] = row[index] !== undefined ? row[index] : '';
            }
        });
        return rowData;
    });
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, idx) => {
                row[header] = values[idx];
            });
            data.push(row);
        }
    }

    return data;
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^["']|["']$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim().replace(/^["']|["']$/g, ''));
    return values;
}

function calculateNameSimilarity(name1, name2) {
    if (!name1 || !name2) return 0.0;

    const str1 = String(name1).toLowerCase().trim();
    const str2 = String(name2).toLowerCase().trim();

    const baseSimilarity = similarityRatio(str1, str2);

    const contradictoryPairs = [
        [['dental', 'dentistry'], ['medical', 'medicine']],
        [['dental'], ['veterinary', 'vet']],
        [['law'], ['medical', 'business', 'engineering']],
        [['medical'], ['law', 'business', 'engineering']],
        [['graduate'], ['undergraduate']],
        [['community college', ' cc '], ['university']]
    ];

    for (const [group1, group2] of contradictoryPairs) {
        const hasGroup1 = group1.some(word => str1.includes(word));
        const hasGroup2 = group2.some(word => str2.includes(word));

        if (hasGroup1 && hasGroup2) return 0.0;

        const hasGroup1In2 = group1.some(word => str2.includes(word));
        const hasGroup2In1 = group2.some(word => str1.includes(word));

        if (hasGroup1In2 && hasGroup2In1) return 0.0;
    }

    return baseSimilarity;
}

function similarityRatio(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1.0 : (maxLen - distance) / maxLen;
}

function normalizeMdbCode(value) {
    return String(value || '').trim();
}

function normalizeOrgId(value) {
    if (value === null || value === undefined || value === '') {
        return NaN;
    }
    const cleaned = String(value).replace(/^0+/, '');
    if (cleaned === '') {
        return 0;
    }
    const parsed = parseInt(cleaned, 10);
    return Number.isNaN(parsed) ? NaN : parsed;
}

function mergeData(outcomes, translate, wsuOrg) {
    const merged = [];
    const outcomesMap = new Map();
    const wsuOrgMap = new Map();

    outcomes.forEach(row => {
        outcomesMap.set(normalizeMdbCode(row.mdb_code), row);
    });

    wsuOrg.forEach(row => {
        const normalized = normalizeOrgId(row['Org ID']);
        if (!Number.isNaN(normalized)) {
            wsuOrgMap.set(normalized, row);
        }
    });

    for (const tRow of translate) {
        const mdbCode = normalizeMdbCode(tRow.Input);
        const orgIdRaw = tRow.Output;
        const orgIdNumeric = normalizeOrgId(orgIdRaw);

        const outcomesMatch = outcomesMap.get(mdbCode);

        const wsuMatch = wsuOrgMap.get(orgIdNumeric);

        const mergedRow = {
            mdb_code: mdbCode,
            Org_ID_raw: orgIdRaw,
            Output_numeric: orgIdNumeric
        };

        if (outcomesMatch) {
            for (const key in outcomesMatch) {
                mergedRow[`outcomes_${key}`] = outcomesMatch[key];
            }
        }

        if (wsuMatch) {
            for (const key in wsuMatch) {
                mergedRow[`wsu_${key}`] = wsuMatch[key];
            }
        }

        merged.push(mergedRow);
    }

    console.log(`[OK] Merged data: ${merged.length} rows`);
    return merged;
}

function detectInvalidOrgIds(translate, wsuOrg) {
    const wsuOrgIds = new Set();
    wsuOrg.forEach(row => {
        const normalized = normalizeOrgId(row['Org ID']);
        if (!Number.isNaN(normalized)) {
            wsuOrgIds.add(normalized);
        }
    });

    const invalidIds = [];
    for (const row of translate) {
        const orgId = normalizeOrgId(row.Output);
        if (Number.isNaN(orgId) || !wsuOrgIds.has(orgId)) {
            invalidIds.push(orgId);
        }
    }

    console.log(`[OK] Found ${invalidIds.length} invalid Org IDs`);
    return invalidIds;
}

function detectDuplicateOrgIds(translate) {
    const orgIdMap = {};

    for (const row of translate) {
        const orgId = normalizeOrgId(row.Output);
        if (Number.isNaN(orgId)) {
            continue;
        }
        const mdbCode = normalizeMdbCode(row.Input);

        if (!orgIdMap[orgId]) {
            orgIdMap[orgId] = [];
        }
        orgIdMap[orgId].push(mdbCode);
    }

    const duplicates = {};
    for (const [orgId, codes] of Object.entries(orgIdMap)) {
        if (codes.length > 1) {
            duplicates[orgId] = codes;
        }
    }

    const totalDuplicateRows = Object.values(duplicates).reduce((sum, codes) => sum + codes.length, 0);
    console.log(`[OK] Found ${Object.keys(duplicates).length} Org IDs with duplicates (${totalDuplicateRows} total rows)`);

    return duplicates;
}

function detectDuplicateMdbCodes(translate) {
    const mdbMap = {};

    for (const row of translate) {
        const mdbCode = normalizeMdbCode(row.Input);
        const orgId = normalizeOrgId(row.Output);
        if (!mdbMap[mdbCode]) {
            mdbMap[mdbCode] = [];
        }
        if (!Number.isNaN(orgId)) {
            mdbMap[mdbCode].push(orgId);
        }
    }

    const duplicates = {};
    for (const [code, orgIds] of Object.entries(mdbMap)) {
        if (orgIds.length > 1) {
            duplicates[code] = orgIds;
        }
    }

    console.log(`[OK] Found ${Object.keys(duplicates).length} mdb_codes with duplicate mappings`);
    return duplicates;
}

function detectOrphanedMappings(translate, outcomes) {
    const outcomesCodes = new Set(outcomes.map(o => normalizeMdbCode(o.mdb_code)));
    const orphaned = [];

    for (const row of translate) {
        const mdbCode = normalizeMdbCode(row.Input);
        if (!outcomesCodes.has(mdbCode)) {
            orphaned.push(mdbCode);
        }
    }

    console.log(`[OK] Found ${orphaned.length} orphaned mappings`);
    return orphaned;
}

function detectMissingMappings(outcomes, translate) {
    const translateCodes = new Set(translate.map(t => normalizeMdbCode(t.Input)));
    const missing = outcomes.filter(o => !translateCodes.has(normalizeMdbCode(o.mdb_code)));

    console.log(`[OK] Found ${missing.length} missing mappings`);
    return missing;
}

function validateMappings(merged, translate, outcomes, wsuOrg, nameCompare = {}) {
    console.log('\n=== Running Validation ===');

    const invalidOrgIds = new Set(detectInvalidOrgIds(translate, wsuOrg));
    const duplicateOrgIdsDict = detectDuplicateOrgIds(translate);
    const duplicateMdbDict = detectDuplicateMdbCodes(translate);
    const orphanedCodes = new Set(detectOrphanedMappings(translate, outcomes));

    const duplicateGroups = {};
    const sortedDuplicates = Object.entries(duplicateOrgIdsDict)
        .sort((a, b) => b[1].length - a[1].length);

    sortedDuplicates.forEach(([orgId, codes], idx) => {
        const groupName = idx < 26 ? `Group_${String.fromCharCode(65 + idx)}` : `Group_${idx + 1}`;
        codes.forEach(code => {
            duplicateGroups[code] = groupName;
        });
    });

    const nameCompareEnabled = Boolean(nameCompare.enabled);
    const outcomesColumn = nameCompare.outcomes_column || '';
    const wsuColumn = nameCompare.wsu_column || '';
    const threshold = typeof nameCompare.threshold === 'number' ? nameCompare.threshold : 0.5;
    const outcomesKey = outcomesColumn ? `outcomes_${outcomesColumn}` : '';
    const wsuKey = wsuColumn ? `wsu_${wsuColumn}` : '';
    const canCompareNames = nameCompareEnabled && outcomesKey && wsuKey;

    const validated = merged.map(row => {
        const result = {
            ...row,
            Error_Type: 'Valid',
            Error_Description: 'Mapping is valid',
            Duplicate_Group: ''
        };

        if (orphanedCodes.has(row.mdb_code)) {
            result.Error_Type = 'Orphaned_Mapping';
            result.Error_Description = 'mdb_code does not exist in Outcomes.csv';
        }

        if (invalidOrgIds.has(row.Output_numeric)) {
            result.Error_Type = 'Invalid_OrgID';
            result.Error_Description = 'Org ID does not exist in WSU_org.xlsx';
        }

        const duplicateMdbCount = duplicateMdbDict[row.mdb_code]?.length || 0;
        if (duplicateMdbCount > 1) {
            result.Error_Type = 'Duplicate_mdb';
            result.Error_Description = `mdb_code maps to ${duplicateMdbCount} different Org IDs`;
        }

        const duplicateCount = duplicateOrgIdsDict[row.Output_numeric]?.length || 0;
        if (duplicateCount > 1) {
            result.Error_Type = 'Duplicate_OrgID';
            result.Error_Description = `Org ID maps to ${duplicateCount} different schools (one-to-many error)`;
            result.Duplicate_Group = duplicateGroups[row.mdb_code] || '';
        }

        if (result.Error_Type === 'Valid' && canCompareNames && row[outcomesKey] && row[wsuKey]) {
            const similarity = calculateNameSimilarity(row[outcomesKey], row[wsuKey]);

            if (similarity < threshold) {
                result.Error_Type = 'Name_Mismatch';
                result.Error_Description = `Names do not match (similarity: ${Math.round(similarity * 100)}%). "${row[outcomesKey]}" mapped to "${row[wsuKey]}" - verify this is correct`;
            }
        }

        return result;
    });

    console.log('\n=== Validation Complete ===');
    console.log(`Total rows validated: ${validated.length}`);

    const errorCounts = {};
    validated.forEach(row => {
        errorCounts[row.Error_Type] = (errorCounts[row.Error_Type] || 0) + 1;
    });

    console.log('\nError Type Breakdown:');
    for (const [type, count] of Object.entries(errorCounts)) {
        console.log(`  ${type}: ${count}`);
    }

    return validated;
}

function generateSummaryStats(validated, outcomes, translate, wsuOrg) {
    const totalMappings = validated.length;
    const validCount = validated.filter(r => r.Error_Type === 'Valid').length;
    const errorCount = totalMappings - validCount;

    const errorCounts = {};
    validated.forEach(row => {
        errorCounts[row.Error_Type] = (errorCounts[row.Error_Type] || 0) + 1;
    });

    const stats = {
        timestamp: new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }),
        files: {
            outcomes_rows: outcomes.length,
            translate_rows: translate.length,
            wsu_org_rows: wsuOrg.length
        },
        validation: {
            total_mappings: totalMappings,
            valid_count: validCount,
            valid_percentage: Math.round(validCount / totalMappings * 1000) / 10,
            error_count: errorCount,
            error_percentage: Math.round(errorCount / totalMappings * 1000) / 10
        },
        errors: {
            invalid_org_ids: errorCounts.Invalid_OrgID || 0,
            duplicate_org_ids: errorCounts.Duplicate_OrgID || 0,
            duplicate_mdb_codes: errorCounts.Duplicate_mdb || 0,
            orphaned_mappings: errorCounts.Orphaned_Mapping || 0
        }
    };

    return stats;
}

function getErrorSamples(validated, limit = 10) {
    const samples = {};
    const errorTypes = ['Invalid_OrgID', 'Duplicate_OrgID', 'Duplicate_mdb', 'Name_Mismatch', 'Orphaned_Mapping'];

    errorTypes.forEach(errorType => {
        const rows = validated.filter(r => r.Error_Type === errorType);
        samples[errorType] = {
            count: rows.length,
            rows: rows.slice(0, limit).map(r => ({
                mdb_code: r.mdb_code,
                Org_ID_raw: r.Org_ID_raw,
                Error_Description: r.Error_Description
            }))
        };
    });

    return samples;
}
