import { PALACE_TEMPLATE } from "./constants";
import type { ZiweiPalace } from "./types";

export function createPalaceSkeleton(): ZiweiPalace[] {
  return PALACE_TEMPLATE.map((palace) => ({
    ...palace,
    majorStars: [],
    minorStars: [],
    transforms: [],
    notes: ["待補"]
  }));
}
