import type { ZiweiInput } from "./types";

export interface MingShenResult {
  ming: string;
  shen: string;
  implemented: false;
}

export function resolveMingShen(_input: ZiweiInput): MingShenResult {
  return {
    ming: "待補",
    shen: "待補",
    implemented: false
  };
}
