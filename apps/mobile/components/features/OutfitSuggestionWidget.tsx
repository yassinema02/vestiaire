/**
 * OutfitSuggestionWidget Component
 * Home screen widget for AI outfit suggestions
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { OutfitCard } from './OutfitCard';
import { useOutfitGeneration } from '../../hooks/useOutfitGeneration';
import { itemsService, WardrobeItem } from '../../services/items';
import PaywallModal from '../PaywallModal';
import { appTheme } from '../../theme/tokens';

interface OutfitSuggestionWidgetProps {
  onAddItemsPress?: () => void;
}

const MIN_ITEMS_FOR_GENERATION = 3;

export const OutfitSuggestionWidget: React.FC<OutfitSuggestionWidgetProps> = ({
  onAddItemsPress,
}) => {
  const router = useRouter();
  const {
    suggestions,
    isLoading,
    error,
    isFromAI,
    limitStatus,
    generate,
    regenerate,
    saveSuggestion,
    refreshLimitStatus,
  } = useOutfitGeneration();

  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [hasEnoughItems, setHasEnoughItems] = useState(true);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Load wardrobe items and check count
  useEffect(() => {
    const loadItems = async () => {
      const { items } = await itemsService.getItems();
      const completeItems = items.filter(i => i.status === 'complete');
      console.log('[OutfitWidget] Items loaded:', items.length, 'complete:', completeItems.length);
      setWardrobeItems(items);
      setHasEnoughItems(completeItems.length >= MIN_ITEMS_FOR_GENERATION);
    };
    loadItems();
  }, []);

  // Auto-generate on first load if we have enough items
  useEffect(() => {
    console.log('[OutfitWidget] State:', {
      hasEnoughItems,
      hasGenerated,
      suggestionsCount: suggestions.length,
      isLoading,
      error,
    });
    if (hasEnoughItems && !hasGenerated && suggestions.length === 0 && !isLoading) {
      console.log('[OutfitWidget] Triggering generate...');
      setHasGenerated(true);
      generate();
    }
  }, [hasEnoughItems, hasGenerated, suggestions.length, isLoading, error, generate]);

  // Show paywall when limit is reached after a generate attempt
  useEffect(() => {
    if (limitStatus && !limitStatus.allowed && !limitStatus.isPremium) {
      setShowPaywall(true);
    }
  }, [limitStatus]);

  // Refresh limit status on mount
  useEffect(() => {
    refreshLimitStatus();
  }, [refreshLimitStatus]);

  const handleRegenerate = useCallback(() => {
    setSavedIndices(new Set());
    regenerate();
  }, [regenerate]);

  const handleSave = useCallback(
    async (index: number) => {
      if (savingIndex !== null || savedIndices.has(index)) return;

      setSavingIndex(index);
      const success = await saveSuggestion(suggestions[index]);
      setSavingIndex(null);

      if (success) {
        setSavedIndices(prev => new Set([...prev, index]));
      }
    },
    [suggestions, saveSuggestion, savingIndex, savedIndices]
  );

  const handleItemPress = useCallback(
    (itemId: string) => {
      router.push({
        pathname: '/(tabs)/item-detail',
        params: { id: itemId },
      });
    },
    [router]
  );

  const handleAddItems = useCallback(() => {
    if (onAddItemsPress) {
      onAddItemsPress();
    } else {
      router.push('/(tabs)/add');
    }
  }, [router, onAddItemsPress]);

  // Not enough items state
  if (!hasEnoughItems) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Today&apos;s Outfit</Text>
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="shirt-outline" size={48} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>Add more items</Text>
          <Text style={styles.emptySubtitle}>
            Add at least {MIN_ITEMS_FOR_GENERATION} items to your wardrobe to get AI-powered outfit
            suggestions
          </Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddItems}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Items</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading state
  if (isLoading && suggestions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Today&apos;s Outfit</Text>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#A04F37" />
          <Text style={styles.loadingText}>Generating outfit ideas...</Text>
          <Text style={styles.loadingSubtext}>
            Analyzing your wardrobe and today&apos;s context
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && suggestions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Today&apos;s Outfit</Text>
        <View style={styles.errorCard}>
          <Ionicons name="cloud-offline-outline" size={48} color="#f87171" />
          <Text style={styles.errorTitle}>Couldn&apos;t generate outfits</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRegenerate}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show first suggestion (or empty state)
  const primarySuggestion = suggestions[0];

  if (!primarySuggestion) {
    // No suggestions yet - show a prompt to generate
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Today&apos;s Outfit</Text>
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="sparkles-outline" size={48} color="#A04F37" />
          </View>
          <Text style={styles.emptyTitle}>Ready for outfit ideas?</Text>
          <Text style={styles.emptySubtitle}>
            Tap the button below to get AI-powered outfit suggestions based on your wardrobe and
            today&apos;s weather.
          </Text>
          <TouchableOpacity style={styles.addButton} onPress={generate}>
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Generate Outfit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Today&apos;s Outfit</Text>
        <View style={styles.headerRight}>
          {limitStatus && !limitStatus.isPremium && (
            <View style={styles.usageCounter}>
              <Ionicons name="sparkles" size={12} color="#A04F37" />
              <Text style={styles.usageCounterText}>
                {limitStatus.used}/{limitStatus.limit}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.regenerateButton}
            onPress={handleRegenerate}
            disabled={isLoading}
          >
            <Ionicons name="refresh" size={18} color={isLoading ? '#9ca3af' : '#A04F37'} />
            <Text style={[styles.regenerateText, isLoading && styles.regenerateTextDisabled]}>
              {isLoading ? 'Generating...' : 'Regenerate'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isFromAI && (
        <View style={styles.fallbackBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
          <Text style={styles.fallbackText}>Quick match • Enable AI for smarter suggestions</Text>
        </View>
      )}

      <OutfitCard
        suggestion={primarySuggestion}
        wardrobeItems={wardrobeItems}
        onSave={() => handleSave(0)}
        onItemPress={handleItemPress}
        isSaving={savingIndex === 0}
        isSaved={savedIndices.has(0)}
      />

      {suggestions.length > 1 && (
        <Text style={styles.moreText}>
          +{suggestions.length - 1} more suggestion{suggestions.length > 2 ? 's' : ''} available
        </Text>
      )}

      <PaywallModal
        visible={showPaywall}
        onDismiss={() => setShowPaywall(false)}
        feature="ai_suggestions"
        used={limitStatus?.used ?? 0}
        limit={limitStatus?.limit ?? 3}
        resetAt={limitStatus?.resetAt ?? null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: appTheme.palette.text,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usageCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: appTheme.palette.accentSoft,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  usageCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: appTheme.palette.accent,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: appTheme.palette.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.22)',
  },
  regenerateText: {
    fontSize: 13,
    fontWeight: '500',
    color: appTheme.palette.accent,
  },
  regenerateTextDisabled: {
    color: appTheme.palette.textSoft,
  },
  fallbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: appTheme.palette.canvas,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  fallbackText: {
    fontSize: 12,
    color: appTheme.palette.textMuted,
  },
  moreText: {
    fontSize: 13,
    color: appTheme.palette.accent,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  // Empty state
  emptyCard: {
    backgroundColor: appTheme.palette.surfaceRaised,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.22)',
    ...appTheme.shadows.card,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: appTheme.palette.canvas,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: appTheme.palette.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: appTheme.palette.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: appTheme.palette.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  addButtonText: {
    color: appTheme.palette.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  // Loading state
  loadingCard: {
    backgroundColor: appTheme.palette.surfaceRaised,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(181, 150, 120, 0.22)',
    ...appTheme.shadows.card,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: appTheme.palette.text,
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: appTheme.palette.textMuted,
    marginTop: 4,
  },
  // Error state
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 4,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#A04F37',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
