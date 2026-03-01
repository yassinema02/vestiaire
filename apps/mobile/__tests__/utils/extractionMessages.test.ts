/**
 * Extraction Messages Utility Tests
 * Story 10.6: Extraction Progress & Feedback
 */

import {
  getStatusMessage,
  getDetailMessage,
  getEstimatedTimeRemaining,
  getFunFact,
  getPhaseTitle,
} from '../../utils/extractionMessages';

describe('getStatusMessage', () => {
  it('returns upload message with correct photo number', () => {
    expect(getStatusMessage('upload', { done: 4, total: 20 })).toBe(
      'Uploading photo 5 of 20...'
    );
  });

  it('returns detection message with correct photo number', () => {
    expect(getStatusMessage('detection', { done: 0, total: 10 })).toBe(
      'Analyzing photo 1 of 10...'
    );
  });

  it('returns bgRemoval message with done/total', () => {
    expect(getStatusMessage('bgRemoval', { done: 8, total: 22 })).toBe(
      'Cleaning backgrounds... 8 of 22'
    );
  });

  it('returns import message with correct item number', () => {
    expect(getStatusMessage('import', { done: 2, total: 15 })).toBe(
      'Adding item 3 of 15...'
    );
  });
});

describe('getDetailMessage', () => {
  it('returns items found during detection', () => {
    expect(getDetailMessage('detection', { done: 5, total: 10 }, 14)).toBe(
      'Found 14 items so far'
    );
  });

  it('returns null during detection with no items yet', () => {
    expect(getDetailMessage('detection', { done: 0, total: 10 }, 0)).toBeNull();
  });

  it('returns "Almost done!" near end of bgRemoval', () => {
    expect(getDetailMessage('bgRemoval', { done: 19, total: 20 })).toBe('Almost done!');
  });

  it('returns large batch message for upload > 10 photos', () => {
    expect(getDetailMessage('upload', { done: 0, total: 15 })).toBe(
      'This might take a moment for large batches'
    );
  });

  it('returns null for upload with <= 10 photos', () => {
    expect(getDetailMessage('upload', { done: 0, total: 5 })).toBeNull();
  });
});

describe('getEstimatedTimeRemaining', () => {
  it('returns seconds for small remaining detection', () => {
    // 5 items * 6 sec = 30 sec
    expect(getEstimatedTimeRemaining('detection', 5)).toBe('~30 seconds remaining');
  });

  it('returns minutes for large remaining detection', () => {
    // 20 items * 6 sec = 120 sec = 2 min
    expect(getEstimatedTimeRemaining('detection', 20)).toBe('~2 minutes remaining');
  });

  it('returns empty string for 0 remaining', () => {
    expect(getEstimatedTimeRemaining('upload', 0)).toBe('');
  });

  it('uses correct seconds per item for bgRemoval', () => {
    // 10 items * 4 sec = 40 sec
    expect(getEstimatedTimeRemaining('bgRemoval', 10)).toBe('~40 seconds remaining');
  });

  it('uses correct seconds per item for import', () => {
    // 50 items * 0.2 sec = 10 sec
    expect(getEstimatedTimeRemaining('import', 50)).toBe('~10 seconds remaining');
  });

  it('rounds up to 1 minute correctly', () => {
    // 11 items * 6 sec = 66 sec → ~2 minutes
    expect(getEstimatedTimeRemaining('detection', 11)).toBe('~2 minutes remaining');
  });

  it('handles singular minute', () => {
    // 10 items * 6 sec = 60 sec → ~1 minute
    expect(getEstimatedTimeRemaining('detection', 10)).toBe('~1 minute remaining');
  });
});

describe('getFunFact', () => {
  it('returns a string from the facts list', () => {
    const fact = getFunFact(0);
    expect(typeof fact).toBe('string');
    expect(fact.length).toBeGreaterThan(0);
  });

  it('rotates through facts based on tick', () => {
    const fact0 = getFunFact(0);
    const fact1 = getFunFact(1);
    expect(fact0).not.toBe(fact1);
  });

  it('wraps around after cycling all facts', () => {
    const fact0 = getFunFact(0);
    // After cycling all 6 facts, should return to same one
    const factCycled = getFunFact(6);
    expect(factCycled).toBe(fact0);
  });
});

describe('getPhaseTitle', () => {
  it('returns correct title for each phase', () => {
    expect(getPhaseTitle('upload')).toBe('Uploading photos...');
    expect(getPhaseTitle('detection')).toBe('Analyzing your photos...');
    expect(getPhaseTitle('bgRemoval')).toBe('Cleaning up backgrounds...');
    expect(getPhaseTitle('import')).toBe('Adding to wardrobe...');
  });
});
