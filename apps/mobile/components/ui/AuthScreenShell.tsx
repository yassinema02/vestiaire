import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { appTheme } from '../../theme/tokens';

interface AuthScreenShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthScreenShell({
  eyebrow,
  title,
  subtitle,
  icon,
  children,
  footer,
}: AuthScreenShellProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>{eyebrow}</Text>
          </View>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <View style={styles.heroIcon}>
                <Ionicons name={icon} size={22} color={appTheme.palette.accent} />
              </View>
              <Text style={styles.title}>{title}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.card}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appTheme.palette.canvas,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 18,
  },
  hero: {
    backgroundColor: appTheme.palette.surfaceRaised,
    borderRadius: appTheme.radii.xl,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.20)',
    ...appTheme.shadows.card,
  },
  brandBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: appTheme.radii.pill,
    backgroundColor: appTheme.palette.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(160, 79, 55, 0.12)',
    marginBottom: 18,
  },
  brandBadgeText: {
    color: appTheme.palette.accentDeep,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 14,
  },
  heroCopy: {
    flex: 1,
    gap: 12,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(160, 79, 55, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(160, 79, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: appTheme.palette.text,
    fontFamily: appTheme.typography.display,
    fontSize: 38,
    lineHeight: 44,
  },
  subtitle: {
    color: appTheme.palette.textMuted,
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 320,
  },
  card: {
    backgroundColor: appTheme.palette.surface,
    borderRadius: appTheme.radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.22)',
    padding: 22,
    gap: 16,
    ...appTheme.shadows.card,
  },
  footer: {
    paddingHorizontal: 6,
  },
});
