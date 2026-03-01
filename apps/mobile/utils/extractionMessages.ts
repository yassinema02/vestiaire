/**
 * Extraction Status Messages & Time Estimation
 * Story 10.6: Extraction Progress & Feedback
 *
 * Provides contextual status messages, time estimates, and fun facts
 * for each phase of the extraction pipeline.
 */

export type ExtractionPhase = 'upload' | 'detection' | 'bgRemoval' | 'import';

/**
 * Get the primary status message for the current phase and progress.
 */
export function getStatusMessage(
  phase: ExtractionPhase,
  progress: { done: number; total: number }
): string {
  const messages: Record<ExtractionPhase, string> = {
    upload: `Uploading photo ${progress.done + 1} of ${progress.total}...`,
    detection: `Analyzing photo ${progress.done + 1} of ${progress.total}...`,
    bgRemoval: `Cleaning backgrounds... ${progress.done} of ${progress.total}`,
    import: `Adding item ${progress.done + 1} of ${progress.total}...`,
  };
  return messages[phase];
}

/**
 * Get a secondary detail message with running counts.
 */
export function getDetailMessage(
  phase: ExtractionPhase,
  progress: { done: number; total: number },
  itemsFoundSoFar?: number
): string | null {
  if (phase === 'detection' && itemsFoundSoFar !== undefined && itemsFoundSoFar > 0) {
    return `Found ${itemsFoundSoFar} item${itemsFoundSoFar !== 1 ? 's' : ''} so far`;
  }
  if (phase === 'bgRemoval' && progress.done > 0 && progress.done >= progress.total - 2) {
    return 'Almost done!';
  }
  if (phase === 'upload' && progress.total > 10) {
    return 'This might take a moment for large batches';
  }
  return null;
}

// Average seconds per item for each phase
const SECS_PER_ITEM: Record<ExtractionPhase, number> = {
  upload: 2,
  detection: 6,
  bgRemoval: 4,
  import: 0.2,
};

/**
 * Get estimated time remaining string for the current phase.
 */
export function getEstimatedTimeRemaining(
  phase: ExtractionPhase,
  remaining: number
): string {
  const totalSecs = remaining * SECS_PER_ITEM[phase];
  if (totalSecs <= 0) return '';
  if (totalSecs < 60) return `~${Math.ceil(totalSecs)} seconds remaining`;
  return `~${Math.ceil(totalSecs / 60)} minute${Math.ceil(totalSecs / 60) !== 1 ? 's' : ''} remaining`;
}

const FUN_FACTS = [
  'AI is analyzing colors, patterns, and styles...',
  'Detecting clothing items in each photo...',
  'Quality takes time ✨',
  'Building your digital wardrobe...',
  'Matching items to categories...',
  'Identifying materials and textures...',
];

/**
 * Get a rotating fun fact / tip message for long waits.
 * Uses a tick counter to rotate deterministically.
 */
export function getFunFact(tick: number): string {
  return FUN_FACTS[tick % FUN_FACTS.length];
}

/**
 * Get the phase display title.
 */
export function getPhaseTitle(phase: ExtractionPhase): string {
  const titles: Record<ExtractionPhase, string> = {
    upload: 'Uploading photos...',
    detection: 'Analyzing your photos...',
    bgRemoval: 'Cleaning up backgrounds...',
    import: 'Adding to wardrobe...',
  };
  return titles[phase];
}
