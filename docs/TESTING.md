# Ashlar Verification & Testing Guide

This document describes the test suites, verification procedures, and continuous integration recommendations for the Ashlar property valuation studio.

---

## 1. Test Architecture Overview

Ashlar incorporates three layers of testing:

1. **Static Type & Lint Verification**: TypeScript strict mode (`tsc --noEmit`) and ESLint 9 (`eslint .`).
2. **Mathematical & ML Parity Tests**: Pure-function unit tests validating the client-side XGBoost tree evaluations, mortgage amortization, property tax, and nearest-neighbor distance metrics (`tests/core-math-parity.test.mjs`).
3. **Internal Script & Platform Tests**: Node built-in test runner verification of app-env injection, preview host bridges, and atomic file operations (`scripts/*.test.mjs`).

---

## 2. Executing Tests

### Cross-Platform Core Math & Parity Suite (Recommended)

To run the self-contained mathematical parity and inference test suite on any platform (Windows, macOS, or Linux, Node 20+ or 22+):

```bash
node --test tests/core-math-parity.test.mjs
```

**Expected output:**
```
TAP version 13
# Subtest: predictMedv: evaluates model trees deterministically
ok 1 - predictMedv: evaluates model trees deterministically
# Subtest: predictMedv: overall MAE on 506 historical rows matches expected error range
ok 2 - predictMedv: overall MAE on 506 historical rows matches expected error range
# Subtest: monthlyPayment: calculates exact standard 30-year fixed loan payments
ok 3 - monthlyPayment: calculates exact standard 30-year fixed loan payments
# Subtest: dollarsFromMedv: correct scaling across lenses
ok 4 - dollarsFromMedv: correct scaling across lenses
1..4
# tests 4
# pass 4
# fail 0
```

---

### Type Checking & Linting

```bash
# TypeScript compiler check
npm run typecheck

# ESLint code hygiene check
npm run lint
```

Both commands must exit with code `0`.

---

### Production Build Verification

Verify that Vite bundler and Nitro server target build cleanly:

```bash
npm run build
```

**Validation criteria:**
- Generates `.vercel/output/` without native binding errors.
- Exits with code `0`.

---

## 3. Test Cases & Mathematical Validation Criteria

### 1. Model Parity (`predictMedv`)
- Evaluates 100 decision trees sequentially starting with base score $0.5$.
- Verifies full-dataset evaluation across all 506 recorded census tracts.
- Asserts that weighted Mean Absolute Error (MAE) matches the published study metrics ($1.357 \pm 0.05$).

### 2. Mortgage Amortization (`monthlyPayment`)
- Validates the standard closed-form formula:
  $$M = P \frac{r(1+r)^n}{(1+r)^n - 1}$$
- Edge case: $0\%$ interest rate must fall back cleanly to linear principal division ($P / n$).
- Edge case: Zero or negative principal returns $\$0$.

### 3. Lens Scaling (`dollarsFromMedv`)
- Validates nominal 1978 baseline ($\times 1$), US housing index ($\times 8$), and high-cost coastal market ($\times 20$) scaling factors.

---

## 4. Continuous Integration (CI) Workflow Recommendation

Create `.github/workflows/ci.yml` with the following configuration:

```yaml
name: CI

on:
  push:
    branches: [main, feat]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: node --test tests/core-math-parity.test.mjs
      - run: npm run build
```
