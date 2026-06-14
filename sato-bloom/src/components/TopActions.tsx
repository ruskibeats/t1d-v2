import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useNavigation } from '../navigation/NavigationProvider';

export function TopActions() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { top: insets.top + 12 }]}>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => nav.openProfile()}
      >
        <Feather name="user" size={22} color={Colors.ink} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => nav.openNotifications()}
      >
        <Ionicons name="notifications-outline" size={24} color={Colors.ink} />
        <View style={styles.bellDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
  },
  actionButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D97748',
    position: 'absolute',
    top: 6,
    right: 8,
  },
});
