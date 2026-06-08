# T1D Companion Mobile - Design System

## Overview

Design system specification for T1D Companion mobile app. This document provides AI agents with consistent styling, component patterns, and user experience guidelines for generating production-grade medical companion interfaces.

See also: `docs/mobile-showcase-runner-strategy.md` for the complete mobile journey that maps the full showcase runner into the native iOS app.

> Educational simulator only. All designs must maintain safety-first principles: no dosing/treatment recommendations, clear confidence indicators, and educational disclaimers.

## Design Principles

1. **Trust Through Transparency**: Confidence scores, data sources, and uncertainty bands always visible
2. **Calm Clinical UX**: Non-alarmist colors, accessible typography, medical-grade clarity
3. **Progressive Disclosure**: Simple defaults → detailed evidence on tap
4. **Inclusive Design**: WCAG AAA compliant, dynamic type support, screen reader optimized

---

## Color System

```json
{
  "primary": {
    "baseline": "#1976D2",
    "contrast": "#FFFFFF"
  },
  "status": {
    "success": { "bg": "#E8F5E9", "text": "#2E7D32", "icon": "🟢" },
    "warning": { "bg": "#FFF3E0", "text": "#EF6C00", "icon": "🟡" },
    "error": { "bg": "#FFEBEE", "text": "#C62828", "icon": "🔴" },
    "unknown": { "bg": "#F5F5F5", "text": "#757575", "icon": "⚫" }
  },
  "confidence": {
    "high": { "name": "High", "color": "#2E7D32", "badge": "🟢" },
    "medium": { "name": "Medium", "color": "#EF6C00", "badge": "🟡" },
    "low": { "name": "Low", "color": "#C62828", "badge": "🔴" }
  },
  "medical": {
    "hypo": { "range": "70 mg/dL", "color": "#1976D2", "alert": "#0D47A1" },
    "hyper": { "range": ">180 mg/dL", "color": "#FF9800", "alert": "#E65100" }
  }
}
```

---

## Typography

```json
{
  "scale": {
    "title": { "size": 24, "weight": 600, "lineHeight": 32 },
    "heading": { "size": 20, "weight": 600, "lineHeight": 28 },
    "body": { "size": 16, "weight": 400, "lineHeight": 24 },
    "caption": { "size": 14, "weight": 400, "lineHeight": 20 },
    "overline": { "size": 12, "weight": 500, "lineHeight": 16, "letterSpacing": 1.2 }
  },
  "accessibility": {
    "dynamicType": { "minScale": 1.0, "maxScale": 2.0 },
    "contrast": { "ratio": 4.5, "largeRatio": 7.0 }
  }
}
```

---

## Spacing & Layout

```json
{
  "touchTargets": { "minimum": 44, "recommended": 48 },
  "spacing": { "xs": 4, "sm": 8, "md": 12, "lg": 16, "xl": 24 },
  "layout": {
    "screenPadding": 16,
    "cardSpacing": 12,
    "sectionSpacing": 24
  }
}
```

---

## Core Components

### Card Component

```tsx
interface CardProps {
  title: string;
  badge?: ConfidenceBadge;
  sourceLabel?: string;
  children: React.ReactNode;
  safetyFooter?: boolean;
}

// Usage: Each meal pipeline step uses card wrapper
<Card title="Step 3: Forecast" badge="medium" sourceLabel="synthetic legends demo">
  <ForecastChart data={forecast} />
  <Text>Projected peak: ~139 mg/dL at ~105 min</Text>
</Card>
```

### Confidence Badge

```tsx
type ConfidenceLevel = 'high' | 'medium' | 'low';

<ConfidenceBadge level="high">
  High confidence
</ConfidenceBadge>

// Colors from status.confidence above
// Text always includes both icon AND text for accessibility
```

### Forecast Chart

```tsx
interface ForecastChartProps {
  baseline: number;
  peak: number;
  peakTime: number;  // minutes
  uncertaintyRange?: [number, number];
  timeRange?: [number, number];
  points: Array<{ hour: number; glucose: number }>;
  safetyFooter?: boolean;
}

// SVG line chart with:
// - Baseline marker (dashed line)
// - Peak marker (solid dot)
// - Uncertainty band (shaded area)
// - Educational disclaimer automatically appended
```

### Food Evidence Row

```tsx
interface FoodEvidenceRowProps {
  item: string;
  quantity: number;
  unit?: string;
  carbs: number;
  fat: number;
  sugars: number;
  confidence: ConfidenceLevel;
  warnings?: string[];
  uncertaintyReason?: string;
}

// Display format:
// 🟢 1 pizza | 33g carbs 12g fat 1g sugar conf: medium
//    ⚠ Portion size estimated — check actual serving
//    💡 Main uncertainty: portion of pizza unclear
```

---

## Screen Templates

### Forecast Results Screen

```tsx
const ForecastScreen = () => (
  <SwipeDeck>
    <Card title="Step 1: Parsed Foods" badge={parser}>
      <FoodList items={parsedFoods} />
    </Card>
    <Card title="Step 2: Food Evidence">
      <FoodEvidenceList items={evidence} />
    </Card>
    <Card title="Step 3: Forecast" badge={overallConfidence}>
      <ForecastChart data={forecast} />
    </Card>
    <Card title="Step 4: Meal Memory">
      <SimilarMealsList meals={similarMeals} />
    </Card>
  </SwipeDeck>
  
  <ActionBar>
    <Button icon="edit">Edit meal</Button>
    <Button icon="help">Clarify</Button>
    <Button icon="what-if">Try what-if</Button>
    <Button icon="save">Save</Button>
    <Button icon="share">Export</Button>
  </ActionBar>
);
```

### Meal Entry Screen

```tsx
const MealEntryScreen = () => (
  <Form>
    <TextInput 
      label="Food" 
      placeholder="e.g., pizza and salad"
      helpText="Can also enter structured: [Item] [Qty] [Unit]"
    />
    <NumberInput label="Quantity" optional />
    <SelectInput label="Unit" options={units} optional />
    <DateTimeInput label="Meal time" />
    
    <ToggleRow>
      <Toggle label="Use AI parser" defaultValue={true} />
      <HelpText>Requires internet connection for LLM</HelpText>
    </ToggleRow>
  </Form>
);
```

---

## State Handling Patterns

### Loading States

```tsx
// Skeleton screens during data fetch
<LoadingSkeleton>
  <SkeletonCard rows={5} />
</LoadingSkeleton>

// Progressive reveal
{parsedFoods ? <ParsedFoods /> : <SkeletonRows />}
```

### Empty States

```tsx
// No meals logged
<EmptyState 
  icon="restaurant"
  title="No meals logged"
  action="Log your first meal"
/>

// No CGM data
<EmptyState 
  icon="monitor-heart"
  title="Connect CGM"
  description="Link your continuous glucose monitor for context"
  action="Settings → Health Data"
/>
```

### Error States

```tsx
// LLM unavailable
<ErrorBanner type="warning">
  AI parser offline — using deterministic fallback
</ErrorBanner>

// Database unavailable  
<ErrorBanner type="error">
  Food database unavailable — showing archetype estimates
</ErrorBanner>
```

---

## Navigation Structure

```
Tab Navigator
├── Today (HomeScreen)
├── Log Meal (MealEntryScreen)
├── History (HistoryScreen)
├── Insights (InsightsScreen)
└── Reports (ReportsScreen)

Settings/Profile accessed via avatar in header
```

---

## Safety Patterns

Every medical-oriented screen must include:

1. **Source label**: "synthetic legends demo" vs "real history"
2. **Confidence indicator**: High/Medium/Low badge
3. **Educational disclaimer**: "Simulation only — not medical advice"
4. **No dosing language**: All suggestions are observational

```tsx
<SafetyFooter>
  Educational simulation only — not medical advice.
  Discuss with your care team before making changes.
</SafetyFooter>
```

---

## Accessibility Requirements

- **Screen reader**: All charts have spoken summaries
- **Dynamic type**: Support 100-200% text scaling
- **Color contrast**: Minimum 4.5:1 (7:1 for medical data)
- **Touch targets**: 44pt minimum
- **Haptics**: Subtle confirmations for key actions

---

## Testing Checklist

- [ ] All cards render with confidence badges
- [ ] Loading states show skeletons
- [ ] Empty states have clear CTAs
- [ ] Error states show actionable recovery
- [ ] All interactive elements ≥44pt touch targets
- [ ] Dynamic type up to 200% works
- [ ] Screen reader reads chart data
- [ ] Educational disclaimers visible
- [ ] No dosing/treatment language

---

## 12. Atomic Design Structure (Enhanced with Mobile App Design Standards)

### Atoms - Basic Medical UI Elements

```tsx
// Avatar for profile photos
interface AvatarProps {
  uri: string;
  size: number;
  accessibilityLabel?: string;
}

// TouchTarget - 44pt minimum compliant button
interface TouchTargetProps {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}

// ConfidenceBadge - Medical-grade confidence indicator
interface ConfidenceBadgeProps {
  level: 'high' | 'medium' | 'low';
  label?: string; // Includes both icon AND text for accessibility
}
```

### Molecules - Simple Component Groups

```tsx
// StatItem - Single data point (carbs, sugars, etc.)
interface StatItemProps {
  label: string;
  value: string | number;
  unit?: string;
  accessibilityLabel?: string;
}

// FormField - Label + input with accessibility
interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
}
```

### Organisms - Complex Medical Screens

```tsx
// ForecastCard - Complete forecast visualization
interface ForecastCardProps {
  meal: string;
  forecast: ForecastData;
  confidence: ConfidenceLevel;
  sourceLabel: string;
}

// MealEntryForm - Structured meal input
interface MealEntryFormProps {
  onSubmit: (meal: MealData) => void;
  onCancel?: () => void;
}
```

### Templates - Screen Layouts

```tsx
// ForecastScreen - Container managing state
interface ForecastScreenProps {
  mealId: string;
  onNavigate: (screen: string) => void;
}
```

## Platform-specific (from skill)

```tsx
const PLATFORM = {
  ios: { 
    navigation: 'Back top-left, action top-right',
    font: 'San Francisco System Font',
    haptics: true 
  },
  android: {
    navigation: 'Back top-left, menu top-right',
    font: 'Roboto',
    ripples: true
  }
};
```

---

## 13. Complete Mobile User Journey (1:1 Showcase Runner Mapping)

### Journey Flow Overview

```
Today Screen (Home)
    ↓ "Log Meal" button
Meal Entry Screen
    ↓ Submit "pizza and salad for dinner"
Parsed Foods Screen
    ↓ Review foods → Continue
Food Evidence Screen
    ↓ See matches → Continue
Forecast Screen (SwipeDeck)
├── Card 1: Parsed Foods
├── Card 2: Food Evidence
├── Card 3: Forecast Chart
├── Card 4: Meal Memory
├── Card 5: What-If Scenarios
├── Card 6: Monitoring
└── Card 7: Confidence
    ↓ Action Bar actions
[Edit meal] [Clarify] [Try what-if] [Save] [Export]
```

### Screen-by-Screen Journey Map

#### **Screen 1: Today (HomeScreen) - `--demo product --legend 1`**
**Terminal Equivalent**: `\n━━━ T1D Companion Showcase ━━━` + legend intro

```tsx
// Mobile Implementation
const TodayScreen = () => (
  <ScrollView>
    {/* Header */}
    <Header>
      <Text>Today</Text>
      <AvatarButton onPress={() => navigation.navigate('Settings')} />
    </Header>

    {/* Current CGM */}
    <Card title="Current CGM" sourceLabel="synthetic legends demo">
      <CurrentCGM 
        mg_dl={105} 
        trend="stable" 
        timestamp="2026-06-02T12:19:52"
      />
    </Card>

    {/* Quick Actions */}
    <QuickActionGrid>
      <QuickAction icon="meal" label="Log Meal" onPress={() => navigation.navigate('LogMeal')} />
      <QuickAction icon="patterns" label="Patterns" onPress={() => navigation.navigate('Insights')} />
      <QuickAction icon="debrief" label="Debrief" onPress={() => navigation.navigate('Debrief')} />
    </QuickActionGrid>

    {/* Legend Intro */}
    <Card title="Meet Alex Chen" sourceLabel="synthetic legends demo">
      <ProfileSummary 
        age={24}
        diagnosisYears={1}
        anchorType="Well-Controlled"
        tir={62.9}
        a1c={6.3}
      />
    </Card>

    {/* Question Deck */}
    <Card title="Questions">
      <QuestionDeck questions={[
        { type: "meal", text: "pizza and salad for dinner" },
        { type: "what_if", text: "can I have a dessert after dinner" },
        // ... more questions
      ]} />
    </Card>
  </ScrollView>
);
```

#### **Screen 2: Meal Entry Screen**
**Terminal Equivalent**: CLI free-text prompt

```tsx
const MealEntryScreen = () => (
  <KeyboardAvoidingView>
    <Header>
      <BackButton />
      <Text>Log Meal</Text>
      <SaveButton disabled={!isValid} />
    </Header>

    <Form>
      <TextInput 
        label="Food"
        placeholder="e.g., pizza and salad"
        value={mealText}
        onChangeText={setMealText}
        accessibilityLabel="Enter meal description"
      />
      
      <ToggleRow>
        <Toggle 
          label="Use AI Parser" 
          value={useLLM} 
          onValueChange={setUseLLM}
        />
        <HelpText>LLM connection required for AI parsing</HelpText>
      </ToggleRow>

      <HelpFooter>
        Parser: {useLLM ? "LLM (llama3.1)" : "Deterministic"}
        Educational simulation only — not medical advice.
      </HelpFooter>
    </Form>
  </KeyboardAvoidingView>
);
```

#### **Screen 3-8: Forecast SwipeDeck**
**Terminal Equivalent**: `meal_pipeline_section` Steps 1-7

```tsx
const ForecastScreen = ({ route }) => (
  <View style={{ flex: 1 }}>
    {/* Header */}
    <Header>
      <BackButton />
      <Text>Pizza and Salad Dinner</Text>
      <ConfidenceBadge level="medium" />
    </Header>

    {/* Swipeable Cards */}
    <SwipeDeck>
      {/* Step 1: Parsed Foods */}
      <Card title="Step 1: Parsed Foods" badge="deterministic" sourceLabel="synthetic legends demo">
        <FoodList items={[
          { item: "pizza", quantity: 1, unit: "", confidence: "medium" },
          { item: "salad", quantity: 1, unit: "", confidence: "medium" }
        ]} />
      </Card>

      {/* Step 2: Food Evidence */}
      <Card title="Step 2: Food Evidence">
        <FoodEvidenceList items={[
          {
            parsed: { item: "pizza", quantity: 1 },
            computed: { carbs_g: 33, fat_g: 12, sugars_g: 1 },
            confidence: "medium",
            warnings: ["Portion size estimated — check actual serving"],
            top_uncertainty_reason: "portion of pizza unclear"
          }
        ]} />
      </Card>

      {/* Step 3: Forecast Chart */}
      <Card title="Step 3: Forecast" badge="medium">
        <ForecastChart 
          baseline={113}
          peak={139}
          peakTime={105}
          uncertaintyRange={[133, 146]}
          points={[
            { hour: 1, glucose: 137 },
            { hour: 2, glucose: 139 },
            { hour: 3, glucose: 136 },
            { hour: 4, glucose: 133 }
          ]}
        />
      </Card>

      {/* Step 4: Meal Memory */}
      <Card title="Step 4: Meal Memory">
        <SimilarMealsList meals={[
          { food: "Turkey Sandwich", carbs_g: 37, peak_rise_mg_dl: 63, peak_time_min: 172, similarity: 0.94 },
          { food: "Turkey Sandwich", carbs_g: 37, peak_rise_mg_dl: 95, peak_time_min: 160, similarity: 0.94 }
        ]} />
        <Text>Consistency: medium (score: 0.56)</Text>
        <Text>Provenance: synthetic legends demo data · demo confidence</Text>
      </Card>

      {/* Step 5: What-If Scenarios */}
      <Card title="Step 5: What-If Scenarios">
        <ScenarioCarousel scenarios={[
          { type: "smaller portion", peak: 131 },
          { type: "different timing", peak: 139 },
          { type: "separate snack", peak: 152 }
        ]} />
      </Card>

      {/* Step 6: Monitoring */}
      <Card title="Step 6: Monitoring">
        <Text>⚠ High fat may delay the rise — watch 3–4 hours.</Text>
        <Text>💡 Key uncertainty: portion of pizza unclear</Text>
        <SafetyFooter>Educational simulation only — not medical advice.</SafetyFooter>
      </Card>

      {/* Step 7: Confidence */}
      <Card title="Step 7: Data Quality & Confidence">
        <ConfidenceDetail 
          overall="medium"
          forecastUncertainty="low (peak range 133–146 mg/dL)"
          historicalConsistency="medium (score: 0.56)"
          safetyStatus="not checked"
        />
        <SafetyFooter>Educational simulation only — not medical advice.</SafetyFooter>
      </Card>
    </SwipeDeck>

    {/* Action Bar */}
    <ActionBar>
      <ActionButton icon="edit" label="Edit meal" onPress={handleEditMeal} />
      <ActionButton icon="help" label="Clarify" onPress={handleClarify} />
      <ActionButton icon="what-if" label="Try what-if" onPress={handleWhatIf} />
      <ActionButton icon="save" label="Save" onPress={handleSave} />
      <ActionButton icon="share" label="Export" onPress={handleExport} />
    </ActionBar>
  </View>
);
```

### All Card Types Journey Map

| Terminal Card | Mobile Screen | User Action |
|-------------|---------------|-------------|
| `meal_pipeline_section` | ForecastScreen (SwipeDeck 7 cards) | Swipe through pipeline |
| `what_if_card` | WhatIfScreen | Enter alternative food |
| `troubleshoot_card("high")` | TroubleshootHighScreen | View causes list |
| `troubleshoot_card("low")` | TroubleshootLowScreen | View causes list |
| `situation_card("exercise")` | SituationExerciseScreen | Read guidance |
| `morning_call_card` | MorningCheckinScreen | View overnight summary |
| `lunch_presser_card` | LunchCheckinScreen | View midday insights |
| `evening_roundup_card` | EveningRoundupScreen | View daily summary |
| `insights_card` | InsightsScreen | View patterns |
| `clarification_card` | ClarificationModal | Enter portion estimate |
| `debrief_card` | DailyDebriefScreen | Review day summary |
| `pattern_genome` card | PatternGenomeScreen | View traits |
| `experiment` card | ExperimentScreen | View hypothesis |

### State Transitions

```tsx
// Navigation flow based on showcase runner
const navigationFlow = {
  Today: {
    logMeal: 'MealEntry',
    patterns: 'Insights',
    debrief: 'DailyDebrief'
  },
  MealEntry: {
    submit: 'ParsedFoods', // Validate & proceed
    cancel: 'Today'
  },
  Forecast: {
    edit: 'MealEntry',
    clarify: 'Clarification',
    whatIf: 'WhatIf',
    save: 'History',
    export: 'Reports'
  },
  WhatIf: {
    back: 'Forecast',
    save: 'History'
  }
};
```

### Showcase Modes Mobile Mapping

| CLI Mode | Mobile Equivalent | Implementation |
|----------|-------------------|----------------|
| `--demo product --all-cards` | "All Cards Tour" tab | Tab with 13 screens carousel |
| `--demo investor` | "Investor Demo" mode | 5-step guided flow for presentations |
| `--all-legends` | "Compare Legends" mode | Legend comparison grid |
| Default showcase | "Quick Forecast" | Direct meal → forecast flow |
---

## 14. Native Prototype + Recommended React Native Stack

The T1D Companion iOS project already exists at `ios/T1DCompanion/T1DCompanion/` with native SwiftUI prototype implementation. The recommended product stack is **React Native + TypeScript + Expo**, with Swift/Kotlin native modules only for platform-deep integrations such as Apple Health, CGM/Bluetooth, background execution, and device-specific polish.

### SwiftUI Prototype Files

| File | Purpose | Status |
|------|---------|--------|
| `T1DCompanionApp.swift` | Main app entry, AppState | ✅ Complete |
| `Views/RootTabView.swift` | 4-tab prototype navigation | ✅ Complete |
| `Views/HomeView.swift` | Profile + CGM + quick actions | ✅ Complete |
| `Views/ForecastResultView.swift` | Forecast pipeline display | ✅ Complete |
| `Views/MealEntryView.swift` | Meal input screen | ✅ Complete |
| `Views/SharedComponents.swift` | Reusable UI components | ✅ Complete |
| `Models/AppModels.swift` | Data models | ✅ Complete |

### Terminal → Mobile Mapping Reference

| Terminal Output | Prototype Component | File |
|-----------------|---------------|------|
| Legend intro + CGM | ProfileHeader | HomeView.swift |
| Meal pipeline step 1 | ForecastSummaryCard | ForecastResultView.swift |
| Meal pipeline step 3 | ForecastChartCard + Bar | ForecastResultView.swift |
| Meal pipeline step 7 | ConfidenceBreakdownCard | ForecastResultView.swift |
| Safety footer | SafetyNoticeCard | SharedComponents.swift |
| Confidence badges | ConfidencePill | SharedComponents.swift |
| Data source labels | DataSourcePill | SharedComponents.swift |

### Screens Ready In Prototype

- ✅ HomeView (Today screen with profile/CGM)
- ✅ ForecastResultView (7-card pipeline reference)
- ✅ MealEntryView (meal input reference)
- ✅ InsightsView (pattern display reference)
- ✅ MealsView (meal review shell)
- ✅ ChatView (Hoot & Holla shell)
- ⏳ React Native/Expo app shell and typed mobile card renderer (TODO)
