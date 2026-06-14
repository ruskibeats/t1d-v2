import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Text as SvgText, Circle } from 'react-native-svg';
import { View } from 'react-native';
import { Colors } from '@/constants/theme';

interface SparklineProps {
  data: number[]; // normalised 0–1
  labels: string[];
  color: string;
  width?: number;
  height?: number;
  showPeak?: boolean;
}

export function GlucoseSparkline({
  data,
  labels,
  color,
  width = 320,
  height = 100,
  showPeak = true,
}: SparklineProps) {
  const padLeft = 28;
  const padRight = 8;
  const padTop = 12;
  const padBottom = 24;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = data.map((v, i) => ({
    x: padLeft + (i / (data.length - 1)) * chartW,
    y: padTop + (1 - v) * chartH,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x.toFixed(1)},${(padTop + chartH).toFixed(1)}` +
    ` L ${points[0].x.toFixed(1)},${(padTop + chartH).toFixed(1)} Z`;

  const peakIdx = data.indexOf(Math.max(...data));
  const peak = points[peakIdx];

  // Show a subset of labels to avoid crowding
  const labelStep = Math.ceil(labels.length / 4);
  const visibleLabels = labels.map((l, i) => ({ label: l, x: points[i].x, show: i % labelStep === 0 || i === labels.length - 1 }));

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.25} />
            <Stop offset="1" stopColor={color} stopOpacity={0.03} />
          </LinearGradient>
        </Defs>

        {/* Baseline */}
        <Line
          x1={padLeft} y1={padTop + chartH}
          x2={padLeft + chartW} y2={padTop + chartH}
          stroke={Colors.border} strokeWidth={1}
        />
        {/* Mid line */}
        <Line
          x1={padLeft} y1={padTop + chartH / 2}
          x2={padLeft + chartW} y2={padTop + chartH / 2}
          stroke={Colors.borderLight} strokeWidth={0.5} strokeDasharray="3,3"
        />

        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <Path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Peak marker */}
        {showPeak && peak && (
          <>
            <Line
              x1={peak.x} y1={peak.y - 4}
              x2={peak.x} y2={padTop + chartH}
              stroke={Colors.ink} strokeWidth={0.8} strokeDasharray="2,2" opacity={0.3}
            />
            <Circle cx={peak.x} cy={peak.y} r={3} fill={color} stroke={Colors.card} strokeWidth={1.5} />
          </>
        )}

        {/* Time labels */}
        {visibleLabels.filter(l => l.show).map((l, i) => (
          <SvgText
            key={i}
            x={l.x}
            y={height - 4}
            fontSize={8}
            fill={Colors.softStone}
            textAnchor="middle"
            fontFamily="System"
          >
            {l.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
