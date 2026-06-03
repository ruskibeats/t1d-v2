import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, List, Text, RadioButton } from 'react-native-paper';
import { SafetyNotice } from '@/components/cards/DomainPrimitives';
import { useLegendProfile, legendProfiles } from '@/state/useLegendProfile';

export default function SettingsScreen() {
  const { selectedProfile, selectProfile } = useLegendProfile();
  
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>Settings</Text>
      
      {/* Profile Selection */}
      <List.Section title="Active Profile">
        {legendProfiles.map((profile) => (
          <List.Item
            key={profile.key}
            title={profile.name}
            description={profile.description}
            left={() => (
              <RadioButton
                value={profile.key}
                status={selectedProfile === profile.key ? 'checked' : 'unchecked'}
                onPress={() => selectProfile(profile.key)}
              />
            )}
          />
        ))}
      </List.Section>

      {/* Data sources */}
      <List.Section>
        <List.Item
          title="Data sources"
          description={selectedProfile === 'foot_to_floor_tom' ? "Nightscout LibreLinkUp connected" : "Nightscout setup shell for real mode"}
          left={(props) => <List.Icon {...props} icon="database" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/settings/data-sources')}
        />
        <List.Item
          title="Mode"
          description={selectedProfile === 'foot_to_floor_tom' ? 'Real CGM (Foot2Floor)' : 'Synthetic demo mode active'}
          left={(props) => <List.Icon {...props} icon={selectedProfile === 'foot_to_floor_tom' ? 'heart-pulse' : 'flask'} />}
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