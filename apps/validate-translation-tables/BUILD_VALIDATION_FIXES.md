# Build: Validation Fixes

Planned fixes for the Validate workflow. **Do not implement** until prioritized.

---

## Validation Principle: Many-to-One Can Be Valid

**Duplicate_Target** (many Outcomes keys → one myWSU key) is often **intentional and valid**. Example:

- Outcomes: campus-level entries — *University of Washington - Bothell*, *University of Washington - Main*, *University of Washington - Tacoma*
- myWSU: single org — *University of Washington*

Multiple campus keys mapping to one parent org is correct. The validator should flag these for **review**, not treat them as errors to fix. The user validates in Review_Workbench that the many-to-one mapping is correct (e.g., Allow One-to-Many or Keep As-Is). The goal is human confirmation, not automatic resolution.

---

## 1. Name-Match Suggestions: Location Constraints

### Problem

The name matcher currently suggests matches across countries and states. Example of a clearly wrong suggestion:

- **Outcomes:** ALLIANT INTERNATIONAL UNIVERSITY - FRESNO, CA, US, 666131  
- **Suggested myWSU:** Alliant International Univ, Nairobi, KEN, 011318229  

Same institutional name (Alliant International has campuses in multiple countries), but different campuses—Fresno (US) vs Nairobi (Kenya). A suggestion should never cross countries.

### Fix (not yet implemented)

Add **location constraints** for name-match suggestions:

| Rule | Behavior |
|------|----------|
| **Different countries** | Never suggest. Hard constraint—never propose a match when Outcomes country ≠ myWSU country. |
| **Different US states** | When both sides are US, never suggest across states, OR apply a very large penalty so cross-state suggestions are effectively filtered out. |
| **Same country** | Allow suggestions as today. Location can remain a positive confidence signal. |

### Requirements

- Outcomes must have usable country (and state when US) columns.
- myWSU must have usable country (and state when US) columns.
- Role mapping (Country, State) must be applied so the matcher knows which columns hold location.
- Suggestion logic enforces these rules **before** returning a match—geography as a filter, not only a confidence boost.

### Out of scope for this fix

- Key-only matching (unchanged).
- The Join Preview workflow (separate build).

---

## 2. No Suggestion When Same as Current Value

### Problem

The name matcher sometimes suggests a key that is **already** the current translate_input or translate_output for that row. The suggestion is identical to what is already listed—"Use Suggestion" would change nothing. This adds noise and clutters the review.

### Fix (not yet implemented)

When generating a suggestion:

- If `Suggested_Key` equals the current value on the relevant side (translate_input when Update Side = Input, translate_output when Update Side = Output, both when Update Side = Both), **do not surface it as a suggestion**.
- Treat the row as no-change-needed: default to `Keep As-Is` rather than offering a redundant `Use Suggestion`.

Rationale: Suggesting the same value is pointless; the user should not be prompted to "use" something they already have.

---

## 3. Candidate ID Picker (Review_Workbench ↔ Candidate_Pool)

### Problem

When Outcomes has a value like "University of Washington - Tacoma" and multiple myWSU matches exist (UW Main, UW Tacoma, UW Bothell), only the top-scoring suggestion is shown. Users cannot see or select other valid matches. Keys (org numbers) are meaningless to users—they need to see and choose by **name** (or a stable proxy).

### Workbook Structure

Review_Workbench is joined to a Candidate_Pool via Review_Row_ID. Three sheets:

| Sheet | Role |
|-------|------|
| **Review_Workbench** (active) | Adds `Selected_Candidate_ID` (editable; defaults to "C1" only if valid and non-redundant). `Suggested_*` columns become XLOOKUP formulas targeting Candidate_Pool. |
| **Candidate_Reference** (visible) | Read-only legend grouped by Review_Row_ID. Shows Name, City, State, Country, Similarity for C1, C2, C3. |
| **Candidate_Pool** (hidden) | Flat staging table for lookups. Composite key: `[Review_Row_ID]|[Candidate_ID]` (e.g., `123|C2`). |

### Hybrid UX

Reviewer picks **C1, C2, or C3** in `Selected_Candidate_ID` (IDs chosen for formula stability; long names with special characters are brittle in Excel). `Suggested_School` (formula) updates immediately to show the name of the selected candidate. Candidate_Reference is for deep-dive evidence only.

### Data Flow

1. User enters "C2" in Selected_Candidate_ID.
2. Suggested_Key (formula) = XLOOKUP([RowID]|"C2", Candidate_Pool!$A$2:$A$N, Candidate_Pool!Key_Column).
3. Suggested_School, Suggested_City, Suggested_State, Suggested_Country (formulas) resolve from Candidate_Pool.
4. Final_Input / Final_Output (existing formulas) already reference Suggested_Key; no change to compaction.

### Decision ↔ Selected_Candidate_ID

- **Use Suggestion** → Selected_Candidate_ID MUST NOT be blank (blocking QA).
- **Keep As-Is** → Selected_Candidate_ID should be blank or ignored (advisory if filled).
- **Blank Decision + filled ID** → Unresolved (existing block).
- **Decision_Warning:** "Missing Selection" when Use Suggestion but no ID.

### Update Side & Candidate Generation

- **Input_Not_Found:** Update Side = Input. Current Value check against translate_input. Pool holds Outcomes keys.
- **Output_Not_Found / Duplicate_Source:** Update Side = Output. Current Value check against translate_output. Pool holds myWSU keys.
- Candidate_Pool is keyed by Review_Row_ID; the export worker populates keys appropriate for the row's error type.

### No-Op Suppression & Defaults

- If a candidate's key matches the row's current translate value (per Update Side), flag as "Current Value" and do not default to it.
- If C1 is valid, meets location constraints, and is not Current Value → Selected_Candidate_ID = "C1", Decision = "Use Suggestion".
- If C1 is Current Value → Selected_Candidate_ID = "", Decision = "Keep As-Is".
- If no high-confidence candidates → both blank, Decision_Warning "No candidates found" (advisory).

### No Candidate Found vs None Correct

- **No Candidate Found (system):** Zero matches. Selected_Candidate_ID blank, Decision_Warning "No candidates found."
- **None Correct (reviewer):** C1/C2/C3 offered but reviewer rejects → Decision = Ignore or Keep As-Is, Resolution_Note.
- **Use Suggestion + blank ID** → Missing Selection (blocking).
- **Use Suggestion + invalid ID** → Invalid Selection (blocking).

### Capacity

Export worker computes `candidatePoolLastRow`; all formulas use bounded range `Candidate_Pool!$A$2:$A$N` (actual N). No fixed cap; no truncation.

### Dependencies

- Location constraints (#1) — candidates must pass same-state same-country.
- Centralized in export-worker.js — candidate discovery as enrichment during export; validation.js helpers (e.g., calculateNameSimilarity) used for scoring.

---

## 4. Duplicate_Source Duplication Behavior

When multiple Duplicate_Source rows (one Outcomes key → many myWSU keys in translate) resolve to the same (input, output) pair via Use Suggestion, duplicates can appear in Final_Translation_Table. Users must set some rows to Ignore to avoid duplication. No automatic collapse in current logic. Consider: warn on duplicates, or document as user responsibility.

---

## 5. Impact Notes

- **No suggestion when same (#2)** — Helps valid many-to-ones (e.g., UW Bothell → MY-UW): removes redundant Use Suggestion, defaults to Keep As-Is. No negative impact.
- **Valid many-to-one** — Duplicate_Target often intentional; confirm in Review_Workbench, not automatic resolution.

---

## Implementation Analysis (AI Review)

### Feasibility

- **Location constraints** — High. `validation.js` already has `countriesMatch` and `statesMatch`. Thread through suggestion loops in `export-worker.js`.
- **No suggestion when same** — High. Simple conditional `Suggested_Key !== current_key` before populating.
- **Candidate ID Picker** — Moderate. ExcelJS supports Data Validation; per-row lists require FILTER (Excel 365/2021+) or a large hidden grid. Reinforces 365/2021+ requirement.
- **Duplicate QA check** — High. Add row to QA_Checks_Validate.

### Implementation Order

1. Location constraints (#1)
2. No suggestion when same (#2)
3. Candidate ID Picker (#3)
4. Duplicate QA check (#4)

### Code Paths

**Item 1 — Location constraints:**
- `export-worker.js`: `getBestNameSuggestion` (~1210–1244), `getBestOutcomesNameSuggestion` (~1245–1282), `applySuggestionColumns` (~1296–1336). Add `sourceCountry`, `sourceState`; filter `scanCandidates` with `countriesMatch` / `statesMatch`.
- `validation.js`: `classifyMissingOutputReplacement` (~907–1036). Review location checks for parity.

**Item 2 — No suggestion when same:**
- `export-worker.js`: `applySuggestionColumns`. After suggestion found, if `normalizeValue(suggestion.key) === normalizeValue(row.translate_output)` (or `translate_input` per Update Side), skip; default Keep As-Is.
- `validation.js`: `validateMappings` Output_Not_Found block. If suggestion key equals current (stale) key, do not promote as LIKELY_STALE_KEY.

**Item 4 — Duplicate QA check:**
- `export-worker.js` ~2785: Add QA_Checks_Validate row that counts duplicate (input, output) pairs in Final_Translation_Table. Advisory or blocking per design. Do NOT stop-run; use SUMPRODUCT-style formula.

### Excel Compatibility

| Feature                  | Excel 365 / 2021+ | Excel 2016 / 2019 |
|--------------------------|-------------------|-------------------|
| Final_Translation_Table | Supported (FILTER)| Broken            |
| Candidate ID Picker     | Supported (FILTER)| Broken (needs VBA)|

App already mandates 365/2021+; FILTER-based dropdowns are the correct choice.

### Risks

- **Performance:** Returning top N candidates increases search time. Use `blockedIndices` to keep scan pool small. **Formula ranges:** Export worker must set XLOOKUP range to exact Candidate_Pool size (e.g., `$A$2:$A$7432`), not hard-coded `$A$15000`, to avoid unnecessary calculation overhead on smaller files.
- **Formula regression:** Suggested_Key as lookup (from Selected_Candidate_ID) could break Final_Input/Final_Output. Use IFERROR/XLOOKUP with fallbacks.

### Test Fixtures

- **A (location):** Outcomes "Alliant University (US)", myWSU "Alliant University (Kenya)". Verify zero suggestions.
- **B (redundancy):** Output_Not_Found where current key = 123 and best match = 123. Verify no suggestion columns filled.
- **C (Candidate ID Picker):** Outcomes "University of Washington". Verify Candidate_Pool has UW Seattle, Bothell, Tacoma; user can resolve mapping by entering C1, C2, or C3.

---

## Implementation Analysis v2 (AI Review)

### Feasibility by Item

**1. Location constraints** — Feasible. `validation.js` lines 615, 632 already have matching utilities. Export suggestion pickers (`export-worker.js` 1210, 1245) do not yet enforce location. **Blocker:** Missing or mis-mapped State/Country roles from input config (`app.js` 1233, 1241).

**2. No suggestion when same** — Feasible; needs coordinated logic updates. **Blocker:** Default logic treats high score as suggestion even without key (`export-worker.js` 1851); Use Suggestion noise possible unless decision-default logic is tightened.

**3. Candidate ID Picker** — Feasible; moderate scope. Current model is single best suggestion + scalar fields (`export-worker.js` 1297). Requires multi-candidate persistence and per-row validation list plumbing, keyed by Review_Row_ID. **Blocker:** Excel per-row dynamic list behavior plus workbook size/performance at scale.

**4. Duplicate QA check** — Straightforward in QA sheet builder (`export-worker.js` 2778). Must update empty-queue QA helper (`validation-export-helpers.js` 67) and tests that assume row indexes.

### Recommended Implementation Order (v2)

1. Location constraints (#1)
2. No-suggestion-when-same (#2)
3. Duplicate pair QA check (#4)
4. Candidate ID Picker (#3)

### Code Paths (Detailed)

- **#1:** `export-worker.js` 1210, 1245, 1297. Pass row location context into suggestion search; pre-filter candidates by country/state before scoring.
- **#2:** `export-worker.js` 1297, 1851, 1953. Suppress redundant suggestion rows; align default decision to real key-change availability.
- **#3 (Candidate ID Picker):** `export-worker.js` 1210, 2204, 2327, 2583. Move from single best key to candidate list + Selected_Candidate_ID (C1/C2/C3) → key lookup → Suggested_* formulas.
- **#4:** `export-worker.js` 2778, `validation-export-helpers.js` 67. Add pair-level duplicate formula; decide blocking vs advisory; rebalance publish gate row references.

### Key Risks (v2)

- Over-filtering when location data is sparse/dirty (suggestions vanish).
- Regression: Use Suggestion auto-selected without actionable key.
- Candidate ID ambiguity if display names collide (same label across campuses).
- Performance/workbook bloat from large per-row candidate lists.
- QA publish-gate formula/index drift after adding a new QA row.

### Test Scenarios (v2)

1. Cross-country same-name row → no suggestion.
2. US same-country cross-state row → no suggestion or heavily penalized below threshold.
3. Same-key suggestion for Input/Output/Both update sides → suggestion suppressed, default Keep As-Is.
4. Multi-candidate same-state row → Candidate_Pool has allowed options; user enters C1/C2/C3; resolves key + Suggested_* + final output.
5. Exact duplicate (input, output) in Final_Translation_Table → new QA row increments correctly.
6. Regression: Error vs Missing vs One-to-Many dedupe behavior unchanged.

### Excel Compatibility (v2)

- **365 / 2021+:** Supported; target for dynamic dropdown formulas.
- **2016 / 2019:** Already incompatible with FILTER final-table; dropdown would need static helper grids or VBA.
- **Recommendation:** Keep Validate explicitly 365/2021+ unless legacy support is a separate scope.
