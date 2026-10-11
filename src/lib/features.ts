export type SliderControl = {
  feature: string;
  group: string;
  label: string;
  low: string;
  high: string;
  kind: "pct" | "rooms";
  invert?: boolean;
};

export type ToggleControl = {
  feature: "CHAS";
  group: string;
  label: string;
  kind: "toggle";
  hint: string;
};

export type Control = SliderControl | ToggleControl;

export const GROUP_COPY: Record<string, string> = {
  "The home": "Size, age, and whether the tract touches the river.",
  "The block": "Safety, prosperity, lots, industry, and the air.",
  "Getting around": "Jobs, highways, classrooms, and the tax rate.",
};

export const CONTROLS: Control[] = [
  { feature: "RM", group: "The home", label: "Rooms", low: "Fewer", high: "More", kind: "rooms" },
  { feature: "AGE", group: "The home", label: "Age of the block", low: "Newer", high: "Older", kind: "pct" },
  {
    feature: "CHAS",
    group: "The home",
    label: "River",
    kind: "toggle",
    hint: "The tract bounds the Charles.",
  },
  {
    feature: "CRIM",
    group: "The block",
    label: "Safety",
    low: "Exposed",
    high: "Quieter",
    kind: "pct",
    invert: true,
  },
  {
    feature: "LSTAT",
    group: "The block",
    label: "Prosperity",
    low: "Strained",
    high: "Easier",
    kind: "pct",
    invert: true,
  },
  { feature: "ZN", group: "The block", label: "Large lots", low: "None", high: "Widespread", kind: "pct" },
  { feature: "INDUS", group: "The block", label: "Industry", low: "Less", high: "More", kind: "pct" },
  {
    feature: "NOX",
    group: "The block",
    label: "Air",
    low: "Heavier",
    high: "Clearer",
    kind: "pct",
    invert: true,
  },
  { feature: "DIS", group: "Getting around", label: "Commute", low: "Closer", high: "Farther", kind: "pct" },
  { feature: "RAD", group: "Getting around", label: "Highways", low: "Fewer", high: "More", kind: "pct" },
  {
    feature: "PTRATIO",
    group: "Getting around",
    label: "Classrooms",
    low: "Smaller",
    high: "Larger",
    kind: "pct",
  },
  { feature: "TAX", group: "Getting around", label: "Tax rate", low: "Lower", high: "Higher", kind: "pct" },
];

export const SHORT_LABEL: Record<string, string> = {
  CRIM: "Crime",
  ZN: "Large lots",
  INDUS: "Industry",
  CHAS: "River",
  NOX: "Air pollution",
  RM: "Rooms",
  AGE: "Older stock",
  DIS: "Job distance",
  RAD: "Highways",
  TAX: "Tax",
  PTRATIO: "Class size",
  LSTAT: "Economic strain",
};

export const PRESETS = [
  { id: "middle", name: "Middle block", blurb: "Near the middle of the 506 tracts.", rowId: 78 },
  { id: "garden", name: "Garden suburb", blurb: "Wide lots, newer houses, a quiet crime rate.", rowId: 193 },
  { id: "rooms", name: "Many rooms", blurb: "More than seven rooms, still off the river.", rowId: 2 },
  { id: "river", name: "River edge", blurb: "Bounds the river. The study caps this kind of tract at 50.", rowId: 162 },
  { id: "hard", name: "Strained block", blurb: "High crime, fewer rooms, the heavy tax band.", rowId: 398 },
] as const;

export function readout(feature: string, value: number) {
  switch (feature) {
    case "RM":
      return `${value.toFixed(1)} rooms`;
    case "AGE":
      return `${Math.round(value)}% pre-1940`;
    case "CRIM":
      return value < 1 ? `${value.toFixed(2)} crime` : `${value.toFixed(1)} crime`;
    case "ZN":
      return `${Math.round(value)}% large lots`;
    case "INDUS":
      return `${value.toFixed(1)}% industry`;
    case "NOX":
      return `${value.toFixed(3)} NOX`;
    case "DIS":
      return `${value.toFixed(2)} distance`;
    case "RAD":
      return `index ${Math.round(value)}`;
    case "TAX":
      return `${Math.round(value)} per $10k`;
    case "PTRATIO":
      return `${value.toFixed(1)} pupils`;
    case "LSTAT":
      return `${value.toFixed(1)}% strain`;
    case "CHAS":
      return value >= 0.5 ? "On the river" : "Inland";
    default:
      return value.toFixed(2);
  }
}

export function tractTitle(x: number[]) {
  const crime = x[0];
  const lots = x[1];
  const river = x[3];
  const rooms = x[5];
  const age = x[6];
  const distance = x[7];
  const strain = x[11];
  if (river >= 0.5) return "River tract";
  if (crime > 10 || strain > 25) return "Strained tract";
  if (lots >= 40 && age < 45) return "Garden tract";
  if (rooms >= 7) return "Large-house tract";
  if (distance > 7) return "Farther tract";
  if (age > 85) return "Older tract";
  return "Town tract";
}

export function photoFor(x: number[]) {
  const lots = x[1];
  const river = x[3];
  const rooms = x[5];
  const age = x[6];
  if (river >= 0.5) {
    return {
      src: "/images/river.jpg",
      alt: "A brick house beside still water in late afternoon",
      caption: "River frontage",
    };
  }
  if (rooms >= 7) {
    return {
      src: "/images/modern.jpg",
      alt: "A low cedar and glass house among pines",
      caption: "A larger house",
    };
  }
  if (lots >= 30) {
    return {
      src: "/images/clapboard.jpg",
      alt: "A white clapboard house with a deep green door and a gravel path",
      caption: "A house on a wider lot",
    };
  }
  if (age >= 80) {
    return {
      src: "/images/clapboard.jpg",
      alt: "A white clapboard house with a deep green door",
      caption: "An older block",
    };
  }
  return {
    src: "/images/street.jpg",
    alt: "A quiet morning street of pale brick townhouses",
    caption: "A town street",
  };
}
