import { useLocalSearchParams, router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { CardRenderer } from '@/components/cards/CardRenderer';
import { DataSourcePill, DemoModeBanner, SafetyNotice } from '@/components/cards/DomainPrimitives';
import { demoEnvelope } from '@/data/demoEnvelope';
import { useMealReviewStore } from '@/state/useMealReviewStore';
import type { CompanionRunEnvelope } from '@/types/mobileCard';

export default function ForecastScreen() {
  const { runId } = useLocalSearchParams<{ runId: string }>();
  const queryClient = useQueryClient();
  const saveDemoReview = useMealReviewStore((state) => state.saveDemoReview);
  const envelope = queryClient.getQueryData<CompanionRunEnvelope>(['companion-run', runId]) ?? demoEnvelope;
  const forecastCard = envelope.cards?.find((card) => card.kind === 'forecast');
  const detailCards = envelope.cards?.filter((card) => card.kind !== 'forecast' && card.kind !== 'safetyStatus') ?? [];

  const handleSave = () => {
    saveDemoReview(envelope);
    router.push('/(tabs)/meals');
  };

  return (
    <View style={styles.screen}>
      <DemoModeBanner dataMode={envelope.dataMode} sourceLabel={envelope.sourceLabel} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="headlineSmall" style={styles.title}>Forecast result</Text>
            <Text variant="bodyMedium" style={styles.muted}>Result first, evidence below.</Text>
          </View>
          <DataSourcePill label={envelope.sourceLabel} />
        </View>

        {forecastCard ? <CardRenderer card={forecastCard} /> : null}

        {detailCards.map((card) => (
          <CardRenderer key={card.id} card={card} />
        ))}

        <SafetyNotice label={envelope.safety.label} />
      </ScrollView>

      <View style={styles.actionBar}>
        <Button mode="contained" onPress={handleSave}>Save meal review</Button>
        <Button mode="outlined" onPress={() => router.push('/(tabs)/chat')}>Discuss</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 16, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  title: { color: '#004349', fontWeight: '700' },
  muted: { color: '#5F6B6D' },
  actionBar: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#FFFFFF', borderTopColor: '#E1E3E4', borderTopWidth: StyleSheet.hairlineWidth },
});
