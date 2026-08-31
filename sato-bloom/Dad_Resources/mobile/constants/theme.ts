// Sato Design System — Botanical Palette
// Sourced from Stitch project 5278907948092774474
// Typography: Cormorant Garamond (editorial) + Instrument Sans (functional)

export const Colors = {
  // Backgrounds
  bg: '#F1EBDD',
  card: '#F1EBDD', // Exactly the same as bg for print layout hierarchy
  cardAlt: '#FBF8F2', // Elevated
  heroCard: '#F2ECDF', // Hero Insight Surface (1.5% diff)
  modal: '#FCFAF6',

  // Text
  ink: '#181614',
  softStone: '#7E756A',

  // Accents
  burntOrange: '#D97947',
  amber: '#B97B3F',

  // Bloom Engine — per-pattern palette
  bloom: {
    pizza: {
      bg: '#F2D8CB',
      text: '#C65A32',
      petal1: '#C65A32',
      petal2: '#E9A07D',
      petal3: '#F2D8CB',
      cardBg: '#F3ECE2',
      trace: '#C97854',
    },
    walks: {
      bg: '#E2EEF2',
      text: '#2B6B86',
      petal1: '#2B6B86',
      petal2: '#7EAEC3',
      petal3: '#E2EEF2',
      cardBg: '#F1ECE2',
      trace: '#6D91A8',
    },
    mornings: {
      bg: '#E6ECD8',
      text: '#70824B',
      petal1: '#70824B',
      petal2: '#B5C08D',
      petal3: '#E6ECD8',
      cardBg: '#F1ECE3',
      trace: '#8C9B76',
    },
    jiujitsu: {
      bg: '#EEE6F7',
      text: '#7A5CA6',
      petal1: '#7A5CA6',
      petal2: '#B79ED6',
      petal3: '#EEE6F7',
      cardBg: '#F1EBE4',
      trace: '#9887B1',
    },
    sleep: {
      bg: '#EEE6F7',
      text: '#7A5CA6',
      petal1: '#B97B3F',
      petal2: '#D4B483',
      petal3: '#F0E2CC',
      cardBg: '#F2EBE5',
      trace: '#9887B1',
    },
    evening: {
      bg: '#F2D8CB',
      text: '#C65A32',
      petal1: '#D97947',
      petal2: '#E9A07D',
      petal3: '#F2D8CB',
      cardBg: '#F3ECE2',
      trace: '#C97854',
    },
  },

  // UI Chrome
  border: '#E7DECF',
  borderLight: '#E7DECF',
  divider: '#E3DACB',
  chipBg: '#EDE7DD',
  navBg: 'rgba(246,242,234,0.96)',
  white: '#FFFFFF',
} as const;

export const Fonts = {
  // Editorial voice — Cormorant Garamond (Canela substitute)
  serif: 'CormorantGaramond_400Regular',
  serifItalic: 'CormorantGaramond_400Regular_Italic',
  serifMedium: 'CormorantGaramond_500Medium',
  serifSemiBold: 'CormorantGaramond_600SemiBold',

  // Functional voice — Inter (Suisse Int'l substitute)
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
} as const;

// Type Scale — "quiet Kyoto museum meets Apple Health meets premium editorial"
export const TypeScale = {
  // Editorial / Sato Voice
  display: {
    // "Discover" — the hero title
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  heroTitle: {
    // "The evening left a stronger trace."
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  cardTitle: {
    // Pattern card titles in lists
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  screenTitle: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    // "Recently uncovered"
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  logoMark: {
    // "Sato" in header
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.5,
  },

  // Functional / Data Voice
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  bodyLarge: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  smallBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  metadata: {
    // "Strong Pattern • Seen 18 times"
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  label: {
    // "WHAT SATO NOTICED" all-caps labels
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  badge: {
    // "Strong Pattern" pill text
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
  tabLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 12,
  },
  button: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  chatBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
} as const;

export const Radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;
