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

1. `Action_Queue`
2. `Errors_in_Translate`
3. `Output_Not_Found_Ambiguous` (if present)
4. `Output_Not_Found_No_Replacement` (if present)
5. `One_to_Many`
6. `Missing_Mappings`
7. `QA_Checks_Validate`
8. `High_Confidence_Matches` and `Valid_Mappings` (reference tabs)

### Action_Queue columns (human use)

- `Priority`: lower number = fix first.
- `Recommended_Action`: suggested next step.
- `Error_Type`, `Error_Subtype`: what kind of issue.
- `Source_Sheet`: which sheet the row came from (`Errors_in_Translate`, `One_to_Many`, or `Missing_Mappings`).
- `Is_Stale_Key`: 1 = likely stale key (update candidate); 0 = other.
- `Missing_In`, `Similarity`: for rows from `Missing_Mappings`; blank for other sources.
- `Decision`: what you chose (`Accept`, `Update Key`, `No Change`, `Needs Research`).
- `Owner`, `Status`, `Resolution_Note`, `Resolved_Date`: tracking fields for team review.

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
