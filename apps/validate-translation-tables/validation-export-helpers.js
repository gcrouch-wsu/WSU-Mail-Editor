/**
 * Shared helpers for validation export (Action_Queue priority, recommended actions).
 * Used by export-worker.js and testable from checks.js.
 */
'use strict';

const OUTPUT_NOT_FOUND_SUBTYPE = (typeof self !== 'undefined' && self.OUTPUT_NOT_FOUND_SUBTYPE)
    ? self.OUTPUT_NOT_FOUND_SUBTYPE
    : {
        LIKELY_STALE_KEY: 'Output_Not_Found_Likely_Stale_Key',
        AMBIGUOUS_REPLACEMENT: 'Output_Not_Found_Ambiguous_Replacement',
        NO_REPLACEMENT: 'Output_Not_Found_No_Replacement'
    };

/** Priority order: lower number = higher priority (tackle first). */
const PRIORITY_ORDER = {
    Missing_Input: 1,
    Missing_Output: 2,
    Input_Not_Found: 3,
    [OUTPUT_NOT_FOUND_SUBTYPE.NO_REPLACEMENT]: 4,
    Duplicate_Target: 5,
    Duplicate_Source: 6,
    [OUTPUT_NOT_FOUND_SUBTYPE.LIKELY_STALE_KEY]: 7,
    [OUTPUT_NOT_FOUND_SUBTYPE.AMBIGUOUS_REPLACEMENT]: 8,
    Name_Mismatch: 9,
    Ambiguous_Match: 10,
    Missing_Mapping: 11
};

const DEFAULT_PRIORITY = 99;

function getPriority(errorType, errorSubtype) {
    if (errorType === 'Output_Not_Found' && errorSubtype) {
        const sub = PRIORITY_ORDER[errorSubtype];
        if (sub !== undefined) return sub;
    }
    return PRIORITY_ORDER[errorType] ?? DEFAULT_PRIORITY;
}

const RECOMMENDED_ACTIONS = {
    Missing_Input: 'Fix blank input in Translate',
    Missing_Output: 'Fix blank output in Translate',
    Input_Not_Found: 'Correct input key or remove row',
    Output_Not_Found: 'Correct output key or remove row',
    [OUTPUT_NOT_FOUND_SUBTYPE.NO_REPLACEMENT]: 'Verify output key; remove or correct manually',
    [OUTPUT_NOT_FOUND_SUBTYPE.LIKELY_STALE_KEY]: 'Update output to suggested key',
    [OUTPUT_NOT_FOUND_SUBTYPE.AMBIGUOUS_REPLACEMENT]: 'Choose correct replacement from candidates',
    Duplicate_Target: 'Resolve many-to-one conflict',
    Duplicate_Source: 'Resolve duplicate source mapping',
    Name_Mismatch: 'Verify name match or correct mapping',
    Ambiguous_Match: 'Choose correct mapping from alternatives',
    Missing_Mapping: 'Add row to Translate table'
};

function getRecommendedAction(errorType, errorSubtype) {
    if (errorType === 'Output_Not_Found' && errorSubtype) {
        const act = RECOMMENDED_ACTIONS[errorSubtype];
        if (act) return act;
    }
    return RECOMMENDED_ACTIONS[errorType] ?? 'Review and resolve';
}

/** Columns required for Missing_Mappings context in Action_Queue */
const ACTION_QUEUE_CONTEXT_COLUMNS = ['Missing_In', 'Similarity'];

/** QA_Checks_Validate rows when Action_Queue is empty */
function getQAValidateRowsForEmptyQueue() {
    return [
        ['Check', 'Count', 'Status', 'Detail'],
        ['Unresolved actions', 0, 'PASS', 'Rows without a decision'],
        ['Approved for update', 0, 'PASS', 'Accept or Update Key decisions'],
        ['Stale-key rows lacking decision', 0, 'PASS', 'Likely stale key rows without decision'],
        ['Duplicate conflict rows lacking decision', 0, 'PASS', 'One-to-many rows without decision']
    ];
}

/** Filter errorDataRows for Output_Not_Found subtype (uses raw values) */
function filterOutputNotFoundBySubtype(rows, subtype) {
    return rows.filter(row =>
        row._rawErrorType === 'Output_Not_Found' && row._rawErrorSubtype === subtype
    );
}

(function (global) {
    const exp = {
        OUTPUT_NOT_FOUND_SUBTYPE,
        PRIORITY_ORDER,
        ACTION_QUEUE_CONTEXT_COLUMNS,
        getPriority,
        getRecommendedAction,
        getQAValidateRowsForEmptyQueue,
        filterOutputNotFoundBySubtype
    };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exp;
    } else if (typeof global !== 'undefined') {
        global.ValidationExportHelpers = exp;
    }
})(typeof self !== 'undefined' ? self : typeof global !== 'undefined' ? global : this);
