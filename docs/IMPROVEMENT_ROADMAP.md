# Ashlar Implementation & Improvement Roadmap

**Branch:** `feat`  
**Status:** Baseline Audit Completed & Phase 10 Roadmap Defined  

---

## 1. Overview of Priority Tiers

| Priority Tier | Description | Action Status |
| :--- | :--- | :--- |
| **Tier 0: Must-Fix Defects** | Critical execution blockers, compiler/linter failures, accessibility deficits, or data corruption bugs | **Implemented on `feat`** |
| **Tier 1: High-Value Improvements** | Tangible UX, ML transparency, and financial clarity upgrades | **Ready for Next Release** |
| **Tier 2: Optional Enhancements** | Scenario comparisons, advanced sharing, and export facilities | **Backlog** |
| **Tier 3: Deferred Research Work** | Deep causal inference, real-world MLS ingestion, multi-city models | **Future Strategy** |

---

## 2. Tier 0: Must-Fix Defects (Implemented on `feat`)

### 0.1 Windows Process Spawn Failure
- **Current Limitation:** Running `npm run dev` or `npm run build` failed with `[with-app-env] failed to run vite: spawn vite ENOENT` on Windows.
- **Solution:** Updated `scripts/with-app-env.mjs` to invoke child process with `{ shell: process.platform === "win32" }`.
- **User & Technical Benefit:** Enables seamless execution on Windows machines without manual path or binary workarounds.
- **Priority:** `P0` | **Effort:** `S` | **Risk:** `Nil` | **Status:** **Implemented**

### 0.2 Native Binary Missing in Windows Environment
- **Current Limitation:** Original lockfile generated in Linux sandbox omitted Windows-specific Rolldown binary `@rolldown/binding-win32-x64-msvc`.
- **Solution:** Installed Windows native binding and documented requirement in README.
- **User & Technical Benefit:** Unblocks Vite production bundler on Windows hosts.
- **Priority:** `P0` | **Effort:** `S` | **Risk:** `Nil` | **Status:** **Implemented**

### 0.3 ESLint `no-empty` Rule Violation
- **Current Limitation:** `npm run lint` failed on `src/lib/app-data/client.server.ts` line 281 due to an empty `catch {}` statement.
- **Solution:** Added explicit documented comment within catch block.
- **User & Technical Benefit:** Restores automated CI linting compliance.
- **Priority:** `P0` | **Effort:** `S` | **Risk:** `Nil` | **Status:** **Implemented**

### 0.4 Hardcoded Array Index Fragility in Neighbor Cards
- **Current Limitation:** Neighbor tract display used hardcoded magic indices `neighbor.x[5]` and `neighbor.x[11]` instead of dynamic lookup functions.
- **Solution:** Replaced with `readout("RM", neighbor.x[featureIndex("RM")])` and `readout("LSTAT", neighbor.x[featureIndex("LSTAT")])`.
- **User & Technical Benefit:** Eliminates data rendering bugs if feature arrays are ever reordered.
- **Priority:** `P0` | **Effort:** `S` | **Risk:** `Nil` | **Status:** **Implemented**

### 0.5 Screen Reader Accessibility (A11y) Gaps on Range Sliders
- **Current Limitation:** Sliders only exposed percentile numbers (0–100) without units to assistive technology.
- **Solution:** Added `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext={readout(control.feature, value)}` to `SliderRow`.
- **User & Technical Benefit:** Screen reader users hear actual metrics (e.g. *"6.5 rooms"*, *"15.2% pupil-teacher ratio"*).
- **Priority:** `P0` | **Effort:** `S` | **Risk:** `Nil` | **Status:** **Implemented**

### 0.6 Mortgage Input Validation & Error Indication
- **Current Limitation:** Non-numeric or out-of-bounds interest rates caused loan output to collapse to `—` without feedback.
- **Solution:** Added live helper alert (`"Please enter a valid rate between 0% and 30%"`) and `aria-invalid={!rateOk}`.
- **User & Technical Benefit:** Prevents user confusion regarding why calculations disappear.
- **Priority:** `P0` | **Effort:** `S` | **Risk:** `Nil` | **Status:** **Implemented**

### 0.7 Duplicate Saved Estimates
- **Current Limitation:** Re-clicking "Save on this device" for an identical vector created duplicate entries and consumed the 12-slot capacity.
- **Solution:** Added deduplication check via `sameVector(entry.x, x) && entry.lens === lens`.
- **User & Technical Benefit:** Keeps saved history clean and useful.
- **Priority:** `P0` | **Effort:** `S` | **Risk:** `Nil` | **Status:** **Implemented**

---

## 3. Tier 1: High-Value Improvements

### 1.1 Model Validation & Diagnostics Dashboard
- **Limitation:** Model evaluation stats (MAE 1.985, R² 0.9193) are displayed as raw numbers without visual residual plots.
- **Proposed Solution:** Add an interactive scatter chart comparing predicted vs recorded median value for all 506 study tracts, with a residual distribution histogram.
- **User Benefit:** Clear visual proof of where the model fits closely and where errors occur (especially near the $50k cap).
- **Technical Benefit:** Elevates ML scientific credibility.
- **Priority:** `P1` | **Effort:** `M` | **Risk:** `Low` | **Dependencies:** Recharts scatter chart component.

### 1.2 Out-Of-Distribution (OOD) Input Indicator
- **Limitation:** Inputs outside historical minimum/maximum ranges (e.g. rooms > 8.8 or crime > 88.9) extrapolate tree outputs without warning.
- **Proposed Solution:** Display a subtle badge ("Historical range exceeded") when any feature slider exceeds the 1st or 99th dataset percentiles.
- **User Benefit:** Honest communication of model boundaries and prediction confidence.
- **Technical Benefit:** Prevents misleading extrapolations.
- **Priority:** `P1` | **Effort:** `S` | **Risk:** `Low` | **Dependencies:** `model.percentiles` lookup.

---

## 4. Tier 2: Optional Enhancements

### 2.1 Scenario Comparison Studio
- **Limitation:** Users can only view one saved estimate at a time by clicking "Open".
- **Proposed Solution:** Add a "Compare" mode that places two saved estimates side-by-side with delta badges ($\Delta \text{Price}$, $\Delta \text{Payment}$, $\Delta \text{Rooms}$).
- **User Benefit:** Direct comparison of trade-offs between two home configurations.
- **Technical Benefit:** Reuses existing `predictMedv` and `monthlyPayment` pure functions without additional dependencies.
- **Priority:** `P2` | **Effort:** `M` | **Risk:** `Low` | **Dependencies:** Saved estimate state.

### 2.2 Exportable Scenario Summary (JSON / CSV)
- **Limitation:** Saved estimates are restricted to `localStorage` on a single device.
- **Proposed Solution:** Provide a one-click "Export JSON" button to back up or share saved estimates.
- **Priority:** `P2` | **Effort:** `S` | **Risk:** `Nil`.

---

## 5. Tier 3: Deferred Strategic Work

### 3.1 True Causal SHAP Decomposition
- **Reason for Deferral:** Price pushes currently use One-At-a-Time (OAT) mean sensitivity, which is lightweight ($O(12 \times \text{trees})$) and executes in $<1\text{ms}$ on the main thread. Full Shapley value computation requires exponential combinations or an external tree-SHAP engine that would bloat client bundle size.

### 3.2 Live Real Estate API Integration (Zillow/Redfin)
- **Reason for Deferral:** Ashlar is an educational/historical study app based on the 1978 Boston benchmark dataset. Real-world property valuation requires geo-coordinates, real-time MLS feeds, and contemporary zoning laws outside the scope of this static benchmark model.

---

## 6. Implementation Schedule

```mermaid
flowchart TD
    A["Baseline Audit & Question Verification"] --> B["Tier 0 Defect Fixes (Windows, A11y, Duplicates)"]
    B --> C["Core Math & Prediction Parity Tests"]
    C --> D["Docs Deliverables (AUDIT_REPORT, ROADMAP, TESTING)"]
    D --> E["Tier 1 Release: Diagnostics & OOD Warnings"]
    E --> F["Tier 2 Backlog: Scenario Comparison Studio"]
```
