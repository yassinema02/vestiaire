import { Platform, ViewStyle } from 'react-native';

export const palette = {
  canvas: '#F8F6F0', // Blanc Cassé
  canvasMuted: '#E6D7C3', // Beige Chaud
  canvasStrong: '#DCD1B8',
  surface: '#FFFFFF', // Clean contrast for cards
  surfaceRaised: '#F9F7EE', // Almond
  surfaceInverse: '#1F2937', // Noir Charbon
  line: '#E2D9C5',
  lineStrong: '#CDBF9E',
  text: '#1F2937', // Noir Charbon
  textMuted: '#64748B', // Bleu Ardoise (muted/secondary)
  textSoft: '#9CA3AF',
  accent: '#87A96B', // Vert Sage (Vestiaire Green)
  accentDeep: '#6C8065',
  accentSoft: '#DCE3D9', // Very soft sage background
  forest: '#87A96B', // Sage Green
  forestSoft: '#E8EBE6',
  gold: '#F7E7CE', // Or Champagne
  goldSoft: '#FCF5E8',
  danger: '#D2691E', // Terracotta
  success: '#87A96B', // Vert Sage
  white: '#FFFFFF',
  overlay: 'rgba(31, 41, 55, 0.15)', // Noir Charbon with opacity
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
  serif: 'SourceSerifPro_600SemiBold',
  serifRegular: 'SourceSerifPro_400Regular',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansBold: 'Inter_600SemiBold',
  // Backward compatibility aliases
  display: 'SourceSerifPro_600SemiBold',
  displayRegular: 'SourceSerifPro_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_600SemiBold',
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
