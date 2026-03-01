/**
 * Bulk Upload Service
 * Handles multi-photo selection, batch upload, and extraction job creation
 * Story 10.1: Bulk Photo Upload
 */

import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { ExtractionJob, BulkUploadProgress } from '../types/extraction';

const EXTRACTION_BUCKET = 'extraction-uploads';
const SECONDS_PER_PHOTO = 6;

export const bulkUploadService = {
  /**
   * Open gallery with multi-select (up to 50 photos)
   */
  selectPhotos: async (): Promise<string[]> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 50,
      quality: 0.8,
    });

    if (result.canceled) return [];
    return result.assets.map((a) => a.uri);
  },

  /**
   * Upload photos sequentially to extraction-uploads bucket with progress tracking
   */
  uploadBatch: async (
    photos: string[],
    onProgress: (progress: BulkUploadProgress) => void
  ): Promise<{ urls: string[]; error: Error | null }> => {
    try {
      const userId = await requireUserId();
      const urls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        onProgress({
          uploaded: i,
          total: photos.length,
          percentage: Math.round((i / photos.length) * 100),
          currentPhotoUri: photos[i],
        });

        const timestamp = Date.now();
        const filename = `${userId}/${timestamp}_${i}.jpg`;

        const response = await fetch(photos[i]);
        const arrayBuffer = await new Response(response).arrayBuffer();

        const { data, error } = await supabase.storage
          .from(EXTRACTION_BUCKET)
          .upload(filename, arrayBuffer, { contentType: 'image/jpeg' });

        if (error) {
          console.warn(`Failed to upload photo ${i + 1}:`, error.message);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from(EXTRACTION_BUCKET)
          .getPublicUrl(data.path);

        urls.push(urlData.publicUrl);
      }

      onProgress({
        uploaded: photos.length,
        total: photos.length,
        percentage: 100,
      });

      return { urls, error: null };
    } catch (error) {
      console.error('Batch upload error:', error);
      return { urls: [], error: error as Error };
    }
  },

  /**
   * Create an extraction job record in the database
   */
  createExtractionJob: async (
    photoUrls: string[]
  ): Promise<{ job: ExtractionJob | null; error: Error | null }> => {
    try {
      const userId = await requireUserId();

      const { data, error } = await supabase
        .from('wardrobe_extraction_jobs')
        .insert({
          user_id: userId,
          photo_urls: photoUrls,
          total_photos: photoUrls.length,
          status: 'pending',
        })
        .select()
        .single();

      if (error) return { job: null, error };
      return { job: data, error: null };
    } catch (error) {
      return { job: null, error: error as Error };
    }
  },

  /**
   * Get estimated processing time string
   */
  getEstimatedTime: (photoCount: number): string => {
    const minutes = Math.ceil((photoCount * SECONDS_PER_PHOTO) / 60);
    return `~${minutes} minute${minutes !== 1 ? 's' : ''}`;
  },

  /**
   * Fetch a single extraction job by ID
   */
  getJob: async (
    jobId: string
  ): Promise<{ job: ExtractionJob | null; error: Error | null }> => {
    try {
      const { data, error } = await supabase
        .from('wardrobe_extraction_jobs')
        .select()
        .eq('id', jobId)
        .single();

      if (error) return { job: null, error };
      return { job: data, error: null };
    } catch (error) {
      return { job: null, error: error as Error };
    }
  },

  /**
   * Delete uploaded photos from extraction-uploads bucket after processing
   */
  cleanupPhotos: async (photoUrls: string[]): Promise<{ error: Error | null }> => {
    try {
      // Extract file paths from public URLs
      const paths = photoUrls
        .map((url) => {
          const match = url.match(/extraction-uploads\/(.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];

      if (paths.length === 0) return { error: null };

      const { error } = await supabase.storage
        .from(EXTRACTION_BUCKET)
        .remove(paths);

      if (error) {
        console.warn('Photo cleanup error:', error.message);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Photo cleanup exception:', error);
      return { error: error as Error };
    }
  },

  /**
   * Fetch all extraction jobs for the current user
   */
  getUserJobs: async (): Promise<{
    jobs: ExtractionJob[];
    error: Error | null;
  }> => {
    try {
      const userId = await requireUserId();

      const { data, error } = await supabase
        .from('wardrobe_extraction_jobs')
        .select()
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return { jobs: [], error };
      return { jobs: data || [], error: null };
    } catch (error) {
      return { jobs: [], error: error as Error };
    }
  },
};
