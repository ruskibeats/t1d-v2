import { BloomEvent, IdentityBloom } from "./satoPortraitTypes";

export const placeholderIdentityBloom: IdentityBloom = {
  seed: "sato-user-seed-v1",
  createdAt: new Date().toISOString(),
  asymmetry: 0.34,
  pigmentBias: 0.42,
  paperTexture: 0.72,
  version: 1,
};

export const sampleSatoDayEvents: BloomEvent[] = [
  {
    id: "eggs-bacon",
    time: "08:00",
    label: "Eggs & bacon",
    nutrients: {
      carbs: 0.02,
      sugar: 0.01,
      fat: 0.82,
      protein: 0.72,
      fiber: 0.02,
      hydration: 0.1,
      exercise: 0,
      confidence: 0.86,
    },
  },
  {
    id: "apple",
    time: "10:30",
    label: "Apple",
    nutrients: {
      carbs: 0.58,
      sugar: 0.62,
      fat: 0.02,
      protein: 0.02,
      fiber: 0.32,
      hydration: 0.12,
      exercise: 0,
      confidence: 0.84,
    },
  },
  {
    id: "tuna-salad",
    time: "13:00",
    label: "Tuna salad",
    storyWeight: 0.82,
    nutrients: {
      carbs: 0.08,
      sugar: 0.03,
      fat: 0.45,
      protein: 0.78,
      fiber: 0.18,
      hydration: 0.12,
      exercise: 0,
      confidence: 0.88,
    },
  },
  {
    id: "carrots-hummus",
    time: "15:30",
    label: "Carrots & hummus",
    nutrients: {
      carbs: 0.42,
      sugar: 0.22,
      fat: 0.32,
      protein: 0.22,
      fiber: 0.38,
      hydration: 0.14,
      exercise: 0,
      confidence: 0.82,
    },
  },
  {
    id: "pork-mash",
    time: "18:30",
    label: "Pork chop & mashed potato",
    nutrients: {
      carbs: 0.62,
      sugar: 0.08,
      fat: 0.54,
      protein: 0.74,
      fiber: 0.12,
      hydration: 0.1,
      exercise: 0,
      confidence: 0.82,
    },
  },
];

export const sampleDayModifiers = {
  waterPints: 4,
  exerciseMinutes: 0,
};
