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

    return {
        buildValidationExport: (payload) => vmContext.buildValidationExport(payload),
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
        assert.ok(workbook.getWorksheet('Review_Workbench'), 'Expected Review_Workbench worksheet');
        assert.ok(workbook.getWorksheet('QA_Checks_Validate'), 'Expected QA_Checks_Validate worksheet');
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
