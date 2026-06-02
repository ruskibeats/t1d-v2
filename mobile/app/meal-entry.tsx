import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { getDemoEnvelope } from '@/api/companionRun';
import { SafetyNotice } from '@/components/cards/DomainPrimitives';

const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'What-if'];

export default function MealEntryScreen() {
  const [mealType, setMealType] = useState('Dinner');
  const [text, setText] = useState('2 slices pepperoni pizza');
  const queryClient = useQueryClient();

  const generateDemoForecast = () => {
    const envelope = getDemoEnvelope();
    queryClient.setQueryData(['companion-run', envelope.runId], envelope);
    router.push(`/forecast/${envelope.runId}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>What did you eat?</Text>
      <Text variant="bodyMedium" style={styles.muted}>Free text first. The backend preflight will recommend review or clarification when needed.</Text>

      <View style={styles.chips}>
        {mealTypes.map((type) => (
          <Chip key={type} selected={mealType === type} onPress={() => setMealType(type)}>
            {type}
          </Chip>
        ))}
      </View>

      <TextInput
        mode="outlined"
        label="Meal"
        multiline
        numberOfLines={4}
        value={text}
        onChangeText={setText}
      />
      <TextInput mode="outlined" label="Optional notes" multiline numberOfLines={2} />

      <SafetyNotice label="Forecasts are educational simulations. This app does not recommend insulin doses, treatment changes, or emergency actions." />

      <Button mode="contained" disabled={!text.trim()} onPress={generateDemoForecast}>
        Generate forecast
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, backgroundColor: '#F8F9FA', flexGrow: 1 },
  title: { color: '#004349', fontWeight: '700' },
  muted: { color: '#5F6B6D' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
