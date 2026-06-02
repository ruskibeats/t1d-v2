import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, List, Text } from 'react-native-paper';
import { SafetyNotice } from '@/components/cards/DomainPrimitives';

export default function SettingsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>Settings</Text>
      <List.Section>
        <List.Item
          title="Data sources"
          description="Nightscout setup shell for real mode"
          left={(props) => <List.Icon {...props} icon="database" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/settings/data-sources')}
        />
        <List.Item
          title="Mode"
          description="Synthetic demo mode active"
          left={(props) => <List.Icon {...props} icon="flask" />}
        />
      </List.Section>
      <SafetyNotice label="Educational simulator only. No dosing, treatment changes, or emergency instructions." />
      <Button mode="outlined" onPress={() => router.back()}>Done</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, backgroundColor: '#F8F9FA', flexGrow: 1 },
  title: { color: '#004349', fontWeight: '700' },
});
