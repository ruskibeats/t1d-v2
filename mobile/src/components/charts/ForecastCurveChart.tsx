import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { ForecastPoint } from '@/types/mobileCard';

function buildPath(points: ForecastPoint[], width: number, height: number): string {
  if (points.length === 0) return '';
  const minX = Math.min(...points.map((point) => point.minute));
  const maxX = Math.max(...points.map((point) => point.minute));
  const minY = Math.min(...points.map((point) => point.mgDl)) - 10;
  const maxY = Math.max(...points.map((point) => point.mgDl)) + 10;
  const xScale = (minute: number) => ((minute - minX) / Math.max(1, maxX - minX)) * width;
  const yScale = (mgDl: number) => height - ((mgDl - minY) / Math.max(1, maxY - minY)) * height;

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xScale(point.minute).toFixed(1)} ${yScale(point.mgDl).toFixed(1)}`)
    .join(' ');
}

export function ForecastCurveChart({
  points,
  peakMgDl,
}: {
  points: ForecastPoint[];
  peakMgDl: number;
}) {
  const width = 320;
  const height = 140;
  const path = buildPath(points, width, height);
  const peak = points.reduce<ForecastPoint | undefined>((best, point) => {
    if (!best || point.mgDl > best.mgDl) return point;
    return best;
  }, undefined);

  const peakIndex = peak ? points.indexOf(peak) : -1;
  const peakX = peakIndex >= 0 ? (peakIndex / Math.max(1, points.length - 1)) * width : width / 2;
  const peakY = 24;

  return (
    <Svg width="100%" height={height + 28} viewBox={`0 0 ${width} ${height + 28}`} accessibilityLabel={`Forecast curve with peak ${peakMgDl} milligrams per deciliter`}>
      <Rect x="0" y="0" width={width} height={height} rx="14" fill="#F3F4F5" />
      <Line x1="0" y1={height - 34} x2={width} y2={height - 34} stroke="#BFC8C9" strokeDasharray="4 4" />
      <Path d={path} fill="none" stroke="#004349" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {peak ? <Circle cx={peakX} cy={peakY} r="5" fill="#BA1A1A" /> : null}
      <SvgText x="8" y={height + 18} fontSize="11" fill="#6F797A">Now</SvgText>
      <SvgText x={width - 48} y={height + 18} fontSize="11" fill="#6F797A">+180m</SvgText>
    </Svg>
  );
}
