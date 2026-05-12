import type { ScaleDegree } from "../types/index.js";

export type TransitionMap = Record<ScaleDegree, ScaleDegree[]>;

export const LOFI_TRANSITIONS: TransitionMap = {
  1: [4, 2, 6],
  2: [5, 1],
  3: [6, 4],
  4: [1, 5, 7],
  5: [1, 6],
  6: [2, 4, 1],
  7: [1, 3],
};

export function nextDegree(current: ScaleDegree, map: TransitionMap): ScaleDegree {
  const options = map[current];
  return options[Math.floor(Math.random() * options.length)];
}
