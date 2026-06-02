import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { DataSourcePill, DemoModeBanner, DomainCard, ScreenContainer } from '@/components/cards/DomainPrimitives';
import { demoEnvelope } from '@/data/demoEnvelope';

const patterns = [
  { title: 'Steady mornings', body: '9/10 demo mornings were in range. Fasting glucose remains predictable.', confidence: '94%' },
  { title: 'Post-lunch rise', body: 'Recurring rise after high-carb lunches in synthetic history.', confidence: '78%' },
  { title: 'Overnight lows', body: 'Exercise-linked lows appear in a subset of demo records.', confidence: '82%' },
];

export default function PatternsScreen() {
  return (
    <ScreenContainer>
      <DemoModeBanner dataMode={demoEnvelope.dataMode} sourceLabel={demoEnvelope.sourceLabel} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.chips}>
          {['All', 'Good', 'Watch', 'Lows'].map((label, index) => (
            <Chip key={label} selected={index === 0}>{label}</Chip>
          ))}
        </View>

        <DomainCard title="Weekly summary" subtitle="Health knowledge graph preview">
          <Text variant="headlineSmall" style={styles.primary}>Steady mornings</Text>
          <Text variant="bodyMedium" style={styles.muted}>9/10 mornings were in range in this synthetic demo profile.</Text>
          <DataSourcePill label="Synthetic legend" />
        </DomainCard>

        <DomainCard title="Recent patterns">
          {patterns.map((pattern) => (
            <View key={pattern.title} style={styles.patternRow}>
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall">{pattern.title}</Text>
                <Text variant="bodySmall" style={styles.muted}>{pattern.body}</Text>
              </View>
              <Text variant="labelLarge" style={styles.primary}>{pattern.confidence}</Text>
            </View>
          ))}
        </DomainCard>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  muted: { color: '#5F6B6D' },
  primary: { color: '#004349' },
  patternRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8 },
});
