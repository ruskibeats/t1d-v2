import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, IconButton, Text } from 'react-native-paper';
import { DemoModeBanner, DomainCard, ScreenContainer, SafetyNotice } from '@/components/cards/DomainPrimitives';
import { demoEnvelope } from '@/data/demoEnvelope';

export default function HomeScreen() {
  return (
    <ScreenContainer>
      <DemoModeBanner dataMode={demoEnvelope.dataMode} sourceLabel={demoEnvelope.sourceLabel} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text variant="headlineMedium" style={styles.title}>T1D Companion</Text>
            <Text variant="bodyMedium" style={styles.muted}>Dashboard-first, evidence-backed companion</Text>
          </View>
          <IconButton icon="cog" onPress={() => router.push('/settings')} accessibilityLabel="Settings" />
        </View>

        <Card mode="outlined" style={styles.heroCard}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.muted}>Current glucose</Text>
            <View style={styles.glucoseRow}>
              <Text variant="displayMedium">124</Text>
              <Text variant="titleMedium" style={styles.muted}>mg/dL</Text>
              <Text variant="headlineSmall" style={styles.trend}>→</Text>
            </View>
            <Text variant="bodySmall" style={styles.muted}>Synthetic demo reading · just now</Text>
          </Card.Content>
        </Card>

        <DomainCard title="Top observations" subtitle="Short, source-labelled insights for today">
          <Observation title="Steady trend" body="Today is 15% steadier than the demo 7-day average." />
          <Observation title="Pattern alert" body="Similar pizza meals usually rise later in the forecast window." />
          <Observation title="Exercise effect" body="Activity-linked observations will appear here when available." />
        </DomainCard>

        <View style={styles.actions}>
          <Button mode="contained" onPress={() => router.push('/meal-entry')}>
            Quick log
          </Button>
          <Button mode="outlined" onPress={() => router.push('/(tabs)/patterns')}>
            View patterns
          </Button>
        </View>

        <SafetyNotice label={demoEnvelope.safety.label} />
      </ScrollView>
    </ScreenContainer>
  );
}

function Observation({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.observation}>
      <Text variant="titleSmall">{title}</Text>
      <Text variant="bodySmall" style={styles.muted}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#004349', fontWeight: '700' },
  muted: { color: '#5F6B6D' },
  heroCard: { backgroundColor: '#FFFFFF' },
  glucoseRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: 8 },
  trend: { color: '#004349' },
  observation: { borderLeftColor: '#004349', borderLeftWidth: 3, paddingLeft: 10, gap: 2 },
  actions: { flexDirection: 'row', gap: 12 },
});
