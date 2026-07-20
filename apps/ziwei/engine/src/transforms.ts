import type { ZiweiInput } from "./types";

export interface TransformResult {
  labels: string[];
  implemented: false;
}

export function resolveTransforms(_input: ZiweiInput): TransformResult {
  return {
    labels: [],
    implemented: false
  };
}
