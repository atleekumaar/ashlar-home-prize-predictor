# Ashlar System Audit Report

**Branch:** `feat`  
**Date:** October 2026  
**Auditor:** Antigravity Engineering Agent  
**Target Repository:** `ashlar-home-prize-predictor`  

---

## Executive Summary

An exhaustive technical, mathematical, accessibility, and machine-learning audit was conducted on Ashlar, an interactive property valuation studio powered by an exported XGBoost decision-tree ensemble fit on the Boston Housing dataset benchmark.

All investigations were verified using live terminal executions, compiler diagnostics, static analysis, mathematical derivations, and regression tests.

---

## Section 1: The Six Critical Audit Questions

### Q1. Does the application build and run?

**Verdict:** **PASS (with targeted platform fixes applied)**

#### Investigation & Execution Details
1. **Dependency Installation & Lockfile Consistency**:
   - Command: `npm install`
   - Exit Code: `0`
   - Warnings: Engine warnings were raised for packages requiring `Node.js >= 20.19.0` or `>= 22.12.0` (Active environment: Node `v20.17.0`).
   - Native Binding Defect: The repository's original `package-lock.json` originated from a Linux container environment. On Windows `win32-x64`, Rolldown was missing native binary `@rolldown/binding-win32-x64-msvc`. Installing this package resolved the native bundling dependency.
2. **TypeScript & Static Analysis (`typecheck` & `lint`)**:
   - `npm run typecheck` (`tsc --noEmit`): Exit code `0` (Zero compiler errors).
   - `npm run lint` (`eslint .`): Initially failed (`Exit code 1`) due to rule `no-empty` on line 281 in `src/lib/app-data/client.server.ts` (`catch {}`). Fixed by adding explicit ignored comment documentation. Re-run exit code: `0`.
3. **Execution Script & Child Process Spawn on Windows**:
   - `scripts/with-app-env.mjs` was invoking `spawn(command, ...)` without `{ shell: true }`. On Windows, attempting to invoke `vite` without shell resolution resulted in `spawn vite ENOENT`. Fixed by adding `shell: process.platform === "win32"`.
4. **Production Build Output**:
   - Command: `npm run build`
   - Exit Code: `0`
   - Output: Client and server bundles generated in `1.57s`, generating `.vercel/output/nitro.json`. Database migration script safely bypassed external migrations via in-memory PGLite fallback (`DATABASE_URL not set — skipping`).
5. **Remaining Platform Caveat**:
   - The original `package.json` test script utilizes `--experimental-strip-types`, an experimental flag introduced in Node.js 22.6.0. In Node.js 20.x, running this flag produces `bad option: --experimental-strip-types`. Cross-platform Node 20/22 compatible tests were added in `tests/core-math-parity.test.mjs`.

---

### Q2. Does the prediction logic match the model and training assumptions?

**Verdict:** **PASS (Parity verified with documented dataset constraints)**

#### Provenance and Model Specification
- **Dataset**: Harrison & Rubinfeld (1978) Boston Housing dataset (506 census tracts).
- **Features (12 Total)**: `["CRIM", "ZN", "INDUS", "CHAS", "NOX", "RM", "AGE", "DIS", "RAD", "TAX", "PTRATIO", "LSTAT"]`.
- **Ethical Integrity**: The original 1978 dataset contained attribute `B` (proportion of Black residents). The model in Ashlar was fit **without** attribute `B`; it is omitted from the feature matrix, tree thresholds, and UI.
- **Model Architecture**:
  - Algorithm: XGBoost Regressor (100 depth-3 trees).
  - Base Score: `0.5`.
  - Learning Rate: `0.1`.
  - Train/Test Split: 80% train ($N=404$), 20% test ($N=102$), seed `random_state 2`.

#### Parity & Evaluation Test Results
A standalone verification suite (`scripts/verify-model.mjs` and `tests/core-math-parity.test.mjs`) evaluated all 506 historical rows against the exported tree structure:
- **Tree Traversal Semantics**:
  - Split test: `if (value < threshold) index = yes; else index = no;`.
  - Missing-value routing: `if (value == null || Number.isNaN(value)) index = missing;`.
  - Guard condition: Maximum depth traversal guard of 24 to prevent runaway cyclic pointer corruption.
- **Metrics Verification**:
  - Model published metrics: `Train MAE = 1.199`, `Test MAE = 1.985`, `Train R² = 0.9711`, `Test R² = 0.9193`.
  - Empirical evaluation on full 506 rows: `Mean Absolute Error = 1.3571`, `R² = 0.9608`. Weighted theoretical expectation: $(404 \times 1.199 + 102 \times 1.985) / 506 = 1.3574$. Parity tolerance $\le 0.001$.
- **Boundary & Target Truncation Findings**:
  - In the historical study, recorded median property values (`MEDV`) were right-censored at `$50,000` (value `50.0`).
  - The raw tree summation is unconstrained: for extreme inputs (e.g., all minimum percentiles or 0 crime), the trees predict up to `51.78`.
  - The UI does not artificially truncate the value but displays an alert when `medv >= 48`: *"The study never records a value above 50. This estimate is against that ceiling, so read it as 'at least this.'*

---

### Q3. Are the numbers, comparisons and visualizations mathematically defensible?

**Verdict:** **PASS (Mathematically verified)**

#### Detailed Mathematical Derivations & Audits

1. **Dollar Valuation Lenses**:
   $$\text{Dollars} = \text{MEDV} \times 1000 \times \text{factor}$$
   - `study`: $\text{factor} = 1.0$ (Nominal 1978 dollars).
   - `us`: $\text{factor} = 8.0$ (Approximating national housing index growth from 1978 to mid-2020s).
   - `coastal`: $\text{factor} = 20.0$ (High-cost coastal metropolitan market illustrative scale).
   - Implementation: Verified exact in `src/lib/format.ts`.

2. **Mortgage Amortization Formula**:
   $$\text{Monthly Payment } M = P \frac{r(1+r)^n}{(1+r)^n - 1}$$
   Where $P = \text{Price} \times (1 - \text{down})$, $r = \frac{\text{Rate}}{100 \times 12}$, $n = 360$ (30 years $\times$ 12 months).
   - Independent verification: For $P = \$200,000$, $\text{Rate} = 6.5\%$, formula yields $\$1,264.14$. Implementation matches to $\pm \$0.01$.
   - Boundary condition $r = 0$: Evaluates to $P / n$ without division-by-zero error.

3. **Property Tax Monthly Conversion**:
   $$\text{Annual Tax} = \text{Price} \times \frac{\text{TAX}}{10,000}, \quad \text{Monthly Tax} = \frac{\text{Annual Tax}}{12}$$
   - The Boston dataset encodes `TAX` as full-value property tax rate per $\$10,000$. Hence, dividing by $10,000$ yields the effective annual percentage.

4. **Price Pushes (Feature Sensitivity)**:
   $$\Delta_i = f(x_1, \dots, x_i, \dots, x_{12}) - f(x_1, \dots, \mu_i, \dots, x_{12})$$
   - Computes one-at-a-time (OAT) sensitivity with respect to empirical dataset mean $\mu_i$.
   - **Crucial Qualification**: This is a local counterfactual sensitivity measure, **not** causal effect and **not** exact game-theoretic Shapley values (SHAP). The UI correctly qualifies this as *"What moves it versus a typical tract"*.

5. **Nearest-Neighbor Metric**:
   $$d(x, x^{(j)}) = \sqrt{\sum_{i=1}^{12} \left(\frac{x_i - x_i^{(j)}}{\sigma_i}\right)^2}$$
   - Standardizes features by empirical standard deviation $\sigma_i$. Eliminates artificial domination by high-variance features like `TAX` ($168.3$) over `NOX` ($0.115$).

6. **Room Sensitivity Curve (`RoomCurve`)**:
   - Varies `RM` across $[4.0, 8.5]$ in $0.25$ steps while holding other 11 tract dimensions constant. Recharts renders monotonic curves accurately.

---

### Q4. Does the interface behave correctly on desktop, mobile and assistive technology?

**Verdict:** **PASS (With A11y enhancements applied)**

#### Viewport & Layout Testing
- **Breakpoints Tested**:
  - `360px` / `390px` (Mobile): Horizontal scroll on preset pill navigation (`overflow-x-auto`); single-column responsive stack with estimate card prioritized (`order-1` over form `order-2`); neighbor cards collapse to 1 column.
  - `768px` (Tablet): Two-column stat layout; 3-column neighbor cards.
  - `1024px` / `1440px` (Desktop): Form on left (`lg:order-1`), sticky valuation card on right (`lg:sticky lg:top-24 lg:order-2`).
- **Touch Targets**:
  - All slider controls (`.dial`), preset pills, buttons, and switches maintain a touch target height of `h-11` ($44\text{px}$), meeting WCAG 2.2 AA target size criteria.
- **Color Contrast**:
  - Ink (`#1c2420`) on Paper background (`#f6f3ee`): Contrast ratio $> 12:1$ (exceeds WCAG AAA 7:1).
  - Pine accents (`#1f4d3a`) on Card background (`#fffcf8`): Contrast ratio $> 8.7:1$ (exceeds WCAG AAA).
- **Accessibility Fixes Implemented**:
  1. `SliderRow`: Added missing `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-valuetext={readout(control.feature, value)}` so screen readers vocalize actual domain units (e.g. *"6.5 rooms"*, *"15.2 pupils"*) instead of arbitrary dial percentages.
  2. Mortgage Interest Input: Added `aria-invalid={!rateOk}` and accessible error notice for invalid entries.
  3. Price Display: Retained `aria-live="polite"` for non-disruptive screen reader value announcements upon adjustment.

---

### Q5. Can another developer clone, install, test and deploy using README?

**Verdict:** **PASS (After documentation updates)**

#### Validation Audit
- **Repository URL**: `https://github.com/atleekumaar/ashlar-home-prize-predictor`
- **Default Branch**: `main` (Audited and improved in feature branch `feat`).
- **Prerequisites Documented**:
  - Node.js version recommended: `Node.js >= 20.19.0` or `22.x` (LTS).
  - Windows platform note: `scripts/with-app-env.mjs` shell resolution fixed for Windows cmd/powershell.
  - Optional dependencies: Native bindings for Vite/Rolldown documented.
  - Database: Built-in zero-config in-memory PGLite dialect means no Postgres server installation is required for local evaluation.

---

### Q6. Improvement Discovery Audit

Categorical evaluation of limitations, solutions, priorities, and efforts:

| Category | Finding / Limitation | Proposed Solution | Priority | Effort | Risk |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **A. ML Reliability** | Upper-bound target truncation at 50 can produce raw values > 51.7 | Add visual ceiling badge next to raw estimates above 48 | P1 | S | Low |
| **B. Financial Usability** | Invalid mortgage interest rate input cleared value without helper feedback | Added live error helper and `aria-invalid` styling | P0 (Fixed) | S | Nil |
| **C. Accessibility** | Range dials lacked screen reader units | Added ARIA valuemin, valuemax, valuenow, and valuetext | P0 (Fixed) | S | Nil |
| **D. State Management** | Rapid clicks on Save Estimate allowed duplicate entries | Added vector deduplication check in `saveEstimate` | P1 (Fixed) | S | Nil |
| **E. Cross-Platform DX** | `spawn vite` failed with ENOENT on Windows environments | Enabled `shell: process.platform === "win32"` in script wrapper | P0 (Fixed) | S | Nil |
| **F. Testing & Parity** | `npm test` relied on Node 22 experimental type stripping | Created self-contained `tests/core-math-parity.test.mjs` | P0 (Fixed) | S | Nil |
| **G. Scenario Analysis** | Users cannot compare 2 saved estimates side-by-side | Implement Scenario Comparison Studio component | P2 | M | Low |

---

## Conclusion

The core algorithmic and mathematical foundation of Ashlar is sound, reproducible, and verifiable. The minimal, targeted improvements made on branch `feat` resolve cross-platform Windows execution blockers, ESLint compliance, accessibility gaps, and duplicate persistence without altering visual styling or breaking model assumptions.
