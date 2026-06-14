import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export function WatercolorTrace({ color, children, style }: { color: string, children: React.ReactNode, style?: any }) {
  return (
    <View style={[styles.container, style]}>
      <Svg
        style={styles.svg}
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
      >
        {/* Layer 1: soft outer wash */}
        <Path
          d="M2,12 C10,5 30,3 60,4 C80,5 98,9 96,13 C94,17 75,16 45,17 C20,18 8,16 2,12 Z"
          fill={color}
          opacity={0.16}
        />
        {/* Layer 2: slightly darker center smear */}
        <Path
          d="M8,13 C18,8 40,6 68,7 C80,8 88,11 86,13 C84,15 65,14 40,15 C18,16 12,15 8,13 Z"
          fill={color}
          opacity={0.10}
        />
      </Svg>
      <View style={styles.textContainer}>
        {children}
      </View>
    </View>
  );
}

export function BrushTrace({ color, width = 56, height = 16, style }: { color: string, width?: number, height?: number, style?: any }) {
  return (
    <View style={style}>
      <Svg
        width={width}
        height={height}
        viewBox="0 0 56 16"
        preserveAspectRatio="none"
      >
        {/* Layer 1: Organic brush stroke path */}
        <Path
          d="M2,9 C10,4 25,3 42,4 C48,4.5 54,6 53,9 C52,12 38,11 25,12 C12,13 5,11 2,9 Z"
          fill={color}
          opacity={0.18}
        />
        {/* Layer 2: Core smear */}
        <Path
          d="M6,10 C15,6 30,5 45,6 C49,6.5 51,8 50,10 C49,12 35,11 22,12 C10,13 7,12 6,10 Z"
          fill={color}
          opacity={0.12}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  textContainer: {
    zIndex: 1,
  },
});
