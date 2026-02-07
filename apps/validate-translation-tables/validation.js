let outcomesData = [];
let translateData = [];
let wsuOrgData = [];

async function loadFile(file, options = {}) {
    return new Promise((resolve, reject) => {
        const fileName = file.name.toLowerCase();
        const expectedHeaders = options.expectedHeaders || [];

        if (fileName.endsWith('.csv')) {
            const userEncoding = options.encoding || 'auto';

            const parseText = (text) => {
                try {
                    return parseCSV(text);
                } catch (parseError) {
                    if (typeof XLSX !== 'undefined') {
                        const workbook = XLSX.read(text, { type: 'string' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        return sheetToJsonWithHeaderDetection(firstSheet, expectedHeaders);
                    }
                    throw parseError;
                }
            };

            const attemptRead = (encoding, allowFallback) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const text = e.target.result;
                        const data = parseText(text);
                        resolve(data);
                    } catch (error) {
                        if (allowFallback) {
                            attemptRead('iso-8859-1', false);
                            return;
                        }
                        reject(new Error(`Error parsing CSV: ${error.message}`));
                    }
                };
                reader.onerror = () => reject(new Error('Error reading CSV file'));
                if (encoding) {
                    reader.readAsText(file, encoding);
                } else {
                    reader.readAsText(file);
                }
            };

            if (userEncoding !== 'auto') {
                attemptRead(userEncoding, false);
            } else {
                attemptRead(null, true);
            }
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const reader = new FileReader();
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
    if (expectedHeaders.length && hasExpectedHeaders(jsonData, expectedHeaders)) {
        return jsonData;
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    if (!rows.length) {
        return jsonData;
    }

    const expectedNormalized = expectedHeaders.map(normalizeHeader);
    const headerRowIndex = expectedHeaders.length
        ? rows.findIndex(row => {
            const normalizedRow = row.map(normalizeHeader);
            return expectedNormalized.every(header => normalizedRow.includes(header));
        })
        : detectHeaderRowIndex(rows);

    if (headerRowIndex === -1 || headerRowIndex === rows.length - 1) {
        throw new Error('Header row not found.');
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

function detectHeaderRowIndex(rows) {
    const maxScan = Math.min(rows.length, 10);
    const scored = [];

    for (let i = 0; i < maxScan; i++) {
        const row = rows[i] || [];
        const cells = row.map(cell => String(cell || '').trim());
        const nonEmpty = cells.filter(cell => cell.length > 0);
        if (nonEmpty.length === 0) {
            continue;
        }
        const alphaCount = nonEmpty.filter(cell => /[A-Za-z]/.test(cell)).length;
        const numericCount = nonEmpty.filter(cell => /^[0-9]+$/.test(cell)).length;
        const uniqueCount = new Set(nonEmpty.map(normalizeHeader)).size;

        scored.push({
            index: i,
            nonEmpty: nonEmpty.length,
            alphaCount,
            numericCount,
            uniqueCount
        });
    }

    if (!scored.length) {
        return -1;
    }

    scored.sort((a, b) => {
        if (b.nonEmpty !== a.nonEmpty) return b.nonEmpty - a.nonEmpty;
        if (b.alphaCount !== a.alphaCount) return b.alphaCount - a.alphaCount;
        if (b.uniqueCount !== a.uniqueCount) return b.uniqueCount - a.uniqueCount;
        return a.index - b.index;
    });

    const best = scored[0];
    const first = scored.find(row => row.index === 0);
    if (first && first.nonEmpty >= best.nonEmpty && first.alphaCount >= 2) {
        return 0;
    }

    if (best.nonEmpty < 2 || best.alphaCount === 0 || best.numericCount === best.nonEmpty) {
        return -1;
    }

    return best.index;
}

function parseCSV(text) {
    const rows = parseCSVRows(text);
    if (rows.length === 0) return [];

    const headers = rows[0].map(h => String(h || '').trim());
    if (headers.length && headers[0]) {
        headers[0] = headers[0].replace(/^\uFEFF/, '');
    }
    const headerCells = headers.filter(cell => cell.length > 0);
    const headerHasAlpha = headerCells.some(cell => /[A-Za-z]/.test(cell));
    if (headerCells.length === 0 || !headerHasAlpha) {
        throw new Error('Header row not found.');
    }

    const data = [];
    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        if (!values.length) continue;
        const row = {};
        headers.forEach((header, idx) => {
            if (header) {
                row[header] = values[idx] !== undefined ? values[idx] : '';
            }
        });
        data.push(row);
    }

    return data;
}

function parseCSVRows(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') {
            const nextChar = text[i + 1];
            if (inQuotes && nextChar === '"') {
                field += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            row.push(field);
            field = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && text[i + 1] === '\n') {
                i += 1;
            }
            row.push(field);
            const hasData = row.some(cell => String(cell || '').trim().length > 0);
            if (hasData) {
                rows.push(row.map(cell => String(cell || '').trim()));
            }
            row = [];
            field = '';
            continue;
        }

        field += char;
    }

    if (field.length || row.length) {
        row.push(field);
        const hasData = row.some(cell => String(cell || '').trim().length > 0);
        if (hasData) {
            rows.push(row.map(cell => String(cell || '').trim()));
        }
    }

    return rows;
}

const NAME_TOKEN_STOPWORDS = new Set([
    'university', 'college', 'school', 'academy', 'institute', 'institution',
    'faculty', 'department', 'center', 'centre', 'program', 'programs',
    'campus', 'of', 'the', 'and', 'for', 'at', 'in', 'on', 'de', 'la', 'le',
    'du', 'da', 'di', 'del'
]);
const NAME_MATCH_AMBIGUITY_GAP = 0.03;

const NAME_TOKEN_ALIASES = {
    univ: 'university',
    uni: 'university',
    universitat: 'university',
    universite: 'university',
    universita: 'university',
    universidad: 'university',
    universidade: 'university',
    coll: 'college',
    inst: 'institute',
    intl: 'international',
    int: 'international',
    tech: 'technology',
    sci: 'science',
    st: 'saint',
    mt: 'mount',
    poly: 'polytechnic',
    polytech: 'polytechnic',
    ag: 'agricultural',
    med: 'medical',
    dept: 'department',
    ctr: 'center',
    sch: 'school'
};

function normalizeNameForCompare(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenizeName(value) {
    const normalized = normalizeNameForCompare(value);
    if (!normalized) {
        return [];
    }
    return normalized
        .split(' ')
        .map(token => NAME_TOKEN_ALIASES[token] || token)
        .filter(Boolean);
}

function getInformativeTokens(tokens) {
    return tokens.filter(token => token.length > 1 && !NAME_TOKEN_STOPWORDS.has(token));
}

function tokensMatch(token1, token2) {
    if (token1 === token2) return true;
    if (token1.length < 4 || token2.length < 4) return false;
    return token1.startsWith(token2) || token2.startsWith(token1);
}

function tokenOverlapStats(tokens1, tokens2) {
    if (!tokens1.length || !tokens2.length) {
        return { score: 0, matches: 0 };
    }

    const used = new Set();
    let matches = 0;

    for (const token1 of tokens1) {
        let matchedIndex = -1;
        for (let i = 0; i < tokens2.length; i++) {
            if (used.has(i)) continue;
            if (tokensMatch(token1, tokens2[i])) {
                matchedIndex = i;
                break;
            }
        }
        if (matchedIndex >= 0) {
            used.add(matchedIndex);
            matches += 1;
        }
    }

    return {
        score: matches / Math.max(tokens1.length, tokens2.length),
        matches
    };
}

function getTopTwoNameScores(sourceName, targetRows, targetField, threshold = 0, scoreCache = null) {
    if (!sourceName) {
        return { bestScore: -1, secondBestScore: -1 };
    }
    const normalizedSource = normalizeNameForCompare(sourceName);
    if (!normalizedSource) {
        return { bestScore: -1, secondBestScore: -1 };
    }
    const cacheKey = scoreCache
        ? `${targetField}|${threshold}|${normalizedSource}`
        : '';
    if (scoreCache && scoreCache.has(cacheKey)) {
        return scoreCache.get(cacheKey);
    }

    let bestScore = -1;
    let secondBestScore = -1;
    targetRows.forEach(row => {
        const targetName = row[targetField];
        if (!targetName) {
            return;
        }
        const score = calculateNameSimilarity(sourceName, targetName);
        if (score < threshold) {
            return;
        }
        if (score > bestScore) {
            secondBestScore = bestScore;
            bestScore = score;
        } else if (score > secondBestScore) {
            secondBestScore = score;
        }
    });
    const result = { bestScore, secondBestScore };
    if (scoreCache) {
        scoreCache.set(cacheKey, result);
    }
    return result;
}

function isAmbiguousNameMatch(
    sourceName,
    targetName,
    targetRows,
    targetField,
    threshold,
    gap = NAME_MATCH_AMBIGUITY_GAP,
    scoreCache = null,
    mappedScoreValue = null
) {
    if (!sourceName || !targetName) {
        return false;
    }
    const mappedScore = typeof mappedScoreValue === 'number'
        ? mappedScoreValue
        : calculateNameSimilarity(sourceName, targetName);
    if (mappedScore < threshold) {
        return false;
    }
    const { bestScore, secondBestScore } = getTopTwoNameScores(
        sourceName,
        targetRows,
        targetField,
        threshold,
        scoreCache
    );
    if (bestScore < 0 || secondBestScore < 0) {
        return false;
    }
    if (bestScore - secondBestScore >= gap) {
        return false;
    }
    return (bestScore - mappedScore) <= gap;
}

function calculateNameSimilarity(name1, name2) {
    if (!name1 || !name2) return 0.0;

    const normalized1 = normalizeNameForCompare(name1);
    const normalized2 = normalizeNameForCompare(name2);

    if (!normalized1 || !normalized2) {
        return 0.0;
    }
    if (normalized1 === normalized2) {
        return 1.0;
    }

    const informative1 = getInformativeTokens(tokenizeName(normalized1));
    const informative2 = getInformativeTokens(tokenizeName(normalized2));
    const tokensAll1 = tokenizeName(normalized1);
    const tokensAll2 = tokenizeName(normalized2);
    if (!informative1.length && !informative2.length) {
        return 0.0;
    }
    const overlap = tokenOverlapStats(informative1, informative2);
    const tokenSimilarity = overlap.score;
    const baseSimilarity = similarityRatio(normalized1, normalized2);

    const contradictoryPairs = [
        [['dental', 'dentistry'], ['medical', 'medicine']],
        [['dental'], ['veterinary', 'vet']],
        [['law'], ['medical', 'business', 'engineering']],
        [['medical'], ['law', 'business', 'engineering']],
        [['graduate'], ['undergraduate']],
        [['community college', 'cc'], ['university']]
    ];

    const hasWord = (word, normalized, tokens) => {
        if (!word) return false;
        if (word.includes(' ')) {
            return normalized.includes(word);
        }
        if (word.length <= 3) {
            return tokens.includes(word);
        }
        return normalized.includes(word);
    };

    for (const [group1, group2] of contradictoryPairs) {
        const hasGroup1 = group1.some(word => hasWord(word, normalized1, tokensAll1));
        const hasGroup2 = group2.some(word => hasWord(word, normalized2, tokensAll2));

        if (hasGroup1 && hasGroup2) return 0.0;

        const hasGroup1In2 = group1.some(word => hasWord(word, normalized2, tokensAll2));
        const hasGroup2In1 = group2.some(word => hasWord(word, normalized1, tokensAll1));

        if (hasGroup1In2 && hasGroup2In1) return 0.0;
    }

    if (informative1.length >= 2 && informative2.length >= 2 && overlap.matches === 0) {
        return 0.0;
    }
    if (informative1.length && informative2.length && tokenSimilarity === 0) {
        return Math.min(baseSimilarity * 0.6, 0.45);
    }

    let score = (baseSimilarity * 0.55) + (tokenSimilarity * 0.45);
    if (tokenSimilarity < 0.2 && baseSimilarity < 0.85) {
        score *= 0.85;
    }

    return Math.max(0, Math.min(1, score));
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

function normalizeKeyValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const raw = String(value).trim();
    if (raw === '') {
        return '';
    }
    if (/^\d+$/.test(raw)) {
        const cleaned = raw.replace(/^0+/, '');
        return cleaned === '' ? '0' : cleaned;
    }
    return raw.toLowerCase();
}

function mergeData(outcomes, translate, wsuOrg, keyConfig) {
    const merged = [];
    const outcomesMap = new Map();
    const wsuOrgMap = new Map();

    outcomes.forEach(row => {
        const key = normalizeKeyValue(row[keyConfig.outcomes]);
        if (key) {
            outcomesMap.set(key, row);
        }
    });

    wsuOrg.forEach(row => {
        const normalized = normalizeKeyValue(row[keyConfig.wsu]);
        if (normalized) {
            wsuOrgMap.set(normalized, row);
        }
    });

    for (const tRow of translate) {
        const inputRaw = tRow[keyConfig.translateInput] ?? '';
        const outputRaw = tRow[keyConfig.translateOutput] ?? '';
        const inputNormalized = normalizeKeyValue(inputRaw);
        const outputNormalized = normalizeKeyValue(outputRaw);

        const outcomesMatch = outcomesMap.get(inputNormalized);
        const wsuMatch = wsuOrgMap.get(outputNormalized);

        const mergedRow = {
            translate_input: inputRaw,
            translate_output: outputRaw,
            translate_input_norm: inputNormalized,
            translate_output_norm: outputNormalized
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

function detectDuplicateTargets(translate, keyConfig) {
    const targetMap = {};

    for (const row of translate) {
        const targetKey = normalizeKeyValue(row[keyConfig.translateOutput]);
        const sourceKey = normalizeKeyValue(row[keyConfig.translateInput]);
        if (!targetKey || !sourceKey) {
            continue;
        }
        if (!targetMap[targetKey]) {
            targetMap[targetKey] = new Set();
        }
        targetMap[targetKey].add(sourceKey);
    }

    const duplicates = {};
    for (const [target, sourceSet] of Object.entries(targetMap)) {
        const sources = Array.from(sourceSet);
        if (sources.length > 1) {
            duplicates[target] = sources;
        }
    }

    const totalDuplicateRows = Object.values(duplicates).reduce((sum, codes) => sum + codes.length, 0);
    console.log(`[OK] Found ${Object.keys(duplicates).length} target keys with duplicates (${totalDuplicateRows} total rows)`);

    return duplicates;
}

function detectDuplicateSources(translate, keyConfig) {
    const sourceMap = {};

    for (const row of translate) {
        const sourceKey = normalizeKeyValue(row[keyConfig.translateInput]);
        const targetKey = normalizeKeyValue(row[keyConfig.translateOutput]);
        if (!sourceKey) {
            continue;
        }
        if (!sourceMap[sourceKey]) {
            sourceMap[sourceKey] = new Set();
        }
        if (targetKey) {
            sourceMap[sourceKey].add(targetKey);
        }
    }

    const duplicates = {};
    for (const [source, targetSet] of Object.entries(sourceMap)) {
        const targets = Array.from(targetSet);
        if (targets.length > 1) {
            duplicates[source] = targets;
        }
    }

    console.log(`[OK] Found ${Object.keys(duplicates).length} source keys with duplicate mappings`);
    return duplicates;
}

function detectOrphanedMappings(translate, outcomes, keyConfig) {
    const outcomesKeys = new Set(outcomes.map(o => normalizeKeyValue(o[keyConfig.outcomes])));
    const orphaned = [];

    for (const row of translate) {
        const sourceKey = normalizeKeyValue(row[keyConfig.translateInput]);
        if (sourceKey && !outcomesKeys.has(sourceKey)) {
            orphaned.push(sourceKey);
        }
    }

    console.log(`[OK] Found ${orphaned.length} orphaned mappings`);
    return orphaned;
}

function detectMissingMappings(outcomes, translate, keyConfig) {
    const translateKeys = new Set(translate.map(t => normalizeKeyValue(t[keyConfig.translateInput])));
    const missing = outcomes.filter(o => {
        const key = normalizeKeyValue(o[keyConfig.outcomes]);
        return key && !translateKeys.has(key);
    });

    console.log(`[OK] Found ${missing.length} missing mappings`);
    return missing;
}

function validateMappings(merged, translate, outcomes, wsuOrg, keyConfig, nameCompare = {}) {
    console.log('\n=== Running Validation ===');

    const duplicateTargetsDict = detectDuplicateTargets(translate, keyConfig);
    const duplicateSourcesDict = detectDuplicateSources(translate, keyConfig);

    const outcomesKeys = new Set(
        outcomes
            .map(row => normalizeKeyValue(row[keyConfig.outcomes]))
            .filter(Boolean)
    );
    const wsuKeys = new Set(
        wsuOrg
            .map(row => normalizeKeyValue(row[keyConfig.wsu]))
            .filter(Boolean)
    );

    const duplicateGroups = {};
    const sortedTargetDups = Object.entries(duplicateTargetsDict)
        .sort((a, b) => b[1].length - a[1].length);

    sortedTargetDups.forEach(([targetKey, sourceCodes], idx) => {
        const groupName = idx < 26 ? `Tgt_Group_${String.fromCharCode(65 + idx)}` : `Tgt_Group_${idx + 1}`;
        duplicateGroups[`tgt:${targetKey}`] = groupName;
    });

    const sortedSourceDups = Object.entries(duplicateSourcesDict)
        .sort((a, b) => b[1].length - a[1].length);

    sortedSourceDups.forEach(([sourceKey, targetCodes], idx) => {
        const groupName = idx < 26 ? `Src_Group_${String.fromCharCode(65 + idx)}` : `Src_Group_${idx + 1}`;
        duplicateGroups[`src:${sourceKey}`] = groupName;
    });

    const nameCompareEnabled = Boolean(nameCompare.enabled);
    const outcomesColumn = nameCompare.outcomes_column || '';
    const wsuColumn = nameCompare.wsu_column || '';
    const threshold = typeof nameCompare.threshold === 'number' ? nameCompare.threshold : 0.8;
    const ambiguityGap = typeof nameCompare.ambiguity_gap === 'number'
        ? nameCompare.ambiguity_gap
        : NAME_MATCH_AMBIGUITY_GAP;
    const outcomesKey = outcomesColumn ? `outcomes_${outcomesColumn}` : '';
    const wsuKey = wsuColumn ? `wsu_${wsuColumn}` : '';
    const canCompareNames = nameCompareEnabled && outcomesKey && wsuKey;
    const ambiguityScoreCache = canCompareNames ? new Map() : null;

    const validated = merged.map(row => {
        const result = {
            ...row,
            Error_Type: 'Valid',
            Error_Description: 'Mapping is valid',
            Duplicate_Group: ''
        };

        if (!row.translate_input_norm) {
            result.Error_Type = 'Missing_Input';
            result.Error_Description = 'Translation input is missing';
        }

        if (result.Error_Type === 'Valid' && !row.translate_output_norm) {
            result.Error_Type = 'Missing_Output';
            result.Error_Description = 'Translation output is missing';
        }

        if (result.Error_Type === 'Valid' && row.translate_input_norm && !outcomesKeys.has(row.translate_input_norm)) {
            result.Error_Type = 'Input_Not_Found';
            result.Error_Description = 'Translation input does not exist in Outcomes data';
        }

        if (result.Error_Type === 'Valid' && row.translate_output_norm && !wsuKeys.has(row.translate_output_norm)) {
            result.Error_Type = 'Output_Not_Found';
            result.Error_Description = 'Translation output does not exist in myWSU data';
        }

        const duplicateSourceCount = duplicateSourcesDict[row.translate_input_norm]?.length || 0;
        if (result.Error_Type === 'Valid' && row.translate_input_norm && duplicateSourceCount > 1) {
            result.Error_Type = 'Duplicate_Source';
            result.Error_Description = `Source key maps to ${duplicateSourceCount} different target keys (one-to-many)`;
            result.Duplicate_Group = duplicateGroups[`src:${row.translate_input_norm}`] || '';
        }

        const duplicateTargetCount = duplicateTargetsDict[row.translate_output_norm]?.length || 0;
        if (result.Error_Type === 'Valid' && row.translate_output_norm && duplicateTargetCount > 1) {
            result.Error_Type = 'Duplicate_Target';
            result.Error_Description = `Target key maps to ${duplicateTargetCount} different source keys (many-to-one)`;
            result.Duplicate_Group = duplicateGroups[`tgt:${row.translate_output_norm}`] || '';
        }

        if (result.Error_Type === 'Valid' && canCompareNames && row[outcomesKey] && row[wsuKey]) {
            const similarity = calculateNameSimilarity(row[outcomesKey], row[wsuKey]);

            if (similarity < threshold) {
                result.Error_Type = 'Name_Mismatch';
                result.Error_Description = `Names do not match (similarity: ${Math.round(similarity * 100)}%). "${row[outcomesKey]}" mapped to "${row[wsuKey]}" - verify this is correct`;
            } else if (
                isAmbiguousNameMatch(
                    row[outcomesKey],
                    row[wsuKey],
                    wsuOrg,
                    wsuColumn,
                    threshold,
                    ambiguityGap,
                    ambiguityScoreCache,
                    similarity
                )
            ) {
                result.Error_Type = 'Ambiguous_Match';
                result.Error_Description = `Ambiguous name match (similarity: ${Math.round(similarity * 100)}%). Another candidate is within ${Math.round(ambiguityGap * 100)}% - review alternatives`;
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
    const validPct = totalMappings > 0
        ? Math.round((validCount / totalMappings) * 1000) / 10
        : 0;
    const errorPct = totalMappings > 0
        ? Math.round((errorCount / totalMappings) * 1000) / 10
        : 0;

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
            valid_percentage: validPct,
            error_count: errorCount,
            error_percentage: errorPct
        },
        errors: {
            missing_inputs: errorCounts.Missing_Input || 0,
            missing_outputs: errorCounts.Missing_Output || 0,
            input_not_found: errorCounts.Input_Not_Found || 0,
            output_not_found: errorCounts.Output_Not_Found || 0,
            duplicate_targets: errorCounts.Duplicate_Target || 0,
            duplicate_sources: errorCounts.Duplicate_Source || 0,
            name_mismatches: errorCounts.Name_Mismatch || 0,
            ambiguous_matches: errorCounts.Ambiguous_Match || 0
        }
    };

    return stats;
}

function getErrorSamples(validated, limit = 10) {
    const samples = {};
    const errorTypes = [
        'Missing_Input',
        'Missing_Output',
        'Input_Not_Found',
        'Output_Not_Found',
        'Duplicate_Target',
        'Duplicate_Source',
        'Name_Mismatch',
        'Ambiguous_Match'
    ];

    const resolvedLimit = limit && limit > 0 ? limit : null;

    errorTypes.forEach(errorType => {
        const rows = validated.filter(r => r.Error_Type === errorType);
        const showing = resolvedLimit ? Math.min(rows.length, resolvedLimit) : rows.length;
        samples[errorType] = {
            count: rows.length,
            showing,
            rows: rows.slice(0, showing).map(r => ({
                translate_input: r.translate_input,
                translate_output: r.translate_output,
                Error_Description: r.Error_Description
            }))
        };
    });

    return samples;
}
