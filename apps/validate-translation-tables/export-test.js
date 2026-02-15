'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const workerPath = path.join(__dirname, 'export-worker.js');
const workerCode = fs.readFileSync(workerPath, 'utf8');

let failures = 0;

async function runCheck(name, fn) {
    try {
        await fn();
        console.log(`[PASS] ${name}`);
    } catch (error) {
        failures += 1;
        console.error(`[FAIL] ${name}: ${error.message}`);
    }
}

function columnLetterToIndex(letters) {
    return String(letters || '')
        .toUpperCase()
        .split('')
        .reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0);
}

class FakeCell {
    constructor() {
        this.value = '';
        this.font = undefined;
        this.fill = undefined;
        this.border = undefined;
        this.numFmt = undefined;
        this.protection = undefined;
    }
}

class FakeRow {
    constructor(rowNumber) {
        this.rowNumber = rowNumber;
        this._cells = new Map();
    }

    getCell(index) {
        const col = Number(index);
        if (!this._cells.has(col)) {
            this._cells.set(col, new FakeCell());
        }
        return this._cells.get(col);
    }

    eachCell(callback) {
        const cols = Array.from(this._cells.keys()).sort((a, b) => a - b);
        cols.forEach(colNumber => {
            callback(this._cells.get(colNumber), colNumber);
        });
    }
}

class FakeWorksheet {
    constructor(name) {
        this.name = name;
        this._rows = new Map();
        this._rowCount = 0;
        this._columns = [];
        this.state = 'visible';
        this.views = [];
        this.autoFilter = undefined;
        this.dataValidations = {
            items: [],
            add: (ref, config) => {
                this.dataValidations.items.push({ ref, config });
            }
        };
        this.conditionalFormatting = [];
    }

    get rowCount() {
        return this._rowCount;
    }

    get columns() {
        return this._columns;
    }

    set columns(columns) {
        this._columns = Array.isArray(columns) ? columns : [];
    }

    _ensureRow(rowNumber) {
        const rowNum = Number(rowNumber);
        if (!this._rows.has(rowNum)) {
            this._rows.set(rowNum, new FakeRow(rowNum));
        }
        if (rowNum > this._rowCount) {
            this._rowCount = rowNum;
        }
        return this._rows.get(rowNum);
    }

    addRow(values) {
        const rowNumber = this._rowCount + 1;
        const row = this._ensureRow(rowNumber);
        if (Array.isArray(values)) {
            values.forEach((value, idx) => {
                row.getCell(idx + 1).value = value;
            });
        }
        return row;
    }

    getRow(rowNumber) {
        return this._ensureRow(rowNumber);
    }

    getColumn(index) {
        const colNumber = Number(index);
        if (!this._columns[colNumber - 1]) {
            this._columns[colNumber - 1] = {};
        }
        return this._columns[colNumber - 1];
    }

    getCell(refOrRow, colNumber) {
        if (typeof refOrRow === 'string') {
            const match = /^([A-Za-z]+)(\d+)$/.exec(refOrRow);
            if (!match) {
                throw new Error(`Unsupported cell ref: ${refOrRow}`);
            }
            const col = columnLetterToIndex(match[1]);
            const row = Number(match[2]);
            return this._ensureRow(row).getCell(col);
        }
        return this._ensureRow(refOrRow).getCell(colNumber);
    }

    addConditionalFormatting(config) {
        this.conditionalFormatting.push(config);
    }

    async protect() {
        return undefined;
    }
}

function createHarness() {
    let lastWorkbook = null;
    const progressMessages = [];

    class FakeWorkbook {
        constructor() {
            this._worksheets = [];
            lastWorkbook = this;
            this.xlsx = {
                writeBuffer: async () => new ArrayBuffer(16)
            };
        }

        addWorksheet(name) {
            const sheet = new FakeWorksheet(name);
            this._worksheets.push(sheet);
            return sheet;
        }

        getWorksheet(name) {
            return this._worksheets.find(sheet => sheet.name === name);
        }
    }

    const context = {
        console,
        Buffer,
        ArrayBuffer,
        setTimeout,
        clearTimeout,
        ExcelJS: { Workbook: FakeWorkbook },
        self: {
            postMessage: (message) => {
                progressMessages.push(message);
            }
        }
    };

    context.importScripts = (...scripts) => {
        scripts.forEach(scriptRef => {
            if (!scriptRef) return;
            if (scriptRef.includes('exceljs')) {
                return;
            }
            const scriptPath = path.isAbsolute(scriptRef)
                ? scriptRef
                : path.join(__dirname, scriptRef);
            const code = fs.readFileSync(scriptPath, 'utf8');
            vm.runInContext(code, vmContext, { filename: scriptPath });
        });
    };

    const vmContext = vm.createContext(context);
    vm.runInContext(workerCode, vmContext, { filename: workerPath });

    if (typeof vmContext.buildValidationExport !== 'function') {
        throw new Error('buildValidationExport was not loaded from export-worker.js');
    }
    if (typeof vmContext.buildGenerationExport !== 'function') {
        throw new Error('buildGenerationExport was not loaded from export-worker.js');
    }

    return {
        buildValidationExport: (payload) => vmContext.buildValidationExport(payload),
        buildGenerationExport: (payload) => vmContext.buildGenerationExport(payload),
        getLastWorkbook: () => lastWorkbook,
        getProgressMessages: () => progressMessages
    };
}

function getRowValues(sheet, rowNumber, upToColumn) {
    const row = sheet.getRow(rowNumber);
    const values = [];
    for (let col = 1; col <= upToColumn; col += 1) {
        values.push(row.getCell(col).value);
    }
    return values;
}

function findHeaderIndex(sheet, headerText, scanColumns = 80) {
    const headers = getRowValues(sheet, 1, scanColumns).map(v => String(v || ''));
    return headers.indexOf(headerText) + 1;
}

function assertExportResult(result) {
    assert.ok(result, 'Expected result object');
    assert.equal(typeof result.filename, 'string');
    assert.ok(result.filename.length > 0, 'Expected non-empty filename');
    assert.ok(result.buffer instanceof ArrayBuffer, 'Expected ArrayBuffer buffer');
    assert.ok(result.buffer.byteLength > 0, 'Expected non-empty buffer');
}

async function run() {
    await runCheck('buildValidationExport handles empty payload object', async () => {
        const harness = createHarness();
        const result = await harness.buildValidationExport({});
        assertExportResult(result);
        assert.ok(harness.getProgressMessages().length > 0, 'Expected progress messages');
    });

    await runCheck('buildValidationExport handles explicit empty/minimal payload', async () => {
        const harness = createHarness();
        const result = await harness.buildValidationExport({
            validated: [],
            selectedCols: {},
            context: {}
        });
        assertExportResult(result);
        const workbook = harness.getLastWorkbook();
        const finalSheet = workbook.getWorksheet('Final_Translation_Table');
        const filterCell = finalSheet?.getRow(2)?.getCell(1)?.value;
        assert.ok(filterCell?.formula, 'Empty payload should still produce FILTER formula');
        assert.ok(!/:\$[A-Z]+\$1\b/.test(filterCell.formula), 'FILTER include range must not end at row 1 (stagingLastRow >= 2 guard)');
    });

    await runCheck('buildValidationExport handles missing selectedCols arrays', async () => {
        const harness = createHarness();
        const result = await harness.buildValidationExport({
            validated: [],
            selectedCols: {},
            context: {
                loadedData: {
                    outcomes: [{ some_key: 'A1', school: 'Alpha' }],
                    translate: [],
                    wsu_org: [{ some_key: 'B1', school: 'Beta' }]
                },
                keyConfig: {
                    outcomes: 'some_key',
                    translateInput: 'translate_input',
                    translateOutput: 'translate_output',
                    wsu: 'some_key'
                }
            }
        });
        assertExportResult(result);
    });

    await runCheck('buildValidationExport sanitizes object-valued cells', async () => {
        const harness = createHarness();
        const result = await harness.buildValidationExport({
            validated: [
                {
                    Error_Type: 'Valid',
                    translate_input: 'x',
                    translate_output: 'y',
                    outcomes_school: { foo: 1 },
                    wsu_school: 'Y School'
                }
            ],
            selectedCols: {
                outcomes: ['school'],
                wsu_org: ['school']
            },
            context: {
                loadedData: { outcomes: [], translate: [], wsu_org: [] },
                keyConfig: {
                    outcomes: 'outcomes_key',
                    translateInput: 'translate_input',
                    translateOutput: 'translate_output',
                    wsu: 'wsu_key'
                },
                keyLabels: {
                    outcomes: 'outcomes_key',
                    wsu: 'wsu_key',
                    translateInput: 'translate_input',
                    translateOutput: 'translate_output'
                }
            }
        });

        assertExportResult(result);
        const workbook = harness.getLastWorkbook();
        const validSheet = workbook.getWorksheet('Valid_Mappings');
        assert.ok(validSheet, 'Expected Valid_Mappings worksheet');
        const headerValues = getRowValues(validSheet, 1, 12).map(v => String(v || ''));
        const outcomesSchoolIndex = headerValues.indexOf('outcomes_school');
        assert.ok(outcomesSchoolIndex >= 0, 'Expected outcomes_school column header');
        const dataCell = validSheet.getRow(2).getCell(outcomesSchoolIndex + 1).value;
        assert.equal(typeof dataCell, 'string');
        assert.equal(dataCell, '[object Object]');
    });

    await runCheck('buildValidationExport handles normal small payload', async () => {
        const harness = createHarness();
        const result = await harness.buildValidationExport({
            validated: [
                {
                    Error_Type: 'Valid',
                    translate_input: 'IN-1',
                    translate_output: 'OUT-1',
                    outcomes_school: 'Alpha University',
                    wsu_school: 'Alpha University'
                }
            ],
            selectedCols: {
                outcomes: ['school', 'key'],
                wsu_org: ['school', 'key']
            },
            context: {
                loadedData: {
                    outcomes: [{ key: 'IN-1', school: 'Alpha University' }],
                    translate: [{ translate_input: 'IN-1', translate_output: 'OUT-1' }],
                    wsu_org: [{ key: 'OUT-1', school: 'Alpha University' }]
                },
                keyConfig: {
                    outcomes: 'key',
                    translateInput: 'translate_input',
                    translateOutput: 'translate_output',
                    wsu: 'key'
                },
                keyLabels: {
                    outcomes: 'key',
                    wsu: 'key',
                    translateInput: 'translate_input',
                    translateOutput: 'translate_output'
                },
                columnRoles: {
                    outcomes: { school: 'School' },
                    wsu_org: { school: 'School' }
                }
            },
            options: {
                fileName: 'Validation_Test.xlsx'
            }
        });
        assertExportResult(result);
        assert.equal(result.filename, 'Validation_Test.xlsx');
        const workbook = harness.getLastWorkbook();
        assert.equal(
            workbook.calcProperties && workbook.calcProperties.fullCalcOnLoad,
            true,
            'Validation workbook should force full recalculation on open'
        );
        assert.ok(workbook.getWorksheet('Review_Workbench'), 'Expected Review_Workbench worksheet');
        assert.ok(workbook.getWorksheet('QA_Checks_Validate'), 'Expected QA_Checks_Validate worksheet');
        const finalSheet = workbook.getWorksheet('Final_Translation_Table');
        assert.ok(finalSheet, 'Expected Final_Translation_Table worksheet');
        const stagingSheet = workbook.getWorksheet('Final_Staging');
        assert.ok(stagingSheet, 'Expected Final_Staging worksheet');
        const translateInputCol = findHeaderIndex(finalSheet, 'Translate Input');
        assert.ok(translateInputCol > 0, 'Final table should include Translate Input');
        const stagingTranslateInputCol = findHeaderIndex(stagingSheet, 'Translate Input');
        assert.ok(stagingTranslateInputCol > 0, 'Final_Staging should include Translate Input');
        const stagingInputCell = stagingSheet.getRow(2).getCell(stagingTranslateInputCol).value;
        assert.equal(stagingInputCell, 'IN-1', 'Auto-approved rows should be written as plain values in Final_Staging');
        const filterCell = finalSheet.getRow(2).getCell(1).value;
        assert.ok(filterCell && filterCell.formula, 'Final table A2 should have FILTER formula');
        assert.ok(!filterCell.formula.startsWith('='), 'FILTER formula must not have leading = (OOXML compliance)');
        assert.ok(filterCell.formula.includes('_xlfn._xlws.FILTER'), 'FILTER must use future-function namespace _xlfn._xlws.FILTER');
        assert.strictEqual(filterCell.shareType, 'array', 'FILTER must have shareType array');
        assert.ok(filterCell.ref && /^A2:[A-Z]+\d+$/.test(filterCell.ref), 'FILTER ref must be bounded range A2:ColN');
        assert.ok(filterCell.formula.includes('Final_Staging'), 'FILTER formula should reference Final_Staging');
        assert.ok(/\$[A-Z]+\$\d+:\$[A-Z]+\$\d+/.test(filterCell.formula), 'FILTER must use absolute ref $Col$2:$Col$N for include range');
    });

    await runCheck('buildValidationExport keeps review-to-final approval flow and output-side duplicate suggestions', async () => {
        const harness = createHarness();
        const result = await harness.buildValidationExport({
            validated: [
                {
                    Error_Type: 'Duplicate_Target',
                    Duplicate_Group: 'G-1',
                    translate_input: 'IN-ALPHA',
                    translate_output: 'OUT-LEGACY',
                    outcomes_school: 'Alpha Campus',
                    wsu_school: 'Legacy Org'
                }
            ],
            selectedCols: {
                outcomes: ['school'],
                wsu_org: ['school']
            },
            options: {
                includeSuggestions: true,
                nameCompareConfig: {
                    enabled: true,
                    outcomes: 'school',
                    wsu: 'school',
                    threshold: 0.8
                }
            },
            context: {
                loadedData: {
                    outcomes: [{ key: 'IN-ALPHA', school: 'Alpha Campus' }],
                    translate: [{ translate_input: 'IN-ALPHA', translate_output: 'OUT-LEGACY' }],
                    wsu_org: [
                        { key: 'OUT-LEGACY', school: 'Legacy Org' },
                        { key: 'OUT-BETTER', school: 'Alpha Campus' }
                    ]
                },
                keyConfig: {
                    outcomes: 'key',
                    translateInput: 'translate_input',
                    translateOutput: 'translate_output',
                    wsu: 'key'
                },
                keyLabels: {
                    outcomes: 'key',
                    wsu: 'key',
                    translateInput: 'translate_input',
                    translateOutput: 'translate_output'
                },
                columnRoles: {
                    outcomes: { school: 'School' },
                    wsu_org: { school: 'School' }
                }
            }
        });
        assertExportResult(result);

        const workbook = harness.getLastWorkbook();
        const actionQueue = workbook.getWorksheet('Action_Queue');
        const approvedMappings = workbook.getWorksheet('Approved_Mappings');
        const errorsSheet = workbook.getWorksheet('Errors_in_Translate');
        const ambiguousOutputSheet = workbook.getWorksheet('Output_Not_Found_Ambiguous');
        const noReplacementOutputSheet = workbook.getWorksheet('Output_Not_Found_No_Replacement');
        const oneToMany = workbook.getWorksheet('One_to_Many');
        const missingMappings = workbook.getWorksheet('Missing_Mappings');
        const highConfidence = workbook.getWorksheet('High_Confidence_Matches');
        const validMappings = workbook.getWorksheet('Valid_Mappings');
        const reviewSheet = workbook.getWorksheet('Review_Workbench');
        const finalSheet = workbook.getWorksheet('Final_Translation_Table');
        assert.ok(actionQueue, 'Expected Action_Queue worksheet');
        assert.ok(approvedMappings, 'Expected Approved_Mappings worksheet');
        assert.ok(errorsSheet, 'Expected Errors_in_Translate worksheet');
        assert.ok(oneToMany, 'Expected One_to_Many worksheet');
        assert.ok(missingMappings, 'Expected Missing_Mappings worksheet');
        assert.ok(highConfidence, 'Expected High_Confidence_Matches worksheet');
        assert.ok(validMappings, 'Expected Valid_Mappings worksheet');
        assert.ok(reviewSheet, 'Expected Review_Workbench worksheet');
        assert.ok(finalSheet, 'Expected Final_Translation_Table worksheet');

        assert.equal(actionQueue.state, 'hidden', 'Action_Queue should be hidden in exported workbook');
        assert.equal(approvedMappings.state, 'hidden', 'Approved_Mappings should be hidden in exported workbook');
        assert.equal(errorsSheet.state, 'hidden', 'Errors_in_Translate should be hidden in exported workbook');
        if (ambiguousOutputSheet) {
            assert.equal(ambiguousOutputSheet.state, 'hidden', 'Output_Not_Found_Ambiguous should be hidden in exported workbook');
        }
        if (noReplacementOutputSheet) {
            assert.equal(noReplacementOutputSheet.state, 'hidden', 'Output_Not_Found_No_Replacement should be hidden in exported workbook');
        }
        assert.equal(oneToMany.state, 'hidden', 'One_to_Many should be hidden in exported workbook');
        assert.equal(missingMappings.state, 'hidden', 'Missing_Mappings should be hidden in exported workbook');
        assert.equal(highConfidence.state, 'hidden', 'High_Confidence_Matches should be hidden in exported workbook');
        assert.equal(validMappings.state, 'hidden', 'Valid_Mappings should be hidden in exported workbook');

        const reviewSheetIndex = workbook._worksheets.findIndex(sheet => sheet && sheet.name === 'Review_Workbench');
        assert.ok(reviewSheetIndex >= 0, 'Review_Workbench should exist in workbook order');
        assert.equal(workbook.views?.[0]?.activeTab, reviewSheetIndex, 'Review_Workbench should be the active tab on open');
        assert.equal(workbook.views?.[0]?.firstSheet, reviewSheetIndex, 'Review_Workbench should be the first visible tab on open');

        const reviewView = Array.isArray(reviewSheet.views) && reviewSheet.views[0] ? reviewSheet.views[0] : {};
        assert.equal(reviewView.ySplit, 1, 'Review_Workbench should freeze header row');
        assert.ok(!reviewView.xSplit, 'Review_Workbench should not freeze wide left pane columns');

        const suggestedKeyCol = findHeaderIndex(oneToMany, 'Suggested Key');
        assert.ok(suggestedKeyCol > 0, 'One_to_Many should include Suggested Key');
        const suggestedKeyValue = oneToMany.getRow(2).getCell(suggestedKeyCol).value;
        assert.equal(suggestedKeyValue, 'OUT-BETTER', 'Duplicate rows should suggest myWSU output-side key');

        const reviewFinalInputCol = findHeaderIndex(reviewSheet, 'Final Translate Input');
        const reviewPublishEligibleCol = findHeaderIndex(reviewSheet, 'Publish Eligible (1=yes)');
        assert.ok(reviewFinalInputCol > 0, 'Review sheet should include Final Translate Input');
        assert.ok(reviewPublishEligibleCol > 0, 'Review sheet should include Publish Eligible');
        const finalInputFormula = reviewSheet.getRow(2).getCell(reviewFinalInputCol).value?.formula || '';
        const publishFormula = reviewSheet.getRow(2).getCell(reviewPublishEligibleCol).value?.formula || '';
        assert.ok(finalInputFormula.includes('"Keep As-Is"') && finalInputFormula.includes('"Use Suggestion"'), 'Final input formula should use renamed decision values');
        assert.ok(publishFormula.includes('"Keep As-Is"') && publishFormula.includes('"Allow One-to-Many"'), 'Publish eligibility should use renamed decision values');

        const finalFilterCell = finalSheet.getRow(2).getCell(1).value;
        assert.ok(finalFilterCell?.formula, 'Final table A2 should have FILTER formula');
        assert.ok(!finalFilterCell.formula.startsWith('='), 'FILTER formula must not have leading = (OOXML compliance)');
        assert.ok(finalFilterCell.formula.includes('_xlfn._xlws.FILTER'), 'FILTER must use future-function namespace _xlfn._xlws.FILTER');
        assert.strictEqual(finalFilterCell.shareType, 'array', 'FILTER must have shareType array');
        assert.ok(finalFilterCell.ref && /^A2:[A-Z]+\d+$/.test(finalFilterCell.ref), 'FILTER ref must be bounded range A2:ColN');
        assert.ok(finalFilterCell.formula.includes('Final_Staging'), 'Final table should pull from Final_Staging via FILTER');
        assert.ok(/\$[A-Z]+\$\d+:\$[A-Z]+\$\d+/.test(finalFilterCell.formula), 'FILTER must use absolute ref $Col$2:$Col$N for include range');
        const stagingSheet = workbook.getWorksheet('Final_Staging');
        assert.ok(stagingSheet, 'Final_Staging should exist and feed Final_Translation_Table');
        const outcomesNameCol = findHeaderIndex(finalSheet, 'Outcomes Name');
        const myWsuNameCol = findHeaderIndex(finalSheet, 'myWSU Name');
        const translateInputCol = findHeaderIndex(finalSheet, 'Translate Input');
        const translateOutputCol = findHeaderIndex(finalSheet, 'Translate Output');
        assert.ok(outcomesNameCol > 0, 'Final table should include Outcomes Name context');
        assert.ok(myWsuNameCol > 0, 'Final table should include myWSU Name context');
        assert.ok(translateInputCol > 0 && translateOutputCol > 0, 'Final table should include Translate Input and Translate Output');
        assert.equal(
            findHeaderIndex(finalSheet, '_Approved Pick'),
            0,
            'Final table should not include AGGREGATE helper columns'
        );
        assert.ok(finalSheet.autoFilter, 'Final table should have autoFilter enabled');
        assert.equal(finalSheet.autoFilter.from, 'A1', 'Final table autoFilter should start at A1');
        assert.ok(finalSheet.autoFilter.to, 'Final table autoFilter should include all output columns');

        const qaSheet = workbook.getWorksheet('QA_Checks_Validate');
        assert.ok(qaSheet, 'Expected QA_Checks_Validate worksheet');
        const publishGateDetail = qaSheet.getRow(12).getCell(4).value;
        assert.ok(
            String(publishGateDetail || '').includes('Diagnostic tabs are hidden'),
            'QA publish gate detail should mention hidden diagnostic tabs'
        );
    });

    await runCheck('buildGenerationExport includes create review guidance columns and instructions', async () => {
        const harness = createHarness();
        const result = await harness.buildGenerationExport({
            cleanRows: [
                {
                    outcomes_row_index: 0,
                    outcomes_record_id: 'OUT-1',
                    outcomes_display_name: 'Alpha University',
                    proposed_wsu_key: 'WSU-1',
                    proposed_wsu_name: 'Alpha University',
                    match_similarity: 97,
                    confidence_tier: 'high',
                    outcomes_school: 'Alpha University',
                    wsu_school: 'Alpha University'
                }
            ],
            errorRows: [
                {
                    outcomes_row_index: 1,
                    outcomes_record_id: 'OUT-2',
                    outcomes_display_name: 'Beta College',
                    missing_in: 'Ambiguous Match',
                    proposed_wsu_key: 'WSU-2A',
                    proposed_wsu_name: 'Beta College Main',
                    alternate_candidates: [
                        { key: 'WSU-2A', name: 'Beta College Main', similarity: 94 },
                        { key: 'WSU-2B', name: 'Beta College South', similarity: 92 }
                    ],
                    outcomes_school: 'Beta College',
                    wsu_school: ''
                },
                {
                    outcomes_row_index: 2,
                    outcomes_record_id: 'OUT-3',
                    outcomes_display_name: 'Gamma Institute',
                    missing_in: 'myWSU',
                    alternate_candidates: [],
                    outcomes_school: 'Gamma Institute',
                    wsu_school: ''
                }
            ],
            selectedCols: {
                outcomes: ['school'],
                wsu_org: ['school']
            },
            generationConfig: {
                threshold: 0.8
            }
        });
        assertExportResult(result);

        const workbook = harness.getLastWorkbook();
        assert.equal(
            workbook.calcProperties && workbook.calcProperties.fullCalcOnLoad,
            true,
            'Generation workbook should force full recalculation on open'
        );
        const ambiguousSheet = workbook.getWorksheet('Ambiguous_Candidates');
        const missingSheet = workbook.getWorksheet('Missing_In_myWSU');
        const reviewSheet = workbook.getWorksheet('Review_Decisions');
        const instructionsSheet = workbook.getWorksheet('Review_Instructions_Create');
        assert.ok(ambiguousSheet, 'Expected Ambiguous_Candidates worksheet');
        assert.ok(missingSheet, 'Expected Missing_In_myWSU worksheet');
        assert.ok(reviewSheet, 'Expected Review_Decisions worksheet');
        assert.ok(instructionsSheet, 'Expected Review_Instructions_Create worksheet');

        const ambiguousHeaders = getRowValues(ambiguousSheet, 1, 40).map(v => String(v || ''));
        assert.ok(ambiguousHeaders.includes('Resolution Type'), 'Ambiguous sheet should include Resolution Type');
        assert.ok(ambiguousHeaders.includes('Review Path'), 'Ambiguous sheet should include Review Path');
        assert.ok(ambiguousHeaders.includes('Candidate Count'), 'Ambiguous sheet should include Candidate Count');
        assert.ok(ambiguousHeaders.includes('Top Suggested myWSU Key'), 'Ambiguous sheet should include top suggested key');

        const reviewHeaders = getRowValues(reviewSheet, 1, 40).map(v => String(v || ''));
        assert.ok(reviewHeaders.includes('Resolution Type'), 'Review sheet should include Resolution Type');
        assert.ok(reviewHeaders.includes('Review Path'), 'Review sheet should include Review Path');
        assert.ok(reviewHeaders.includes('Candidate Count'), 'Review sheet should include Candidate Count');

        const candidateCountIndex = ambiguousHeaders.indexOf('Candidate Count');
        assert.ok(candidateCountIndex >= 0, 'Candidate Count column must exist');
        const candidateCountValue = ambiguousSheet.getRow(2).getCell(candidateCountIndex + 1).value;
        assert.equal(candidateCountValue, 2, 'Ambiguous row should expose candidate count');

        const allCFRules = reviewSheet.conditionalFormatting.flatMap(cf => cf.rules || []);
        const expressionRules = allCFRules.filter(r => r.type === 'expression');
        assert.ok(expressionRules.length >= 3, 'Review sheet should include expression conditional formatting rules');
        expressionRules.forEach((rule, idx) => {
            assert.ok(Array.isArray(rule.formulae), `Create expression rule ${idx} should use formulae array`);
            assert.equal(rule.formula, undefined, `Create expression rule ${idx} should not use singular formula`);
        });
    });

    await runCheck('expression-type CF rules use formulae array (not formula string)', async () => {
        const harness = createHarness();
        await harness.buildValidationExport({
            validated: [
                {
                    Error_Type: 'Name_Mismatch',
                    translate_input: 'IN-1',
                    translate_output: 'OUT-1',
                    outcomes_school: 'Alpha University',
                    wsu_school: 'Alpha University',
                    Source_Sheet: 'One_to_Many',
                    Is_Stale_Key: 0,
                    duplicateGroup: ''
                }
            ],
            selectedCols: {
                outcomes: ['school'],
                wsu_org: ['school']
            },
            context: {
                loadedData: {
                    outcomes: [{ key: 'IN-1', school: 'Alpha University' }],
                    translate: [{ translate_input: 'IN-1', translate_output: 'OUT-1' }],
                    wsu_org: [{ key: 'OUT-1', school: 'Alpha University' }]
                },
                keyConfig: {
                    outcomes: 'key',
                    translateInput: 'translate_input',
                    translateOutput: 'translate_output',
                    wsu: 'key'
                },
                keyLabels: {
                    outcomes: 'key',
                    wsu: 'key',
                    translateInput: 'translate_input',
                    translateOutput: 'translate_output'
                },
                columnRoles: {
                    outcomes: { school: 'School' },
                    wsu_org: { school: 'School' }
                }
            }
        });
        const workbook = harness.getLastWorkbook();
        const reviewSheet = workbook.getWorksheet('Review_Workbench');
        assert.ok(reviewSheet, 'Expected Review_Workbench worksheet');
        const allCFRules = reviewSheet.conditionalFormatting.flatMap(cf => cf.rules || []);
        const expressionRules = allCFRules.filter(r => r.type === 'expression');
        assert.ok(expressionRules.length > 0, 'Expected at least one expression-type CF rule');
        expressionRules.forEach((rule, idx) => {
            assert.ok(
                Array.isArray(rule.formulae),
                `Expression rule ${idx}: formulae must be an array, got ${typeof rule.formulae}`
            );
            assert.ok(
                rule.formulae.length > 0,
                `Expression rule ${idx}: formulae array must not be empty`
            );
            assert.equal(
                rule.formula,
                undefined,
                `Expression rule ${idx}: must not have singular 'formula' property (ExcelJS requires 'formulae' array)`
            );
        });
    });

    if (failures > 0) {
        console.error(`\n${failures} export test(s) failed.`);
        process.exit(1);
    }

    console.log('\nAll export validation tests passed.');
}

run().catch(error => {
    console.error(`[FAIL] export-test fatal error: ${error.message}`);
    process.exit(1);
});
