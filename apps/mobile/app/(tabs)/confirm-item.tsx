/**
 * Item Confirmation Screen
 * Shows AI suggestions for category and colors, allows user to confirm or edit
 * Extended with metadata fields (name, brand, price, seasons, occasions)
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    Platform,
    TextInput,
    KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    analyzeClothing,
    isCategorizationConfigured,
    getDefaultAnalysis,
    CATEGORIES,
    COLORS,
    PATTERNS,
    Category,
    ClothingAnalysis,
} from '../../services/aiCategorization';
import { itemsService } from '../../services/items';
import { onboardingService } from '../../services/onboarding';
import { gamificationService } from '../../services/gamificationService';
import { challengeService } from '../../services/challengeService';
import LevelUpModal from '../../components/gamification/LevelUpModal';
import BadgeUnlockModal from '../../components/gamification/BadgeUnlockModal';
import { BadgeDefinition } from '@vestiaire/shared';

// Constants
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All-Season'] as const;
const OCCASIONS = ['Casual', 'Work', 'Formal', 'Sport', 'Night Out'] as const;
const CURRENCIES = [
    { code: 'EUR', symbol: '€' },
    { code: 'USD', symbol: '$' },
    { code: 'GBP', symbol: '£' },
] as const;

type Season = (typeof SEASONS)[number];
type Occasion = (typeof OCCASIONS)[number];
type Currency = (typeof CURRENCIES)[number]['code'];

export default function ConfirmItemScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ itemId: string; imageUrl: string }>();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState(1);
    const [showBadgeUnlock, setShowBadgeUnlock] = useState(false);
    const [unlockedBadge, setUnlockedBadge] = useState<BadgeDefinition | null>(null);
    const [pendingBadges, setPendingBadges] = useState<BadgeDefinition[]>([]);

    // Category/Color state
    const [selectedCategory, setSelectedCategory] = useState<Category>('tops');
    const [selectedSubCategory, setSelectedSubCategory] = useState('');
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [selectedPattern, setSelectedPattern] = useState('solid');

    // Metadata state
    const [itemName, setItemName] = useState('');
    const [brand, setBrand] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [currency, setCurrency] = useState<Currency>('EUR');
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [selectedSeasons, setSelectedSeasons] = useState<Season[]>([]);
    const [selectedOccasions, setSelectedOccasions] = useState<Occasion[]>([]);

    const navigateAfterSave = async () => {
        const shouldOnboard = await onboardingService.shouldShowOnboarding();
        if (shouldOnboard) {
            router.replace('/onboarding');
        } else {
            router.replace('/(tabs)/wardrobe');
        }
    };

    const handleBadgeDismiss = () => {
        setShowBadgeUnlock(false);
        setUnlockedBadge(null);
        // Show next pending badge or navigate
        if (pendingBadges.length > 0) {
            const [next, ...rest] = pendingBadges;
            setPendingBadges(rest);
            setUnlockedBadge(next);
            setShowBadgeUnlock(true);
        } else {
            navigateAfterSave();
        }
    };

    const handleLevelUpDismiss = () => {
        setShowLevelUp(false);
        // Show pending badges if any, otherwise navigate
        if (pendingBadges.length > 0) {
            const [next, ...rest] = pendingBadges;
            setPendingBadges(rest);
            setUnlockedBadge(next);
            setShowBadgeUnlock(true);
        } else {
            navigateAfterSave();
        }
    };

    useEffect(() => {
        loadAnalysis();
    }, []);

    const loadAnalysis = async () => {
        setIsLoading(true);
        try {
            if (isCategorizationConfigured() && params.imageUrl) {
                const { analysis, error } = await analyzeClothing(params.imageUrl);
                if (analysis && !error) {
                    setSelectedCategory(analysis.category);
                    setSelectedSubCategory(analysis.subCategory);
                    setSelectedColors(analysis.colors);
                    setSelectedPattern(analysis.pattern);
                } else {
                    const defaults = getDefaultAnalysis();
                    setSelectedCategory(defaults.category);
                    setSelectedSubCategory(defaults.subCategory);
                    setSelectedColors(defaults.colors);
                    setSelectedPattern(defaults.pattern);
                }
            } else {
                const defaults = getDefaultAnalysis();
                setSelectedCategory(defaults.category);
                setSelectedSubCategory(defaults.subCategory);
                setSelectedColors(defaults.colors);
                setSelectedPattern(defaults.pattern);
            }
        } catch (error) {
            console.error('Load analysis error:', error);
            const defaults = getDefaultAnalysis();
            setSelectedCategory(defaults.category);
            setSelectedSubCategory(defaults.subCategory);
            setSelectedColors(defaults.colors);
            setSelectedPattern(defaults.pattern);
        }
        setIsLoading(false);
    };

    const toggleColor = (colorName: string) => {
        if (selectedColors.includes(colorName)) {
            setSelectedColors(selectedColors.filter((c) => c !== colorName));
        } else if (selectedColors.length < 3) {
            setSelectedColors([...selectedColors, colorName]);
        }
    };

    const toggleSeason = (season: Season) => {
        if (selectedSeasons.includes(season)) {
            setSelectedSeasons(selectedSeasons.filter((s) => s !== season));
        } else {
            setSelectedSeasons([...selectedSeasons, season]);
        }
    };

    const toggleOccasion = (occasion: Occasion) => {
        if (selectedOccasions.includes(occasion)) {
            setSelectedOccasions(selectedOccasions.filter((o) => o !== occasion));
        } else {
            setSelectedOccasions([...selectedOccasions, occasion]);
        }
    };

    const handleConfirm = async () => {
        if (!params.itemId) return;
        setIsSaving(true);
        try {
            const { error } = await itemsService.updateItem(params.itemId, {
                category: selectedCategory,
                sub_category: selectedSubCategory,
                colors: selectedColors,
                name: itemName || null,
                brand: brand || null,
                purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
                currency: currency,
                seasons: selectedSeasons.length > 0 ? selectedSeasons : null,
                occasions: selectedOccasions.length > 0 ? selectedOccasions : null,
                status: 'complete',
            } as any);
            if (error) throw error;

            // Award style points (fire-and-forget)
            gamificationService.awardUploadItem().catch(() => {});

            // Update challenge progress (fire-and-forget)
            challengeService.updateProgress().catch(() => {});

            // Check badges (upload trigger)
            const newBadges = await gamificationService.checkBadges('upload').catch(() => []);

            // Check for level-up
            const levelResult = await gamificationService.checkAndApplyLevelUp().catch(() => null);

            // Queue badge modals
            if (newBadges && newBadges.length > 0) {
                setPendingBadges(newBadges.slice(1));
                if (levelResult && levelResult.leveledUp) {
                    // Show level-up first, then badges
                    setPendingBadges(newBadges);
                    setNewLevel(levelResult.newLevel);
                    setShowLevelUp(true);
                    return;
                }
                // Show first badge
                setUnlockedBadge(newBadges[0]);
                setPendingBadges(newBadges.slice(1));
                setShowBadgeUnlock(true);
                return;
            }

            if (levelResult && levelResult.leveledUp) {
                setNewLevel(levelResult.newLevel);
                setShowLevelUp(true);
                return;
            }

            await navigateAfterSave();
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save item. Please try again.');
        }
        setIsSaving(false);
    };

    const handleSkip = async () => {
        if (params.itemId) {
            try {
                await itemsService.updateItem(params.itemId, {
                    category: selectedCategory,
                    sub_category: selectedSubCategory,
                    colors: selectedColors,
                    status: 'draft',
                } as any);
            } catch (error) {
                console.error('Skip save error:', error);
            }
        }

        // Check if onboarding is still in progress
        const shouldOnboard = await onboardingService.shouldShowOnboarding();
        if (shouldOnboard) {
            router.replace('/onboarding');
        } else {
            router.replace('/(tabs)/wardrobe');
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Analyzing your item...</Text>
                <Text style={styles.loadingSubtext}>AI is detecting category and colors</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Confirm Details</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {params.imageUrl && (
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: params.imageUrl }} style={styles.previewImage} />
                    </View>
                )}

                {/* Category */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.chipRow}>
                            {Object.keys(CATEGORIES).map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.chip, selectedCategory === cat && styles.chipSelected]}
                                    onPress={() => {
                                        setSelectedCategory(cat as Category);
                                        setSelectedSubCategory(CATEGORIES[cat as Category][0]);
                                    }}
                                >
                                    <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextSelected]}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Type */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.chipRow}>
                            {CATEGORIES[selectedCategory].map((subCat) => (
                                <TouchableOpacity
                                    key={subCat}
                                    style={[styles.chip, selectedSubCategory === subCat && styles.chipSelected]}
                                    onPress={() => setSelectedSubCategory(subCat)}
                                >
                                    <Text style={[styles.chipText, selectedSubCategory === subCat && styles.chipTextSelected]}>
                                        {subCat.replace('-', ' ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Colors */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Colors <Text style={styles.sectionHint}>(up to 3)</Text></Text>
                    <View style={styles.colorGrid}>
                        {COLORS.map((color) => (
                            <TouchableOpacity
                                key={color.name}
                                style={[styles.colorChip, { backgroundColor: color.hex }, selectedColors.includes(color.name) && styles.colorChipSelected]}
                                onPress={() => toggleColor(color.name)}
                            >
                                {selectedColors.includes(color.name) && (
                                    <Ionicons name="checkmark" size={16} color={['White', 'Cream', 'Beige'].includes(color.name) ? '#000' : '#fff'} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Pattern */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pattern</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.chipRow}>
                            {PATTERNS.map((pattern) => (
                                <TouchableOpacity
                                    key={pattern}
                                    style={[styles.chip, selectedPattern === pattern && styles.chipSelected]}
                                    onPress={() => setSelectedPattern(pattern)}
                                >
                                    <Text style={[styles.chipText, selectedPattern === pattern && styles.chipTextSelected]}>
                                        {pattern.replace('-', ' ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                <View style={styles.divider} />
                <Text style={styles.sectionHeader}>Item Details</Text>
                <Text style={styles.optionalHint}>All fields are optional</Text>

                {/* Name */}
                <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g., My favorite blue shirt"
                        placeholderTextColor="#9ca3af"
                        value={itemName}
                        onChangeText={setItemName}
                    />
                </View>

                {/* Brand */}
                <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Brand</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g., Nike, Zara, H&M"
                        placeholderTextColor="#9ca3af"
                        value={brand}
                        onChangeText={setBrand}
                        autoCapitalize="words"
                    />
                </View>

                {/* Price with Currency Selector */}
                <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Purchase Price</Text>
                    <View style={styles.priceRow}>
                        <TouchableOpacity style={styles.currencyButton} onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}>
                            <Text style={styles.currencyButtonText}>{CURRENCIES.find((c) => c.code === currency)?.symbol}</Text>
                            <Ionicons name="chevron-down" size={14} color="#6b7280" />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.priceInput}
                            placeholder="0.00"
                            placeholderTextColor="#9ca3af"
                            value={purchasePrice}
                            onChangeText={(text) => setPurchasePrice(text.replace(/[^0-9.]/g, ''))}
                            keyboardType="decimal-pad"
                        />
                    </View>
                    {showCurrencyPicker && (
                        <View style={styles.currencyDropdown}>
                            {CURRENCIES.map((curr) => (
                                <TouchableOpacity
                                    key={curr.code}
                                    style={[styles.currencyOption, currency === curr.code && styles.currencyOptionSelected]}
                                    onPress={() => { setCurrency(curr.code); setShowCurrencyPicker(false); }}
                                >
                                    <Text style={styles.currencyOptionSymbol}>{curr.symbol}</Text>
                                    <Text style={[styles.currencyOptionText, currency === curr.code && styles.currencyOptionTextSelected]}>{curr.code}</Text>
                                    {currency === curr.code && <Ionicons name="checkmark" size={16} color="#6366f1" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Seasons */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Seasons <Text style={styles.sectionHint}>(when to wear)</Text></Text>
                    <View style={styles.chipWrap}>
                        {SEASONS.map((season) => (
                            <TouchableOpacity
                                key={season}
                                style={[styles.chip, selectedSeasons.includes(season) && styles.chipSelected]}
                                onPress={() => toggleSeason(season)}
                            >
                                <Text style={[styles.chipText, selectedSeasons.includes(season) && styles.chipTextSelected]}>{season}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Occasions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Occasions <Text style={styles.sectionHint}>(what it's for)</Text></Text>
                    <View style={styles.chipWrap}>
                        {OCCASIONS.map((occasion) => (
                            <TouchableOpacity
                                key={occasion}
                                style={[styles.chip, selectedOccasions.includes(occasion) && styles.chipSelected]}
                                onPress={() => toggleOccasion(occasion)}
                            >
                                <Text style={[styles.chipText, selectedOccasions.includes(occasion) && styles.chipTextSelected]}>{occasion}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={[styles.confirmButton, isSaving && styles.confirmButtonDisabled]} onPress={handleConfirm} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Text style={styles.confirmButtonText}>Confirm & Save</Text>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
            <LevelUpModal
                visible={showLevelUp}
                newLevel={newLevel}
                onDismiss={handleLevelUpDismiss}
            />
            <BadgeUnlockModal
                visible={showBadgeUnlock}
                badge={unlockedBadge}
                onDismiss={handleBadgeDismiss}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0E8' },
    loadingContainer: { flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 24, fontSize: 18, fontWeight: '600', color: '#1f2937' },
    loadingSubtext: { marginTop: 8, fontSize: 14, color: '#6b7280' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 16, paddingBottom: 16 },
    skipButton: { width: 50 },
    skipButtonText: { fontSize: 16, color: '#6b7280' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
    content: { flex: 1, paddingHorizontal: 16 },
    imageContainer: { height: 160, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', marginBottom: 20 },
    previewImage: { width: '100%', height: '100%', resizeMode: 'contain' },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 10 },
    sectionHint: { fontSize: 12, color: '#9ca3af', fontWeight: '400' },
    sectionHeader: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
    optionalHint: { fontSize: 13, color: '#9ca3af', marginBottom: 16 },
    divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 20 },
    chipRow: { flexDirection: 'row', gap: 8 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
    chipSelected: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    chipText: { fontSize: 14, color: '#4b5563', textTransform: 'capitalize' },
    chipTextSelected: { color: '#fff', fontWeight: '500' },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    colorChip: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
    colorChipSelected: { borderColor: '#6366f1', borderWidth: 3 },
    inputSection: { marginBottom: 16 },
    inputLabel: { fontSize: 14, fontWeight: '500', color: '#1f2937', marginBottom: 8 },
    textInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1f2937' },
    priceRow: { flexDirection: 'row', gap: 8 },
    currencyButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
    currencyButtonText: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
    priceInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1f2937' },
    currencyDropdown: { marginTop: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
    currencyOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    currencyOptionSelected: { backgroundColor: '#f0f0ff' },
    currencyOptionSymbol: { fontSize: 18, fontWeight: '600', color: '#1f2937', width: 24 },
    currencyOptionText: { flex: 1, fontSize: 14, color: '#4b5563' },
    currencyOptionTextSelected: { color: '#6366f1', fontWeight: '500' },
    footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
    confirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 12 },
    confirmButtonDisabled: { opacity: 0.7 },
    confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
