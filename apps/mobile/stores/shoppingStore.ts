/**
 * Shopping Store
 * Manages shopping scan state and orchestrates the analysis flow
 * Story 8.1: Screenshot Product Analysis
 * Story 8.2: URL Product Scraping
 * Story 8.3: AI Product Extraction with Manual Fallback
 */

import { create } from 'zustand';
import { ShoppingScan, ProductAnalysis } from '../types/shopping';
import { WardrobeItem } from '../services/items';
import { shoppingService } from '../services/shoppingService';
import { itemsService } from '../services/items';
import { requireUserId } from '../services/auth-helpers';
import { compressImage } from '../utils/image';

export type AnalysisProgress = 'idle' | 'uploading' | 'analyzing' | 'scoring' | 'scraping' | 'confirming' | 'done' | 'error';

interface ShoppingState {
    currentScan: ShoppingScan | null;
    currentAnalysis: ProductAnalysis | null;
    scrapedImageUrl: string | null;
    uploadedImageUrl: string | null;
    scanMethod: 'screenshot' | 'url';
    scrapedProductUrl: string | null;
    scrapedPriceAmount: number | null;
    scrapedPriceCurrency: string | null;
    matchingItems: WardrobeItem[];
    scoreExplanation: string | null;
    scanHistory: ShoppingScan[];
    wishlistScans: ShoppingScan[];
    isAnalyzing: boolean;
    analysisProgress: AnalysisProgress;
    analysisError: string | null;
}

interface ShoppingActions {
    startAnalysis: (imageUri: string) => Promise<void>;
    analyzeUrl: (url: string) => Promise<{ fallbackToScreenshot: boolean }>;
    confirmAndScore: (analysis: ProductAnalysis) => Promise<void>;
    clearScan: () => void;
    loadHistory: (limit?: number) => Promise<void>;
    deleteScan: (scanId: string) => Promise<{ success: boolean }>;
    loadWishlist: () => Promise<void>;
    toggleWishlist: (scanId: string) => Promise<{ success: boolean }>;
    reAnalyzeScan: (scanId: string) => Promise<{ success: boolean }>;
    rateScan: (scanId: string, rating: number) => Promise<{ success: boolean }>;
}

type ShoppingStore = ShoppingState & ShoppingActions;

export const useShoppingStore = create<ShoppingStore>((set, get) => ({
    // State
    currentScan: null,
    currentAnalysis: null,
    scrapedImageUrl: null,
    uploadedImageUrl: null,
    scanMethod: 'screenshot',
    scrapedProductUrl: null,
    scrapedPriceAmount: null,
    scrapedPriceCurrency: null,
    matchingItems: [],
    scoreExplanation: null,
    scanHistory: [],
    wishlistScans: [],
    isAnalyzing: false,
    analysisProgress: 'idle',
    analysisError: null,

    // Actions

    /**
     * Step 1-2 only: Upload + Gemini analysis. Stops at currentAnalysis.
     * User confirms/edits on scan-confirm screen, then confirmAndScore() finishes the flow.
     */
    startAnalysis: async (imageUri: string) => {
        const state = get();
        if (state.isAnalyzing) return;

        set({
            isAnalyzing: true,
            analysisProgress: 'uploading',
            analysisError: null,
            currentScan: null,
            currentAnalysis: null,
            matchingItems: [],
            uploadedImageUrl: null,
            scrapedImageUrl: null,
            scanMethod: 'screenshot',
            scrapedProductUrl: null,
            scrapedPriceAmount: null,
            scrapedPriceCurrency: null,
        });

        try {
            const userId = await requireUserId();

            // Step 1: Compress and upload image
            const compressed = await compressImage(imageUri);
            const uploadResult = await shoppingService.uploadScreenshot(userId, compressed.uri);

            if (uploadResult.error || !uploadResult.url) {
                set({
                    isAnalyzing: false,
                    analysisProgress: 'error',
                    analysisError: 'Failed to upload image. Please try again.',
                });
                return;
            }

            set({ uploadedImageUrl: uploadResult.url });

            // Step 2: Analyze product via Gemini
            set({ analysisProgress: 'analyzing' });

            const { analysis, error: analysisError } = await shoppingService.analyzeProduct(compressed.uri);

            if (analysisError || !analysis) {
                // Analysis failed — still navigate to confirm for manual input
                set({
                    currentAnalysis: null,
                    isAnalyzing: false,
                    analysisProgress: 'confirming',
                });
                return;
            }

            // Low confidence — still show confirm screen for user to fix
            set({
                currentAnalysis: analysis,
                isAnalyzing: false,
                analysisProgress: 'confirming',
            });
        } catch (error) {
            console.error('Analysis flow error:', error);
            set({
                isAnalyzing: false,
                analysisProgress: 'error',
                analysisError: 'Something went wrong. Please try again.',
            });
        }
    },

    /**
     * Step 1-2 only for URL: Scrape + Gemini analysis. Stops at currentAnalysis.
     */
    analyzeUrl: async (url: string) => {
        const state = get();
        if (state.isAnalyzing) return { fallbackToScreenshot: false };

        // Validate URL
        const validation = shoppingService.validateUrl(url);
        if (!validation.valid) {
            set({
                isAnalyzing: false,
                analysisProgress: 'error',
                analysisError: validation.error,
            });
            return { fallbackToScreenshot: false };
        }

        set({
            isAnalyzing: true,
            analysisProgress: 'scraping',
            analysisError: null,
            currentScan: null,
            currentAnalysis: null,
            matchingItems: [],
            uploadedImageUrl: null,
            scrapedImageUrl: null,
            scanMethod: 'url',
            scrapedProductUrl: url.trim(),
            scrapedPriceAmount: null,
            scrapedPriceCurrency: null,
        });

        try {
            // Step 1: Scrape product data from URL
            const { product, error: scrapeError } = await shoppingService.scrapeProductUrl(url.trim());

            if (scrapeError || !product) {
                set({
                    isAnalyzing: false,
                    analysisProgress: 'error',
                    analysisError: scrapeError?.message || "We couldn't load this page. Try screenshot instead.",
                });
                return { fallbackToScreenshot: true };
            }

            // Store scraped data for later use in confirmAndScore
            if (product.image_url) {
                set({ scrapedImageUrl: product.image_url });
            }
            set({
                scrapedPriceAmount: product.price_amount,
                scrapedPriceCurrency: product.price_currency,
            });

            // Step 2: If we got an image, analyze it with Gemini
            set({ analysisProgress: 'analyzing' });

            let analysis: ProductAnalysis | null = null;

            if (product.image_url) {
                const { analysis: geminiAnalysis, error: geminiError } =
                    await shoppingService.analyzeProduct(product.image_url);
                if (geminiError) {
                    console.warn('Gemini image analysis failed for URL scrape:', geminiError.message);
                }
                analysis = geminiAnalysis;
            }

            // Merge: Gemini is primary for visual attributes, scraped data for metadata
            const mergedAnalysis: ProductAnalysis = {
                product_name: product.name || analysis?.product_name || 'Unknown Product',
                product_brand: product.brand || analysis?.product_brand || null,
                category: analysis?.category || 'tops',
                color: analysis?.color || product.color || 'Unknown',
                secondary_colors: analysis?.secondary_colors || [],
                style: analysis?.style || 'casual',
                material: analysis?.material || null,
                pattern: analysis?.pattern || 'solid',
                season: analysis?.season || [],
                formality: analysis?.formality ?? 5,
                confidence: analysis?.confidence ?? (product.name ? 0.5 : 0.2),
            };

            // Navigate to confirm screen (even with low confidence — user can fix it there)
            set({
                currentAnalysis: mergedAnalysis,
                isAnalyzing: false,
                analysisProgress: 'confirming',
            });

            return { fallbackToScreenshot: false };
        } catch (error) {
            console.error('URL analysis flow error:', error);
            set({
                isAnalyzing: false,
                analysisProgress: 'error',
                analysisError: 'Something went wrong. Please try again.',
            });
            return { fallbackToScreenshot: true };
        }
    },

    /**
     * Step 3-4: Called from scan-confirm screen after user confirms/edits.
     * Calculates compatibility, saves scan, and transitions to done.
     */
    confirmAndScore: async (analysis: ProductAnalysis) => {
        set({
            isAnalyzing: true,
            analysisProgress: 'scoring',
            analysisError: null,
            currentAnalysis: analysis,
        });

        try {
            const { items: wardrobeItems } = await itemsService.getItems();

            const { score, insights, matchingItemIds, explanation } = shoppingService.calculateCompatibility(
                analysis,
                wardrobeItems
            );

            const matching = wardrobeItems.filter((item) => matchingItemIds.includes(item.id));

            const state = get();
            const imageUrl = state.uploadedImageUrl || state.scrapedImageUrl;

            const scanData: Partial<ShoppingScan> = {
                product_name: analysis.product_name,
                product_brand: analysis.product_brand,
                product_url: state.scrapedProductUrl,
                product_image_url: imageUrl,
                category: analysis.category,
                color: analysis.color,
                secondary_colors: analysis.secondary_colors,
                style: analysis.style,
                material: analysis.material,
                pattern: analysis.pattern,
                season: analysis.season,
                formality: analysis.formality,
                price_amount: state.scrapedPriceAmount,
                price_currency: state.scrapedPriceCurrency || 'GBP',
                compatibility_score: score,
                matching_item_ids: matchingItemIds,
                ai_insights: insights,
                scan_method: state.scanMethod,
            };

            const { scan: savedScan } = await shoppingService.saveScan(scanData);

            set({
                currentScan: savedScan,
                matchingItems: matching,
                scoreExplanation: explanation,
                isAnalyzing: false,
                analysisProgress: 'done',
            });
        } catch (error) {
            console.error('Confirm and score error:', error);
            set({
                isAnalyzing: false,
                analysisProgress: 'error',
                analysisError: 'Failed to calculate compatibility. Please try again.',
            });
        }
    },

    clearScan: () => {
        set({
            currentScan: null,
            currentAnalysis: null,
            scrapedImageUrl: null,
            uploadedImageUrl: null,
            scanMethod: 'screenshot',
            scrapedProductUrl: null,
            scrapedPriceAmount: null,
            scrapedPriceCurrency: null,
            matchingItems: [],
            scoreExplanation: null,
            isAnalyzing: false,
            analysisProgress: 'idle',
            analysisError: null,
        });
    },

    loadHistory: async (limit?: number) => {
        const { scans, error } = await shoppingService.getScanHistory(limit);
        if (!error) {
            set({ scanHistory: scans });
        }
    },

    deleteScan: async (scanId: string) => {
        const { error } = await shoppingService.deleteScan(scanId);
        if (!error) {
            set((state) => ({
                scanHistory: state.scanHistory.filter((s) => s.id !== scanId),
                wishlistScans: state.wishlistScans.filter((s) => s.id !== scanId),
            }));
            return { success: true };
        }
        return { success: false };
    },

    loadWishlist: async () => {
        const { scans, error } = await shoppingService.getWishlistScans();
        if (!error) {
            set({ wishlistScans: scans });
        }
    },

    toggleWishlist: async (scanId: string) => {
        const state = get();
        const scan = state.currentScan?.id === scanId
            ? state.currentScan
            : state.wishlistScans.find((s) => s.id === scanId)
              || state.scanHistory.find((s) => s.id === scanId);

        if (!scan) return { success: false };

        const newValue = !scan.is_wishlisted;

        // Optimistic update
        const updatedScan = { ...scan, is_wishlisted: newValue };
        set((prev) => ({
            currentScan: prev.currentScan?.id === scanId ? updatedScan : prev.currentScan,
            wishlistScans: newValue
                ? [updatedScan, ...prev.wishlistScans.filter((s) => s.id !== scanId)]
                : prev.wishlistScans.filter((s) => s.id !== scanId),
            scanHistory: prev.scanHistory.map((s) => s.id === scanId ? updatedScan : s),
        }));

        const { error } = await shoppingService.toggleWishlist(scanId, newValue);
        if (error) {
            // Revert on failure
            set((prev) => ({
                currentScan: prev.currentScan?.id === scanId ? scan : prev.currentScan,
                wishlistScans: scan.is_wishlisted
                    ? [scan, ...prev.wishlistScans.filter((s) => s.id !== scanId)]
                    : prev.wishlistScans.filter((s) => s.id !== scanId),
                scanHistory: prev.scanHistory.map((s) => s.id === scanId ? scan : s),
            }));
            return { success: false };
        }

        return { success: true };
    },

    reAnalyzeScan: async (scanId: string) => {
        const { scan, error } = await shoppingService.reAnalyzeScan(scanId);
        if (error || !scan) return { success: false };

        set((prev) => ({
            wishlistScans: prev.wishlistScans.map((s) => s.id === scanId ? scan : s),
            scanHistory: prev.scanHistory.map((s) => s.id === scanId ? scan : s),
            currentScan: prev.currentScan?.id === scanId ? scan : prev.currentScan,
        }));

        return { success: true };
    },

    rateScan: async (scanId: string, rating: number) => {
        const { error } = await shoppingService.rateScan(scanId, rating);
        if (error) return { success: false };

        const update = (s: ShoppingScan) =>
            s.id === scanId ? { ...s, user_rating: rating } : s;

        set((prev) => ({
            currentScan: prev.currentScan?.id === scanId
                ? { ...prev.currentScan, user_rating: rating }
                : prev.currentScan,
            scanHistory: prev.scanHistory.map(update),
            wishlistScans: prev.wishlistScans.map(update),
        }));

        return { success: true };
    },
}));
