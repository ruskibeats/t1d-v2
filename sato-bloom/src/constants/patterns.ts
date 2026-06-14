import { Colors } from '@/constants/theme';

export type PatternStrength = 'strong' | 'emerging';

export interface Pattern {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  strength: PatternStrength;
  seenCount: number;
  bloom: keyof typeof Colors.bloom;
  timeLabel: string;
  graphData: number[]; // normalised 0-1, used for sparkline
  graphLabels: string[];
  insight: string;
  category: 'Food' | 'Activity' | 'Sleep' | 'Stress' | 'Routine';
}

export const PATTERNS: Pattern[] = [
  {
    id: 'pizza',
    title: 'Evenings linger',
    shortTitle: 'Pizza evenings',
    description:
      'Your glucose tends to rise higher after pizza, especially after 8pm. The fat and carb combo delays the peak — often hitting 2–3 hours later than other meals.',
    strength: 'strong',
    seenCount: 18,
    bloom: 'pizza',
    timeLabel: '6PM – 12AM',
    graphData: [0, 0, 0.1, 0.3, 0.9, 0.7, 0.4, 0.2],
    graphLabels: ['6PM', '7PM', '8PM', '9PM', '10PM', '11PM', '12AM', '1AM'],
    insight: 'Consider pre-bolusing 20 min earlier on pizza nights.',
    category: 'Food',
  },
  {
    id: 'walks',
    title: 'Afternoons soften',
    shortTitle: 'Afternoon walks',
    description:
      'On days you walk after lunch, your afternoon glucose is calmer and spends more time in range. Even a 15-minute stroll makes a measurable difference.',
    strength: 'strong',
    seenCount: 14,
    bloom: 'walks',
    timeLabel: '12PM – 6PM',
    graphData: [0.5, 0.4, 0.7, 0.9, 0.6, 0.3, 0.2, 0.1],
    graphLabels: ['12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM'],
    insight: 'Walk days show 34% more time-in-range between 2–5pm.',
    category: 'Activity',
  },
  {
    id: 'mornings',
    title: 'Mornings find rhythm',
    shortTitle: 'Morning stability',
    description:
      'Your fasting glucose has become more consistent over the past 3 weeks. Morning variability has dropped — a sign your overnight basal rate is dialling in.',
    strength: 'strong',
    seenCount: 21,
    bloom: 'mornings',
    timeLabel: '6AM – 10AM',
    graphData: [0.3, 0.35, 0.3, 0.32, 0.28, 0.3, 0.31, 0.29],
    graphLabels: ['6AM', '7AM', '7:30', '8AM', '8:30', '9AM', '9:30', '10AM'],
    insight: 'Morning CV dropped from 28% to 14% over the past month.',
    category: 'Routine',
  },
  {
    id: 'jiujitsu',
    title: 'Overnight echoes',
    shortTitle: 'Jiu-jitsu nights',
    description:
      'Intensity on the mat often echoes into your sleep. Your liver tends to release glucose in the early hours after hard sessions, causing a delayed rise around 2–4am.',
    strength: 'emerging',
    seenCount: 6,
    bloom: 'jiujitsu',
    timeLabel: '8PM – 8AM',
    graphData: [0.2, 0.2, 0.3, 0.7, 0.85, 0.6, 0.4, 0.3],
    graphLabels: ['8PM', '10PM', '12AM', '2AM', '3AM', '4AM', '6AM', '8AM'],
    insight: 'Try a small protein snack post-session to blunt the dawn effect.',
    category: 'Activity',
  },
  {
    id: 'sleep',
    title: 'Restless mornings',
    shortTitle: 'Short sleep',
    description:
      'On nights under 6 hours, your cortisol runs higher in the morning, making breakfast glucose more unpredictable and often requiring more insulin.',
    strength: 'emerging',
    seenCount: 9,
    bloom: 'sleep',
    timeLabel: 'Next morning',
    graphData: [0.2, 0.4, 0.8, 0.95, 0.7, 0.5, 0.4, 0.3],
    graphLabels: ['6AM', '7AM', '8AM', '9AM', '10AM', '11AM', '12PM', '1PM'],
    insight: 'Short-sleep mornings need ~15% more breakfast insulin on average.',
    category: 'Sleep',
  },
];

export const FEATURED_PATTERN = PATTERNS[0];
