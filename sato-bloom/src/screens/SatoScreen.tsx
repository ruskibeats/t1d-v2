import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius, TypeScale } from '@/constants/theme';
import { useNavigation } from '../navigation/NavigationProvider';
import { useLogs } from '../context/LogContext';
import { getSatoPageData } from '../services/api';
import { SatoPageData } from '../types/data';

export interface ActionOption {
  id: string;
  label: string;
  icon: string;
  type: 'reminder' | 'watch' | 'timer' | 'view' | 'addLog';
  target?: string;
  completed?: boolean;
  completedLabel?: string;
}

interface Message {
  id: string;
  role: 'sato' | 'user';
  text: string;
  actions?: ActionOption[];
  customCard?: {
    type: 'sleep' | 'walk' | 'glucose';
    title: string;
    value: string;
    subtext: string;
    icon: string;
    color: string;
  };
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

const MOCK_SATO_PAGE_DATA: SatoPageData = {
  page: {
    title: 'Sato Food Memory',
    subtitle: 'Your food memory is ready.',
    tone: 'calm',
  },
  hero: {
    message: 'Your food memory is ready.',
    mood: 'curious',
    calmNarrative: 'Welcome to Sato. Explore nutritional insights, manage recipes, and build your personalized food knowledge graph — all backed by reliable data.',
  },
  graphSummary: {
    ageAvailable: true,
    graphExists: true,
    vertices: 42,
    edges: 87,
    lastSyncAt: new Date().toISOString(),
    lastSyncStatus: 'success',
  },
  foodGraph: {
    query: 'Chicken Caesar salad',
    answer: 'Chicken Caesar salad contains grilled chicken (high protein, low carb), romaine lettuce (fiber), croutons (carbs), and parmesan (fats).',
    facts: [
      { calories: 350, protein: 32, carbs: 12, fat: 18, fiber: 3, sugars: 2, sodium: 850 }
    ],
    sources: [],
    conflicts: [],
    uncertainty: 0.15,
  },
  companionCards: {
    template: null,
    demoCard: null,
  },
  recipeParser: {
    template: null,
    recommendedDemo: {
      title: 'Best Ever Lasagna',
      sourceUrl: 'https://www.gimmesomeoven.com/best-lasagna/',
      ingredientCount: 5,
      prepTime: '45 minutes',
      cookTime: '75 minutes',
      nutritionSource: 'page_provided',
      safetyNote: 'Educational only.',
    },
  },
  audit: {
    provenance: 'Mock Data',
    uncertaintyScore: 0.2,
    safetyNote: 'Educational purposes only.',
    educationalOnly: true,
  },
  actions: [],
};

const MOCK_MEALS = [
  {
    entry_date: new Date().toISOString().split('T')[0],
    calories: 640,
    protein: 34,
    carbs: 72,
    fat: 22,
    fiber: 8,
    sugars: 12,
    sodium: 480,
  },
  {
    entry_date: new Date().toISOString().split('T')[0],
    calories: 420,
    protein: 28,
    carbs: 45,
    fat: 12,
    fiber: 5,
    sugars: 6,
    sodium: 320,
  }
];

const MOCK_CHECK_IN = {
  id: 'mock-checkin',
  weight: 172.5,
  body_fat_percentage: 16.2,
  steps: 10420,
  entry_date: new Date().toISOString(),
};

const MOCK_EXERCISES = [
  {
    id: 'mock-ex-1',
    exercise_name: 'Afternoon Run',
    calories_burned: 420,
    duration_minutes: 35,
    entry_date: new Date().toISOString(),
  },
  {
    id: 'mock-ex-2',
    exercise_name: 'Jiu-Jitsu Training',
    calories_burned: 650,
    duration_minutes: 60,
    entry_date: new Date().toISOString(),
  }
];

const MOCK_SLEEP = [
  {
    id: 'mock-sleep-1',
    date: new Date().toISOString(),
    sleep_duration_minutes: 480,
    sleep_quality_score: 85,
  }
];

const MOCK_GOALS = [
  {
    id: 'mock-goal-1',
    goal_name: 'Daily Step Target',
    target_value: 10000,
    current_value: 10420,
    progress_percentage: 104,
    achieved: true,
  },
  {
    id: 'mock-goal-2',
    goal_name: 'Fasting Glucose Stability',
    target_value: 95,
    current_value: 92,
    progress_percentage: 97,
    achieved: true,
  }
];

export default function SatoScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { addLog } = useLogs();
  
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const [pageData, setPageData] = useState<SatoPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch page data on mount
  useEffect(() => {
    fetchPageData();
  }, []);

  const fetchPageData = async () => {
    try {
      const data = await getSatoPageData();
      setPageData(data);
    } catch (error) {
      console.warn('Failed to fetch Sato page data, using high-fidelity mock fallback:', error);
      setPageData(MOCK_SATO_PAGE_DATA);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    
    const replyText = getSatoReply(text);
    let replyActions = getSatoActions(text) || [];

    // Conversational Autologging Parser
    const lowerVal = text.toLowerCase();
    const insulinMatch = text.match(/(\b\d+(\.\d+)?)\s*(u|unit(s)?)\b/i);
    const matchedFood = ['carbonara', 'pasta', 'spaghetti', 'creamy pasta', 'parmesan', 'pizza', 'pork chop'].find(food =>
      lowerVal.includes(food)
    );

    if (insulinMatch || matchedFood) {
      const parsedInsulin = insulinMatch ? parseFloat(insulinMatch[1]) : null;
      let parsedFood = matchedFood ? (matchedFood.charAt(0).toUpperCase() + matchedFood.slice(1)) : null;
      
      // Normalize 'pizza' to 'Pizza/Carbs' or 'Carbonara' to match logged memory entries
      if (parsedFood === 'Pizza') {
        parsedFood = 'Carbonara'; // linking to our Carbonara memory curve
      }

      replyActions = [
        {
          id: 'autolog-' + Date.now(),
          label: `Log memory: ${parsedFood || ''}${parsedFood && parsedInsulin ? ' + ' : ''}${parsedInsulin ? parsedInsulin + 'u' : ''}`,
          icon: 'book-outline',
          type: 'addLog',
          target: JSON.stringify({
            text: text,
            insulin: parsedInsulin,
            food: parsedFood
          }),
          completedLabel: 'Logged to Diary'
        },
        ...replyActions
      ];
    }

    // Custom Card association
    let customCard = undefined;
    const lower = text.toLowerCase();
    if (lower.includes('sleep')) {
      customCard = {
        type: 'sleep' as const,
        title: 'Sleep Duration & Quality',
        value: '8h 00m',
        subtext: 'Quality: 85% · Sleep target met',
        icon: 'moon-outline',
        color: Colors.burntOrange,
      };
    } else if (lower.includes('walk')) {
      customCard = {
        type: 'walk' as const,
        title: 'Daily Walk Activity',
        value: '10,420 steps today',
        subtext: 'Walked 20m at 2:30pm · Natural stabilizer',
        icon: 'footprints-outline',
        color: '#5795C7',
      };
    } else if (lower.includes('low') || lower.includes('hypo')) {
      customCard = {
        type: 'glucose' as const,
        title: 'Daily Glucose Stability',
        value: '78% Time In Range',
        subtext: 'Time in range: 70-180 mg/dL',
        icon: 'heart-outline',
        color: Colors.burntOrange,
      };
    }

    const satoReply: Message = {
      id: (Date.now() + 1).toString(),
      role: 'sato',
      text: replyText,
      actions: replyActions.length > 0 ? replyActions : undefined,
      customCard,
    };
    
    setMessages((prev) => [...prev, userMsg, satoReply]);
    setDraft('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleActionPress = (messageId: string, action: ActionOption) => {
    // Play SUCCESS haptic notification
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (action.type === 'view' && action.target) {
      nav.openFoodMemory({ foodId: action.target });
      return;
    }

    if (action.type === 'addLog' && action.target) {
      try {
        const parsed = JSON.parse(action.target);
        addLog(parsed.text, parsed.insulin, parsed.food);
      } catch (err) {
        console.warn('Failed to parse autolog action target', err);
      }
    }

    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        if (msg.id !== messageId || !msg.actions) return msg;
        return {
          ...msg,
          actions: msg.actions.map((act) => {
            if (act.id !== action.id) return act;
            return { ...act, completed: !act.completed };
          }),
        };
      })
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={[styles.messageContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >

        {messages.map((msg, index) => (
          <View
            key={msg.id}
            style={[
              styles.messageRow,
              msg.role === 'user' && styles.messageRowUser,
              index > 0 && styles.messageRowDivider,
            ]}
          >
            {msg.role === 'sato' && (
              <Text style={styles.senderLabel}>Sato</Text>
            )}
            {msg.role === 'user' && (
              <Text style={styles.senderLabelUser}>You</Text>
            )}
            <Text style={[styles.messageText, msg.role === 'user' && styles.messageTextUser]}>
              {msg.text}
            </Text>

            {/* Custom interactive card inside message */}
            {msg.role === 'sato' && msg.customCard && (
              <View style={styles.customCard}>
                <View style={styles.customCardIconWrap}>
                  <Ionicons name={msg.customCard.icon as any} size={20} color={msg.customCard.color} />
                </View>
                <View style={styles.customCardInfo}>
                  <Text style={styles.customCardTitle}>{msg.customCard.title}</Text>
                  <Text style={styles.customCardValue}>{msg.customCard.value}</Text>
                  <Text style={styles.customCardSubtext}>{msg.customCard.subtext}</Text>
                </View>
              </View>
            )}

            {/* Action suggestions — inline text links */}
            {msg.role === 'sato' && msg.actions && msg.actions.length > 0 && (
              <View style={styles.actionRow}>
                {msg.actions.map((action) => {
                  const isCompleted = action.completed;
                  return (
                    <TouchableOpacity
                      key={action.id}
                      style={styles.actionLink}
                      onPress={() => handleActionPress(msg.id, action)}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name={isCompleted ? 'checkmark-circle' : (action.icon as any)}
                        size={14}
                        color={isCompleted ? Colors.softStone : Colors.burntOrange}
                      />
                      <Text style={[
                        styles.actionLinkText,
                        isCompleted && styles.actionLinkTextDone
                      ]}>
                        {isCompleted && action.completedLabel ? action.completedLabel : action.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ))}

        {/* Quick prompts — minimal text links */}
        {messages.length <= 1 && (
          <View style={styles.quickPrompts}>
            <Text style={styles.quickPromptsLabel}>Suggested</Text>
            {QUICK_PROMPTS.map((q) => (
              <TouchableOpacity
                key={q}
                style={styles.quickPromptRow}
                onPress={() => sendMessage(q)}
                activeOpacity={0.6}
              >
                <Ionicons name="chevron-forward" size={14} color={Colors.burntOrange} />
                <Text style={styles.quickPromptText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input — sits above the floating dock */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 80 }]}>
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
          <Ionicons name="arrow-up" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
}

function getSatoReply(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('low') || lower.includes('hypo'))
    return "Your afternoon dip is a pattern commonly observed on days you skip or delay meals. For informational purposes, taking fast-acting glucose (like juice or honey) can help restore baseline levels. Discuss recurring dips with your care team.";
  if (lower.includes('walk'))
    return "A brief 15-20 minute walk after meals is an established physiological stabilizer that increases muscle glucose uptake and smooths out post-meal curves. Across similar entries, walks are linked to a calmer glucose trajectory.";
  if (lower.includes('pizza') || lower.includes('carbonara') || lower.includes('pasta'))
    return "Foods rich in fats and proteins (like pizza or carbonara) slow down stomach emptying. This typically shifts the glycemic peak outward, often causing a delayed rise 3 to 4 hours post-meal. Some individuals discuss timing offsets or split-dosing strategies with their diabetes care team to align with this prolonged absorption curve.";
  if (lower.includes('rice'))
    return "White rice is a complex starch that digests into simple sugars. When paired with protein or fats, stomach emptying slows, which can delay the glycemic peak to 3 or 4 hours after eating, creating a prolonged rise. Discuss timing and pairing strategies with your clinician.";
  if (lower.includes('sleep'))
    return "Shorter sleep duration (under 6 hours) is associated with higher morning cortisol levels. This can temporarily increase insulin resistance at breakfast, leading to higher glycemic variability. This is a common physiological response to restricted rest.";
  return "That's a helpful question. Based on your logged diary entries from the past 30 days, we can observe some repeating patterns. Let me search through your logs to provide educational context — give me a moment.";
}

function getSatoActions(text: string): ActionOption[] | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('low') || lower.includes('hypo')) {
    return [
      { id: 'remind-lunch', label: 'Set check-in reminder for lunch', icon: 'calendar-outline', type: 'reminder', completedLabel: 'Lunch check-in scheduled' },
      { id: 'watch-low', label: 'Track post-meal dips in diary', icon: 'analytics-outline', type: 'watch', completedLabel: 'Tracking post-meal dips' }
    ];
  }
  if (lower.includes('walk')) {
    return [
      { id: 'start-timer', label: 'Set 20m post-meal timer', icon: 'timer-outline', type: 'timer', completedLabel: 'Timer active' },
      { id: 'remind-walk', label: 'Remind me to move after lunch', icon: 'alarm-outline', type: 'reminder', completedLabel: 'Movement reminder scheduled' }
    ];
  }
  if (lower.includes('pizza') || lower.includes('carbonara') || lower.includes('pasta') || lower.includes('rice')) {
    return [
      { id: 'remind-check-onset', label: 'Set 20m pre-meal check reminder', icon: 'time-outline', type: 'reminder', completedLabel: 'Pre-meal check scheduled' },
      { id: 'remind-delayed-rise', label: 'Set 4h delayed rise check reminder', icon: 'alarm-outline', type: 'reminder', completedLabel: '4h check-in scheduled' },
      { id: 'view-pizza-memory', label: 'View Linked Food Memory', icon: 'book-outline', type: 'view', target: lower.includes('rice') ? 'Spaghetti' : 'carbonara' }
    ];
  }
  if (lower.includes('sleep')) {
    return [
      { id: 'track-sleep', label: 'Record sleep logs retrospectively', icon: 'bed-outline', type: 'reminder', completedLabel: 'Sleep tracking active' },
      { id: 'view-sleep-insights', label: 'Track rest trends in diary', icon: 'bar-chart-outline', type: 'watch', completedLabel: 'Sleep tracking added' }
    ];
  }
  return undefined;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  messageList: { flex: 1 },
  messageContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },

  /* ── Line-separated message rows ── */
  messageRow: {
    paddingVertical: Spacing.xl,
  },
  messageRowUser: {
    // subtle right-alignment hint — no background card
  },
  messageRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },

  senderLabel: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 15,
    color: Colors.burntOrange,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  senderLabelUser: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.softStone,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
    textAlign: 'right',
  },

  messageText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.ink,
    lineHeight: 23,
  },
  messageTextUser: {
    textAlign: 'right',
    color: Colors.ink,
  },

  /* ── Inline action links ── */
  actionRow: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
  },
  actionLinkText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.burntOrange,
  },
  actionLinkTextDone: {
    color: Colors.softStone,
    textDecorationLine: 'line-through',
  },

  /* ── Quick prompts ── */
  quickPrompts: {
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  quickPromptsLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.softStone,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: Spacing.md,
  },
  quickPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.sm + 2,
  },
  quickPromptText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.burntOrange,
  },

  /* ── Input bar ── */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingHorizontal: 0,
    paddingVertical: Spacing.md,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.ink,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.chipBg },
  dashboardContainer: {
    marginBottom: Spacing.xl,
  },
  dashboardDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.xl,
    marginHorizontal: -Spacing.xl, // extend edge-to-edge
  },
  customCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: 'rgba(231, 222, 207, 0.4)',
    borderBottomColor: 'rgba(231, 222, 207, 0.4)',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  customCardIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCardInfo: {
    flex: 1,
  },
  customCardTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9.5,
    color: Colors.softStone,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  customCardValue: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 22,
    color: Colors.ink,
    marginTop: 1,
  },
  customCardSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.softStone,
    marginTop: 2,
    lineHeight: 16,
  },
});
