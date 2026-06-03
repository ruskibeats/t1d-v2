import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { ForecastCurveChart } from '@/components/charts/ForecastCurveChart';
import type { ForecastPayload, MobileShowcaseCard, ParsedFood } from '@/types/mobileCard';
import {
  ConfidenceBadge,
  IconBubble,
  MetricTile,
  ProgressRow,
  SectionLabel,
  StitchCard,
  StitchHero,
  stitchImages,
  styles as stitchStyles,
} from '@/components/stitch/StitchNative';
import { colors, spacing } from '@/theme/theme';

export function CardRenderer({ card }: { card: MobileShowcaseCard }) {
  switch (card.kind) {
    case 'parsedFoods':
      return <ParsedFoodsCard card={card} />;
    case 'foodEvidence':
      return <FoodEvidenceCard card={card} />;
    case 'forecast':
      return <ForecastCard card={card} />;
    case 'mealMemory':
      return <MealMemoryCard card={card} />;
    case 'confidence':
      return <ConfidenceCard card={card} />;
    case 'safetyStatus':
      return <SafetyCard label={card.safetyFooter} />;
    default:
      return <UnsupportedCard card={card} />;
  }
}

function ParsedFoodsCard({ card }: { card: MobileShowcaseCard }) {
  const foods = (card.payload.foods ?? []) as ParsedFood[];
  const iconFor = (item: string) => {
    const lower = item.toLowerCase();
    if (lower.includes('toast')) return 'bread-slice-outline';
    if (lower.includes('egg')) return 'egg-outline';
    if (lower.includes('butter')) return 'food-croissant';
    if (lower.includes('avocado')) return 'leaf';
    return 'silverware-fork-knife';
  };
  const pct = [98, 95, 88, 92];

  return (
    <View style={local.cardStack}>
      <StitchHero uri={stitchImages.parsedFoodsHero} height={192} />
      <StitchCard>
        <View style={local.summaryRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="titleLarge" style={local.cardTitle}>Breakfast Routine</Text>
            <View style={local.inlineMeta}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={local.muted}>Today, 08:30 AM</Text>
            </View>
          </View>
          <IconBubble icon="silverware-fork-knife" tone="primary" />
        </View>
      </StitchCard>

      <SectionLabel>Detected Items</SectionLabel>
      <View style={local.itemList}>
        {foods.map((food, index) => {
          const confidence = food.confidenceTier === 'medium' ? 'Med' : 'High';
          const tone = food.confidenceTier === 'medium' ? 'warning' : 'success';
          return (
            <StitchCard key={`${food.item}-${index}`} style={local.itemCard}>
              <IconBubble icon={iconFor(food.item)} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={local.foodName}>{titleCase(food.item)}</Text>
                <Text variant="bodySmall" style={local.muted}>{food.quantity} {food.unit || (food.item.includes('egg') ? 'eggs' : 'portion')}</Text>
              </View>
              <ConfidenceBadge label={`${pct[index] ?? 90}% ${confidence}`} tone={tone as any} />
            </StitchCard>
          );
        })}
      </View>
    </View>
  );
}

function FoodEvidenceCard({ card }: { card: MobileShowcaseCard }) {
  const totals = card.payload.totals as Record<string, number> | undefined;
  const warnings = (card.payload.warnings ?? []) as string[];
  return (
    <View style={local.cardStack}>
      <View style={local.alertCard}>
        <MaterialCommunityIcons name="check-circle" size={18} color={colors.secondary} />
        <Text variant="bodyMedium" style={{ color: colors.onSecondaryContainer, flex: 1 }}>{warnings[0] ?? 'This is your known routine — values are consistent.'}</Text>
      </View>

      <StitchCard>
        <Text variant="titleLarge" style={local.sectionTitle}>Nutrition Totals</Text>
        <View style={local.metricGrid}>
          <MetricTile label="Carbs" value={totals?.carbsG ?? '—'} unit="g" icon="nutrition" />
          <MetricTile label="Fat" value={totals?.fatG ?? '—'} unit="g" icon="water" tone="warning" />
          <MetricTile label="Sugars" value={totals?.sugarsG ?? 3} unit="g" icon="cube-outline" tone="success" />
          <MetricTile label="Protein" value={totals?.proteinG ?? '—'} unit="g" icon="arm-flex-outline" tone="primary" />
        </View>
      </StitchCard>

      <StitchHero uri={stitchImages.foodEvidenceHero} height={192} label="Analyzed Meal Context" />
    </View>
  );
}

function ForecastCard({ card }: { card: MobileShowcaseCard }) {
  const payload = card.payload as unknown as ForecastPayload;
  return (
    <View style={local.cardStack}>
      <StitchCard>
        <View style={local.headerRow}>
          <View>
            <Text variant="labelLarge" style={local.muted}>Next 2 Hrs</Text>
            <Text variant="titleLarge" style={local.sectionTitle}>Trend Projection</Text>
          </View>
          <ConfidenceBadge label="MEDIUM Confidence" tone="warning" />
        </View>
        <ForecastCurveChart points={payload.points ?? []} peakMgDl={payload.peakMgDl ?? 0} />
        <View style={local.metricRowCompact}>
          <Stat label="Baseline" value={payload.baselineMgDl ?? '—'} unit="mg/dL" />
          <Stat label="Peak" value={payload.peakMgDl ?? '—'} unit="mg/dL" />
          <Stat label="Time" value={payload.peakTimeMinutes ?? '—'} unit="min" />
        </View>
        {payload.uncertaintyRangeMgDl ? (
          <View style={local.uncertaintyBand}>
            <MaterialCommunityIcons name="alert-outline" size={18} color={colors.tertiary} />
            <Text variant="bodySmall" style={{ color: colors.tertiary }}>
              Expected range {payload.uncertaintyRangeMgDl[0]}–{payload.uncertaintyRangeMgDl[1]} mg/dL
            </Text>
          </View>
        ) : null}
      </StitchCard>
    </View>
  );
}

function MealMemoryCard({ card }: { card: MobileShowcaseCard }) {
  return (
    <View style={local.cardStack}>
      <View style={local.centerIntro}>
        <Text variant="bodyMedium" style={local.muted}>Tom Batchelor / Foot2Floor pattern · 90-day history</Text>
        <ConfidenceBadge label="High Confidence" tone="success" />
      </View>
      <View style={local.metricGrid}>
        <MetricTile label="Similar Meals" value={String(card.payload.similarMealsCount ?? 32)} unit="historical matches" icon="history" />
        <MetricTile label="CGM Outcomes" value={String(card.payload.glucoseOutcomesCount ?? 28)} icon="heart-pulse" tone="success" />
        <MetricTile label="Typical Rise" value={`+${card.payload.typicalRiseMgDl ?? 50}`} unit="mg/dL" icon="trending-up" tone="warning" />
      </View>
      <StitchCard>
        <Text variant="titleLarge" style={local.sectionTitle}>Outcome Distribution</Text>
        <Text variant="bodySmall" style={local.muted}>Predicted glucose trajectory based on 28 past CGM records.</Text>
        <View style={local.distributionBox}>
          <Text variant="labelSmall" style={local.muted}>250 mg/dL</Text>
          <View style={local.distributionLine} />
          <Text variant="labelSmall" style={local.muted}>70 mg/dL</Text>
        </View>
      </StitchCard>
    </View>
  );
}

function ConfidenceCard({ card }: { card: MobileShowcaseCard }) {
  const components = (card.payload.components ?? []) as { label: string; value: number }[];
  return (
    <View style={local.cardStack}>
      <StitchCard>
        <View style={local.centerIntro}>
          <ConfidenceBadge label="High Confidence" tone="success" />
          <Text variant="bodyMedium" style={[local.muted, { textAlign: 'center' }]}>Your recent logging habits and glucose stability provide a highly reliable foundation.</Text>
        </View>
      </StitchCard>
      <StitchCard>
        <Text variant="titleLarge" style={local.sectionTitle}>Confidence Breakdown</Text>
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {components.map((component) => <ProgressRow key={component.label} label={component.label} value={component.value} />)}
        </View>
      </StitchCard>
      <StitchCard variant="low">
        <View style={local.educationRow}>
          <IconBubble icon="school-outline" tone="primary" />
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={local.foodName}>Educational Simulation</Text>
            <Text variant="bodySmall" style={local.muted}>Confidence metrics combine historical logging accuracy, CGM stability, and nutrition precision.</Text>
          </View>
        </View>
      </StitchCard>
    </View>
  );
}

function SafetyCard({ label }: { label: string }) {
  return (
    <StitchCard variant="low">
      <Text variant="bodySmall" style={local.muted}>{label}</Text>
    </StitchCard>
  );
}

function UnsupportedCard({ card }: { card: MobileShowcaseCard }) {
  return (
    <StitchCard>
      <Text variant="titleMedium">Update required</Text>
      <Text variant="bodySmall" style={local.muted}>Unsupported card kind: {card.kind}</Text>
    </StitchCard>
  );
}

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <View style={local.statBlock}>
      <Text variant="labelSmall" style={local.muted}>{label}</Text>
      <Text variant="headlineSmall" style={local.statValue}>{value}</Text>
      {unit ? <Text variant="labelSmall" style={local.muted}>{unit}</Text> : null}
    </View>
  );
}

function titleCase(value: string) {
  return value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

const local = StyleSheet.create({
  cardStack: { gap: spacing.md, marginBottom: spacing.lg },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: { color: colors.onSurface, fontWeight: '700' },
  inlineMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  muted: { color: colors.onSurfaceVariant },
  itemList: { gap: spacing.sm },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 16, padding: spacing.sm },
  foodName: { color: colors.onSurface, fontWeight: '700' },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 16, backgroundColor: 'rgba(160,243,153,0.3)', borderWidth: 1, borderColor: colors.secondaryContainer },
  sectionTitle: { color: colors.primary, fontWeight: '800' },
  metricGrid: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md, gap: spacing.sm },
  metricRowCompact: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md },
  statBlock: { alignItems: 'center', flex: 1 },
  statValue: { color: colors.primary, fontWeight: '800' },
  uncertaintyBand: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, padding: spacing.sm, borderRadius: 12, backgroundColor: 'rgba(255,221,181,0.45)' },
  centerIntro: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  distributionBox: { height: 180, marginTop: spacing.md, borderRadius: 12, backgroundColor: colors.surfaceContainer, padding: spacing.md, justifyContent: 'space-between' },
  distributionLine: { height: 4, borderRadius: 999, backgroundColor: colors.primaryContainer, width: '80%', alignSelf: 'center' },
  educationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
