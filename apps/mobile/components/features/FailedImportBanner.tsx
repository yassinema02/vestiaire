/**
 * FailedImportBanner
 * Shows on the home screen when outfit photo extraction failed for some items.
 * Suggests the user retry with individual photos.
 */

import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useExtractionStore } from '../../stores/extractionStore';
import { Text } from '../ui/Typography';

export function FailedImportBanner() {
  const { failedExtractionItems, dismissFailedItems } = useExtractionStore();

  if (failedExtractionItems.length === 0) return null;

  const itemNames = failedExtractionItems.map(i => i.name);
  const displayNames = itemNames.length <= 3
    ? itemNames.join(', ')
    : `${itemNames.slice(0, 2).join(', ')} and ${itemNames.length - 2} more`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="alert-circle" size={20} color="#92400e" />
        <Text style={styles.title}>
          {failedExtractionItems.length} item{failedExtractionItems.length !== 1 ? 's' : ''} couldn't be imported
        </Text>
        <TouchableOpacity onPress={dismissFailedItems} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color="#92400e" />
        </TouchableOpacity>
      </View>
      <Text style={styles.items}>{displayNames}</Text>
      <Text style={styles.hint}>
        Try taking a photo of each item by itself, or use a different outfit photo where items are more visible.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  items: {
    fontSize: 13,
    color: '#b45309',
    fontWeight: '500',
    paddingLeft: 28,
  },
  hint: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
    paddingLeft: 28,
  },
});
