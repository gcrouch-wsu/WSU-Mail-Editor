# Validate App-First Review Build

## Goal
Move review work into the app so users can make decisions with context, save/resume sessions, and use Excel as a final verification/publish artifact.

## Scope
- Workflow: `Validate` only
- In-app review panel (`Bulk edit before export`) upgraded to contextual row editing + safe bulk actions
- Export integration unchanged except for merged `Selected_Candidate_ID` from app edits

## Implemented

### 1) Contextual in-app review grid
- Replaced key-only bulk table with row context:
  - `Error_Type`, `Error_Subtype`
  - Outcomes name/state/country
  - Current myWSU name/state/country
  - Current input/output keys
  - Decision, Reason, Suggested candidate dropdown, Manual key
- Candidate dropdown uses location-filtered candidates already produced by validation/export logic.

### 2) Improved filtering and grouping
- Filters:
  - Error type
  - Decision (including blank)
  - Outcomes name contains
  - Current myWSU name contains
- Sorted by Outcomes name + input key for family-style review passes.

### 3) Safer bulk actions
- Bulk fields:
  - Decision
  - Reason code
  - Candidate ID (`C1..C5`)
  - Manual key
- Apply scope:
  - Filtered rows
  - Selected rows only (checkbox option)
- Row selection controls:
  - Select filtered
  - Deselect filtered
  - Clear selected values

### 4) Session continuity
- Added in-app session export/import:
  - `Save session` downloads JSON
  - `Load session` merges by `Review_Row_ID`
- Supports multi-day review without requiring Excel edits between sessions.

### 5) Export merge support
- `preEditedActionQueueRows` now merges:
  - `Decision`
  - `Reason_Code`
  - `Manual_Suggested_Key`
  - `Selected_Candidate_ID`

### 6) Regression coverage
- Extended export test to assert `Selected_Candidate_ID` merge from pre-edited app rows.

### 7) UX add-ons for large-review usability
- Added quick family filter chips in the app review panel (for example `Texas A&M`, `Troy University`).
- Added persistent helper text clarifying that only 400 rows are rendered at once for performance, while bulk actions still apply to all filtered rows.

## Reviewer Actions Model (in-app)
- `Keep As-Is`
- `Use Suggestion`
- `Allow One-to-Many`
- `Ignore`
- `Reason_Code` required for risky decisions (enforced by Excel QA gate)

## Notes
- Location constraints remain in candidate generation logic; app dropdown does not bypass them.
- Excel remains the final verification surface (`Review_Workbench`, `Translation_Key_Updates`, `QA_Checks_Validate`).
