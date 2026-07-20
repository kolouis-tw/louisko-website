import type { ZiweiInput } from "./types";

export interface MinorStarResult {
  labels: string[];
  implemented: false;
}

export function resolveMinorStars(_input: ZiweiInput): MinorStarResult {
  return {
    labels: [],
    implemented: false
  };
}
