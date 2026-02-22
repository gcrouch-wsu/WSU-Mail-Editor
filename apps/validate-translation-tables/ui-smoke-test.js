'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appPath = path.join(__dirname, 'app.js');
const indexPath = path.join(__dirname, 'index.html');
const appCode = fs.readFileSync(appPath, 'utf8');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

let failures = 0;

function runCheck(name, fn) {
    return Promise.resolve()
        .then(fn)
        .then(() => {
            console.log(`[PASS] ${name}`);
        })
        .catch((error) => {
            failures += 1;
            console.error(`[FAIL] ${name}: ${error.message}`);
        });
}

function extractIds(html) {
    const ids = new Set();
    const re = /id="([^"]+)"/g;
    let match = re.exec(html);
    while (match) {
        ids.add(match[1]);
        match = re.exec(html);
    }
    return ids;
}

function createElementStub(id) {
    return {
        id,
        value: '',
        checked: false,
        disabled: false,
        textContent: '',
        innerHTML: '',
        files: [],
        style: { width: '' },
        dataset: {},
        classList: {
            add() {},
            remove() {},
            toggle() {},
            contains() { return false; }
        },
        addEventListener() {},
        removeEventListener() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        appendChild() {},
        removeChild() {},
        setAttribute() {},
        getAttribute() { return ''; },
        scrollIntoView() {},
        getContext() { return {}; }
    };
}

function createAppContext(htmlIds) {
    const elementMap = new Map();
    const alerts = [];
    let domContentLoadedHandler = null;

    const documentStub = {
        body: createElementStub('body'),
        addEventListener(type, handler) {
            if (type === 'DOMContentLoaded') {
                domContentLoadedHandler = handler;
            }
        },
        dispatchEvent() {},
        createElement(tagName) {
            return createElementStub(tagName);
        },
        getElementById(id) {
            if (!htmlIds.has(id)) return null;
            if (!elementMap.has(id)) {
                elementMap.set(id, createElementStub(id));
            }
            return elementMap.get(id);
        }
    };

    const context = {
        console,
        setTimeout,
        clearTimeout,
        Blob,
        document: documentStub,
        window: {
            URL: {
                createObjectURL() { return 'blob:stub'; },
                revokeObjectURL() {}
            }
        },
        location: { reload() {} },
        alert(message) {
            alerts.push(String(message ?? ''));
        },
        confirm() { return true; },
        fetch: async () => ({ ok: false, json: async () => ({}) }),
        Worker: function WorkerStub() {
            return {
                onmessage: null,
                onerror: null,
                terminate() {},
                postMessage() {}
            };
        }
    };

    vm.createContext(context);
    vm.runInContext(appCode, context, { filename: appPath });

    return {
        context,
        clearAlerts() {
            alerts.length = 0;
        },
        getAlerts() {
            return alerts.slice();
        },
        setActionQueueRows(rows) {
            const payload = JSON.stringify(Array.isArray(rows) ? rows : []);
            vm.runInContext(`actionQueueRowsCache = ${payload}; preEditedActionQueueRows = null;`, context);
        },
        getActionQueueRows() {
            const json = vm.runInContext('JSON.stringify(getCurrentActionQueueRows())', context);
            return JSON.parse(json);
        },
        runDomReady() {
            assert.equal(typeof domContentLoadedHandler, 'function', 'Expected DOMContentLoaded handler to register');
            domContentLoadedHandler();
        }
    };
}

async function run() {
    const htmlIds = extractIds(indexHtml);

    await runCheck('index: required new controls exist', () => {
        assert.ok(htmlIds.has('session-upload-card'));
        assert.ok(htmlIds.has('session-upload-file'));
        assert.ok(htmlIds.has('campus-family-template-json-btn'));
        assert.ok(htmlIds.has('campus-family-template-csv-btn'));
        assert.ok(htmlIds.has('show-unresolved-errors-only'));
        assert.ok(htmlIds.has('bulk-filter-translation-only'));
        assert.ok(htmlIds.has('bulk-load-progress'));
        assert.ok(htmlIds.has('bulk-mark-reviewed-btn'));
        assert.ok(htmlIds.has('bulk-clear-reviewed-btn'));
        assert.ok(htmlIds.has('bulk-edit-reviewed-count'));
    });

    await runCheck('index: removed review-order card is absent', () => {
        assert.ok(!htmlIds.has('recommended-review-order'));
        assert.ok(!htmlIds.has('review-order-list'));
    });

    await runCheck('app: dead review-order renderer removed', () => {
        assert.ok(!appCode.includes('function renderRecommendedReviewOrder'));
    });

    const { context, clearAlerts, getAlerts, setActionQueueRows, getActionQueueRows, runDomReady } = createAppContext(htmlIds);

    await runCheck('app smoke: DOMContentLoaded bootstrap does not throw', async () => {
        runDomReady();
        await Promise.resolve();
    });

    await runCheck('parseCampusFamilyDelimitedText: parses => form', () => {
        const rows = context.parseCampusFamilyDelimitedText('Texas A&M* => TAMU-MAIN\n# comment');
        assert.equal(rows.length, 1);
        assert.equal(rows[0].pattern, 'Texas A&M*');
        assert.equal(rows[0].parentKey, 'TAMU-MAIN');
    });

    await runCheck('parseCampusFamilyDelimitedText: parses headered CSV-like text', () => {
        const rows = context.parseCampusFamilyDelimitedText('pattern,parentKey,country,state,priority,enabled\nTroy*,TROY-MAIN,US,AL,2,false');
        assert.equal(rows.length, 1);
        assert.equal(rows[0].pattern, 'Troy*');
        assert.equal(rows[0].parentKey, 'TROY-MAIN');
        assert.equal(rows[0].country, 'US');
        assert.equal(rows[0].enabled, 'false');
    });

    await runCheck('parseCampusFamilyDelimitedText: parses pipe-delimited rows', () => {
        const rows = context.parseCampusFamilyDelimitedText('UCLA*|UCLA-MAIN|US|CA|5|no');
        assert.equal(rows.length, 1);
        assert.equal(rows[0].pattern, 'UCLA*');
        assert.equal(rows[0].parentKey, 'UCLA-MAIN');
        assert.equal(rows[0].country, 'US');
        assert.equal(rows[0].state, 'CA');
        assert.equal(rows[0].priority, '5');
        assert.equal(rows[0].enabled, 'no');
    });

    await runCheck('parseCampusFamilyDelimitedText: parses tab-delimited rows', () => {
        const rows = context.parseCampusFamilyDelimitedText(
            'pattern\tparentKey\tcountry\tstate\tpriority\tenabled\nCal Poly*\tCALPOLY-MAIN\tUS\tCA\t4\ttrue'
        );
        assert.equal(rows.length, 1);
        assert.equal(rows[0].pattern, 'Cal Poly*');
        assert.equal(rows[0].parentKey, 'CALPOLY-MAIN');
        assert.equal(rows[0].country, 'US');
        assert.equal(rows[0].state, 'CA');
        assert.equal(rows[0].priority, '4');
        assert.equal(rows[0].enabled, 'true');
    });

    await runCheck('parseCampusFamilyRulesFile: JSON patterns payload normalizes', async () => {
        const parsed = await context.parseCampusFamilyRulesFile({
            name: 'rules.json',
            text: async () => JSON.stringify({
                patterns: [
                    { pattern: 'Texas A&M*', parentKey: 'TAMU-MAIN', enabled: 'no', priority: '9' }
                ]
            })
        });
        assert.equal(parsed.version, 1);
        assert.equal(parsed.patterns.length, 1);
        assert.equal(parsed.patterns[0].enabled, false);
        assert.equal(parsed.patterns[0].priority, 9);
    });

    await runCheck('parseCampusFamilyRulesFile: CSV loadFile path normalizes rows', async () => {
        const originalLoadFile = context.loadFile;
        context.loadFile = async () => [{ Pattern: 'Cal State*', ParentKey: 'CALSTATE-MAIN', Enabled: '1', Priority: '3' }];
        try {
            const parsed = await context.parseCampusFamilyRulesFile({
                name: 'rules.csv',
                text: async () => ''
            });
            assert.equal(parsed.patterns.length, 1);
            assert.equal(parsed.patterns[0].pattern, 'Cal State*');
            assert.equal(parsed.patterns[0].parentKey, 'CALSTATE-MAIN');
            assert.equal(parsed.patterns[0].enabled, true);
            assert.equal(parsed.patterns[0].priority, 3);
        } finally {
            context.loadFile = originalLoadFile;
        }
    });

    await runCheck('parseCampusFamilyRulesFile: CSV fallback parses text when loadFile throws', async () => {
        const originalLoadFile = context.loadFile;
        let called = 0;
        context.loadFile = async () => {
            called += 1;
            throw new Error('csv parse failure');
        };
        try {
            const parsed = await context.parseCampusFamilyRulesFile({
                name: 'rules.csv',
                text: async () => 'pattern,parentKey\nTroy University*,TROY-MAIN'
            });
            assert.equal(called, 1);
            assert.equal(parsed.patterns.length, 1);
            assert.equal(parsed.patterns[0].pattern, 'Troy University*');
            assert.equal(parsed.patterns[0].parentKey, 'TROY-MAIN');
        } finally {
            context.loadFile = originalLoadFile;
        }
    });

    await runCheck('parseCampusFamilyRulesFile: XLSX loadFile path works', async () => {
        const originalLoadFile = context.loadFile;
        context.loadFile = async () => [{ pattern: 'University of California*', parentKey: 'UC-MAIN' }];
        try {
            const parsed = await context.parseCampusFamilyRulesFile({
                name: 'rules.xlsx',
                text: async () => ''
            });
            assert.equal(parsed.patterns.length, 1);
            assert.equal(parsed.patterns[0].pattern, 'University of California*');
        } finally {
            context.loadFile = originalLoadFile;
        }
    });

    await runCheck('parseCampusFamilyRulesFile: rejects when no valid rules exist', async () => {
        const originalLoadFile = context.loadFile;
        context.loadFile = async () => [{ pattern: '', parentKey: '' }];
        try {
            await assert.rejects(
                () => context.parseCampusFamilyRulesFile({ name: 'invalid.xlsx', text: async () => '' }),
                /No valid rules found/
            );
        } finally {
            context.loadFile = originalLoadFile;
        }
    });

    await runCheck('action queue prefetch: reuses in-flight promise and hydrates cache', async () => {
        vm.runInContext(`
            validatedData = [{ Review_Row_ID: 'seed' }];
            missingData = [];
            selectedColumns = { outcomes: [], wsu_org: [] };
            priorDecisions = null;
            lastNameCompareConfig = {};
            campusFamilyRules = null;
            loadedData = { outcomes: [], translate: [], wsu_org: [] };
            columnRoles = { outcomes: {}, wsu_org: {} };
            keyConfig = { outcomes: '', translateInput: '', translateOutput: '', wsu: '' };
            keyLabels = { outcomes: '', translateInput: '', translateOutput: '', wsu: '' };
            actionQueueRowsCache = null;
            preEditedActionQueueRows = null;
            actionQueuePrefetchPromise = null;
            actionQueuePrefetchInFlight = false;
        `, context);

        const originalRunExportWorkerTask = context.runExportWorkerTask;
        let calls = 0;
        let resolveTask;
        context.runExportWorkerTask = async () => {
            calls += 1;
            return new Promise((resolve) => {
                resolveTask = resolve;
            });
        };

        try {
            const p1 = context.startActionQueuePrefetch();
            const p2 = context.startActionQueuePrefetch();
            assert.equal(calls, 1);
            assert.equal(p1, p2);

            resolveTask({
                actionQueueRows: [{ Review_Row_ID: 'RID-PREFETCH', _candidates: [{ candidateId: 'C1' }] }]
            });
            await p1;

            const cacheRows = JSON.parse(vm.runInContext('JSON.stringify(actionQueueRowsCache)', context));
            const editedRows = JSON.parse(vm.runInContext('JSON.stringify(preEditedActionQueueRows)', context));
            assert.equal(cacheRows.length, 1);
            assert.equal(cacheRows[0].Review_Row_ID, 'RID-PREFETCH');
            assert.equal(editedRows.length, 1);
            assert.equal(editedRows[0].Review_Row_ID, 'RID-PREFETCH');
            assert.equal(vm.runInContext('actionQueuePrefetchPromise === null', context), true);
            assert.equal(vm.runInContext('actionQueuePrefetchInFlight === false', context), true);
        } finally {
            context.runExportWorkerTask = originalRunExportWorkerTask;
        }
    });

    await runCheck('action queue prefetch: cancel terminates active prefetch worker', () => {
        vm.runInContext(`
            var __termCount = 0;
            var __rejectCount = 0;
            activeExportWorker = { terminate() { __termCount += 1; } };
            activeExportWorkerReject = () => { __rejectCount += 1; };
            actionQueuePrefetchPromise = Promise.resolve();
            actionQueuePrefetchInFlight = true;
        `, context);

        context.cancelActionQueuePrefetch();
        assert.equal(vm.runInContext('__termCount', context), 1);
        assert.equal(vm.runInContext('__rejectCount', context), 1);
        assert.equal(vm.runInContext('actionQueuePrefetchPromise === null', context), true);
        assert.equal(vm.runInContext('actionQueuePrefetchInFlight === false', context), true);
    });

    await runCheck('unresolved view: requires explicit Reviewed plus non-blank decision', () => {
        const rows = [
            {
                Error_Type: 'Duplicate_Source',
                Error_Subtype: '',
                Decision: 'Keep As-Is',
                Reviewed: false,
                translate_input: 'A',
                translate_output: '1'
            },
            {
                Error_Type: 'Duplicate_Source',
                Error_Subtype: '',
                Decision: 'Keep As-Is',
                Reviewed: true,
                translate_input: 'B',
                translate_output: '2'
            },
            {
                Error_Type: 'Duplicate_Source',
                Error_Subtype: '',
                Decision: '',
                Reviewed: true,
                translate_input: 'C',
                translate_output: '3'
            }
        ];
        const samples = context.buildErrorSamplesFromQueue(rows, 10, true);
        const chart = context.buildChartErrorsFromQueue(rows, true);
        assert.equal(samples.Duplicate_Source.count, 2);
        assert.equal(chart.duplicate_sources, 2);
    });

    await runCheck('applySessionDataToActionQueue: applies matches and reports unmatched Review_Row_ID', () => {
        setActionQueueRows([
            {
                Review_Row_ID: 'RID-100',
                Decision: '',
                Reason_Code: '',
                Manual_Suggested_Key: '',
                Selected_Candidate_ID: ''
            },
            {
                Review_Row_ID: 'RID-200',
                Decision: 'Keep As-Is',
                Reason_Code: 'existing',
                Manual_Suggested_Key: '',
                Selected_Candidate_ID: ''
            }
        ]);
        clearAlerts();

        const applied = context.applySessionDataToActionQueue(
            [
                {
                    Review_Row_ID: 'RID-100',
                    Decision: 'Use Suggestion',
                    Reason_Code: 'auto_fix',
                    Manual_Suggested_Key: 'UCLA-MAIN',
                    Selected_Candidate_ID: 'cand-1'
                },
                {
                    Review_Row_ID: 'RID-999',
                    Decision: 'Reject',
                    Reason_Code: 'manual_review'
                }
            ],
            { sourceLabel: 'Session Resume' }
        );

        assert.equal(applied, true);
        const rows = getActionQueueRows();
        assert.equal(rows.length, 2);
        assert.equal(rows[0].Decision, 'Use Suggestion');
        assert.equal(rows[0].Reason_Code, 'auto_fix');
        assert.equal(rows[0].Manual_Suggested_Key, 'UCLA-MAIN');
        assert.equal(rows[0].Selected_Candidate_ID, 'cand-1');
        assert.equal(rows[1].Decision, 'Keep As-Is');

        const alerts = getAlerts();
        assert.equal(alerts.length, 1);
        assert.match(alerts[0], /Session Resume loaded: 1 rows applied, 1 unmatched Review_Row_ID\./);
    });

    if (failures > 0) {
        console.error(`\n${failures} UI smoke/parser check(s) failed.`);
        process.exit(1);
    }

    console.log('\nAll validate-translation-table UI smoke/parser checks passed.');
}

run().catch((error) => {
    console.error(`[FAIL] ui-smoke-test runner: ${error.message}`);
    process.exit(1);
});
