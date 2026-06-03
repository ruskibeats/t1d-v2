import { useLocalSearchParams, router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { CardRenderer } from '@/components/cards/CardRenderer';
import { demoEnvelope } from '@/data/demoEnvelope';
import { useMealReviewStore } from '@/state/useMealReviewStore';
import type { CompanionRunEnvelope } from '@/types/mobileCard';
import { BottomActions, OutlinePillButton, PrimaryPillButton, StitchHeader, styles as stitchStyles } from '@/components/stitch/StitchNative';
import { spacing } from '@/theme/theme';

export default function ForecastScreen() {
  const { runId } = useLocalSearchParams<{ runId: string }>();
  const queryClient = useQueryClient();
  const saveDemoReview = useMealReviewStore((state) => state.saveDemoReview);
  const envelope = queryClient.getQueryData<CompanionRunEnvelope>(['companion-run', runId]) ?? demoEnvelope;
  const cards = envelope.cards?.filter((card) => card.kind !== 'safetyStatus') ?? [];

  const handleSave = () => {
    saveDemoReview(envelope);
    router.push('/(tabs)/meals');
  };

  return (
    <View style={stitchStyles.screen}>
      <StitchHeader title="Meal Results" />
      <ScrollView contentContainerStyle={[stitchStyles.content, { paddingBottom: 156 }]}>
        {cards.map((card) => <CardRenderer key={card.id} card={card} />)}
      </ScrollView>
      <BottomActions>
        <PrimaryPillButton label="Confirm & Save" icon="check" onPress={handleSave} />
        <OutlinePillButton label="Edit Details" icon="pencil" onPress={() => router.push('/(tabs)/log-meal')} />
        <Button mode="text" onPress={() => router.push('/(tabs)/chat')}>Discuss with AI</Button>
      </BottomActions>
    </View>
  );
}
