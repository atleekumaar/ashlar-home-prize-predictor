export type LensId = "study" | "us" | "coastal";

export const LENSES: { id: LensId; label: string; factor: number; note: string }[] = [
  {
    id: "study",
    label: "1978 dollars",
    factor: 1,
    note: "The study’s own dollars. A result of 21 is $21,000 in the late 1970s.",
  },
  {
    id: "us",
    label: "US housing ×8",
    factor: 8,
    note: "National sale prices are roughly eight times late-1970s levels.",
  },
  {
    id: "coastal",
    label: "Coastal ×20",
    factor: 20,
    note: "A hotter-market sketch so the logic is easier to feel. Not an appraisal.",
  },
];

export function lensById(id: LensId) {
  return LENSES.find((lens) => lens.id === id) ?? LENSES[2];
}

export function dollarsFromMedv(medv: number, factor: number) {
  return medv * 1000 * factor;
}

export function roundDollars(dollars: number, factor: number) {
  const step = factor === 1 ? 10 : 100;
  return Math.round(dollars / step) * step;
}

export function formatMoney(dollars: number) {
  const rounded = Math.round(dollars);
  return rounded.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatSignedDollars(dollars: number, factor: number) {
  const rounded = roundDollars(dollars, factor);
  if (rounded === 0) return formatMoney(0);
  const sign = rounded > 0 ? "+" : "−";
  return sign + formatMoney(Math.abs(rounded));
}

export function formatCompact(dollars: number) {
  const sign = dollars < 0 ? "−" : "";
  const value = Math.abs(dollars);
  if (value >= 1_000_000) return `${sign}$${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 10_000) return `${sign}$${Math.round(value / 1000)}k`;
  return formatMoney(dollars);
}
