import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { DemoModeBanner, DomainCard, ScreenContainer } from '@/components/cards/DomainPrimitives';
import { demoEnvelope } from '@/data/demoEnvelope';

export default function ChatScreen() {
  return (
    <ScreenContainer>
      <DemoModeBanner dataMode={demoEnvelope.dataMode} sourceLabel={demoEnvelope.sourceLabel} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>Why was I high at 6pm yesterday?</Text>
        </View>

        <View style={styles.aiBubble}>
          <Text variant="labelLarge" style={styles.primary}>HOOT AI</Text>
          <Text variant="bodyMedium">
            The demo graph shows a meal-to-delayed-rise pattern with medium confidence. This is an educational explanation based on synthetic evidence.
          </Text>
          <View style={styles.badges}>
            <Text variant="labelSmall" style={styles.badge}>Evidence: demo CGM</Text>
            <Text variant="labelSmall" style={styles.badge}>Source: meal history</Text>
          </View>
        </View>

        <DomainCard title="Insight context" subtitle="Contextual chat should start from concrete forecast or meal evidence.">
          <Button mode="outlined">View graph</Button>
          <Button mode="outlined">Compare pizza days</Button>
        </DomainCard>
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput mode="outlined" placeholder="Ask Hoot about your trends..." style={styles.input} />
        <Button mode="contained">Send</Button>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  userBubble: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: '#004349', borderRadius: 18, padding: 12 },
  userText: { color: '#FFFFFF' },
  aiBubble: { alignSelf: 'flex-start', maxWidth: '92%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12, gap: 8 },
  primary: { color: '#004349' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { backgroundColor: '#EDEEEF', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, color: '#3F484A' },
  inputBar: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#F8F9FA' },
  input: { flex: 1 },
});
