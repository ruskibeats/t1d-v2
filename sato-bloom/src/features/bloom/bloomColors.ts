// ── Sato Watercolor Palette ──────────────────────────────────────────
// Rich but restrained. No emergency red, no medical blue, no neon.
// Think: botanical print, Japanese paper postcard, museum watercolor.

export const bloomPalette = {
  // ── watercolor stains ──
  mutedTeal: "#6F9FA0",
  blueGrey: "#8FB3C2",
  mossGreen: "#9FAE86",
  warmOchre: "#D7B36A",
  apricot: "#E3A061",
  softCoral: "#DB8A6F",
  fadedClay: "#C47B61",

  // ── identity vessel neutrals ──
  vesselWarm: "#D9C49D",
  vesselNeutral: "#C9B49A",

  // ── ink & labels ──
  ink: "#211F1B",
  inkWarm: "#5A5249",
  captionBlue: "#5795C7",
  muted: "#8C8175",
  mutedLight: "#A89F95",

  // ── paper ──
  paper: "#FBF3E6",
  paperDeep: "#F7EEDC",
  paperCream: "#FFF9EF",

  // ── legacy aliases (deprecated, keep for compat) ──
  lower: "#6F9FA0",
  lowIndigo: "#8FB3C2",
  calmBlue: "#8FB3C2",
  balancedGreen: "#9FAE86",
  softGold: "#D7B36A",
  coral: "#DB8A6F",
  warmRose: "#DB8A6F",
  lavender: "#A98BC5",
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

export function colorForBloomValue(value: number): string {
  if (value < 0.25) {
    return interpolateHex(bloomPalette.blueGrey, bloomPalette.mutedTeal, value / 0.25);
  }
  if (value < 0.5) {
    return interpolateHex(
      bloomPalette.mutedTeal,
      bloomPalette.mossGreen,
      (value - 0.25) / 0.25
    );
  }
  if (value < 0.7) {
    return interpolateHex(
      bloomPalette.mossGreen,
      bloomPalette.warmOchre,
      (value - 0.5) / 0.2
    );
  }
  if (value < 0.85) {
    return interpolateHex(
      bloomPalette.warmOchre,
      bloomPalette.apricot,
      (value - 0.7) / 0.15
    );
  }
  return interpolateHex(
    bloomPalette.apricot,
    bloomPalette.softCoral,
    Math.min(1, (value - 0.85) / 0.15)
  );
}
