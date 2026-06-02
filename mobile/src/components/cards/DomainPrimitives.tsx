import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, Text, useTheme } from 'react-native-paper';
import type { ConfidenceTier, DataMode, DataSource } from '@/types/mobileCard';

export function ScreenContainer({ children }: PropsWithChildren) {
  return <View style={styles.screen}>{children}</View>;
}

export function DomainCard({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium">{title}</Text>
        {subtitle ? (
          <Text variant="bodySmall" style={styles.muted}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.cardBody}>{children}</View>
      </Card.Content>
    </Card>
  );
}

export function ConfidencePill({ tier }: { tier?: ConfidenceTier }) {
  const theme = useTheme();
  const label = tier ?? 'unknown';
  const color = label === 'high' ? '#2E7D32' : label === 'medium' ? '#B26A00' : label === 'low' ? theme.colors.error : theme.colors.outline;

  return <Chip compact textStyle={{ color }}>{label.toUpperCase()}</Chip>;
}

export function DataSourcePill({ source, label }: { source?: DataSource; label?: string }) {
  const text = label ?? source?.replace(/_/g, ' ') ?? 'unknown source';
  return <Chip compact icon="database">{text}</Chip>;
}

export function DemoModeBanner({ dataMode, sourceLabel }: { dataMode: DataMode; sourceLabel: string }) {
  if (dataMode !== 'synthetic_demo') return null;

  return (
    <View style={styles.demoBanner}>
      <Text variant="labelLarge" style={styles.demoText}>
        DEMO DATA · {sourceLabel}
      </Text>
    </View>
  );
}

export function SafetyNotice({ label }: { label: string }) {
  return (
    <View style={styles.safety}>
      <Text variant="bodySmall" style={styles.safetyText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  cardBody: {
    marginTop: 12,
    gap: 8,
  },
  muted: {
    color: '#5F6B6D',
    marginTop: 2,
  },
  demoBanner: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFB703',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  demoText: {
    color: '#6B4D00',
  },
  safety: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 12,
  },
  safetyText: {
    color: '#5F4B00',
  },
});
