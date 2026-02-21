# All Builds from Last Commit

**Commit:** Add Join Preview workflow, validation fixes, and documentation

---

## Validation Fixes (Validate Workflow)

### Fix A: Output_Not_Found_No_Replacement Skip

- **Goal:** Do not run export-time name fallback suggestion generation for NO_REPLACEMENT rows; do not populate candidate list from low-threshold fallback; only retain preset suggestion data when subtype is explicitly stale/ambiguous from validation.
- **Status:** Implemented

### Fix B: Texas A&M Many-to-One (B14 Exemption)

- **Goal:** For duplicate output-key QA (B14), treat a row as exempt only when Source_Sheet=One_to_Many, Error_Type=Duplicate_Target, and Decision=Keep As-Is. Support intentional many-to-one mappings (e.g., Texas A&M campuses → one parent key).
- **Status:** Implemented

### Fix C: Manual Override for Blank/No-Candidate Rows

- **Goal:** Allow reviewer to enter a manual target key when suggestion candidates are missing; define effective suggestion key (manual when present, otherwise candidate lookup); require effective key for Use Suggestion; add blocking validation for invalid manual keys.
- **Status:** Implemented

### Location Constraints for Suggestions

- **Goal:** Filter suggestion candidates by location before surfacing: reject cross-country, reject cross-state when countries match, handle blank source-country conservatively.
- **Status:** Implemented

### C1/C2/C3 Inline Candidate Visibility

- **Goal:** Show C1_Choice, C2_Choice, C3_Choice inline in Review_Workbench; reviewer enters C1/C2/C3 in Selected_Candidate_ID; Suggested_* columns resolve from Candidate_Pool.
- **Status:** Implemented

### No Suggestion When Same as Current Value

- **Goal:** Suppress suggestion when suggested key equals current key; leave Suggested_Key blank for Duplicate_Target/Duplicate_Source/High_Confidence_Match when no actionable suggestion; One-to-Many rows with no suggestion default to Allow One-to-Many.
- **Status:** Implemented

### USER_GUIDE Clarity Updates

- **Goal:** Document many-to-one rule, manual override rule, hidden candidate-sheet usage, C1/C2/C3 review flow in USER_GUIDE.md, user-guide.html, index.html.
- **Status:** Implemented

---

## P0 (Speed + Safety)

### P0.1: Stronger No-Op Protection

- **Goal:** Make "Use Suggestion key equals current value" blocking (not just Decision_Warning).
- **Status:** Implemented

### P0.2: "What Changed" Enhancement

- **Goal:** Position Translation_Key_Updates as the primary change-review sheet for faster final verification before publish.
- **Status:** Implemented

### P0.3: Bulk Apply Tools

- **Goal:** Apply Decision and Manual_Suggested_Key to filtered rows in one step.
- **Status:** Implemented (Pre-export UI)
- **UX add-ons:** Implemented quick family filter chips and persistent 400-row render guidance so reviewers can group campus families quickly without confusion.

---

## P1 (Accuracy + Audit)

### P1.1: Richer C1/C2/C3 Display

- **Goal:** Include Country and Score in inline candidate text for better disambiguation without unhide steps.
- **Status:** Implemented

### P1.2: Mandatory Reason Codes

- **Goal:** Require Reason_Code for manual key use, Allow One-to-Many, and Duplicate_Target+Keep As-Is (controlled list).
- **Status:** Implemented

### P1.3: Campus-Family Mapping Rules

- **Goal:** Add configurable pattern/group-to-parent-key prefill rules for Manual_Suggested_Key to reduce repetitive manual edits.
- **Status:** Implemented (JSON upload + baseline)

---

## P2 (Automation + Continuity)

### P2.1: Many-to-One Decision Assist

- **Goal:** Heuristic prefill: keep-as-is when already parent; suggest manual/update path otherwise. Duplicate_Target defaults to Keep As-Is when no actionable suggestion.
- **Status:** Implemented

### P2.2: Re-Import Prior Review Decisions

- **Goal:** Map previous decisions back by Review_Row_ID with conflict report for multi-day review continuity.
- **Status:** Implemented

---

## Join Preview Workflow

### Join Preview

- **Goal:** Produce a joined view of translation table + Outcomes + myWSU for visual verification before publish. Key matching only; one row per translate row; Outcomes columns + translate_input/translate_output + myWSU columns.
- **Status:** Implemented

---

## Fix Queue Verification

**Verified:** No fixes remain in the queue. All P0/P1/P2 items implemented; no unblocked items.
