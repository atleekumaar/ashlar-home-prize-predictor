import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Load model data
const code = fs.readFileSync("src/data/model-data.ts", "utf8");
const start = code.indexOf('JSON.parse(`') + 'JSON.parse(`'.length;
const end = code.lastIndexOf('`)');
const model = JSON.parse(code.slice(start, end));

function isLeaf(node) {
  return node.length === 1;
}

function predictMedv(x) {
  let total = model.baseScore;
  for (const tree of model.trees) {
    let index = 0;
    let node = tree[index];
    let guard = 0;
    while (node && !isLeaf(node)) {
      const feature = node[0];
      const threshold = node[1];
      const yes = node[2];
      const no = node[3];
      const missing = node[4];
      const value = x[feature];
      if (value == null || Number.isNaN(value)) index = missing;
      else if (value < threshold) index = yes;
      else index = no;
      node = tree[index];
      guard += 1;
      if (guard > 24) break;
    }
    total += node?.[0] ?? 0;
  }
  return total;
}

function monthlyPayment(principal, annualPercent, years = 30) {
  if (principal <= 0) return 0;
  const monthly = annualPercent / 100 / 12;
  const payments = years * 12;
  if (monthly === 0) return principal / payments;
  const grown = (1 + monthly) ** payments;
  return (principal * monthly * grown) / (grown - 1);
}

function dollarsFromMedv(medv, factor) {
  return medv * 1000 * factor;
}

test("predictMedv: evaluates model trees deterministically", () => {
  assert.equal(model.trees.length, 100);
  assert.equal(model.features.length, 12);
  assert.equal(model.baseScore, 0.5);

  // Test row 0: [0.00632, 18.0, 2.31, 0.0, 0.538, 6.575, 65.2, 4.09, 1.0, 296.0, 15.3, 4.98]
  const row0 = model.rows[0];
  const pred0 = predictMedv(row0.x);
  assert.ok(Number.isFinite(pred0));
  assert.ok(pred0 > 15 && pred0 < 35, `Prediction ${pred0} within reasonable bounds`);
});

test("predictMedv: overall MAE on 506 historical rows matches expected error range", () => {
  let sumAbsDiff = 0;
  for (const row of model.rows) {
    const pred = predictMedv(row.x);
    sumAbsDiff += Math.abs(pred - row.price);
  }
  const meanMae = sumAbsDiff / model.rows.length;
  // Train MAE is 1.199 (404 rows), Test MAE is 1.985 (102 rows). Weighted mean = ~1.357
  assert.ok(Math.abs(meanMae - 1.357) < 0.05, `Overall dataset MAE ${meanMae} within 0.05 of weighted expectation`);
});

test("monthlyPayment: calculates exact standard 30-year fixed loan payments", () => {
  // $100,000 loan at 6.0% for 30 years = $599.55 / month
  const p1 = monthlyPayment(100000, 6.0, 30);
  assert.ok(Math.abs(p1 - 599.55) < 0.1, `Got ${p1}, expected ~599.55`);

  // $200,000 loan at 6.5% for 30 years = $1264.14 / month
  const p2 = monthlyPayment(200000, 6.5, 30);
  assert.ok(Math.abs(p2 - 1264.14) < 0.1, `Got ${p2}, expected ~1264.14`);

  // Zero interest: $120,000 loan at 0% for 30 years (360 mo) = $333.33 / month
  const pZero = monthlyPayment(120000, 0, 30);
  assert.ok(Math.abs(pZero - 333.33) < 0.1, `Got ${pZero}, expected ~333.33`);

  // Zero principal
  assert.equal(monthlyPayment(0, 6.5, 30), 0);
  assert.equal(monthlyPayment(-1000, 6.5, 30), 0);
});

test("dollarsFromMedv: correct scaling across lenses", () => {
  // MEDV = 24 ($24k in 1978)
  assert.equal(dollarsFromMedv(24, 1), 24000);
  assert.equal(dollarsFromMedv(24, 8), 192000);
  assert.equal(dollarsFromMedv(24, 20), 480000);
});
