import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, TypeScale, Fonts } from '@/constants/theme';
import { TabBar } from '@/components/TabBar';
import { PaperBackground } from '@/components/PaperBackground';

interface Message {
  id: string;
  role: 'sato' | 'user';
  text: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'sato',
    text: "Good evening, Russell. Your glucose has been more settled today — you've spent 78% of the day in range. Anything on your mind?",
  },
];

const QUICK_PROMPTS = [
  'Why was I low this afternoon?',
  'How did my walk affect things?',
  'Pizza tonight — what should I expect?',
  'Show me my sleep patterns',
];

export default function SatoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    const satoReply: Message = {
      id: (Date.now() + 1).toString(),
      role: 'sato',
      text: getSatoReply(text),
    };
    setMessages((prev) => [...prev, userMsg, satoReply]);
    setDraft('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <PaperBackground>
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('@/assets/sato_logo_mark.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Sato</Text>
          <Text style={styles.subtitle}>Your T1D companion</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.bubble,
              msg.role === 'user' ? styles.bubbleUser : styles.bubbleSato,
            ]}
          >
            {msg.role === 'sato' && (
              <Text style={styles.bubbleName}>Sato</Text>
            )}
            <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
              {msg.text}
            </Text>
          </View>
        ))}

        {/* Quick prompts (only shown initially) */}
        {messages.length <= 1 && (
          <View style={styles.quickPrompts}>
            {QUICK_PROMPTS.map((q) => (
              <TouchableOpacity
                key={q}
                style={styles.quickChip}
                onPress={() => sendMessage(q)}
              >
                <Text style={styles.quickChipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 4 }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask Sato anything..."
          placeholderTextColor={Colors.softStone}
          multiline
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(draft)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
          onPress={() => sendMessage(draft)}
          disabled={!draft.trim()}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>

      <TabBar active="sato" onPress={(tab) => {
        if (tab === 'discover') router.replace('/');
        else if (tab !== 'sato') router.replace(`/(tabs)/${tab}`);
      }} />
      </KeyboardAvoidingView>
    </PaperBackground>
  );
}

function getSatoReply(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('low') || lower.includes('hypo'))
    return "Your 3pm dip is a pattern I've noticed on days you skip lunch or push back your meal. You were at 3.8 mmol/L — treated quickly though. Well handled.";
  if (lower.includes('walk'))
    return "The 20-minute walk you took at 2:30pm likely contributed to a 1.2 mmol/L drop over 90 minutes. Walks are one of your most consistent stabilisers — I've seen this 14 times.";
  if (lower.includes('pizza'))
    return "Pizza nights typically cause a delayed spike — usually peaking around 2–3 hours later due to the fat slowing absorption. I'd suggest pre-bolusing 20 minutes earlier than usual and splitting your dose.";
  if (lower.includes('sleep'))
    return "Short sleep (under 6 hours) is linked to higher morning glucose variability for you. On those days, you've needed roughly 15% more insulin at breakfast. This is an emerging signal — 9 observations so far.";
  return "That's a great question. Based on your data from the past 30 days, I can see some patterns forming. Let me dig into that for you — give me a moment.";
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  logoImage: { width: 72, height: 72 },
  headerTextContainer: { flex: 1, gap: 1 },
  title: {
    fontFamily: Fonts.serifSemiBold,
    fontWeight: 'bold',
    color: Colors.ink,
    fontSize: 38,
    lineHeight: 42,
  },
  subtitle: { ...TypeScale.caption, color: Colors.softStone, marginTop: 0 },

  messageList: { flex: 1 },
  messageContent: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxl },

  bubble: {
    maxWidth: '82%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  bubbleSato: {
    backgroundColor: Colors.card,
    alignSelf: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.015,
    shadowRadius: 18,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: Colors.ink,
    alignSelf: 'flex-end',
  },
  bubbleName: { ...TypeScale.label, color: Colors.burntOrange, marginBottom: 3 },
  bubbleText: { ...TypeScale.chatBody, color: Colors.ink },
  bubbleTextUser: { color: '#FFF' },

  quickPrompts: { gap: Spacing.sm, marginTop: Spacing.sm },
  quickChip: {
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignSelf: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.015,
    shadowRadius: 18,
    elevation: 1,
  },
  quickChipText: { ...TypeScale.button, color: Colors.burntOrange },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: Colors.ink,
    maxHeight: 100,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.015,
    shadowRadius: 18,
    elevation: 1,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.chipBg },
  sendIcon: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});
