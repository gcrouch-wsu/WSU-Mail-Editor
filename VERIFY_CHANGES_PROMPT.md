# Verification Prompt: Validate Translation Export – Excel Output and Human Workflow

Use this prompt to have another AI verify the Validate mode Excel export and expected human workflow, including recent changes to `apps/validate-translation-tables/export-worker.js`.

---

## Excel Output Structure (Validate Mode)

### Visible Sheets (Reviewer Tabs, Left to Right)

| Sheet | Purpose |
|-------|---------|
| **Review_Workbench** | Main decision surface. Only editable sheet for reviewer. Opens as active tab. |
| **Final_Translation_Table** | Publish-ready key pairs (Outcomes → myWSU). Compact, no empty slots. Auto-filter enabled. |
| **Translation_Key_Updates** | Delta only: rows where final keys differ from current keys. |
| **QA_Checks_Validate** | Publish gate checks. Must pass before publishing. |

### Hidden Internal Staging

| Sheet | Purpose |
|-------|---------|
| Action_Queue | Internal queue; feeds Review_Workbench. |
| Approved_Mappings | Auto-approved + review-approved rows. |
| Final_Staging | Holds auto-approved literals + review formula rows. Feeds Final_Translation_Table via FILTER. |

### Hidden Diagnostic Sheets

| Sheet | When Present | Purpose |
|-------|--------------|---------|
| Errors_in_Translate | Always | All non-duplicate validation errors. |
| Output_Not_Found_Ambiguous | If ambiguous candidates exist | Multiple replacement options. |
| Output_Not_Found_No_Replacement | If no replacement found | No suggested key. |
| One_to_Many | If duplicates exist | Duplicate_Source, Duplicate_Target rows. |
| Missing_Mappings | If high-confidence pairs missing from Translate | Proposed mappings to add. |
| High_Confidence_Matches | If any | Auto-approved below-threshold matches. |
| Valid_Mappings | If any | Auto-approved valid rows. |

*To unhide: right-click tab bar → Unhide.*

---

## Review_Workbench Columns (Order)

**Visible columns:** Decision, Error_Type, Error_Subtype, Outcomes name/state/country (from selected cols), myWSU name/state/city/country, translate_input, translate_output, Suggested_Key, Suggested_School, Suggested_City, Suggested_State, Suggested_Country, Final_Input, Final_Output, Decision_Warning, Review_Row_ID.

**Hidden columns:** Priority, Source_Sheet, Key_Update_Side, Is_Stale_Key, Missing_In, Similarity, Recommended_Action, Current_Input, Current_Output, Publish_Eligible, Approval_Source, Has_Update.

**Editable:** Decision only. All others are formula-driven or locked.

---

## Final_Translation_Table Columns (Order)

1. Review Row ID  
2. Decision (hidden; used by QA formulas)  
3. All user-selected Outcomes columns (excluding key)  
4. Translate Input (Final_Input)  
5. Translate Output (Final_Output)  
6. All user-selected myWSU columns (excluding key)  

*Columns match the user's selected include columns (Outcomes, myWSU). The Decision column is hidden but still participates in QA logic.*

**Data flow:** Final_Staging (hidden) → FILTER(…, translate_input<>"") → Final_Translation_Table. Requires Excel 365 or 2021+.

---

## Translation_Key_Updates Columns

Review Row ID, Current_Input, Current_Output, Final_Input, Final_Output, Decision, Source_Sheet, Owner, Resolution_Note.

**Filter:** Only rows where Publish_Eligible=1 AND Has_Update=1 (keys changed).

---

## QA_Checks_Validate Rows

| Check | Blocks Publish | Purpose |
|-------|----------------|---------|
| Unresolved actions | Yes (B2) | Blank or Ignore decisions |
| Approved review rows | No | Count of approved rows |
| Approved rows beyond formula capacity | Yes (B4) | Over cap (5000) |
| Blank final keys on publish-eligible rows | Yes (B5) | Sanity check |
| Use Suggestion without Suggested_Key | Yes (B6) | Invalid state |
| Use Suggestion with invalid Update Side | Yes (B7) | Key_Update_Side = None |
| Stale-key rows lacking decision | Advisory (B8) | | 
| One-to-many rows lacking decision | Advisory (B9) | |
| Duplicate final input keys (excl. Allow One-to-Many) | Yes (B10) | |
| Duplicate final output keys (excl. Allow One-to-Many) | Yes (B11) | |
| Publish gate | — | PASS/HOLD |

---

## Expected Human Workflow (Step by Step)

### 1. Before Export

- Upload Outcomes, Translate, and myWSU files.
- Select keys and include columns; map roles (School, City, State, Country) if using name comparison.
- Run validation; review on-screen cards.
- Click **Download Full Report**.

### 2. Open Workbook

- Open the downloaded Excel file (Excel 365 or 2021+).
- Review_Workbench is the active tab.
- Ensure full recalculation (workbook uses `fullCalcOnLoad`).

### 3. Work in Review_Workbench

**Per row, choose Decision:**

| Decision | When to Use | Effect |
|----------|-------------|--------|
| **Keep As-Is** | Current keys are correct | Final_Input = Current_Input, Final_Output = Current_Output |
| **Use Suggestion** | Use Suggested_Key instead of current | Final replaces Suggested_Key on side from Key_Update_Side (Input/Output/Both). Check Suggested School/City/State/Country first. |
| **Allow One-to-Many** | Intentional one-to-many exception | Same as Keep As-Is for finals; excluded from duplicate checks |
| **Ignore** | Exclude from publish | Row does not appear in Final_Translation_Table |

**Key_Update_Side:**
- Input: Suggested_Key replaces Final_Input.
- Output: Suggested_Key replaces Final_Output.
- Both: Both finals use Suggested_Key (e.g. both-missing Missing_Mapping).
- None: Use Suggestion should not be used (warning).

**Publish:** Row publishes only when Decision is publishable and both Final_Input and Final_Output are non-blank. Decision_Warning shows issues (e.g. Use Suggestion with blank Suggested_Key).

### 4. Check Final_Translation_Table

- Shows all published rows in compact order.
- Row order follows Action Queue sort (Priority, Source_Sheet, Error_Type, translate_input, translate_output).
- Outcomes Name/State/Country and myWSU Name/City/State/Country should be populated for context.

### 5. Check Translation_Key_Updates

- Lists only rows where keys actually changed (current ≠ final).
- Use to apply updates back to the Translate table or systems.

### 6. Pass QA Before Publish

- Open QA_Checks_Validate.
- Gate must be PASS (or accept documented exceptions).
- Resolve any blocking checks before publishing.

---

## Recent Changes to Verify

### 1. Outcomes/myWSU context when Use Suggestion is chosen

**Problem:** For Input_Not_Found or Output_Not_Found, choosing Use Suggestion fixed the keys but Outcomes Name/State/Country (or myWSU Name/City/State/Country) stayed blank in Final_Translation_Table because the original row had no Outcomes/myWSU match.

**Fix:** Final_Staging formulas for Outcomes and myWSU context columns use Suggested_* when:
- Decision = "Use Suggestion" and Key_Update_Side includes Input → Outcomes columns from Suggested_School, Suggested_State, Suggested_Country
- Decision = "Use Suggestion" and Key_Update_Side includes Output → myWSU columns from Suggested_School, Suggested_City, Suggested_State, Suggested_Country

**Verify:** In `export-worker.js` find `reviewFinalValueFormulaWithSuggestionFallback`, `outcomesContextFallbacks`, `wsuContextFallbacks`, and the Final_Staging row loop. Confirm formulas reference Review_Workbench Decision and Key_Update_Side, and use Suggested_* when the condition matches.

### 2. Key_Update_Side for Duplicate_Source and Duplicate_Target

**Problem:** Key_Update_Side was "None" for One-to-Many rows, causing "Use Suggestion needs valid Update Side" warning.

**Fix:** `inferKeyUpdateSide` returns "Output" for Duplicate_Source and "Input" for Duplicate_Target.

**Verify:** In `export-worker.js` find `inferKeyUpdateSide` and confirm these cases.

### 3. Default Decision for One-to-Many rows

**Problem:** One-to-Many rows had Decision blank, so they never published.

**Fix:** `actionQueueFromOneToMany` sets `Decision: 'Allow One-to-Many'` by default.

**Verify:** In `export-worker.js` find `actionQueueFromOneToMany` and confirm `Decision: 'Allow One-to-Many'`.

### 4. Pre-populated default decisions (§1)

**Problem:** Many rows required manual Decision selection even when the best choice was obvious.

**Fix:** `getDefaultDecision` populates Decision based on error type/subtype and Suggestion_Score:
- Name_Mismatch (score ≥ threshold) → Keep As-Is
- Output_Not_Found No_Replacement → Ignore
- Output_Not_Found Likely_Stale_Key (with suggestion) → Use Suggestion
- Missing_Mapping → Keep As-Is
- Input_Not_Found / Duplicate_Source / Duplicate_Target (with suggestion) → Use Suggestion

**Verify:** Find `getDefaultDecision`, `actionQueueFromErrors`, `actionQueueFromMissing`, `actionQueueFromOneToMany`; confirm defaults are applied.

### 5. All user-selected columns in Final_Translation_Table (§2)

**Problem:** Final table used a fixed role-mapped set of columns (Outcomes Name/State/Country, myWSU Name/City/State/Country).

**Fix:** Final_Translation_Table columns are built from `selectedCols.outcomes` and `selectedCols.wsu_org` (excluding key columns). Headers use `buildHeaders` for friendly display.

**Verify:** In `buildValidationExport`, find `finalOutcomesCols` and `finalWsuCols`; confirm they derive from `outcomesColumns` and `wsuColumns` (user-selected, minus keys).

### 6. Hidden Decision column in Final_Translation_Table (§3)

**Problem:** Decision column cluttered the publish-ready Final table.

**Fix:** Final_Translation_Table column for Decision has `hidden: true`. Column remains for QA formula references but is not visible.

**Verify:** Find Final_Translation_Table column config; confirm `hidden: col.key === 'Decision'`.

---

## Verification Steps

1. Read `apps/validate-translation-tables/export-worker.js` and confirm all six changes.
2. Run `npm run check:validate-translation` and ensure all checks pass.
3. Optional: Export with sample data containing Input_Not_Found and Output_Not_Found with suggestions; choose Use Suggestion; confirm Outcomes and myWSU context columns are populated in Final_Translation_Table.
4. Optional: Confirm One-to-Many rows appear in Final_Translation_Table with Decision = "Allow One-to-Many" by default.
