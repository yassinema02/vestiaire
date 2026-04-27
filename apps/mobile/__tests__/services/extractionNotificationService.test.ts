/**
 * Extraction Notification Service Tests
 * Story 10.6: Extraction Progress & Feedback
 */

import { extractionNotificationService } from '../../services/extractionNotificationService';

describe('extractionNotificationService', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('notifyComplete', () => {
    it('logs completion notification with item and photo counts', async () => {
      await extractionNotificationService.notifyComplete(22, 18);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('22 items added from 18 photos')
      );
    });

    it('includes the sparkle emoji in message', async () => {
      await extractionNotificationService.notifyComplete(5, 3);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✨')
      );
    });
  });

  describe('notifyFailed', () => {
    it('logs failure notification', async () => {
      await extractionNotificationService.notifyFailed();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Import encountered issues')
      );
    });
  });
});
