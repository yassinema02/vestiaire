/**
 * Scan Confirmation Screen
 * Allows user to review and edit AI-extracted product data before scoring
 * Story 8.3: AI Product Extraction with Manual Fallback
 */

import { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useShoppingStore } from '../../stores/shoppingStore';
import {
    ProductAnalysis,
    CATEGORY_OPTIONS,
    STYLE_OPTIONS,
    PATTERN_OPTIONS,
    SEASON_OPTIONS,
} from '../../types/shopping';

function ChipSelector({
    label,
    options,
    selected,
    onSelect,
    required,
    error,
}: {
    label: string;
    options: readonly string[];
    selected: string;
    onSelect: (value: string) => void;
    required?: boolean;
    error?: string | null;
}) {
    return (
        <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
                {label}{required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.chipRow}>
                {options.map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[styles.chip, selected === option && styles.chipSelected]}
                        onPress={() => onSelect(option)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.chipText, selected === option && styles.chipTextSelected]}>
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {error && <Text style={styles.fieldError}>{error}</Text>}
        </View>
    );
}

function MultiChipSelector({
    label,
    options,
    selected,
    onToggle,
}: {
    label: string;
    options: readonly string[];
    selected: string[];
    onToggle: (value: string) => void;
}) {
    return (
        <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={styles.chipRow}>
                {options.map((option) => {
                    const isSelected = selected.includes(option);
                    return (
                        <TouchableOpacity
                            key={option}
                            style={[styles.chip, isSelected && styles.chipSelected]}
                            onPress={() => onToggle(option)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const FORMALITY_LABELS: Record<number, string> = {
    1: 'Very Casual',
    2: 'Casual',
    3: 'Relaxed',
    4: 'Smart Casual',
    5: 'Neutral',
    6: 'Polished',
    7: 'Business',
    8: 'Dressy',
    9: 'Formal',
    10: 'Black Tie',
};

export default function ScanConfirmScreen() {
    const router = useRouter();
    const {
        currentAnalysis,
        scrapedImageUrl,
        uploadedImageUrl,
        isAnalyzing,
        analysisProgress,
        confirmAndScore,
        clearScan,
    } = useShoppingStore();

    const isManualMode = !currentAnalysis || (currentAnalysis.confidence < 0.3);
    const imageUrl = uploadedImageUrl || scrapedImageUrl;

    // Form state — initialized from AI analysis or empty defaults
    const [name, setName] = useState(currentAnalysis?.product_name || '');
    const [brand, setBrand] = useState(currentAnalysis?.product_brand || '');
    const [category, setCategory] = useState(currentAnalysis?.category || '');
    const [color, setColor] = useState(currentAnalysis?.color || '');
    const [style, setStyle] = useState(currentAnalysis?.style || '');
    const [pattern, setPattern] = useState(currentAnalysis?.pattern || 'solid');
    const [formality, setFormality] = useState(currentAnalysis?.formality ?? 5);
    const [season, setSeason] = useState<string[]>(currentAnalysis?.season || []);
    const [categoryError, setCategoryError] = useState<string | null>(null);

    // Track if user made any edits
    const hasEdits = useMemo(() => {
        if (!currentAnalysis) return true; // Manual mode = always "edited"
        return (
            name !== currentAnalysis.product_name ||
            brand !== (currentAnalysis.product_brand || '') ||
            category !== currentAnalysis.category ||
            color !== currentAnalysis.color ||
            style !== currentAnalysis.style ||
            pattern !== currentAnalysis.pattern ||
            formality !== currentAnalysis.formality ||
            JSON.stringify(season) !== JSON.stringify(currentAnalysis.season)
        );
    }, [name, brand, category, color, style, pattern, formality, season, currentAnalysis]);

    const toggleSeason = (s: string) => {
        setSeason((prev) =>
            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
        );
    };

    const handleConfirm = async () => {
        // Validate required field
        if (!category) {
            setCategoryError('Please select a category');
            return;
        }
        setCategoryError(null);

        const finalAnalysis: ProductAnalysis = {
            product_name: name || 'Product',
            product_brand: brand || null,
            category,
            color: color || 'Unknown',
            secondary_colors: currentAnalysis?.secondary_colors || [],
            style: style || 'casual',
            material: currentAnalysis?.material || null,
            pattern: pattern || 'solid',
            season,
            formality,
            confidence: currentAnalysis?.confidence ?? 0.5,
            user_edited: hasEdits,
        };

        await confirmAndScore(finalAnalysis);

        const state = useShoppingStore.getState();
        if (state.analysisProgress === 'done' && state.currentScan) {
            router.push('/(tabs)/scan-results');
        }
    };

    const handleStartOver = () => {
        clearScan();
        router.replace('/(tabs)/shopping');
    };

    // Show scoring loading state
    if (isAnalyzing && analysisProgress === 'scoring') {
        return (
            <View style={[styles.container, styles.centerContainer]}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.scoringText}>Checking wardrobe compatibility...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleStartOver}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Confirm Details</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* AI Badge or Manual Warning */}
            {isManualMode ? (
                <View style={styles.warningBadge}>
                    <Ionicons name="alert-circle-outline" size={20} color="#f97316" />
                    <Text style={styles.warningText}>
                        We couldn't identify this automatically. Help us out by filling in some details.
                    </Text>
                </View>
            ) : (
                <View style={styles.aiBadge}>
                    <Ionicons name="sparkles" size={16} color="#6366f1" />
                    <Text style={styles.aiBadgeText}>AI extracted this data</Text>
                </View>
            )}

            {/* Product Image */}
            {imageUrl && (
                <View style={styles.imageSection}>
                    <Image source={{ uri: imageUrl }} style={styles.productImage} />
                </View>
            )}

            {/* Form Fields */}
            <View style={styles.formSection}>
                {/* Product Name */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Product Name</Text>
                    <TextInput
                        style={styles.textInput}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Linen Cotton Shirt"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Brand */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Brand</Text>
                    <TextInput
                        style={styles.textInput}
                        value={brand}
                        onChangeText={setBrand}
                        placeholder="e.g. Zara"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Category (required) */}
                <ChipSelector
                    label="Category"
                    options={CATEGORY_OPTIONS}
                    selected={category}
                    onSelect={(v) => { setCategory(v); setCategoryError(null); }}
                    required
                    error={categoryError}
                />

                {/* Color */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Color</Text>
                    <TextInput
                        style={styles.textInput}
                        value={color}
                        onChangeText={setColor}
                        placeholder="e.g. Beige"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Style */}
                <ChipSelector
                    label="Style"
                    options={STYLE_OPTIONS}
                    selected={style}
                    onSelect={setStyle}
                />

                {/* Pattern */}
                <ChipSelector
                    label="Pattern"
                    options={PATTERN_OPTIONS}
                    selected={pattern}
                    onSelect={setPattern}
                />

                {/* Formality Slider */}
                <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>
                        Formality: {FORMALITY_LABELS[formality] || formality}
                    </Text>
                    <View style={styles.formalityRow}>
                        <Text style={styles.formalityEndLabel}>Casual</Text>
                        <View style={styles.formalitySlider}>
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                                <TouchableOpacity
                                    key={level}
                                    style={[
                                        styles.formalityDot,
                                        level <= formality && styles.formalityDotActive,
                                    ]}
                                    onPress={() => setFormality(level)}
                                    activeOpacity={0.7}
                                />
                            ))}
                        </View>
                        <Text style={styles.formalityEndLabel}>Formal</Text>
                    </View>
                </View>

                {/* Season (multi-select) */}
                <MultiChipSelector
                    label="Season"
                    options={SEASON_OPTIONS}
                    selected={season}
                    onToggle={toggleSeason}
                />
            </View>

            {/* Actions */}
            <View style={styles.actionsSection}>
                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirm}
                    activeOpacity={0.8}
                >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.confirmButtonText}>Looks Good</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.startOverButton}
                    onPress={handleStartOver}
                    activeOpacity={0.8}
                >
                    <Text style={styles.startOverText}>Start Over</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    contentContainer: {
        paddingTop: 60,
        paddingBottom: 120,
    },
    centerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    scoringText: {
        fontSize: 15,
        color: '#6366f1',
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
    },

    // AI Badge
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: '#eef2ff',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        gap: 6,
        marginBottom: 16,
    },
    aiBadgeText: {
        fontSize: 13,
        color: '#6366f1',
        fontWeight: '500',
    },

    // Warning Badge
    warningBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 24,
        backgroundColor: '#fff7ed',
        borderRadius: 12,
        padding: 14,
        gap: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#fed7aa',
    },
    warningText: {
        fontSize: 13,
        color: '#9a3412',
        flex: 1,
        lineHeight: 18,
    },

    // Image
    imageSection: {
        paddingHorizontal: 24,
        marginBottom: 20,
        alignItems: 'center',
    },
    productImage: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        backgroundColor: '#e5e7eb',
    },

    // Form
    formSection: {
        paddingHorizontal: 24,
        gap: 4,
    },
    fieldContainer: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4b5563',
        marginBottom: 8,
    },
    required: {
        color: '#ef4444',
    },
    fieldError: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
    },
    textInput: {
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1f2937',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },

    // Chips
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    chipSelected: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
    chipText: {
        fontSize: 13,
        color: '#4b5563',
    },
    chipTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },

    // Formality
    formalityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    formalitySlider: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    formalityDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#e5e7eb',
    },
    formalityDotActive: {
        backgroundColor: '#6366f1',
    },
    formalityEndLabel: {
        fontSize: 11,
        color: '#9ca3af',
        fontWeight: '500',
    },

    // Actions
    actionsSection: {
        paddingHorizontal: 24,
        marginTop: 8,
        gap: 12,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10b981',
        borderRadius: 14,
        padding: 16,
        gap: 8,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    startOverButton: {
        alignItems: 'center',
        padding: 14,
    },
    startOverText: {
        fontSize: 15,
        color: '#6b7280',
        fontWeight: '500',
    },
});
