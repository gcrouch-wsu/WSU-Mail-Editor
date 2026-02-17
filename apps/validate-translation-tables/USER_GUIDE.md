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

**Note:** The Validate Excel file requires **Excel 365 or 2021+** to display the Final_Translation_Table correctly. Excel 2016/2019 may show errors for the compact table.

### What the Excel file contains

The downloaded Excel file includes:

- **Auto-matched rows** - rows classified as `Valid` or `High_Confidence_Match` are already approved and appear in `Final_Translation_Table` automatically.
- **Rows needing your decision** - errors, mismatches, duplicates, and missing mappings appear in `Review_Workbench`. You must choose a Decision for each of these before the final table is complete.

**You must use Review_Workbench** to resolve all rows that need a decision. The Final_Translation_Table is built from your decisions plus the auto-matched rows.

### Validate Excel review order (left to right)

Recommended order:

1. `Review_Workbench` - main decision sheet (use this first). Sortable and filterable.
2. `Final_Translation_Table` - final publish-ready key table (auto-matched + your approved decisions).
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
- `Final_Staging`

### How `Review_Workbench` works

**Your decisions here control which rows appear in the Final_Translation_Table.** Each row needing review shows:

- Outcomes and myWSU name/key context
- Source location columns when selected: Outcomes State, Outcomes Country; myWSU City, myWSU State, myWSU Country (blanks in source appear as blank)
- Current translate keys and suggested key/school/city/state/country (verify suggested location before applying Use Suggestion)
- `Decision` (editable dropdown) - **this determines whether the row is copied to the Final_Translation_Table**
- Formula outputs: `Final_Input`, `Final_Output`, `Publish_Eligible`, `Decision_Warning` (these show whether the row is ready to publish)

Only `Decision` should be edited. The sheet is intentionally unprotected so sort/filter works reliably, so avoid editing formula/system columns.
The sheet freezes the header row only, so horizontal scrolling should remain usable.
**Review_Workbench is sortable and filterable** - use the header dropdowns to sort or filter rows as you work.

### Validate decision options (Review_Workbench)

Each decision determines whether the row is included in the Final_Translation_Table:

| Decision | Effect |
|----------|--------|
| **Keep As-Is** | Row is copied to Final_Translation_Table with current keys. No changes. |
| **Use Suggestion** | Row is copied to Final_Translation_Table with `Suggested_Key` applied on the side shown by Update Side. Verify Suggested Key, School, City, State, Country before applying. |
| **Allow One-to-Many** | Row is copied to Final_Translation_Table as an intentional one-to-many exception. |
| **Ignore** | Row is **not** copied to Final_Translation_Table. Kept unresolved for later review. |

### How to edit rows to get a clean final table

1. Go to `Review_Workbench`.
2. Work top to bottom, or filter to rows where `Decision` is blank.
3. For each row, choose one Decision from the table above.
4. If you choose `Use Suggestion`, confirm:
   - `Suggested_Key` is filled.
   - `Update Side` is `Input`, `Output`, or `Both` (not `None`).
5. Check the same row:
   - `Decision_Warning` should be blank.
   - `Final_Input` and `Final_Output` should be filled for rows you want to publish.
6. Verify outputs:
   - `Final_Translation_Table` shows approved rows.
   - `Translation_Key_Updates` shows only changed keys.
   - `QA_Checks_Validate` has no blocking checks.

### What happens automatically

- `Valid` and `High_Confidence_Match` rows are **auto-matched** and appear in `Final_Translation_Table` without any decision from you.
- For rows that need review, **default decisions** are pre-populated when the best choice is obvious (for example, Name_Mismatch with good score -> Keep As-Is; Output_Not_Found with no replacement -> Ignore). You can still change any decision.
- `Final_Translation_Table` = auto-matched rows + rows where your Review_Workbench decision is Keep As-Is, Use Suggestion, or Allow One-to-Many (not Ignore).
- Columns: Review Row ID, your selected Outcomes columns, Translate Input, Translate Output, your selected myWSU columns.
- `Translation_Key_Updates` shows only rows where final keys differ from current keys.

### Final step before updating Outcomes Translation Table

When you are done reviewing and the QA gate passes:

1. **Copy the Final_Translation_Table** - select all data rows and copy.
2. **Paste as values only** into a new sheet (Paste Special -> Values). The Final_Translation_Table is formula-driven and cannot be sorted directly.
3. **Sort and double-check** the pasted values in the new sheet.
4. **Only then** update the Outcomes Translation Table with the verified data.

Do not update the Outcomes Translation Table until you have completed these steps.

### Publish rule of thumb

Use `QA_Checks_Validate` before publishing.
Publish only when gate checks are clean (`PASS`) or you intentionally accept documented exceptions.
Gate-blocking checks include:

- unresolved actions
- overflow beyond formula capacity
- blank finals on publish-eligible rows
- `Use Suggestion` without `Suggested_Key`
- `Use Suggestion` with invalid Update Side
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
