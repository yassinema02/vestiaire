import { Platform, ViewStyle } from 'react-native';

export const palette = {
  canvas: '#F6F0E8',
  canvasMuted: '#E8D8C9',
  canvasStrong: '#D8C0A8',
  surface: '#FFF9F3',
  surfaceRaised: '#FFFCF8',
  surfaceInverse: '#2C221D',
  line: '#D9C7B4',
  lineStrong: '#B59678',
  text: '#241B17',
  textMuted: '#7C6656',
  textSoft: '#A08775',
  accent: '#A04F37',
  accentDeep: '#7D3825',
  accentSoft: '#EBC8B5',
  forest: '#365246',
  forestSoft: '#C8D8CF',
  gold: '#C49A58',
  goldSoft: '#F4E3BF',
  danger: '#B4483A',
  success: '#3F6B57',
  white: '#FFFFFF',
  overlay: 'rgba(36, 27, 23, 0.14)',
};

export const editorial = {
  bg: '#0C0F1A',
  bgRaised: '#121728',
  surface: '#151929',
  surfaceRaised: '#1C2238',
  surfaceSoft: '#232A43',
  border: '#2A3150',
  borderSoft: 'rgba(139, 147, 176, 0.20)',
  text: '#E8EAF0',
  textMuted: '#9AA3C4',
  textSoft: '#707A9D',
  accent: '#B48CFF',
  accentStrong: '#9C72F6',
  accentSoft: 'rgba(180, 140, 255, 0.16)',
  warm: '#F5C77E',
  warmSoft: 'rgba(245, 199, 126, 0.16)',
  green: '#6EE7A8',
  greenSoft: 'rgba(110, 231, 168, 0.16)',
  rose: '#F0A0B8',
  roseSoft: 'rgba(240, 160, 184, 0.16)',
  shadow: 'rgba(5, 8, 18, 0.60)',
};

export const radii = {
  xs: 10,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const typography = {
  display: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia',
  }),
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
};

export const shadows = {
  card: {
    shadowColor: '#6C5646',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  } satisfies ViewStyle,
  float: {
    shadowColor: '#4D3A2D',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  } satisfies ViewStyle,
};

export const editorialShadows = {
  card: {
    shadowColor: '#050812',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.34,
    shadowRadius: 30,
    elevation: 16,
  } satisfies ViewStyle,
  glow: {
    shadowColor: '#7E5CD8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 10,
  } satisfies ViewStyle,
};

export const appTheme = {
  palette,
  editorial,
  radii,
  spacing,
  typography,
  shadows,
  editorialShadows,
};

export function alpha(hex: string, opacity: string) {
  return `${hex}${opacity}`;
}
