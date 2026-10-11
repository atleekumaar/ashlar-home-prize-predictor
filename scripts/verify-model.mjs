import fs from "node:fs";

// Read model JSON directly from src/data/model-data.ts
const code = fs.readFileSync("src/data/model-data.ts", "utf8");
const start = code.indexOf('JSON.parse(`') + 'JSON.parse(`'.length;
const end = code.lastIndexOf('`)');
const jsonStr = code.slice(start, end);
const model = JSON.parse(jsonStr);

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

console.log("=== MODEL METADATA ===");
console.log("Features (" + model.features.length + "):", model.features.join(", "));
console.log("Trees count:", model.trees.length);
console.log("Base score:", model.baseScore);
console.log("Reported Metrics:", JSON.stringify(model.metrics));

// Evaluate predictions on historical rows
const preds = model.rows.map(row => predictMedv(row.x));
const actuals = model.rows.map(row => row.price);

let sumAbsDiff = 0;
let sumSqDiff = 0;
let sumActual = 0;
for (let i = 0; i < model.rows.length; i++) {
  const diff = preds[i] - actuals[i];
  sumAbsDiff += Math.abs(diff);
  sumSqDiff += diff * diff;
  sumActual += actuals[i];
}

const n = model.rows.length;
const meanActual = sumActual / n;
let totalSq = 0;
for (let i = 0; i < n; i++) {
  const d = actuals[i] - meanActual;
  totalSq += d * d;
}

const overallMae = sumAbsDiff / n;
const overallR2 = 1 - (sumSqDiff / totalSq);

console.log("\n=== FULL DATASET EVALUATION (N=" + n + ") ===");
console.log("Overall MAE:", overallMae.toFixed(4));
console.log("Overall R2:", overallR2.toFixed(4));

// Test extreme / boundary inputs
console.log("\n=== BOUNDARY & EXTREME INPUTS ===");
const zeroInput = new Array(12).fill(0);
console.log("All Zeros prediction:", predictMedv(zeroInput).toFixed(4));

const maxInput = model.features.map(f => model.percentiles[f][100]);
console.log("Max Percentiles prediction:", predictMedv(maxInput).toFixed(4));

const minInput = model.features.map(f => model.percentiles[f][0]);
console.log("Min Percentiles prediction:", predictMedv(minInput).toFixed(4));

const meanInput = model.features.map(f => model.means[f]);
console.log("Mean Features prediction:", predictMedv(meanInput).toFixed(4));
