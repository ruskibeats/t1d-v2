---
name: Text-first UX refinement
about: Turn terminal output into a canonical mobile-app text prototype
title: "ux: text-first output states"
labels: enhancement, text-ux
assignees: ''
---

## What to build

The terminal output is currently a single block response. The eventual mobile app needs distinct screens:
- **First state**: Initial greeting, profile selection
- **Input screen**: Free-text meal entry with example hints
- **Food evidence review**: Parsed foods, confidence, warnings, portion assumptions
- **Forecast summary**: Timeline, peak, uncertainty range, nighttime
- **Historical context**: Similar meals, observations
- **Chat/narrator response**: Safe natural-language explanation
- **Insights view**: Risk flags, monitoring suggestions

The principle: if it does not work clearly in the terminal, it is not ready for mobile.

## Acceptance criteria

- [ ] Runner can output each state independently (not just final response)
- [ ] Each state has a clear text format that would map to a mobile screen
- [ ] Input screen accepts free-text meal and returns parsed foods for confirmation
- [ ] Food evidence review shows per-item confidence, warnings, carb range
- [ ] Forecast summary includes ASCII chart (current) and timed table
- [ ] Historical context section (already exists, needs polish)
- [ ] Chat/narrator response is marked clearly
- [ ] Tests cover each state's output format

## Text-first UX

```text
━━━ T1D Companion ━━━
Profile: High Fat Delayed

Meal: pizza and large fries

━━━ Food Evidence ━━━
✓ 1 pizza        | 33g carbs | confidence: high
  serving: 1 slice (100g)
⚠ 1 large fries  | 62g carbs | confidence: high
  High fat (23g) may delay rise
  Portion size estimated

━━━ Forecast ━━━
→ Peak: ~193 mg/dL at 115 minutes
→ Range: 185–201 mg/dL (due to carb uncertainty)
→ Baseline: 112 mg/dL

━━━ Similar Meals ━━━
3 similar meals found: avg rise 57 mg/dL, peak ~123 min

━━━ Monitoring ━━━
Higher fat may delay the rise — watch the 3–4 hour window.
Educational simulation only — not medical advice.
```

## Blocked by

- `food-matching-tuning` branch merge (foundation)

