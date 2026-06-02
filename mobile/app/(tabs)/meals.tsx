import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, List, Text } from 'react-native-paper';
import { DemoModeBanner, ScreenContainer, SafetyNotice } from '@/components/cards/DomainPrimitives';
import { demoEnvelope } from '@/data/demoEnvelope';
import { useMealReviewStore } from '@/state/useMealReviewStore';

export default function MealsScreen() {
  const savedReviews = useMealReviewStore((state) => state.savedReviews);
  const clearDemoReviews = useMealReviewStore((state) => state.clearDemoReviews);

  return (
    <ScreenContainer>
      <DemoModeBanner dataMode={demoEnvelope.dataMode} sourceLabel={demoEnvelope.sourceLabel} />
      <View style={styles.content}>
        <View style={styles.actions}>
          <Button mode="contained" onPress={() => router.push('/meal-entry')}>Log meal</Button>
          <Button mode="text" onPress={clearDemoReviews}>Clear demo</Button>
        </View>

        {savedReviews.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="titleMedium">No saved meal reviews yet</Text>
            <Text variant="bodyMedium" style={styles.muted}>Generate and save a forecast to see it here.</Text>
          </View>
        ) : (
          <FlatList
            data={savedReviews}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <List.Item
                title={item.normalized.mealText}
                description={`${item.normalized.peakMgDl ?? '—'} mg/dL peak · ${item.sourceLabel}`}
                left={(props) => <List.Icon {...props} icon="silverware-fork-knife" />}
              />
            )}
          />
        )}

        <SafetyNotice label={demoEnvelope.safety.label} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16, gap: 12 },
  actions: { flexDirection: 'row', gap: 12 },
  empty: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, gap: 4 },
  muted: { color: '#5F6B6D' },
});
