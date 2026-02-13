'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const validationPath = path.join(__dirname, 'validation.js');
const validationCode = fs.readFileSync(validationPath, 'utf8');

const context = {
    console
};
vm.createContext(context);
vm.runInContext(validationCode, context, { filename: validationPath });

let failures = 0;

function runCheck(name, fn) {
    try {
        fn();
        console.log(`[PASS] ${name}`);
    } catch (error) {
        failures += 1;
        console.error(`[FAIL] ${name}: ${error.message}`);
    }
}

runCheck('countriesMatch: BD maps to Bangladesh', () => {
    assert.equal(context.countriesMatch('BD', 'Bangladesh'), true);
});

runCheck('countriesMatch: BG does not map to Bangladesh', () => {
    assert.equal(context.countriesMatch('BG', 'Bangladesh'), false);
});

runCheck('countriesMatch: NG maps to Nigeria', () => {
    assert.equal(context.countriesMatch('NG', 'Nigeria'), true);
});

runCheck('countriesMatch: NI does not map to Nigeria', () => {
    assert.equal(context.countriesMatch('NI', 'Nigeria'), false);
});

runCheck('mergeData throws on duplicate Outcomes keys', () => {
    const keyConfig = {
        outcomes: 'outcomes_key',
        translateInput: 'translate_input',
        translateOutput: 'translate_output',
        wsu: 'wsu_key'
    };
    const outcomes = [
        { outcomes_key: '1001', school: 'Alpha One' },
        { outcomes_key: '1001', school: 'Alpha Duplicate' }
    ];
    const translate = [{ translate_input: '1001', translate_output: '2001' }];
    const wsu = [{ wsu_key: '2001', school: 'Beta One' }];

    assert.throws(
        () => context.mergeData(outcomes, translate, wsu, keyConfig),
        /Outcomes source has duplicate key values/
    );
});

runCheck('mergeData throws on duplicate myWSU keys', () => {
    const keyConfig = {
        outcomes: 'outcomes_key',
        translateInput: 'translate_input',
        translateOutput: 'translate_output',
        wsu: 'wsu_key'
    };
    const outcomes = [{ outcomes_key: '1001', school: 'Alpha One' }];
    const translate = [{ translate_input: '1001', translate_output: '2001' }];
    const wsu = [
        { wsu_key: '2001', school: 'Beta One' },
        { wsu_key: '2001', school: 'Beta Duplicate' }
    ];

    assert.throws(
        () => context.mergeData(outcomes, translate, wsu, keyConfig),
        /myWSU source has duplicate key values/
    );
});

runCheck('mergeData succeeds with unique keys', () => {
    const keyConfig = {
        outcomes: 'outcomes_key',
        translateInput: 'translate_input',
        translateOutput: 'translate_output',
        wsu: 'wsu_key'
    };
    const outcomes = [{ outcomes_key: '1001', school: 'Alpha One' }];
    const translate = [{ translate_input: '1001', translate_output: '2001' }];
    const wsu = [{ wsu_key: '2001', school: 'Beta One' }];

    const merged = context.mergeData(outcomes, translate, wsu, keyConfig);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].outcomes_school, 'Alpha One');
    assert.equal(merged[0].wsu_school, 'Beta One');
});

const helpersPath = path.join(__dirname, 'validation-export-helpers.js');
const helpersCode = fs.readFileSync(helpersPath, 'utf8');
const helpersContext = { module: { exports: {} }, require: () => {} };
vm.createContext(helpersContext);
vm.runInContext(helpersCode, helpersContext, { filename: helpersPath });
const helpers = helpersContext.module.exports;
const exportWorkerPath = path.join(__dirname, 'export-worker.js');
const exportWorkerCode = fs.readFileSync(exportWorkerPath, 'utf8');

runCheck('validation-export-helpers: OUTPUT_NOT_FOUND_SUBTYPE has three values', () => {
    assert.ok(helpers.OUTPUT_NOT_FOUND_SUBTYPE.LIKELY_STALE_KEY);
    assert.ok(helpers.OUTPUT_NOT_FOUND_SUBTYPE.AMBIGUOUS_REPLACEMENT);
    assert.ok(helpers.OUTPUT_NOT_FOUND_SUBTYPE.NO_REPLACEMENT);
});

runCheck('validation-export-helpers: getPriority returns correct order', () => {
    assert.ok(helpers.getPriority('Missing_Input') < helpers.getPriority('Name_Mismatch'));
    assert.ok(helpers.getPriority('Output_Not_Found', helpers.OUTPUT_NOT_FOUND_SUBTYPE.NO_REPLACEMENT) <
        helpers.getPriority('Output_Not_Found', helpers.OUTPUT_NOT_FOUND_SUBTYPE.LIKELY_STALE_KEY));
});

runCheck('validation-export-helpers: getRecommendedAction returns non-empty', () => {
    assert.ok(helpers.getRecommendedAction('Missing_Input').length > 0);
    assert.ok(helpers.getRecommendedAction('Output_Not_Found', helpers.OUTPUT_NOT_FOUND_SUBTYPE.LIKELY_STALE_KEY).length > 0);
});

runCheck('generateSummaryStats returns Output_Not_Found subtype keys', () => {
    const validated = [
        { Error_Type: 'Output_Not_Found', Error_Subtype: 'Output_Not_Found_Likely_Stale_Key' },
        { Error_Type: 'Output_Not_Found', Error_Subtype: 'Output_Not_Found_Ambiguous_Replacement' },
        { Error_Type: 'Output_Not_Found', Error_Subtype: 'Output_Not_Found_No_Replacement' }
    ];
    const outcomes = [];
    const translate = [];
    const wsu = [];
    const stats = context.generateSummaryStats(validated, outcomes, translate, wsu);
    assert.ok('output_not_found_likely_stale_key' in stats.errors);
    assert.ok('output_not_found_ambiguous_replacement' in stats.errors);
    assert.ok('output_not_found_no_replacement' in stats.errors);
});

runCheck('Action_Queue context columns include Missing_In and Similarity', () => {
    assert.ok(helpers.ACTION_QUEUE_CONTEXT_COLUMNS.includes('Missing_In'));
    assert.ok(helpers.ACTION_QUEUE_CONTEXT_COLUMNS.includes('Similarity'));
});

runCheck('filterOutputNotFoundBySubtype uses raw subtype', () => {
    const rows = [
        { _rawErrorType: 'Output_Not_Found', _rawErrorSubtype: helpers.OUTPUT_NOT_FOUND_SUBTYPE.AMBIGUOUS_REPLACEMENT },
        { _rawErrorType: 'Output_Not_Found', _rawErrorSubtype: helpers.OUTPUT_NOT_FOUND_SUBTYPE.NO_REPLACEMENT },
        { _rawErrorType: 'Input_Not_Found', _rawErrorSubtype: '' }
    ];
    const ambiguous = helpers.filterOutputNotFoundBySubtype(rows, helpers.OUTPUT_NOT_FOUND_SUBTYPE.AMBIGUOUS_REPLACEMENT);
    const noRepl = helpers.filterOutputNotFoundBySubtype(rows, helpers.OUTPUT_NOT_FOUND_SUBTYPE.NO_REPLACEMENT);
    assert.equal(ambiguous.length, 1);
    assert.equal(noRepl.length, 1);
    assert.equal(ambiguous[0]._rawErrorSubtype, helpers.OUTPUT_NOT_FOUND_SUBTYPE.AMBIGUOUS_REPLACEMENT);
    assert.equal(noRepl[0]._rawErrorSubtype, helpers.OUTPUT_NOT_FOUND_SUBTYPE.NO_REPLACEMENT);
});

runCheck('getQAValidateRowsForEmptyQueue returns valid structure', () => {
    const rows = helpers.getQAValidateRowsForEmptyQueue();
    assert.equal(rows.length, 12, 'Header + 11 check rows matching non-empty QA layout');
    assert.equal(rows[0][0], 'Check');
    assert.equal(rows[1][1], 0);
    assert.equal(rows[1][2], 'PASS');
    assert.equal(rows[2][2], 'PASS', 'Approved review rows status should be PASS when empty');
    assert.equal(rows[6][0], 'Update Key with invalid Update Side');
    assert.equal(rows[7][0], 'Stale-key rows lacking decision');
    assert.equal(rows[11][0], 'Publish gate');
    assert.equal(rows[11][1], 'PASS', 'Empty-queue publish gate result in column B to match non-empty layout');
    assert.equal(rows[11][2], '', 'Empty-queue publish gate Status column C empty to match non-empty');
});

runCheck('export-worker: Input_Not_Found uses reverse name suggestion from myWSU', () => {
    assert.ok(
        exportWorkerCode.includes('getBestOutcomesNameSuggestion'),
        'Expected reverse name suggestion helper to exist'
    );
    assert.ok(
        exportWorkerCode.includes("row[`wsu_${nameCompareConfig.wsu}`] || row.wsu_Descr || ''"),
        'Expected Input_Not_Found suggestion to anchor on myWSU name columns'
    );
});

runCheck('export-worker: Validate decision dropdown includes Allow One-to-Many', () => {
    assert.ok(
        exportWorkerCode.includes('"Accept,Update Key,Allow One-to-Many,No Change,No Match,Needs Research"'),
        'Expected expanded decision dropdown values'
    );
});

runCheck('export-worker: Validate review/approved/final/update sheets exist', () => {
    assert.ok(exportWorkerCode.includes("sheetName: 'Review_Workbench'"));
    assert.ok(exportWorkerCode.includes("sheetName: 'Approved_Mappings'"));
    assert.ok(exportWorkerCode.includes("addWorksheet('Final_Translation_Table')"));
    assert.ok(exportWorkerCode.includes("addWorksheet('Translation_Key_Updates')"));
});

runCheck('export-worker: Validate publish gate checks exist', () => {
    assert.ok(exportWorkerCode.includes("'Publish gate'"));
    assert.ok(exportWorkerCode.includes('B2=0'));
    assert.ok(exportWorkerCode.includes('B4=0'));
    assert.ok(exportWorkerCode.includes('B5=0'));
    assert.ok(exportWorkerCode.includes('B6=0'));
    assert.ok(exportWorkerCode.includes('B7=0'));
    assert.ok(exportWorkerCode.includes('B10=0'));
    assert.ok(exportWorkerCode.includes('B11=0'));
    assert.ok(exportWorkerCode.includes('"PASS","HOLD"'));
});

runCheck('export-worker: Validate export uses capped review formula rows', () => {
    assert.ok(exportWorkerCode.includes('MAX_VALIDATE_DYNAMIC_REVIEW_FORMULA_ROWS'));
    assert.ok(exportWorkerCode.includes("'Approved rows beyond formula capacity'"));
});

runCheck('export-worker: Review workbook exposes explicit current/final key columns', () => {
    assert.ok(exportWorkerCode.includes("'Current_Input'"));
    assert.ok(exportWorkerCode.includes("'Current_Output'"));
    assert.ok(exportWorkerCode.includes("'Final_Input'"));
    assert.ok(exportWorkerCode.includes("'Final_Output'"));
});

runCheck('export-worker: Human review safeguards exist', () => {
    assert.ok(exportWorkerCode.includes('Decision_Warning'));
    assert.ok(exportWorkerCode.includes('Update Key without Suggested_Key'));
    assert.ok(exportWorkerCode.includes('Update Key needs'));
    assert.ok(exportWorkerCode.includes('valid Update Side'));
    assert.ok(exportWorkerCode.includes('Update Key with invalid Update Side'));
    assert.ok(exportWorkerCode.includes('Approved but blank final'));
    assert.ok(exportWorkerCode.includes("const editableCols = ['Decision']"));
});

runCheck('export-worker: Validate internal staging tabs are hidden', () => {
    assert.ok(exportWorkerCode.includes("aqSheet.state = 'hidden'"));
    assert.ok(exportWorkerCode.includes("approvedSheet.state = 'hidden'"));
});

runCheck('export-worker: Create review workflow is explicit in Excel', () => {
    assert.ok(exportWorkerCode.includes("addSheetFromObjects('Ambiguous_Candidates'"));
    assert.ok(exportWorkerCode.includes("addSheetFromObjects('Missing_In_myWSU'"));
    assert.ok(exportWorkerCode.includes("addSheetFromObjects('Review_Decisions'"));
    assert.ok(exportWorkerCode.includes("header: 'Resolution Type'"));
    assert.ok(exportWorkerCode.includes("header: 'Review Path'"));
    assert.ok(exportWorkerCode.includes("header: 'Candidate Count'"));
    assert.ok(exportWorkerCode.includes('Review_Instructions_Create'));
});

runCheck('export-worker: Create review sheet highlights unresolved manual rows', () => {
    assert.ok(exportWorkerCode.includes('$${colSourceStatus}2="Ambiguous Match"'));
    assert.ok(exportWorkerCode.includes('$${colSourceStatus}2="Missing in myWSU"'));
    assert.ok(exportWorkerCode.includes('AND($${colDecision}2="",OR($${colSourceStatus}2="Ambiguous Match",$${colSourceStatus}2="Missing in myWSU"))'));
});

runCheck('export-worker: Validate workbook omits Review_Instructions tab', () => {
    assert.ok(!exportWorkerCode.includes("addWorksheet('Review_Instructions'"));
});

runCheck('export-worker: Review_Workbench has freeze and conditional formatting', () => {
    assert.ok(exportWorkerCode.includes('addConditionalFormatting'));
    assert.ok(exportWorkerCode.includes('hiddenReviewColumns'));
});

runCheck('export-worker: Publish_Eligible excludes No Change', () => {
    assert.ok(exportWorkerCode.includes('non-publishable') || exportWorkerCode.includes('do NOT publish'),
        'Intent to exclude No Change from publish should be documented');
});

runCheck('export-worker: Final_Translation_Table includes reviewer context and stable AGGREGATE math', () => {
    assert.ok(exportWorkerCode.includes("header: 'Outcomes Name'"));
    assert.ok(exportWorkerCode.includes("header: 'myWSU Name'"));
    assert.ok(exportWorkerCode.includes("header: 'Current Translate Input'"));
    assert.ok(
        exportWorkerCode.includes('const approvedRelativeRows = `(ROW(${approvedFinalInputRange})-ROW(Approved_Mappings!'),
        'Final approved row math should be wrapped in parentheses before mask division'
    );
    assert.ok(
        exportWorkerCode.includes('const reviewRelativeRows = `(ROW(${reviewPublishRange})-ROW(Review_Workbench!'),
        'Review approved row math should be wrapped in parentheses before mask division'
    );
});

runCheck('export-worker: expression CF rules use formulae array not formula string', () => {
    // ExcelJS renderExpression does model.formulae[0] without guard.
    // Using singular `formula:` on expression rules causes TypeError.
    const expressionBlocks = exportWorkerCode.split("type: 'expression'");
    // First segment is before the first match, skip it
    for (let i = 1; i < expressionBlocks.length; i += 1) {
        const block = expressionBlocks[i].slice(0, 200);
        assert.ok(
            block.includes('formulae:'),
            `expression-type CF rule #${i} must use 'formulae:' (array), not 'formula:' (string)`
        );
        assert.ok(
            !block.match(/\bformula\s*:/),
            `expression-type CF rule #${i} must not use singular 'formula:' property`
        );
    }
});

if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
}

console.log('\nAll validate-translation-table checks passed.');
