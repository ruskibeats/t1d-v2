import { StyleSheet, View } from 'react-native';
import { Button, ProgressBar, Text } from 'react-native-paper';
import { ForecastCurveChart } from '@/components/charts/ForecastCurveChart';
import { ConfidencePill, DataSourcePill, DomainCard, SafetyNotice } from './DomainPrimitives';
import type { ForecastPayload, MobileShowcaseCard, ParsedFood } from '@/types/mobileCard';

export function CardRenderer({ card }: { card: MobileShowcaseCard }) {
  switch (card.kind) {
    case 'forecast':
      return <ForecastCard card={card} />;
    case 'parsedFoods':
      return <ParsedFoodsCard card={card} />;
    case 'foodEvidence':
      return <FoodEvidenceCard card={card} />;
    case 'mealMemory':
      return <MealMemoryCard card={card} />;
    case 'confidence':
      return <ConfidenceCard card={card} />;
    case 'safetyStatus':
      return <SafetyNotice label={card.safetyFooter} />;
    default:
      return <UnsupportedCard card={card} />;
  }
}

function ForecastCard({ card }: { card: MobileShowcaseCard }) {
  const payload = card.payload as unknown as ForecastPayload;
  return (
    <DomainCard title={card.title} subtitle={card.summary}>
      <View style={styles.rowBetween}>
        <ConfidencePill tier={card.confidenceTier} />
        <DataSourcePill source={card.source} />
      </View>
      <ForecastCurveChart points={payload.points ?? []} peakMgDl={payload.peakMgDl ?? 0} />
      <View style={styles.metricRow}>
        <Metric label="Baseline" value={`${payload.baselineMgDl ?? '—'}`} unit="mg/dL" />
        <Metric label="Peak" value={`${payload.peakMgDl ?? '—'}`} unit="mg/dL" />
        <Metric label="Peak time" value={`${payload.peakTimeMinutes ?? '—'}`} unit="min" />
      </View>
      {payload.uncertaintyRangeMgDl ? (
        <Text variant="bodySmall">
          Uncertainty range: {payload.uncertaintyRangeMgDl[0]}–{payload.uncertaintyRangeMgDl[1]} mg/dL
        </Text>
      ) : null}
    </DomainCard>
  );
}

function ParsedFoodsCard({ card }: { card: MobileShowcaseCard }) {
  const foods = (card.payload.foods ?? []) as ParsedFood[];
  return (
    <DomainCard title={card.title} subtitle={card.summary}>
      {foods.map((food) => (
        <View key={`${food.item}-${food.quantity}`} style={styles.rowBetween}>
          <Text variant="bodyMedium">
            {food.quantity} {food.unit ?? ''} {food.item}
          </Text>
          <ConfidencePill tier={food.confidenceTier} />
        </View>
      ))}
    </DomainCard>
  );
}

function FoodEvidenceCard({ card }: { card: MobileShowcaseCard }) {
  const totals = card.payload.totals as Record<string, number> | undefined;
  const warnings = (card.payload.warnings ?? []) as string[];
  return (
    <DomainCard title={card.title} subtitle={card.summary}>
      <View style={styles.metricRow}>
        <Metric label="Carbs" value={`${totals?.carbsG ?? '—'}`} unit="g" />
        <Metric label="Fat" value={`${totals?.fatG ?? '—'}`} unit="g" />
        <Metric label="Protein" value={`${totals?.proteinG ?? '—'}`} unit="g" />
      </View>
      {warnings.map((warning) => (
        <Text key={warning} variant="bodySmall" style={styles.warning}>
          {warning}
        </Text>
      ))}
    </DomainCard>
  );
}

function MealMemoryCard({ card }: { card: MobileShowcaseCard }) {
  return (
    <DomainCard title={card.title} subtitle={card.summary}>
      <View style={styles.metricRow}>
        <Metric label="Similar meals" value={`${card.payload.similarMealsCount ?? '—'}`} />
        <Metric label="CGM outcomes" value={`${card.payload.glucoseOutcomesCount ?? '—'}`} />
        <Metric label="Typical rise" value={`${card.payload.typicalRiseMgDl ?? '—'}`} unit="mg/dL" />
      </View>
      <Text variant="bodySmall">Provenance: {String(card.payload.provenance ?? 'unknown')}</Text>
    </DomainCard>
  );
}

function ConfidenceCard({ card }: { card: MobileShowcaseCard }) {
  const components = (card.payload.components ?? []) as { label: string; value: number }[];
  return (
    <DomainCard title={card.title} subtitle={card.summary}>
      <ConfidencePill tier={card.confidenceTier} />
      {components.map((component) => (
        <View key={component.label} style={styles.progressBlock}>
          <View style={styles.rowBetween}>
            <Text variant="bodySmall">{component.label}</Text>
            <Text variant="bodySmall">{Math.round(component.value * 100)}%</Text>
          </View>
          <ProgressBar progress={component.value} color="#004349" />
        </View>
      ))}
    </DomainCard>
  );
}

function UnsupportedCard({ card }: { card: MobileShowcaseCard }) {
  return (
    <DomainCard title="Update required" subtitle="This result includes a card type not supported by this app version.">
      <Text variant="bodySmall">Unsupported card kind: {card.kind}</Text>
      <Button mode="outlined">Contact support</Button>
    </DomainCard>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.metric}>
      <Text variant="labelSmall" style={styles.muted}>
        {label}
      </Text>
      <Text variant="titleMedium">
        {value} {unit ? <Text variant="labelSmall">{unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
  },
  muted: {
    color: '#5F6B6D',
  },
  warning: {
    color: '#6B4D00',
    backgroundColor: '#FFF3CD',
    padding: 8,
    borderRadius: 8,
  },
  progressBlock: {
    gap: 4,
  },
});
