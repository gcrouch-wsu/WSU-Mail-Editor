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

if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
}

console.log('\nAll validate-translation-table checks passed.');
