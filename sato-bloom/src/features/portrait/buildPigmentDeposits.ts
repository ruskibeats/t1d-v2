import { BloomEvent, PigmentDeposit } from "./satoPortraitTypes";
import { SATO, mixHex } from "./satoPigments";
import { noise, timeToAngle } from "./satoGeometry";

function eventHasHappened(eventTime: string, currentTime?: string) {
  if (!currentTime) return true;
  const [eh, em] = eventTime.split(":").map(Number);
  const [ch, cm] = currentTime.split(":").map(Number);
  return eh * 60 + em <= ch * 60 + cm;
}

export function buildPigmentDeposits({
  events,
  waterPints = 0,
  exerciseMinutes = 0,
  currentTime,
  identitySeed = "sato-default-seed",
}: {
  events: BloomEvent[];
  waterPints?: number;
  exerciseMinutes?: number;
  currentTime?: string;
  identitySeed?: string;
}): PigmentDeposit[] {
  const deposits: PigmentDeposit[] = [];
  const hydrationSoftening = Math.min(0.22, waterPints * 0.035);
  const noExerciseWeight = exerciseMinutes === 0 ? 0.12 : 0;

  for (const event of events) {
    if (!eventHasHappened(event.time, currentTime)) continue;
    const n = event.nutrients;
    const storyWeight = event.storyWeight ?? 0;
    const isKeyEvent = storyWeight >= 0.7;
    const angle = timeToAngle(event.time);
    const confidence = n.confidence ?? 0.78;
    const baseRadius = 52 + noise(event.id + "radius", -10, 14);
    const angleShift = noise(event.id + "angle", -0.16, 0.16);
    const identityDrift = noise(identitySeed + event.id + "identityDrift", -0.22, 0.22);
    const mealSag = (n.fat ?? 0) * 0.18 - (n.exercise ?? 0) * 0.12;
    const hydrationDiffusion = waterPints * 0.018;
    const finalAngle = angle + angleShift + identityDrift + mealSag;
    const storyBias = storyWeight;
    const clusterOffset = {
      x: noise(event.id + "clusterX", -28, 28) * (1 + hydrationDiffusion) + Math.cos(angle) * storyBias * 18,
      y: noise(event.id + "clusterY", -28, 28) * (1 + hydrationDiffusion) + Math.sin(angle) * storyBias * 18,
    };

    if ((n.carbs ?? 0) > 0.06) {
      const opacity = (0.14 + (n.carbs ?? 0) * 0.13) * confidence * (isKeyEvent ? 1.22 : 1);
      const length = (100 + (n.carbs ?? 0) * 95) * (isKeyEvent ? 1.12 : 1);
      const width = (70 + (n.carbs ?? 0) * 52) * (isKeyEvent ? 1.08 : 1);
      const granulation = 0.28 + (n.carbs ?? 0) * 0.18 + (isKeyEvent ? 0.12 : 0);
      const edgeChaos = 0.28 + (n.sugar ?? 0) * 0.22 + (isKeyEvent ? 0.08 : 0);
      const layers = 7 + (isKeyEvent ? 1 : 0);
      deposits.push({
        id: `${event.id}-carbWash`,
        eventId: event.id,
        kind: "carbWash",
        angle: finalAngle,
        radius: baseRadius + 10,
        length,
        width,
        color: mixHex([
          { hex: SATO.rawApricot, weight: n.carbs ?? 0 },
          { hex: SATO.boneLinen, weight: 0.22 },
          { hex: SATO.softOlive, weight: n.fiber ?? 0 },
        ]),
        opacity,
        layers,
        bleed: 0.55 + hydrationSoftening,
        granulation,
        edgeChaos,
        rotationNoise: 0.2,
        centerPull: 0.54,
        clusterOffset,
      });
    }

    if ((n.sugar ?? 0) > 0.08) {
      const opacity = (0.15 + (n.sugar ?? 0) * 0.14) * confidence * (isKeyEvent ? 1.22 : 1);
      const length = (52 + (n.sugar ?? 0) * 64) * (isKeyEvent ? 1.12 : 1);
      const width = (32 + (n.sugar ?? 0) * 36) * (isKeyEvent ? 1.08 : 1);
      const granulation = 0.42 + (isKeyEvent ? 0.12 : 0);
      const edgeChaos = 0.56 + (isKeyEvent ? 0.08 : 0);
      const layers = 4 + (isKeyEvent ? 1 : 0);
      deposits.push({
        id: `${event.id}-sugarAccent`,
        eventId: event.id,
        kind: "sugarAccent",
        angle: finalAngle + noise(event.id + "sugar", -0.12, 0.12),
        radius: baseRadius + 28,
        length,
        width,
        color: mixHex([
          { hex: SATO.burnishedPersimmon, weight: n.sugar ?? 0 },
          { hex: SATO.rawApricot, weight: 0.28 },
          { hex: SATO.boneLinen, weight: 0.16 },
        ]),
        opacity,
        layers,
        bleed: 0.6 + hydrationSoftening,
        granulation,
        edgeChaos,
        rotationNoise: 0.24,
        centerPull: 0.42,
        clusterOffset,
      });
    }

    if ((n.protein ?? 0) > 0.08) {
      const opacity = (0.15 + (n.protein ?? 0) * 0.1) * confidence * (isKeyEvent ? 1.22 : 1);
      const length = (74 + (n.protein ?? 0) * 54) * (isKeyEvent ? 1.12 : 1);
      const width = (52 + (n.protein ?? 0) * 38) * (isKeyEvent ? 1.08 : 1);
      const granulation = 0.34 + (isKeyEvent ? 0.12 : 0);
      const edgeChaos = 0.22 + (isKeyEvent ? 0.08 : 0);
      const layers = 5 + (isKeyEvent ? 1 : 0);
      deposits.push({
        id: `${event.id}-proteinCore`,
        eventId: event.id,
        kind: "proteinCore",
        angle: finalAngle + noise(event.id + "protein", -0.1, 0.1),
        radius: baseRadius - 8,
        length,
        width,
        color: mixHex([
          { hex: SATO.warmOchre, weight: n.protein ?? 0 },
          { hex: SATO.softOlive, weight: 0.32 },
        ]),
        opacity,
        layers,
        bleed: 0.44 + hydrationSoftening * 0.4,
        granulation,
        edgeChaos,
        rotationNoise: 0.12,
        centerPull: 0.74,
        clusterOffset,
      });
    }

    if ((n.fat ?? 0) > 0.1) {
      const opacity = (0.11 + (n.fat ?? 0) * 0.12 + noExerciseWeight * 0.04) * confidence * (isKeyEvent ? 1.22 : 1);
      const length = (110 + (n.fat ?? 0) * 90) * (isKeyEvent ? 1.12 : 1);
      const width = (92 + (n.fat ?? 0) * 66) * (isKeyEvent ? 1.08 : 1);
      const granulation = 0.42 + (n.fat ?? 0) * 0.14 + (isKeyEvent ? 0.12 : 0);
      const edgeChaos = 0.3 + (isKeyEvent ? 0.08 : 0);
      const layers = 8 + (isKeyEvent ? 1 : 0);
      deposits.push({
        id: `${event.id}-fatShadow`,
        eventId: event.id,
        kind: "fatShadow",
        angle: finalAngle + noise(event.id + "fat", -0.18, 0.18),
        radius: baseRadius - 20,
        length,
        width,
        color: mixHex([
          { hex: SATO.toastedSesame, weight: n.fat ?? 0 },
          { hex: SATO.softOlive, weight: 0.28 },
          { hex: SATO.boneLinen, weight: 0.18 },
        ]),
        opacity,
        layers,
        bleed: 0.7 + (n.fat ?? 0) * 0.14,
        granulation,
        edgeChaos,
        rotationNoise: 0.18,
        centerPull: 0.66,
        clusterOffset,
      });
    }

    if ((n.fiber ?? 0) > 0.14) {
      const opacity = 0.1 * confidence * (isKeyEvent ? 1.22 : 1);
      const length = (70 + (n.fiber ?? 0) * 48) * (isKeyEvent ? 1.12 : 1);
      const width = (76 + (n.fiber ?? 0) * 44) * (isKeyEvent ? 1.08 : 1);
      const granulation = 0.18 + (isKeyEvent ? 0.12 : 0);
      const edgeChaos = 0.14 + (isKeyEvent ? 0.08 : 0);
      const layers = 4 + (isKeyEvent ? 1 : 0);
      deposits.push({
        id: `${event.id}-fiberVeil`,
        eventId: event.id,
        kind: "fiberVeil",
        angle: finalAngle + noise(event.id + "fiber", -0.12, 0.12),
        radius: baseRadius + 2,
        length,
        width,
        color: mixHex([
          { hex: SATO.softOlive, weight: n.fiber ?? 0 },
          { hex: SATO.boneLinen, weight: 0.34 },
        ]),
        opacity,
        layers,
        bleed: 0.66 + hydrationSoftening,
        granulation,
        edgeChaos,
        rotationNoise: 0.12,
        centerPull: 0.58,
        clusterOffset,
      });
    }

    // Memory mark for high storyWeight + mixed nutrients
    if (isKeyEvent && (n.carbs ?? 0) > 0.05 && (n.fat ?? 0) > 0.1 && (n.protein ?? 0) > 0.08) {
      deposits.push({
        id: `${event.id}-memoryMark`,
        eventId: event.id,
        kind: "carbWash",
        angle: finalAngle + noise(event.id + "memory", -0.08, 0.08),
        radius: baseRadius + 4,
        length: 90,
        width: 72,
        color: mixHex([
          { hex: SATO.rawApricot, weight: 0.42 },
          { hex: SATO.toastedSesame, weight: 0.28 },
          { hex: SATO.softOlive, weight: 0.2 },
          { hex: SATO.boneLinen, weight: 0.1 },
        ]),
        opacity: 0.16 * confidence,
        layers: 5,
        bleed: 0.72,
        granulation: 0.56,
        edgeChaos: 0.42,
        rotationNoise: 0.16,
        centerPull: 0.62,
        clusterOffset,
      });
    }
  }

  return deposits;
}
