export function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

export function noise(key: string, min = -1, max = 1) {
  const h = hashString(key);
  const n = (h % 10000) / 10000;
  return min + (max - min) * n;
}

export function timeToAngle(time: string) {
  const [hh, mm] = time.split(":").map(Number);
  const hour = hh + mm / 60;
  return -Math.PI / 2 + (hour / 24) * Math.PI * 2;
}

export function polar(cx: number, cy: number, angle: number, radius: number) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}
