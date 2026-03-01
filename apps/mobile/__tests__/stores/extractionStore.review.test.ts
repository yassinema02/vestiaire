/**
 * Extraction Store Review & Import Tests
 * Story 10.4: Review & Confirm Interface
 */

const mockFrom = jest.fn();

jest.mock('../../services/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
  },
}));

const mockCreateItem = jest.fn();

jest.mock('../../services/items', () => ({
  itemsService: {
    createItem: mockCreateItem,
  },
  CreateItemInput: {},
}));

jest.mock('../../services/bulkUploadService', () => ({
  bulkUploadService: {
    selectPhotos: jest.fn(),
    uploadBatch: jest.fn(),
    createExtractionJob: jest.fn(),
    getJob: jest.fn(),
    cleanupPhotos: jest.fn(),
    getEstimatedTime: jest.fn(),
  },
}));

jest.mock('../../services/extractionService', () => ({
  extractionService: {
    processJob: jest.fn(),
    flattenDetectedItems: jest.fn(),
    getCategorySummary: jest.fn(),
  },
}));

jest.mock('../../services/batchBgRemovalService', () => ({
  batchBgRemovalService: {
    processExtractedItems: jest.fn(),
  },
}));

import { useExtractionStore } from '../../stores/extractionStore';
import { ProcessedDetectedItem, ReviewableItem } from '../../types/extraction';

function makeProcessedItem(overrides: Partial<ProcessedDetectedItem> = {}): ProcessedDetectedItem {
  return {
    category: 'Tops',
    sub_category: 'T-Shirt',
    colors: ['navy'],
    style: 'casual',
    material: 'cotton',
    position_description: 'upper body',
    confidence: 90,
    photo_index: 0,
    photo_url: 'https://storage.test/photo1.jpg',
    bg_removal_status: 'success',
    processed_image_url: 'https://storage.test/processed_1.png',
    ...overrides,
  };
}

function buildChain(overrides = {}) {
  return {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useExtractionStore.getState().reset();

  mockFrom.mockReturnValue(buildChain());
  mockCreateItem.mockResolvedValue({ item: { id: 'new-item-1' }, error: null });
});

describe('initReview', () => {
  it('creates reviewable items from processedItems with isSelected=true', () => {
    const items = [
      makeProcessedItem(),
      makeProcessedItem({ sub_category: 'Sweater', category: 'Tops', confidence: 85 }),
      makeProcessedItem({ sub_category: 'Jeans', category: 'Bottoms' }),
    ];

    useExtractionStore.setState({ processedItems: items });
    useExtractionStore.getState().initReview();

    const { reviewableItems } = useExtractionStore.getState();
    expect(reviewableItems).toHaveLength(3);
    expect(reviewableItems.every((item) => item.isSelected)).toBe(true);
    expect(reviewableItems[0].sub_category).toBe('T-Shirt');
    expect(reviewableItems[2].category).toBe('Bottoms');
  });

  it('handles empty processedItems', () => {
    useExtractionStore.setState({ processedItems: null });
    useExtractionStore.getState().initReview();

    expect(useExtractionStore.getState().reviewableItems).toHaveLength(0);
  });
});

describe('toggleItem', () => {
  it('flips isSelected for the given index', () => {
    const items = [makeProcessedItem(), makeProcessedItem({ sub_category: 'Jacket' })];
    useExtractionStore.setState({ processedItems: items });
    useExtractionStore.getState().initReview();

    useExtractionStore.getState().toggleItem(0);

    const { reviewableItems } = useExtractionStore.getState();
    expect(reviewableItems[0].isSelected).toBe(false);
    expect(reviewableItems[1].isSelected).toBe(true);
  });

  it('toggles back to selected', () => {
    const items = [makeProcessedItem()];
    useExtractionStore.setState({ processedItems: items });
    useExtractionStore.getState().initReview();

    useExtractionStore.getState().toggleItem(0);
    useExtractionStore.getState().toggleItem(0);

    expect(useExtractionStore.getState().reviewableItems[0].isSelected).toBe(true);
  });

  it('ignores invalid index', () => {
    const items = [makeProcessedItem()];
    useExtractionStore.setState({ processedItems: items });
    useExtractionStore.getState().initReview();

    useExtractionStore.getState().toggleItem(5);
    useExtractionStore.getState().toggleItem(-1);

    expect(useExtractionStore.getState().reviewableItems).toHaveLength(1);
  });
});

describe('selectAll / deselectAll', () => {
  it('selectAll sets all items to isSelected=true', () => {
    const items = [makeProcessedItem(), makeProcessedItem({ sub_category: 'Pants' })];
    useExtractionStore.setState({ processedItems: items });
    useExtractionStore.getState().initReview();

    useExtractionStore.getState().deselectAll();
    expect(useExtractionStore.getState().reviewableItems.every((i) => !i.isSelected)).toBe(true);

    useExtractionStore.getState().selectAll();
    expect(useExtractionStore.getState().reviewableItems.every((i) => i.isSelected)).toBe(true);
  });

  it('deselectAll sets all items to isSelected=false', () => {
    const items = [makeProcessedItem(), makeProcessedItem()];
    useExtractionStore.setState({ processedItems: items });
    useExtractionStore.getState().initReview();

    useExtractionStore.getState().deselectAll();

    expect(useExtractionStore.getState().reviewableItems.every((i) => !i.isSelected)).toBe(true);
  });
});

describe('deselectByCategory', () => {
  it('deselects all items of a given category', () => {
    const items = [
      makeProcessedItem({ category: 'Tops' }),
      makeProcessedItem({ category: 'Tops', sub_category: 'Sweater' }),
      makeProcessedItem({ category: 'Bottoms', sub_category: 'Jeans' }),
    ];
    useExtractionStore.setState({ processedItems: items });
    useExtractionStore.getState().initReview();

    useExtractionStore.getState().deselectByCategory('Tops');

    const { reviewableItems } = useExtractionStore.getState();
    expect(reviewableItems[0].isSelected).toBe(false);
    expect(reviewableItems[1].isSelected).toBe(false);
    expect(reviewableItems[2].isSelected).toBe(true);
  });

  it('uses editedCategory when present', () => {
    const items = [
      makeProcessedItem({ category: 'Tops' }),
      makeProcessedItem({ category: 'Tops', sub_category: 'Sweater' }),
    ];
    useExtractionStore.setState({ processedItems: items });
    useExtractionStore.getState().initReview();

    // Edit first item to a different category
    useExtractionStore.getState().editItem(0, { editedCategory: 'Outerwear' });

    useExtractionStore.getState().deselectByCategory('Tops');

    const { reviewableItems } = useExtractionStore.getState();
    // First item was reclassified to Outerwear, should still be selected
    expect(reviewableItems[0].isSelected).toBe(true);
    // Second item is still Tops, should be deselected
    expect(reviewableItems[1].isSelected).toBe(false);
  });
});

describe('editItem', () => {
  it('updates item name, category, subCategory, and colors', () => {
    const items = [makeProcessedItem()];
    useExtractionStore.setState({ processedItems: items });
    useExtractionStore.getState().initReview();

    useExtractionStore.getState().editItem(0, {
      editedName: 'My Navy T-Shirt',
      editedCategory: 'Tops',
      editedSubCategory: 'Polo',
      editedColors: ['blue', 'white'],
    });

    const { reviewableItems } = useExtractionStore.getState();
    expect(reviewableItems[0].editedName).toBe('My Navy T-Shirt');
    expect(reviewableItems[0].editedCategory).toBe('Tops');
    expect(reviewableItems[0].editedSubCategory).toBe('Polo');
    expect(reviewableItems[0].editedColors).toEqual(['blue', 'white']);
  });

  it('preserves existing edits when partially updating', () => {
    const items = [makeProcessedItem()];
    useExtractionStore.setState({ processedItems: items });
    useExtractionStore.getState().initReview();

    useExtractionStore.getState().editItem(0, { editedName: 'Test Name' });
    useExtractionStore.getState().editItem(0, { editedColors: ['red'] });

    const { reviewableItems } = useExtractionStore.getState();
    expect(reviewableItems[0].editedName).toBe('Test Name');
    expect(reviewableItems[0].editedColors).toEqual(['red']);
  });
});

describe('getSelectedCount / getSelectedItems', () => {
  it('returns correct count and items', () => {
    const items = [
      makeProcessedItem(),
      makeProcessedItem({ sub_category: 'Pants' }),
      makeProcessedItem({ sub_category: 'Jacket' }),
    ];
    useExtractionStore.setState({ processedItems: items });
    useExtractionStore.getState().initReview();

    expect(useExtractionStore.getState().getSelectedCount()).toBe(3);
    expect(useExtractionStore.getState().getSelectedItems()).toHaveLength(3);

    useExtractionStore.getState().toggleItem(1);

    expect(useExtractionStore.getState().getSelectedCount()).toBe(2);
    expect(useExtractionStore.getState().getSelectedItems()).toHaveLength(2);
  });
});

describe('importToWardrobe', () => {
  it('calls createItem for each selected item', async () => {
    const items = [
      makeProcessedItem({ sub_category: 'T-Shirt', colors: ['navy'] }),
      makeProcessedItem({ sub_category: 'Jeans', category: 'Bottoms', colors: ['blue'] }),
    ];
    useExtractionStore.setState({
      processedItems: items,
      currentJob: { id: 'job-1' } as any,
    });
    useExtractionStore.getState().initReview();

    const added = await useExtractionStore.getState().importToWardrobe();

    expect(added).toBe(2);
    expect(mockCreateItem).toHaveBeenCalledTimes(2);
    expect(mockCreateItem).toHaveBeenCalledWith(
      expect.objectContaining({
        image_url: 'https://storage.test/processed_1.png',
        original_image_url: 'https://storage.test/photo1.jpg',
        category: 'Tops',
        sub_category: 'T-Shirt',
      })
    );
  });

  it('skips deselected items', async () => {
    const items = [
      makeProcessedItem(),
      makeProcessedItem({ sub_category: 'Jacket' }),
    ];
    useExtractionStore.setState({
      processedItems: items,
      currentJob: { id: 'job-1' } as any,
    });
    useExtractionStore.getState().initReview();
    useExtractionStore.getState().toggleItem(1);

    const added = await useExtractionStore.getState().importToWardrobe();

    expect(added).toBe(1);
    expect(mockCreateItem).toHaveBeenCalledTimes(1);
  });

  it('uses edited values over detected values', async () => {
    const items = [makeProcessedItem()];
    useExtractionStore.setState({
      processedItems: items,
      currentJob: { id: 'job-1' } as any,
    });
    useExtractionStore.getState().initReview();
    useExtractionStore.getState().editItem(0, {
      editedName: 'Custom Name',
      editedCategory: 'Outerwear',
      editedSubCategory: 'Blazer',
      editedColors: ['black', 'gray'],
    });

    await useExtractionStore.getState().importToWardrobe();

    expect(mockCreateItem).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Custom Name',
        category: 'Outerwear',
        sub_category: 'Blazer',
        colors: ['black', 'gray'],
      })
    );
  });

  it('falls back to photo_url when no processed_image_url', async () => {
    const items = [
      makeProcessedItem({
        processed_image_url: undefined,
        bg_removal_status: 'failed',
      }),
    ];
    useExtractionStore.setState({
      processedItems: items,
      currentJob: { id: 'job-1' } as any,
    });
    useExtractionStore.getState().initReview();

    await useExtractionStore.getState().importToWardrobe();

    expect(mockCreateItem).toHaveBeenCalledWith(
      expect.objectContaining({
        image_url: 'https://storage.test/photo1.jpg',
      })
    );
  });

  it('returns 0 when no items selected', async () => {
    const items = [makeProcessedItem()];
    useExtractionStore.setState({
      processedItems: items,
      currentJob: { id: 'job-1' } as any,
    });
    useExtractionStore.getState().initReview();
    useExtractionStore.getState().deselectAll();

    const added = await useExtractionStore.getState().importToWardrobe();

    expect(added).toBe(0);
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('updates job items_added_count', async () => {
    const items = [makeProcessedItem()];
    useExtractionStore.setState({
      processedItems: items,
      currentJob: { id: 'job-99' } as any,
    });
    useExtractionStore.getState().initReview();

    await useExtractionStore.getState().importToWardrobe();

    expect(mockFrom).toHaveBeenCalledWith('wardrobe_extraction_jobs');
  });

  it('generates auto name from sub_category and first color', async () => {
    const items = [
      makeProcessedItem({
        sub_category: 'Blazer',
        colors: ['black', 'gray'],
      }),
    ];
    useExtractionStore.setState({
      processedItems: items,
      currentJob: { id: 'job-1' } as any,
    });
    useExtractionStore.getState().initReview();

    await useExtractionStore.getState().importToWardrobe();

    expect(mockCreateItem).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Blazer - black',
      })
    );
  });
});
