/**
 * Bulk Upload Screen
 * Multi-phase: selection → upload → detection → bg removal → complete
 * Story 10.1: Bulk Photo Upload
 * Story 10.2: Multi-Item Detection
 * Story 10.3: Background Removal for Extracted Items
 * Story 10.6: Extraction Progress & Feedback
 */

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Platform,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useExtractionStore } from '../../stores/extractionStore';
import { bulkUploadService } from '../../services/bulkUploadService';
import { batchBgRemovalService } from '../../services/batchBgRemovalService';
import {
  getStatusMessage,
  getDetailMessage,
  getEstimatedTimeRemaining,
  getFunFact,
  ExtractionPhase,
} from '../../utils/extractionMessages';

export default function BulkUploadScreen() {
  const router = useRouter();
  const {
    selectedPhotos,
    uploadProgress,
    isUploading,
    isProcessing,
    processingProgress,
    isBgRemoving,
    bgRemovalProgress,
    currentJob,
    detectedItems,
    processedItems,
    categorySummary,
    error,
    retryCount,
    selectPhotos,
    clearSelection,
    startUpload,
    setBackgrounded,
    retryFailedPhotos,
    skipFailedPhotos,
    reset,
  } = useExtractionStore();

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [funFactTick, setFunFactTick] = useState(0);

  // Mark as not backgrounded when screen is visible
  useEffect(() => {
    setBackgrounded(false);
    const state = useExtractionStore.getState();
    if (state.completionPending) {
      useExtractionStore.setState({ completionPending: false });
    }
  }, []);

  // Determine current phase
  const phase = (() => {
    if (processedItems && !isBgRemoving) return 'complete';
    if (isBgRemoving) return 'bgRemoval';
    if (currentJob?.status === 'failed') return 'complete';
    if (isProcessing || currentJob?.status === 'processing') return 'processing';
    if (currentJob && !isProcessing && currentJob.status === 'pending') return 'processing';
    if (detectedItems && !processedItems && !isBgRemoving) return 'processing';
    if (isUploading) return 'uploading';
    return 'selection';
  })();

  const isActiveProcessing = phase === 'uploading' || phase === 'processing' || phase === 'bgRemoval';

  // Pulsing animation during active processing
  useEffect(() => {
    if (!isActiveProcessing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isActiveProcessing]);

  // Animate progress bar width
  const currentPercentage = (() => {
    if (phase === 'uploading') return uploadProgress?.percentage ?? 0;
    if (phase === 'processing' && processingProgress && processingProgress.total > 0)
      return Math.round((processingProgress.processed / processingProgress.total) * 100);
    if (phase === 'bgRemoval' && bgRemovalProgress && bgRemovalProgress.total > 0)
      return Math.round((bgRemovalProgress.processed / bgRemovalProgress.total) * 100);
    return 0;
  })();

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentPercentage,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentPercentage]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  // Fun fact rotation every 5s during processing
  useEffect(() => {
    if (!isActiveProcessing) return;
    const interval = setInterval(() => setFunFactTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, [isActiveProcessing]);

  const estimatedTime =
    currentJob
      ? bulkUploadService.getEstimatedTime(currentJob.total_photos)
      : selectedPhotos.length > 0
        ? bulkUploadService.getEstimatedTime(selectedPhotos.length)
        : null;

  // Handle "Continue using app" — navigate to wardrobe, processing continues in store
  const handleBackground = () => {
    setBackgrounded(true);
    router.push('/(tabs)/wardrobe');
  };

  // --- Phase: Selection ---
  const renderSelection = () => (
    <View style={styles.phaseContainer}>
      <Text style={styles.phaseTitle}>Select photos with your outfits</Text>

      {selectedPhotos.length > 0 && (
        <View style={styles.selectionHeader}>
          <Text style={styles.selectionCount}>
            {selectedPhotos.length}/50 photos selected
          </Text>
          <TouchableOpacity onPress={clearSelection}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedPhotos.length > 0 ? (
        <FlatList
          data={selectedPhotos}
          keyExtractor={(_, i) => i.toString()}
          numColumns={3}
          contentContainerStyle={styles.thumbnailGrid}
          columnWrapperStyle={styles.thumbnailRow}
          renderItem={({ item }) => (
            <View style={styles.thumbnailContainer}>
              <Image source={{ uri: item }} style={styles.thumbnail} />
              <View style={styles.checkOverlay}>
                <Ionicons name="checkmark-circle" size={20} color="#6366f1" />
              </View>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptySelection}>
          <Ionicons name="images-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>
            Tap below to select photos from your gallery
          </Text>
        </View>
      )}

      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.selectButton} onPress={selectPhotos}>
          <Ionicons name="images" size={20} color="#6366f1" />
          <Text style={styles.selectButtonText}>
            {selectedPhotos.length > 0 ? 'Change Selection' : 'Select Photos'}
          </Text>
        </TouchableOpacity>

        {selectedPhotos.length > 0 && (
          <>
            {estimatedTime && (
              <Text style={styles.estimateText}>
                Processing will take {estimatedTime}
              </Text>
            )}
            <TouchableOpacity style={styles.primaryButton} onPress={startUpload}>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Upload & Analyze</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  // --- Shared Progress Renderer ---
  const renderProgress = (progressPhase: ExtractionPhase) => {
    const progress = (() => {
      if (progressPhase === 'upload')
        return { done: uploadProgress?.uploaded ?? 0, total: uploadProgress?.total ?? selectedPhotos.length };
      if (progressPhase === 'detection')
        return { done: processingProgress?.processed ?? 0, total: processingProgress?.total ?? currentJob?.total_photos ?? 0 };
      return { done: bgRemovalProgress?.processed ?? 0, total: bgRemovalProgress?.total ?? 0 };
    })();

    const remaining = progress.total - progress.done;
    const statusMsg = getStatusMessage(progressPhase, progress);
    const detailMsg = getDetailMessage(progressPhase, progress, detectedItems?.length);
    const timeMsg = getEstimatedTimeRemaining(progressPhase, remaining);
    const funFact = getFunFact(funFactTick);

    return (
      <View style={styles.phaseContainer}>
        <View style={styles.progressSection}>
          {/* Pulsing spinner */}
          <Animated.View style={{ opacity: pulseAnim, marginBottom: 16 }}>
            <Ionicons name="sync" size={40} color="#6366f1" />
          </Animated.View>

          <Text style={styles.phaseTitle}>
            {progressPhase === 'upload' ? 'Uploading photos...'
              : progressPhase === 'detection' ? 'Analyzing your photos...'
              : 'Cleaning up backgrounds...'}
          </Text>

          {/* Animated progress bar */}
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { width: animatedWidth }]} />
          </View>

          <Text style={styles.progressText}>{statusMsg}</Text>
          <Text style={styles.percentageText}>{currentPercentage}% complete</Text>

          {/* Bg removal inline stats */}
          {progressPhase === 'bgRemoval' && bgRemovalProgress &&
            (bgRemovalProgress.succeeded > 0 || bgRemovalProgress.failed > 0) && (
            <View style={styles.bgStatsRow}>
              {bgRemovalProgress.succeeded > 0 && (
                <Text style={styles.bgStatSuccess}>{bgRemovalProgress.succeeded} cleaned</Text>
              )}
              {bgRemovalProgress.failed > 0 && (
                <Text style={styles.bgStatFailed}>{bgRemovalProgress.failed} kept original</Text>
              )}
            </View>
          )}

          {detailMsg && <Text style={styles.detailText}>{detailMsg}</Text>}
          {timeMsg ? <Text style={styles.remainingText}>{timeMsg}</Text> : null}

          {/* Fun fact */}
          <View style={styles.funFactContainer}>
            <Ionicons name="bulb-outline" size={16} color="#6b7280" />
            <Text style={styles.funFactText}>{funFact}</Text>
          </View>

          {/* Continue using app button */}
          <TouchableOpacity style={styles.backgroundButton} onPress={handleBackground}>
            <Text style={styles.backgroundButtonText}>Continue using app</Text>
            <Ionicons name="arrow-forward" size={16} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --- Phase: Complete ---
  const renderComplete = () => {
    const jobResult = currentJob?.detected_items;
    const totalFound = jobResult?.total_items_detected ?? detectedItems?.length ?? 0;
    const failedPhotos = jobResult?.failed_photos ?? 0;
    const isFailed = currentJob?.status === 'failed';
    const isPartialFailure = !isFailed && failedPhotos > 0;
    const totalPhotos = currentJob?.total_photos ?? 0;
    const processedPhotos = totalPhotos - failedPhotos;

    const bgSucceeded = processedItems?.filter((i) => i.bg_removal_status === 'success').length ?? 0;
    const bgFailed = processedItems?.filter((i) => i.bg_removal_status === 'failed').length ?? 0;

    return (
      <ScrollView style={styles.phaseContainer} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Celebration or error icon */}
        <View style={styles.successIcon}>
          {isFailed ? (
            <Ionicons name="alert-circle" size={64} color="#ef4444" />
          ) : (
            <Text style={styles.celebrationEmoji}>✨</Text>
          )}
        </View>

        {isFailed ? (
          <>
            <Text style={styles.successTitle}>Something went wrong</Text>
            <Text style={styles.successSubtitle}>
              {currentJob?.error_message || 'Please try again.'}
            </Text>
            <View style={styles.completeActions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => { reset(); }}
              >
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => { reset(); router.push('/(tabs)/wardrobe'); }}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : isPartialFailure && retryCount < 2 ? (
          <>
            <Text style={styles.successTitle}>Partial failure</Text>
            <Text style={styles.successSubtitle}>
              {processedPhotos} of {totalPhotos} photos processed.{'\n'}
              {failedPhotos} photo{failedPhotos !== 1 ? 's' : ''} couldn't be analyzed.
            </Text>
            <View style={styles.completeActions}>
              <TouchableOpacity style={styles.primaryButton} onPress={retryFailedPhotos}>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Retry failed photos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  skipFailedPhotos();
                  router.push('/(tabs)/review-items');
                }}
              >
                <Text style={styles.secondaryButtonText}>Skip & Continue</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.successTitle}>Wardrobe Updated!</Text>

            {/* Summary stats */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryStatRow}>
                <Text style={styles.summaryStatIcon}>📸</Text>
                <Text style={styles.summaryStatText}>{processedPhotos} photos processed</Text>
              </View>
              <View style={styles.summaryStatRow}>
                <Text style={styles.summaryStatIcon}>👕</Text>
                <Text style={styles.summaryStatText}>{totalFound} items detected</Text>
              </View>
              {bgSucceeded > 0 && (
                <View style={styles.summaryStatRow}>
                  <Text style={styles.summaryStatIcon}>🎨</Text>
                  <Text style={styles.summaryStatText}>{bgSucceeded} backgrounds cleaned</Text>
                </View>
              )}
              {failedPhotos > 0 && (
                <View style={styles.summaryStatRow}>
                  <Text style={styles.summaryStatIcon}>⚠️</Text>
                  <Text style={[styles.summaryStatText, { color: '#f59e0b' }]}>
                    {failedPhotos} photo{failedPhotos !== 1 ? 's' : ''} skipped
                  </Text>
                </View>
              )}
            </View>

            {/* Category breakdown */}
            {categorySummary && Object.keys(categorySummary).length > 0 && (
              <View style={styles.categoryBreakdown}>
                <Text style={styles.summaryTitle}>Breakdown</Text>
                {Object.entries(categorySummary)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, count]) => (
                    <View key={category} style={styles.summaryRow}>
                      <Ionicons name={getCategoryIcon(category)} size={16} color="#6366f1" />
                      <Text style={styles.summaryText}>{count} {category}</Text>
                    </View>
                  ))}
              </View>
            )}

            <View style={styles.completeActions}>
              {totalFound > 0 && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => router.push('/(tabs)/review-items')}
                >
                  <Ionicons name="checkmark-done" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Review & Add to Wardrobe</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => { reset(); router.push('/(tabs)/wardrobe'); }}
              >
                <Text style={styles.secondaryButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {phase === 'selection' || phase === 'complete' ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => { reset(); router.back(); }}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={styles.headerTitle}>Magic Import</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Error Banner (non-complete phases) */}
      {error && phase !== 'complete' && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Phase Content */}
      {phase === 'selection' && renderSelection()}
      {phase === 'uploading' && renderProgress('upload')}
      {phase === 'processing' && renderProgress('detection')}
      {phase === 'bgRemoval' && renderProgress('bgRemoval')}
      {phase === 'complete' && renderComplete()}
    </View>
  );
}

function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    Tops: 'shirt-outline',
    Bottoms: 'ellipse-outline',
    Outerwear: 'snow-outline',
    Shoes: 'footsteps-outline',
    Accessories: 'watch-outline',
    Dresses: 'flower-outline',
    Activewear: 'fitness-outline',
  };
  return map[category] || 'pricetag-outline';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { flex: 1, fontSize: 13, color: '#ef4444' },
  phaseContainer: { flex: 1, paddingHorizontal: 20 },
  phaseTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },

  // Selection
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectionCount: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  clearText: { fontSize: 14, color: '#ef4444', fontWeight: '500' },
  thumbnailGrid: { paddingBottom: 16 },
  thumbnailRow: { justifyContent: 'flex-start', gap: 8, marginBottom: 8 },
  thumbnailContainer: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  thumbnail: { width: '100%', height: '100%' },
  checkOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  emptySelection: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#9ca3af', textAlign: 'center' },
  bottomActions: { paddingVertical: 16, gap: 12 },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  selectButtonText: { fontSize: 15, fontWeight: '600', color: '#6366f1' },
  estimateText: { fontSize: 13, color: '#6b7280', textAlign: 'center' },

  // Progress
  progressSection: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4, backgroundColor: '#6366f1' },
  progressText: { fontSize: 15, color: '#4b5563' },
  percentageText: { fontSize: 14, color: '#6b7280' },
  detailText: { fontSize: 14, color: '#6366f1', fontWeight: '500' },
  remainingText: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  funFactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  funFactText: { fontSize: 13, color: '#6b7280', fontStyle: 'italic', flex: 1 },
  backgroundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  backgroundButtonText: { fontSize: 14, fontWeight: '600', color: '#6366f1' },

  // Bg Removal stats
  bgStatsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  bgStatSuccess: { fontSize: 13, color: '#22c55e', fontWeight: '500' },
  bgStatFailed: { fontSize: 13, color: '#f59e0b', fontWeight: '500' },

  // Complete
  successIcon: { alignItems: 'center', marginTop: 40, marginBottom: 16 },
  celebrationEmoji: { fontSize: 64 },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: { fontSize: 16, color: '#4b5563', textAlign: 'center', marginBottom: 12 },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  summaryStatRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryStatIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  summaryStatText: { fontSize: 15, color: '#4b5563' },
  categoryBreakdown: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  summaryTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { fontSize: 14, color: '#4b5563' },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 20,
  },
  warningText: { fontSize: 13, color: '#92400e' },
  completeActions: { gap: 12, marginTop: 8 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366f1',
  },
  primaryButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '600', color: '#4b5563' },
});
