import { model } from "@/data/model-data";

function isLeaf(node: number[]) {
  return node.length === 1;
}

/** Study median value, in thousands of late-1970s dollars. */
export function predictMedv(x: number[]) {
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

export function featureIndex(name: string) {
  return model.features.indexOf(name);
}

export function percentileOf(feature: string, value: number) {
  const knots = model.percentiles[feature];
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < knots.length; i += 1) {
    const distance = Math.abs(knots[i] - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

export function valueAtPercentile(feature: string, percentile: number) {
  const knots = model.percentiles[feature];
  const index = Math.max(0, Math.min(100, Math.round(percentile)));
  return knots[index];
}

export type Push = { feature: string; deltaMedv: number };

/** How much each fact moves the price versus a typical training tract. */
export function pricePushes(x: number[]): Push[] {
  const base = predictMedv(x);
  return model.features
    .map((feature, index) => {
      const altered = x.slice();
      altered[index] = model.means[feature];
      return { feature, deltaMedv: base - predictMedv(altered) };
    })
    .sort((a, b) => Math.abs(b.deltaMedv) - Math.abs(a.deltaMedv));
}

export type Neighbor = {
  id: number;
  x: number[];
  price: number;
  distance: number;
};

export function nearestTracts(x: number[], count = 3): Neighbor[] {
  const scored = model.rows.map((row) => {
    let sum = 0;
    for (let i = 0; i < x.length; i += 1) {
      const scale = model.stds[model.features[i]] || 1;
      const z = (x[i] - row.x[i]) / scale;
      sum += z * z;
    }
    return { id: row.id, x: row.x, price: row.price, distance: Math.sqrt(sum) };
  });
  scored.sort((a, b) => a.distance - b.distance);
  return scored.filter((row) => row.distance > 0.02).slice(0, count);
}

export function vectorFromRow(rowId: number) {
  const row = model.rows.find((item) => item.id === rowId);
  if (!row) return model.features.map((feature) => model.means[feature]);
  return row.x.slice();
}
