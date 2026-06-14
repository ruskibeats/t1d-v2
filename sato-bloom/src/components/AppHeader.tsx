import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Fonts, Colors, Spacing } from '@/constants/theme';

export function AppHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image 
          source={require('../../assets/sato_logo_mark.png')} 
          style={styles.logoImage} 
          resizeMode="contain"
          fadeDuration={0}
        />
        <Text style={styles.logoText}>Sato</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  logoText: {
    fontFamily: Fonts.serifSemiBold,
    fontWeight: 'bold',
    color: Colors.ink,
    fontSize: 38,
    lineHeight: 42,
    marginLeft: 4,
  },
});
