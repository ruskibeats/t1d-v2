import { BloomMemoryMark } from "./bloomTypes";
import { SATO_PIGMENTS } from "./pigmentSystem";

export const todayMemoryMarks: BloomMemoryMark[] = [
  {
    id: "morning-blue-veil",
    startHour: 8,
    angle: -0.42,
    distance: 0.42,
    intensity: 0.28,
    pigmentKey: "recovery",
    color: SATO_PIGMENTS.recovery.hex,
    size: 0.04,
    softness: 0.86,
  },
  {
    id: "post-lunch-warm-oat-trace",
    startHour: 13,
    angle: 1.08,
    distance: 0.58,
    intensity: 0.78,
    pigmentKey: "slowCarb",
    color: SATO_PIGMENTS.slowCarb.hex,
    size: 0.052,
    softness: 0.82,
  },
  {
    id: "afternoon-sesame-tail",
    startHour: 15,
    angle: 1.72,
    distance: 0.49,
    intensity: 0.32,
    pigmentKey: "fatDelay",
    color: SATO_PIGMENTS.fatDelay.hex,
    size: 0.034,
    softness: 0.9,
  },
];
