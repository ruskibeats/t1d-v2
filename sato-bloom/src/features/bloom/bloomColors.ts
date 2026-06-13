// ── Sato Watercolor Palette ──────────────────────────────────────────
// Rich but restrained. No emergency red, no medical blue, no neon.
// Think: botanical print, Japanese paper postcard, museum watercolor.
//
// Core palette imported from @workspace/shared canonical contract.
// Rendering-only helpers (interpolateHex, rgba, colorForBloomValue) stay local.

import { SATO_PALETTE } from "@workspace/shared";

/**
 * Bloom palette — Sato watercolor colors for the BloomClock renderer.
 *
 * All canonical palette keys are sourced from the shared SATO_PALETTE.
 * Legacy aliases and the extra `lavender` color are maintained here
 * for backward compatibility with existing rendering code.
 */
export const bloomPalette = {
  ...SATO_PALETTE,

  // ── extra color (not in canonical SATO_PALETTE) ──
  lavender: "#A98BC5",

  // ── legacy aliases (deprecated, keep for compat) ──
  lower: SATO_PALETTE.mutedTeal,
  lowIndigo: SATO_PALETTE.blueGrey,
  calmBlue: SATO_PALETTE.blueGrey,
  balancedGreen: SATO_PALETTE.mossGreen,
  softGold: SATO_PALETTE.warmOchre,
  coral: SATO_PALETTE.softCoral,
  warmRose: SATO_PALETTE.softCoral,
};

export function interpolateHex(a: string, b: string, t: number): string {
  const ah = a.replace("#", "");
  const bh = b.replace("#", "");
  const ar = parseInt(ah.substring(0, 2), 16);
  const ag = parseInt(ah.substring(2, 4), 16);
  const ab = parseInt(ah.substring(4, 6), 16);
  const br = parseInt(bh.substring(0, 2), 16);
  const bg = parseInt(bh.substring(2, 4), 16);
  const bb = parseInt(bh.substring(4, 6), 16);
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${rr.toString(16).padStart(2, "0")}${rg
    .toString(16)
    .padStart(2, "0")}${rb.toString(16).padStart(2, "0")}`;
}

export function rgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function colorForBloomValue(value: number): string {
  if (value < 0.25) {
    return interpolateHex(
      SATO_PALETTE.blueGrey,
      SATO_PALETTE.mutedTeal,
      value / 0.25
    );
  }
  if (value < 0.5) {
    return interpolateHex(
      SATO_PALETTE.mutedTeal,
      SATO_PALETTE.mossGreen,
      (value - 0.25) / 0.25
    );
  }
  if (value < 0.7) {
    return interpolateHex(
      SATO_PALETTE.mossGreen,
      SATO_PALETTE.warmOchre,
      (value - 0.5) / 0.2
    );
  }
  if (value < 0.85) {
    return interpolateHex(
      SATO_PALETTE.warmOchre,
      SATO_PALETTE.apricot,
      (value - 0.7) / 0.15
    );
  }
  return interpolateHex(
    SATO_PALETTE.apricot,
    SATO_PALETTE.softCoral,
    Math.min(1, (value - 0.85) / 0.15)
  );
}
