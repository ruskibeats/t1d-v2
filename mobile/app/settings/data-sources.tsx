import { ScrollView, StyleSheet } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafetyNotice } from '@/components/cards/DomainPrimitives';

export default function DataSourcesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>Nightscout</Text>
      <Text variant="bodyMedium" style={styles.muted}>Real mode will store credentials encrypted on the backend. Mobile keeps only dataSourceId and redacted status.</Text>
      <TextInput mode="outlined" label="Nightscout URL" placeholder="https://example.herokuapp.com" />
      <TextInput mode="outlined" label="API token (optional)" secureTextEntry />
      <Button mode="contained" disabled>Test connection</Button>
      <SafetyNotice label="Real data mode is gated. Demo mode never blends with real CGM data." />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, backgroundColor: '#F8F9FA', flexGrow: 1 },
  title: { color: '#004349', fontWeight: '700' },
  muted: { color: '#5F6B6D' },
});
