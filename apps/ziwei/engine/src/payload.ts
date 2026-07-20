import { createPalaceSkeleton } from "./palaces";
import { ZIWEI_BASELINE_GGDVB } from "./baseline";
import { resolveMajorStars } from "./major-stars";
import { resolveMingShen } from "./ming-shen";
import { resolveTransforms } from "./transforms";
import type { ZiweiChartPayload, ZiweiInput } from "./types";

export function createZiweiPlaceholderPayload(input: ZiweiInput): ZiweiChartPayload {
  const mingShen = resolveMingShen(input);
  const majorStars = resolveMajorStars(input);
  const transforms = resolveTransforms(input);

  return {
    input,
    baseline: {
      code: ZIWEI_BASELINE_GGDVB.code,
      presetStyle: ZIWEI_BASELINE_GGDVB.presetStyle
    },
    summary: {
      ming: mingShen.ming,
      shen: mingShen.shen,
      majorStars: majorStars.labels.length ? majorStars.labels.join("、") : "待補",
      transforms: transforms.labels.length ? transforms.labels.join("、") : "待補"
    },
    palaces: createPalaceSkeleton()
  };
}
