/**
 * Extraction Types
 * Types for bulk wardrobe extraction jobs (Story 10.1, 10.2)
 */

export type ExtractionJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExtractionJob {
  id: string;
  user_id: string;
  photo_urls: string[];
  total_photos: number;
  processed_photos: number;
  detected_items: ExtractionJobResult | null;
  items_added_count: number;
  status: ExtractionJobStatus;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface BulkUploadProgress {
  uploaded: number;
  total: number;
  percentage: number;
  currentPhotoUri?: string;
}

// Story 10.2: Multi-Item Detection

export interface DetectedItem {
  category: string;
  sub_category: string;
  colors: string[];
  style: string;
  material: string;
  position_description: string;
  confidence: number;
  photo_index: number;
  photo_url: string;
}

export interface PhotoDetectionResult {
  photo_url: string;
  photo_index: number;
  detected_items: DetectedItem[];
  error: string | null;
}

export interface ExtractionJobResult {
  photos: PhotoDetectionResult[];
  total_items_detected: number;
  failed_photos: number;
}

// Story 10.3: Background Removal for Extracted Items

export interface ProcessedDetectedItem extends DetectedItem {
  processed_image_base64?: string;
  processed_image_url?: string;
  bg_removal_status: 'pending' | 'success' | 'failed' | 'skipped';
}

export interface BgRemovalProgress {
  processed: number;
  total: number;
  succeeded: number;
  failed: number;
}

// Story 10.4: Review & Confirm Interface
// Story 10.5: Auto-Categorization for Extracted Items

export interface ReviewableItem extends ProcessedDetectedItem {
  isSelected: boolean;
  editedName?: string;
  editedCategory?: string;
  editedSubCategory?: string;
  editedColors?: string[];
  needsReview: boolean;
  duplicateOf?: { itemId: string; similarity: number; itemName?: string };
}
