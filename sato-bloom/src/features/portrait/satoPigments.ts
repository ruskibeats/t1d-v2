export const SATO = {
  paper: "#FBF3E6",
  paperDeep: "#F4E8D6",
  ink: "#211F1B",
  boneLinen: "#E8DCC8",
  mineralBlueGrey: "#8EA9A8",
  sageTeal: "#6E9188",
  softOlive: "#A8B08D",
  warmOchre: "#C9A46A",
  rawApricot: "#DFA06B",
  toastedSesame: "#B9915E",
  burnishedPersimmon: "#C97A58",
  fadedClay: "#B97D65",
  dustyPlum: "#9A8A98",
};

export function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function mixHex(items: { hex: string; weight: number }[]) {
  const total = items.reduce((s, i) => s + i.weight, 0) || 1;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const item of items) {
    const rgb = hexToRgb(item.hex);
    const w = item.weight / total;
    r += rgb.r * w;
    g += rgb.g * w;
    b += rgb.b * w;
  }
  const h = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
