import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, TypeScale } from '@/constants/theme';
import { TabBar } from '@/components/TabBar';
import { BloomFlower } from '@/components/BloomFlower';
import { PaperBackground } from '@/components/PaperBackground';

const SETTINGS = [
  { section: 'Sensor', items: ['CGM Connection', 'Target Range', 'Alert Thresholds'] },
  { section: 'Sato AI', items: ['Learning Preferences', 'Pattern Sensitivity', 'Notification Style'] },
  { section: 'Privacy', items: ['Data Sharing', 'Export My Data', 'Delete History'] },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <PaperBackground>
      <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile hero */}
        <View style={styles.profileHero}>
          <View style={styles.avatarWrap}>
            <BloomFlower
              petal1={Colors.bloom.mornings.petal1}
              petal2={Colors.bloom.mornings.petal2}
              petal3={Colors.bloom.mornings.petal3}
              size={80}
            />
          </View>
          <Text style={styles.name}>Russell</Text>
          <Text style={styles.dx}>T1D since 2018 · Dexcom G7</Text>

          <View style={styles.statRow}>
            {[
              { label: 'Patterns found', value: '12' },
              { label: 'Days tracked', value: '247' },
              { label: 'Avg TIR', value: '71%' },
            ].map(({ label, value }) => (
              <View key={label} style={styles.stat}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Settings sections */}
        {SETTINGS.map(({ section, items }) => (
          <View key={section} style={styles.settingsGroup}>
            <Text style={styles.settingsSection}>{section}</Text>
            {items.map((item) => (
              <TouchableOpacity key={item} style={styles.settingsRow}>
                <Text style={styles.settingsItem}>{item}</Text>
                <Text style={styles.settingsChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <Text style={styles.version}>Sato v1.0 · Not a medical device</Text>
      </ScrollView>

      <TabBar active="profile" onPress={(tab) => {
        if (tab === 'discover') router.replace('/');
        else if (tab !== 'profile') router.replace(`/(tabs)/${tab}`);
      }} />
      </View>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  scroll: { paddingHorizontal: Spacing.xxl, gap: Spacing.xl },

  profileHero: { alignItems: 'center', paddingTop: Spacing.xxl },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.bloom.mornings.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  name: { ...TypeScale.display, fontSize: 28, color: Colors.ink },
  dx: { ...TypeScale.caption, color: Colors.softStone, marginTop: 3, marginBottom: Spacing.xl },

  statRow: {
    flexDirection: 'row',
    gap: Spacing.xxl,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    width: '100%',
    justifyContent: 'center',
  },
  stat: { alignItems: 'center' },
  statValue: { ...TypeScale.heroTitle, fontSize: 26, color: Colors.ink },
  statLabel: { ...TypeScale.caption, fontSize: 11, color: Colors.softStone, marginTop: 2 },

  settingsGroup: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.015,
    shadowRadius: 18,
    elevation: 1,
    overflow: 'hidden',
  },
  settingsSection: {
    ...TypeScale.label,
    color: Colors.softStone,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
  },
  settingsItem: { ...TypeScale.body, color: Colors.ink },
  settingsChevron: { fontSize: 20, color: Colors.softStone },

  version: { ...TypeScale.caption, fontSize: 11, color: Colors.softStone, textAlign: 'center', marginTop: Spacing.sm },
});
