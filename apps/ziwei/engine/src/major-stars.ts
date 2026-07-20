import type { ZiweiInput } from "./types";

export interface MajorStarResult {
  labels: string[];
  implemented: false;
}

export function resolveMajorStars(_input: ZiweiInput): MajorStarResult {
  return {
    labels: [],
    implemented: false
  };
}
