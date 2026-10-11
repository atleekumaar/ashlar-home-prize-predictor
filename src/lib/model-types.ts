export type BostonModel = {
  baseScore: number;
  features: string[];
  trees: number[][][];
  metrics: {
    trainR2: number;
    trainMae: number;
    testR2: number;
    testMae: number;
    nTrain: number;
    nTest: number;
    nRows: number;
  };
  importances: Record<string, number>;
  correlation: Record<string, number>;
  means: Record<string, number>;
  stds: Record<string, number>;
  percentiles: Record<string, number[]>;
  histogram: { from: number; to: number; count: number }[];
  rows: { id: number; x: number[]; price: number }[];
};
