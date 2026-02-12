# Validate Translation Tables - Plain English User Guide

This guide explains how to use the tool in simple terms.

## What this tool does

This app helps you do two jobs:

1. Check an existing translation table for problems (`Validate` workflow).
2. Build a new translation table from Outcomes and myWSU source files (`Create` workflow).

A translation table maps one source key (Outcomes) to one target key (myWSU).

## Basic terms

- `Workflow`: one path in the app (`Validate` or `Create`).
- `Sheet`: a tab inside the Excel file.
- `Key`: unique ID used to map records.
- `Name matching`: matching school names when keys are missing or not usable.

## Before you start

- Use clean headers in your files.
- Confirm key columns are truly unique in Outcomes and myWSU.
- Include `Name`, `City`, `State`, and `Country` columns when possible. This improves match quality.
- If text looks garbled after upload, change file encoding and re-parse.

## Workflow 1: Validate an existing translation table

Use this when you already have a translation table and want to find errors.

**Note:** Existing translate tables are assumed to have complete key pairs (input and output both filled). Blank input or output keys are not expected in normal use.

### Files you need

- Outcomes source file
- Translation table file
- myWSU table file

### Steps in the app

1. Select `Validate` mode.
2. Upload all 3 files.
3. In `Select Columns, Keys, and Roles`:
   - Choose key columns for Outcomes, Translate input, Translate output, and myWSU.
   - Choose which columns to include in exports.
   - Optionally map roles (`School`, `City`, `State`, `Country`).
4. Choose validation method:
   - `Key only`, or
   - `Key + name comparison`.
5. If using name comparison, select name columns and set:
   - `Threshold` (how strict matching is)
   - `Ambiguity gap` (how far apart top matches must be)
6. Click `Validate Mappings`. A system check runs first (row count, no blank keys, no duplicate keys in Outcomes/myWSU). If it fails, fix the data before continuing.
7. Review on-screen results (counts, cards, optional logic preview).
8. Click `Download Full Report`.

### How to review the Excel report (recommended order)

Work through sheets in this order so you tackle problems in the right sequence.

1. **`Action_Queue`** – Your main working sheet. It merges all actionable rows from `Errors_in_Translate`, `One_to_Many`, and `Missing_Mappings`, sorted by priority. Start here and fix the highest-priority items first.

2. **`Errors_in_Translate`** – All rows where the translation table has an error (keys not found in Outcomes or myWSU, name mismatches, etc.). These are the core problems in your current table.

3. **`Output_Not_Found_Ambiguous`** (if present) – Translate rows where the output key is missing in myWSU, but name matching found multiple plausible replacements. You must choose the correct one or mark for research.

4. **`Output_Not_Found_No_Replacement`** (if present) – Translate rows where the output key is missing in myWSU and no replacement was found. You must correct the key manually or remove the row.

5. **`One_to_Many`** – Duplicate conflicts: either one Outcomes key maps to multiple myWSU keys, or one myWSU key is used by multiple Outcomes keys. Resolve these before publishing.

6. **`Missing_Mappings`** – Rows that exist in Outcomes or myWSU but have no corresponding row in your translation table. Add mappings where needed.

7. **`QA_Checks_Validate`** – Summary of remaining issues (unresolved actions, stale-key rows without decisions, etc.). Use it to confirm nothing is left before you update the translation table.

8. **`High_Confidence_Matches`** and **`Valid_Mappings`** – Reference tabs. These contain rows that passed validation. Use them to confirm correct mappings or to copy formats.

### Action_Queue columns (human use)

#### Context and priority

- **`Priority`** – Lower number = fix first. Order is: Input_Not_Found (3), Output_Not_Found_No_Replacement (4), Duplicate_Target (5), Duplicate_Source (6), Output_Not_Found_Likely_Stale_Key (7), Output_Not_Found_Ambiguous (8), Name_Mismatch (9), Ambiguous_Match (10), Missing_Mapping (11). (Missing_Input and Missing_Output are not expected for existing tables.)

- **`Recommended_Action`** – Suggested next step. Examples:
  - `Correct input key or remove row` – input key not found in Outcomes.
  - `Update output to suggested key` – output key likely stale; a replacement is suggested.
  - `Choose correct replacement from candidates` – ambiguous; pick one from the alternatives.
  - `Verify output key; remove or correct manually` – no replacement found; fix or remove.
  - `Resolve many-to-one conflict` – resolve Duplicate_Target.
  - `Resolve duplicate source mapping` – resolve Duplicate_Source.
  - `Add row to Translate table` – row from Missing_Mappings.

- **`Error_Type`** – `Input_Not_Found`, `Output_Not_Found`, `Duplicate_Target`, `Duplicate_Source`, `Name_Mismatch`, `Ambiguous_Match`, `Missing_Mapping`.

- **`Error_Subtype`** – For `Output_Not_Found`: `Output_Not_Found_Likely_Stale_Key`, `Output_Not_Found_Ambiguous_Replacement`, `Output_Not_Found_No_Replacement`. For `Missing_Mapping`: `Outcomes` or `myWSU` (indicates which source has the row).

- **`Source_Sheet`** – Which sheet the row came from: `Errors_in_Translate`, `One_to_Many`, or `Missing_Mappings`.

- **`Is_Stale_Key`** – 1 = likely stale key (update candidate); 0 = other. Use for filtering and QA.

- **`Missing_In`**, **`Similarity`** – For rows from `Missing_Mappings` only. `Missing_In` = `Outcomes` or `myWSU`; `Similarity` = match score when name matching was used. Blank for other sources.

#### Decisions and tracking

- **`Decision`** – What you chose:
  - `Accept` – keep the row as-is (e.g. valid after verification).
  - `Update Key` – change the output key (e.g. to a suggested replacement).
  - `No Change` – leave as-is for now (e.g. intentional or known).
  - `Needs Research` – hold for later follow-up.

- **`Owner`**, **`Status`**, **`Resolution_Note`**, **`Resolved_Date`** – Optional tracking fields for team review.

### Steps to produce a clean translation table (Validate)

The report does not change your translation table. You apply changes in your table file and re-validate until clean.

1. **Download the report** from the app.
2. **Open the report Excel** and your translation table (Excel, CSV, etc.) side by side.
3. **Work through `Action_Queue`** in priority order. For each row:
   - If `Update Key`: change the output key in your translation table to the suggested replacement.
   - If `No Change`: leave the row as-is (or add a note).
   - If `Needs Research`: leave it for later; do not guess.
   - If removing a row: delete it from your translation table.
4. **Add missing rows** from `Missing_Mappings` into your translation table (Outcomes key → myWSU key).
5. **Resolve duplicates** from `One_to_Many`: fix many-to-one or duplicate-source mappings in your table.
6. **Save your translation table**.
7. **Re-run validation** in the app. Upload the updated table and download a new report.
8. **Repeat** until `QA_Checks_Validate` shows no unresolved issues (or only intentional `Needs Research` items).
9. **Your translation table is clean** when QA passes and you are satisfied with the decisions.

## Workflow 2: Create a new translation table

Use this when starting from Outcomes + myWSU and you need a new mapping file.

### Files you need

- Outcomes source file
- myWSU table file

(Translation table is not uploaded in this workflow.)

### Choose a match method

- `Match by key columns`: use when reliable key columns exist on both sides.
- `Match by name columns`: use when key mapping is missing or unreliable.

Important: In `Create + Match by name`, key selections are optional and ignored.

### Steps in the app

1. Select `Create` mode.
2. Upload Outcomes and myWSU.
3. Choose included columns and (optional) role mapping.
4. Choose match method (`key` or `name`).
5. If matching by name, select name columns and set threshold/ambiguity gap.
6. Click `Generate Translation Table`.
7. Open the downloaded Excel and review decisions.

### How to review the Create Excel file

Use this review path to get to a clean final table quickly:

1. `Summary` - quick totals.
2. `New_Translation_Candidates` - 1:1 proposed matches (sorted by confidence and similarity).
3. `Ambiguous_Candidates` - rows with close competing matches.
4. `Missing_In_myWSU` - Outcomes rows with no target candidate.
5. `Missing_In_Outcomes` - myWSU rows with no source row (diagnostic only).
6. `Review_Decisions` - your main working sheet.
7. `Final_Translation_Table` - approved output built from review decisions.
8. `QA_Checks` - unresolved/blank/duplicate checks.

### Review_Decisions sheet: what to do

Each row is one Outcomes record.

- `Decision` options:
  - `Accept`: keep the proposed match.
  - `Choose Alternate`: select `Alt 1/2/3` when a better option exists.
  - `No Match`: no valid mapping found.
  - `Needs Research`: hold for follow-up.
- Fill `Reason_Code`, `Reviewer`, `Review_Date`, and `Notes` when useful.
- `Final_myWSU_Key` and `Final_myWSU_Name` are formula-driven from your decision.

### Steps to produce a clean translation table (Create)

The `Final_Translation_Table` sheet is built from your decisions. You export it when done.

1. **Download the report** from the app.
2. **Open the Excel file** and go to `Review_Decisions`.
3. **Work through each row** in `Review_Decisions`:
   - For 1:1 matches: choose `Accept` or `Choose Alternate` (Alt 1/2/3).
   - For ambiguous rows: pick the correct candidate or `Needs Research`.
   - For no match: set `No Match`.
4. **Check `Final_Translation_Table`** – it updates as you make decisions. It contains only rows with `Accept` or `Choose Alternate`.
5. **Check `QA_Checks`** – resolve any unresolved, blank, or duplicate rows.
6. **Export the clean table** – copy the `Final_Translation_Table` sheet (or save it as a new file) as your translation table.
7. **Your translation table is clean** when all rows are decided and QA passes.

## Practical review tips

- Do not start with low-confidence rows. Start with structural/key problems first.
- Filter by `Priority`, then by `Error_Type`.
- In large files, review in passes (for example, 500-1000 rows per pass).
- Use `Needs Research` instead of guessing.
- Use `QA_Checks_Validate` (Validate) or `QA_Checks` (Create) before publishing.

## Common mistakes

- Wrong key column selected (creates many false errors).
- Name matching enabled but wrong name columns selected.
- Ignoring country/state context when matching international rows.
- Treating `Missing_In_Outcomes` as publishable mapping rows (they are diagnostic).

## Privacy

Files are processed locally in your browser by the app. The tool is designed to avoid uploading your data to a server.
