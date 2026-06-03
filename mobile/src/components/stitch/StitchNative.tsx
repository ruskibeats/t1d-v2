import { PropsWithChildren } from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { colors, spacing } from '@/theme/theme';

export const stitchImages = {
  parsedFoodsHero:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDDVJKM0k7nkFfMLPyiRLETYcblzZJ7-bGzMFchdo8ROy3kUiD4ECccmhR4qpHe7ocrk2IvGNNxqXcFLK9DNXt_TU5buBfCqmsvJkzHr_iyNG1AiLqZbWXJ36Pxlrwraikk4GYDUPav9LuHWOHSoWY9-mRmVEPJ1UpSNJsEF-RJpfU9PNdLnfdJc89U6JQQqIuIEBGLEGqMJlQPsdh67PHG15bAmapa1NXYmRsY73Z5e-333wQhkfr86LEMdab4r0iiJcfR8T8jDAg',
  logMealHero:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCZhtbEqllY2xavK8lK9E92nByrPX0SIOVUjm6DjqZfL1nZKn95HgxLkEZFyzihx4t3j4r1Eaq9L-uVI23vAIL79btexWVdAMwHGYj9rOFMHxScXKCOJ9UgJMDJITK2umTEJmCKMNC5Dmb8QJ_H71Xgsg7frvDF6FhovxcaQ74ddtNG58THaS7jwyv8BJO1ZCnGeVlWkfPnWq-BuZ9iz6MZLlkZHFq9kT2QWGHwkPgKYPsRID0TCOCnu1_KdBp-HkoReHk7GjJp7n0',
  foodEvidenceHero:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAUvF4NDlfcSGtAikDLrYhg7AYBUA4H4b1dlIwvlmjjTlYsKnn3G6UCwP2e6AW-Y6o3ZyDqyDBXBRuDA5FSvjKc-yjepdBd-Fk62KQZ5oIie4nlUzgp_UUJhlNDusFQ-N',
  todayHero:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBXkSQqMx1BhXu5w-QeFjGg-_bdHRBP2HiGo87HfsBibD0L0qcn-zc_q-1C078pEYyjy1I3SpfIfLWh5lmMgDJe-FVsrKVf_93UWW_WkeKCBStB3VIDkwPYet7pv1iSg9',
  patternsHero:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD_BoUwFzr0SA6mf-t0NM6QFhKyarQupYOAQqEAsQ36lTZuiFCaFgDyw1NSMPq3e_A0x_w8F8Edalf9ig5GYT1YeiF1alWHcIL8Cw_oLqq28oGQhh9BMXZcBpNXpGEmj5',
};

export function StitchHeader({ title, left = 'arrow-left', right }: { title: string; left?: keyof typeof MaterialCommunityIcons.glyphMap; right?: keyof typeof MaterialCommunityIcons.glyphMap }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.headerIcon} accessibilityRole="button">
        <MaterialCommunityIcons name={left} size={24} color={colors.onSurfaceVariant} />
      </Pressable>
      <Text variant="titleLarge" style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerIcon}>{right ? <MaterialCommunityIcons name={right} size={24} color={colors.onSurfaceVariant} /> : null}</View>
    </View>
  );
}

export function StitchHero({ uri, label, height = 192 }: { uri: string; label?: string; height?: number }) {
  return (
    <View style={[styles.hero, { height }]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      {label ? (
        <View style={styles.heroLabel}>
          <Text variant="labelMedium" style={styles.heroLabelText}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function StitchCard({ children, variant = 'white', style }: PropsWithChildren<{ variant?: 'white' | 'low'; style?: object }>) {
  return <View style={[styles.card, variant === 'low' && styles.lowCard, style]}>{children}</View>;
}

export function SectionLabel({ children }: PropsWithChildren) {
  return <Text variant="labelLarge" style={styles.sectionLabel}>{children}</Text>;
}

export function IconBubble({ icon, tone = 'neutral' }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'error' }) {
  const bg = tone === 'primary' ? '#d4e3ff' : tone === 'success' ? '#a0f399' : tone === 'warning' ? '#ffddb5' : tone === 'error' ? '#ffdad6' : colors.surfaceContainerHighest;
  const fg = tone === 'primary' ? colors.primary : tone === 'success' ? colors.secondary : tone === 'warning' ? colors.tertiary : tone === 'error' ? colors.error : colors.onSurfaceVariant;
  return (
    <View style={[styles.iconBubble, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={icon} size={22} color={fg} />
    </View>
  );
}

export function ConfidenceBadge({ label = 'High', tone = 'success' }: { label?: string; tone?: 'success' | 'warning' | 'error' | 'primary' }) {
  const bg = tone === 'success' ? colors.secondaryContainer : tone === 'warning' ? '#ffddb5' : tone === 'error' ? '#ffdad6' : colors.primaryFixed;
  const fg = tone === 'success' ? colors.onSecondaryContainer : tone === 'warning' ? colors.tertiary : tone === 'error' ? colors.error : colors.primary;
  const icon = tone === 'warning' ? 'alert' : 'check-circle';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={icon} size={13} color={fg} />
      <Text variant="labelSmall" style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function PrimaryPillButton({ label, icon = 'check', onPress }: { label: string; icon?: keyof typeof MaterialCommunityIcons.glyphMap; onPress?: () => void }) {
  return (
    <Pressable style={styles.primaryPill} accessibilityRole="button" onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.onPrimary} />
      <Text variant="labelLarge" style={styles.primaryPillText}>{label}</Text>
    </Pressable>
  );
}

export function OutlinePillButton({ label, icon = 'pencil', onPress }: { label: string; icon?: keyof typeof MaterialCommunityIcons.glyphMap; onPress?: () => void }) {
  return (
    <Pressable style={styles.outlinePill} accessibilityRole="button" onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      <Text variant="labelLarge" style={styles.outlinePillText}>{label}</Text>
    </Pressable>
  );
}

export function BottomActions({ children }: PropsWithChildren) {
  return <View style={styles.bottomActions}>{children}</View>;
}

export function MetricTile({ label, value, unit, icon, tone = 'primary' }: { label: string; value: string | number; unit?: string; icon?: keyof typeof MaterialCommunityIcons.glyphMap; tone?: 'primary' | 'success' | 'warning' | 'error' }) {
  return (
    <StitchCard style={styles.metricTile}>
      {icon ? <IconBubble icon={icon} tone={tone} /> : null}
      <Text variant="labelMedium" style={styles.muted}>{label}</Text>
      <Text variant="headlineSmall" style={styles.metricValue}>{value}</Text>
      {unit ? <Text variant="bodySmall" style={styles.muted}>{unit}</Text> : null}
    </StitchCard>
  );
}

export function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.progressRow}>
      <View style={styles.rowBetween}>
        <Text variant="bodyMedium" style={styles.progressLabel}>{label}</Text>
        <Text variant="labelLarge" style={styles.progressValue}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(value * 100)}%` }]} />
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface, width: '100%', maxWidth: 430, alignSelf: 'center' },
  content: { paddingHorizontal: spacing.screenEdge, gap: spacing.lg, paddingBottom: 112 },
  header: { height: 64, paddingHorizontal: spacing.screenEdge, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.primary, fontWeight: '700' },
  hero: { width: '100%', borderRadius: 24, overflow: 'hidden', backgroundColor: colors.surfaceContainerHigh, marginBottom: 0 },
  heroLabel: { position: 'absolute', left: spacing.md, bottom: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.88)' },
  heroLabelText: { color: colors.primary, fontWeight: '700' },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 24, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(193,198,211,0.35)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 2 },
  lowCard: { backgroundColor: colors.surfaceContainerLow },
  sectionLabel: { color: colors.outline, fontWeight: '700', letterSpacing: 0.56, textTransform: 'uppercase' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBubble: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontWeight: '700' },
  muted: { color: colors.onSurfaceVariant },
  primaryPill: { minHeight: 48, borderRadius: 999, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg },
  primaryPillText: { color: colors.onPrimary, fontWeight: '700' },
  outlinePill: { minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg },
  outlinePillText: { color: colors.primary, fontWeight: '700' },
  bottomActions: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(247,249,251,0.96)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(193,198,211,0.35)', padding: spacing.screenEdge, gap: spacing.sm },
  metricTile: { flex: 1, alignItems: 'center', gap: 4, padding: spacing.sm },
  metricValue: { color: colors.primary, fontWeight: '800' },
  progressRow: { gap: 8 },
  progressLabel: { color: colors.onSurface },
  progressValue: { color: colors.primary, fontWeight: '700' },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: colors.surfaceContainerHigh, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primaryContainer },
});
