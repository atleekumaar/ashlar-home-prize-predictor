# Ashlar - Home Price Predictor

An interactive house price evaluation studio and machine learning explorer.

Ashlar lets users inspect, adjust, and understand property valuations based on 12 key tract and property characteristics, powered by an XGBoost model fit on historical housing dataset benchmarks.

## Documentation & Audits

- [System Audit Report (Phase 8 Questions)](docs/AUDIT_REPORT.md)
- [Improvement Roadmap (Prioritized Tiers)](docs/IMPROVEMENT_ROADMAP.md)
- [Testing & Verification Guide](docs/TESTING.md)

## Features

- **Interactive Valuation Studio**: Adjust home and block features (room count, age, Charles River frontage, safety/crime, prosperity, school pupil-teacher ratios, and taxes) to see instant valuation updates.
- **Explainable Insights (Price Pushes)**: Breaks down how each factor pulls the price above or below average.
- **Multiple Economic Lenses**: View estimates under historical 1978 baseline, inflation-adjusted, metro, or coastal price lenses.
- **Comparable Tracts**: Finds the nearest census tracts using normalized Euclidean distance over historical records.
- **Mortgage & Tax Estimation**: Real-time 30-year fixed loan payment breakdown with property tax estimates.
- **Sensitivity Curve**: Dynamic visual curve illustrating price sensitivity to room count while holding all other variables constant.
- **Local Persistence**: Save and revisit multiple scenarios directly in your browser.

## Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TanStack Start](https://tanstack.com/start) & [TanStack Router](https://tanstack.com/router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Bundler**: [Vite](https://vitejs.dev/)

## Prerequisites

- **Node.js**: Recommended `Node.js >= 20.19.0` or `22.x` (LTS).
- **npm**: `npm >= 10.x`.
- **Operating Systems**: Fully compatible with Linux, macOS, and Windows.

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/atleekumaar/ashlar-home-prize-predictor.git
   cd ashlar-home-prize-predictor
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Run tests & quality checks**:
   ```bash
   # Typecheck
   npm run typecheck

   # Lint
   npm run lint

   # Core math & ML parity test suite
   node --test tests/core-math-parity.test.mjs
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```
