# Validate Translation Tables - User Guide (Plain English)

This guide explains how to use the app without technical jargon.

## What this tool does

The app supports 2 workflows:

1. `Validate` - check an existing translation table and fix errors.
2. `Create` - build a new translation table from Outcomes and myWSU.

A translation table maps one Outcomes key (`translate_input`) to one myWSU key (`translate_output`).

## Basic terms

- `Workflow`: either Validate or Create.
- `Sheet`: a tab in the Excel file.
- `Key`: unique ID column used for mapping.
- `Name matching`: uses school names (and location context) when key matching is not enough.

## Before you start

- Make sure Outcomes and myWSU key columns are unique.
- Include school name, city, state, and country columns if possible.
- If a file looks garbled after upload, change encoding and re-parse.

## Workflow 1: Validate an existing translation table

Use this when you already have a translation table and want to correct it.

### Files required

- Outcomes source file
- Translate table file
- myWSU source file

### Steps in the app

1. Select `Validate`.
2. Upload all 3 files.
3. In `Select Columns, Keys, and Roles`:
   - Pick key columns for Outcomes, Translate input/output, and myWSU.
   - Pick included columns.
   - Optionally map roles (`School`, `City`, `State`, `Country`).
4. Choose validation mode:
   - `Key only`, or
   - `Key + name comparison`.
5. If using name comparison, pick name columns and adjust threshold/ambiguity gap.
6. Click `Validate Mappings`.
7. Review on-screen cards and counts.
8. Click `Download Full Report`.

### Validate Excel review order (left to right)

Recommended order:

1. `Review_Workbench` - main decision sheet (use this first).
2. `Final_Translation_Table` - final publish-ready key table.
3. `Translation_Key_Updates` - only changed key pairs.
4. `QA_Checks_Validate` - publish gate checks.

Hidden by default (diagnostic/internal):

- `Errors_in_Translate`
- `Output_Not_Found_Ambiguous` (if present)
- `Output_Not_Found_No_Replacement` (if present)
- `One_to_Many`
- `Missing_Mappings`
- `High_Confidence_Matches`
- `Valid_Mappings`
- `Action_Queue`
- `Approved_Mappings`

### How `Review_Workbench` works

Each row shows reviewer context and decision outputs:

- Outcomes and myWSU name/key context
- Source location columns when selected: Outcomes State, Outcomes Country; myWSU City, myWSU State, myWSU Country (blanks in source appear as blank)
- Current translate keys and suggested key/school
- `Decision` (editable dropdown)
- Formula outputs: `Final_Input`, `Final_Output`, `Publish_Eligible`, `Decision_Warning`

Only `Decision` is editable. Formula/system columns are locked.
The sheet freezes the header row only, so horizontal scrolling should remain usable.

### Validate decision meanings

- `Accept`: keep current keys as final.
- `Update Key`: apply `Suggested_Key` on the side shown by `Key_Update_Side`.
- `Allow One-to-Many`: approve as an intentional one-to-many exception.
- `No Match`: unresolved.

### What happens automatically

- `Valid` and `High_Confidence_Match` rows are auto-approved.
- You do not need to approve those one by one.
- Internal `Approved_Mappings` updates as you review.
- `Final_Translation_Table` includes:
  - direct value rows for auto-approved mappings
  - decision-driven rows from `Review_Workbench` when `Publish_Eligible = 1`
  - key pairs plus source context (Outcomes Name/State/Country; myWSU Name/City/State/Country) so each row is a matched pair with full source data; blanks in source appear as blank
- `Final_Translation_Table` opens with Excel filter enabled so you can quickly filter `Translate Input` to non-blanks.
- `Translation_Key_Updates` shows only rows where final keys differ from current keys.
- Publish flow is: `Review_Workbench` -> `Approved_Mappings` (internal) -> `Final_Translation_Table`.

### Publish rule of thumb

Use `QA_Checks_Validate` before publishing.
Publish only when gate checks are clean (`PASS`) or you intentionally accept documented exceptions.
Gate-blocking checks include:

- unresolved actions
- overflow beyond formula capacity
- blank finals on publish-eligible rows
- `Update Key` without `Suggested_Key`
- `Update Key` with invalid `Key_Update_Side`
- duplicate final keys excluding rows intentionally approved as `Allow One-to-Many`

## Workflow 2: Create a new translation table

Use this when you are starting from Outcomes + myWSU and need a new mapping table.

### Files required

- Outcomes source file
- myWSU source file

### Match method

- `Match by key columns`: use when both sides have reliable keys.
- `Match by name columns`: use when key mapping is missing/unreliable.

Important: in Create + name mode, key radio selections are optional and ignored.

### Steps in the app

1. Select `Create`.
2. Upload Outcomes and myWSU.
3. Choose included columns and optional role mapping.
4. Pick match method (`key` or `name`).
5. If name mode, pick name columns and set threshold/ambiguity gap.
6. Click `Generate Translation Table`.
7. Open the downloaded Excel workbook.

### Create Excel review order

See the `Review_Instructions_Create` sheet in the workbook for detailed guidance. Recommended order:

1. `Summary`
2. `New_Translation_Candidates`
3. `Ambiguous_Candidates`
4. `Missing_In_myWSU`
5. `Missing_In_Outcomes` (diagnostic)
6. `Review_Decisions`
7. `Final_Translation_Table`
8. `QA_Checks`

### Create decision meanings (`Review_Decisions`)

- `Accept`: keep proposed match.
- `Choose Alternate`: pick `Alt 1/2/3`.
- `No Match`: unresolved.

`Final_myWSU_Key` and `Final_myWSU_Name` are formula-driven from your decision.

## Practical review tips

- Review by exception, not row by row.
- Start with high-priority structural/key issues.
- Process in passes (for example 500 to 1000 rows at a time).
- Always check QA sheets before publish.

## Common mistakes

- Wrong key column selected.
- Name comparison enabled with wrong name columns.
- Not mapping city/state/country roles when needed.
- Treating `Missing_In_Outcomes` as publishable rows (it is diagnostic).

## Privacy

Files are processed locally in your browser by the app design.
