# Build: Join Preview Workflow

## Summary

A new **Join Preview** workflow for the Validate app. Upload a translation table plus both source files (Outcomes and myWSU), use **key matching only**, and receive an Excel file that joins all three datasets row-by-row. The goal: visually verify what source data is associated with each row of your updated translation table before you publish to Outcomes.

## Purpose

After updating a translation table (e.g., via Validate or manually), you want a final check: *Do the correct Outcomes institutions line up with the correct myWSU institutions through the translate input/output pairs?* This workflow produces a single flat table showing the full picture—no validation logic, no decisions—just a joined view for human review.

## Inputs

| Input | Purpose |
|------|---------|
| **Translation table** | Defines the mapping: translate_input ↔ translate_output |
| **Outcomes source** | Source data keyed by whatever column maps to translate_input |
| **myWSU source** | Source data keyed by whatever column maps to translate_output |

## Matching Rules

- **Key matching only** — no name matching, no similarity scores, no ambiguity logic
- **Keys are selectable in the UI** — user chooses which column from each file is the join key
- **Keys may repeat** — one-to-many and many-to-one are allowed. Each translate row produces one output row; if Outcomes or myWSU has multiple rows for a key, take the first by original file row order. If no match, columns are blank.

## Output Excel Structure

Each row in the output represents one row from the translation table, with columns in this order:

1. **Outcomes columns** (user-selected) — data from the Outcomes row whose key equals `translate_input`
2. **Translate columns** — always `translate_input` and `translate_output`
3. **myWSU columns** (user-selected) — data from the myWSU row whose key equals `translate_output`

**Outcomes and myWSU columns** = only those checked in the UI (same column-selection pattern as Validate). Translate columns are always included.

## Example

| Outcomes_Name | Outcomes_State | Outcomes_Key | translate_input | translate_output | myWSU_Name | myWSU_State | myWSU_Key |
|---------------|----------------|--------------|-----------------|------------------|------------|-------------|-----------|
| WSU Pullman | WA | OUT-001 | OUT-001 | MY-100 | Washington State University | Washington | MY-100 |
| WSU Vancouver | WA | OUT-002 | OUT-002 | MY-101 | WSU Vancouver | Washington | MY-101 |

You can scan down the table and confirm that Outcomes_Name + translate_input + translate_output + myWSU_Name make sense together.

## Resolved Design

1. **One-to-many / many-to-one** — Allowed. Valid use cases exist. One row per translate row; if multiple matches exist on either source, take the first.
2. **Missing matches** — If translate_input has no matching Outcomes row, Outcomes columns are blank. If translate_output has no matching myWSU row, myWSU columns are blank.
3. **UI** — Third workflow option ("Validate" | "Create" | "Join Preview") alongside the existing choices.
4. **Key selection** — Same pattern as Validate: key columns are selectable in the UI for Outcomes, Translate input/output, and myWSU.

## Resolved Implementation Details

| Item | Decision |
|------|----------|
| **Duplicate keys in source** | Simple key lookup. If Outcomes or myWSU has multiple rows for a key, take the first. If no matching key, columns are blank. No special handling. |
| **Worker location** | Add `buildJoinPreviewExport` to `export-worker.js` (reuse existing ExcelJS setup and patterns). |
| **Translate columns** | Always include `translate_input` and `translate_output` in output. No user choice for these. |
| **Column selection** | Same as Validate: user selects which columns to include from Outcomes and myWSU (e.g., name, state, country). Same column-selector UI pattern. |
| **Column order** | Outcomes columns → Translate columns (`translate_input`, `translate_output`) → myWSU columns. |
| **Role mapping** | Hidden. Not used for Join Preview. Column selection is for display only. |

## Implementation Contract

Resolves ambiguities for implementation. Add this section before coding.

### Column Inclusion (clarifies line 33 vs 57)

- **Outcomes columns** — User-selected via column selector (same UI as Validate). Only checked columns are included.
- **Translate columns** — Always included: `translate_input` and `translate_output`. No user choice.
- **myWSU columns** — User-selected via column selector. Only checked columns are included.

### "Take the First" Rule

When Outcomes or myWSU has multiple rows for a key, use the **first row in original file order** (row index 0, then 1, etc.). Deterministic and matches typical user expectation.

### Key Normalization

Use the same key normalization as Validate: `normalizeKeyValue` from `validation.js` (trim, consistent typing) before lookup. The export worker may use a local `normalizeValue` wrapper that calls it. Ensures "ABC" and "abc" match when the source normalizes them the same way.

### UI Behavior (Join Preview mode)

| Control | Behavior |
|---------|----------|
| **Workflow selector** | Show Validate, Create, Join Preview (3 options). |
| **Upload cards** | Show Outcomes, Translation table, myWSU (same as Validate). |
| **Name comparison** | Hidden. Join Preview is key-only. |
| **Create match-method** | Hidden. Create-only. |
| **Validation options** | Hidden (include suggestions, mapping logic). |
| **Column selection** | Shown. Same pattern as Validate. |
| **Key selection** | Shown. Outcomes key, Translate input, Translate output, myWSU key. |
| **Role mapping** | Hidden. Not used for Join Preview. |
| **Action button** | "Generate Join Preview" (replaces "Validate Mappings" / "Generate Translation Table"). |

### Output Workbook

| Item | Specification |
|------|---------------|
| **Sheet name** | `Join_Preview` |
| **Filename** | Default `WSU_Join_Preview.xlsx`. Accept `options.fileName` if provided (same pattern as Validate). |
| **Header naming** | Column keys: prefix Outcomes with `outcomes_`, myWSU with `wsu_` to avoid collisions. Use `buildHeaders` (same as Validate) for humanized display headers (e.g., "School Name (Outcomes)" instead of raw `outcomes_name`). Translate columns: `translate_input`, `translate_output`. |
| **Row order** | Preserve translate table row order exactly. |

### Operational Behavior

| Scenario | Behavior |
|----------|----------|
| **Blank translate_input or translate_output** | Include the row. Outcomes columns blank if input blank; myWSU columns blank if output blank. |
| **Pre-run validation** | Require: Outcomes key selected, Translate input column selected, Translate output column selected, myWSU key selected. Block run with alert if any missing. |
| **Empty translation table** | Output workbook with headers only, no data rows. |

## Documentation Updates (part of build)

When implementing Join Preview, update:

| Document | Updates |
|----------|---------|
| **USER_GUIDE.md** | Add Join Preview as third workflow; include files required, steps, and output description. |
| **user-guide.html** | Same content as USER_GUIDE.md for Join Preview. |
| **README.md** | Update Validate app section: change "two workflows" to "three workflows"; add Join Preview to the list. |

## Out of Scope (for this workflow)

- Validation logic (errors, mismatches, suggestions)
- Name matching
- Decision workflow or Review_Workbench
- QA gates

This is a read-only join for human verification.
