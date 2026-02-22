/**
 * Shopping Assistant Screen
 * Upload a screenshot or paste a URL to check wardrobe compatibility
 * Story 8.1: Screenshot Product Analysis
 * Story 8.2: URL Product Scraping
 */

import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useShoppingStore, AnalysisProgress } from '../../stores/shoppingStore';

type InputTab = 'screenshot' | 'url';

const PROGRESS_MESSAGES: Record<AnalysisProgress, string> = {
    idle: '',
    uploading: 'Uploading image...',
    scraping: 'Fetching product details...',
    analyzing: 'Analyzing product...',
    confirming: 'Ready for review...',
    scoring: 'Checking wardrobe compatibility...',
    done: 'Done!',
    error: '',
};

export default function ShoppingScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<InputTab>('screenshot');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [urlError, setUrlError] = useState<string | null>(null);

    const {
        isAnalyzing,
        analysisProgress,
        analysisError,
        startAnalysis,
        analyzeUrl,
        clearScan,
    } = useShoppingStore();

    const switchTab = (tab: InputTab) => {
        if (isAnalyzing) return;
        setActiveTab(tab);
        setUrlError(null);
        clearScan();
    };

    // --- Screenshot tab handlers ---

    const pickFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
            clearScan();
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera access is needed to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
            clearScan();
        }
    };

    const handleAnalyzeScreenshot = async () => {
        if (!selectedImage) return;

        await startAnalysis(selectedImage);

        const state = useShoppingStore.getState();
        if (state.analysisProgress === 'confirming') {
            router.push('/(tabs)/scan-confirm');
        }
    };

    // --- URL tab handlers ---

    const handleAnalyzeUrl = async () => {
        const trimmed = urlInput.trim();
        if (!trimmed) {
            setUrlError('Please enter a product URL');
            return;
        }

        setUrlError(null);
        Keyboard.dismiss();

        const { fallbackToScreenshot } = await analyzeUrl(trimmed);

        const state = useShoppingStore.getState();
        if (state.analysisProgress === 'confirming') {
            router.push('/(tabs)/scan-confirm');
        } else if (fallbackToScreenshot) {
            // Error is already set in the store — user can see it and optionally switch tabs
        }
    };

    // --- Shared handlers ---

    const handleRetry = () => {
        clearScan();
        setUrlError(null);
        if (activeTab === 'screenshot' && selectedImage) {
            handleAnalyzeScreenshot();
        } else if (activeTab === 'url' && urlInput.trim()) {
            handleAnalyzeUrl();
        }
    };

    const handleSwitchToScreenshot = () => {
        clearScan();
        setActiveTab('screenshot');
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        clearScan();
                        router.back();
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Check Before You Buy</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerIconButton}
                        onPress={() => router.push('/(tabs)/scan-history')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="time-outline" size={22} color="#1f2937" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerIconButton}
                        onPress={() => router.push('/(tabs)/wishlist')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="heart-outline" size={22} color="#1f2937" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Description */}
            <View style={styles.descSection}>
                <Text style={styles.descText}>
                    Screenshot a product or paste its URL, and we'll tell you how well it matches your wardrobe.
                </Text>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'screenshot' && styles.tabActive]}
                    onPress={() => switchTab('screenshot')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="camera-outline"
                        size={16}
                        color={activeTab === 'screenshot' ? '#6366f1' : '#6b7280'}
                    />
                    <Text style={[styles.tabText, activeTab === 'screenshot' && styles.tabTextActive]}>
                        Screenshot
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'url' && styles.tabActive]}
                    onPress={() => switchTab('url')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="link-outline"
                        size={16}
                        color={activeTab === 'url' ? '#6366f1' : '#6b7280'}
                    />
                    <Text style={[styles.tabText, activeTab === 'url' && styles.tabTextActive]}>
                        Paste URL
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Screenshot Tab Content */}
            {activeTab === 'screenshot' && (
                <>
                    {selectedImage ? (
                        <View style={styles.previewSection}>
                            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                            <TouchableOpacity
                                style={styles.changeImageButton}
                                onPress={() => {
                                    setSelectedImage(null);
                                    clearScan();
                                }}
                            >
                                <Ionicons name="close-circle" size={20} color="#6b7280" />
                                <Text style={styles.changeImageText}>Change image</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.inputSection}>
                            <TouchableOpacity
                                style={styles.inputCard}
                                onPress={pickFromGallery}
                                activeOpacity={0.7}
                            >
                                <View style={styles.inputIconContainer}>
                                    <Ionicons name="images-outline" size={32} color="#6366f1" />
                                </View>
                                <Text style={styles.inputTitle}>Upload Screenshot</Text>
                                <Text style={styles.inputSubtitle}>Pick from your gallery</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.inputCard}
                                onPress={takePhoto}
                                activeOpacity={0.7}
                            >
                                <View style={styles.inputIconContainer}>
                                    <Ionicons name="camera-outline" size={32} color="#6366f1" />
                                </View>
                                <Text style={styles.inputTitle}>Take Photo</Text>
                                <Text style={styles.inputSubtitle}>Snap a product photo</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Analyze Button (Screenshot) */}
                    {selectedImage && !isAnalyzing && analysisProgress !== 'error' && (
                        <View style={styles.analyzeSection}>
                            <TouchableOpacity
                                style={styles.analyzeButton}
                                onPress={handleAnalyzeScreenshot}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="sparkles" size={20} color="#fff" />
                                <Text style={styles.analyzeButtonText}>Analyze Product</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}

            {/* URL Tab Content */}
            {activeTab === 'url' && (
                <>
                    <View style={styles.urlSection}>
                        <View style={[
                            styles.urlInputContainer,
                            urlError ? styles.urlInputError : null,
                        ]}>
                            <Ionicons name="link-outline" size={20} color="#9ca3af" />
                            <TextInput
                                style={styles.urlInput}
                                placeholder="https://www.zara.com/..."
                                placeholderTextColor="#9ca3af"
                                value={urlInput}
                                onChangeText={(text) => {
                                    setUrlInput(text);
                                    if (urlError) setUrlError(null);
                                }}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                                returnKeyType="go"
                                onSubmitEditing={handleAnalyzeUrl}
                                editable={!isAnalyzing}
                            />
                            {urlInput.length > 0 && !isAnalyzing && (
                                <TouchableOpacity onPress={() => { setUrlInput(''); setUrlError(null); }}>
                                    <Ionicons name="close-circle" size={20} color="#9ca3af" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {urlError && (
                            <Text style={styles.urlErrorText}>{urlError}</Text>
                        )}

                        <Text style={styles.supportedSites}>
                            Supports Zara, H&M, ASOS, Mango, Uniqlo, Everlane
                        </Text>
                    </View>

                    {/* Analyze Button (URL) */}
                    {urlInput.trim().length > 0 && !isAnalyzing && analysisProgress !== 'error' && (
                        <View style={styles.analyzeSection}>
                            <TouchableOpacity
                                style={styles.analyzeButton}
                                onPress={handleAnalyzeUrl}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="sparkles" size={20} color="#fff" />
                                <Text style={styles.analyzeButtonText}>Analyze Product</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}

            {/* Loading State */}
            {isAnalyzing && (
                <View style={styles.loadingSection}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color="#6366f1" />
                        <Text style={styles.loadingText}>
                            {PROGRESS_MESSAGES[analysisProgress]}
                        </Text>
                        <View style={styles.progressDots}>
                            {activeTab === 'screenshot' ? (
                                <>
                                    <View style={[styles.dot, analysisProgress === 'uploading' && styles.dotActive]} />
                                    <View style={[styles.dot, analysisProgress === 'analyzing' && styles.dotActive]} />
                                    <View style={[styles.dot, analysisProgress === 'scoring' && styles.dotActive]} />
                                </>
                            ) : (
                                <>
                                    <View style={[styles.dot, analysisProgress === 'scraping' && styles.dotActive]} />
                                    <View style={[styles.dot, analysisProgress === 'analyzing' && styles.dotActive]} />
                                    <View style={[styles.dot, analysisProgress === 'scoring' && styles.dotActive]} />
                                </>
                            )}
                        </View>
                    </View>
                </View>
            )}

            {/* Error State */}
            {analysisProgress === 'error' && analysisError && (
                <View style={styles.errorSection}>
                    <View style={styles.errorCard}>
                        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                        <Text style={styles.errorText}>{analysisError}</Text>
                        <View style={styles.errorActions}>
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={handleRetry}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="refresh" size={18} color="#6366f1" />
                                <Text style={styles.retryButtonText}>Try Again</Text>
                            </TouchableOpacity>
                            {activeTab === 'url' && (
                                <TouchableOpacity
                                    style={styles.switchButton}
                                    onPress={handleSwitchToScreenshot}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="camera-outline" size={18} color="#5D4E37" />
                                    <Text style={styles.switchButtonText}>Try Screenshot</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            )}

            {/* Tips */}
            {activeTab === 'screenshot' && !selectedImage && !isAnalyzing && analysisProgress !== 'error' && (
                <View style={styles.tipsSection}>
                    <Text style={styles.tipsTitle}>Tips for best results</Text>
                    <View style={styles.tipRow}>
                        <Ionicons name="checkmark-circle" size={18} color="#7D9A78" />
                        <Text style={styles.tipText}>Use clear product photos with good lighting</Text>
                    </View>
                    <View style={styles.tipRow}>
                        <Ionicons name="checkmark-circle" size={18} color="#7D9A78" />
                        <Text style={styles.tipText}>One item per photo works best</Text>
                    </View>
                    <View style={styles.tipRow}>
                        <Ionicons name="checkmark-circle" size={18} color="#7D9A78" />
                        <Text style={styles.tipText}>Screenshots from shopping apps work great</Text>
                    </View>
                </View>
            )}

            {activeTab === 'url' && !isAnalyzing && analysisProgress !== 'error' && (
                <View style={styles.tipsSection}>
                    <Text style={styles.tipsTitle}>How it works</Text>
                    <View style={styles.tipRow}>
                        <Ionicons name="copy-outline" size={18} color="#7D9A78" />
                        <Text style={styles.tipText}>Copy the product URL from your browser or app</Text>
                    </View>
                    <View style={styles.tipRow}>
                        <Ionicons name="link-outline" size={18} color="#7D9A78" />
                        <Text style={styles.tipText}>Paste it above and tap Analyze</Text>
                    </View>
                    <View style={styles.tipRow}>
                        <Ionicons name="sparkles-outline" size={18} color="#7D9A78" />
                        <Text style={styles.tipText}>We'll extract product details and check your wardrobe</Text>
                    </View>
                </View>
            )}
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
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    headerIconButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    descSection: {
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    descText: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        textAlign: 'center',
    },

    // Tab Switcher
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 24,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    tabActive: {
        backgroundColor: '#eef2ff',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
    },
    tabTextActive: {
        color: '#6366f1',
        fontWeight: '600',
    },

    // Screenshot tab
    inputSection: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 24,
    },
    inputCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    inputIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    inputTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    inputSubtitle: {
        fontSize: 12,
        color: '#6b7280',
    },
    previewSection: {
        paddingHorizontal: 24,
        marginBottom: 24,
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: 300,
        borderRadius: 16,
        backgroundColor: '#e5e7eb',
    },
    changeImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 6,
    },
    changeImageText: {
        fontSize: 14,
        color: '#6b7280',
    },

    // URL tab
    urlSection: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    urlInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 4,
        gap: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    urlInputError: {
        borderColor: '#ef4444',
    },
    urlInput: {
        flex: 1,
        fontSize: 15,
        color: '#1f2937',
        paddingVertical: 12,
    },
    urlErrorText: {
        fontSize: 13,
        color: '#ef4444',
        marginTop: 6,
        marginLeft: 4,
    },
    supportedSites: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 10,
        textAlign: 'center',
    },

    // Shared
    analyzeSection: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    analyzeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366f1',
        borderRadius: 14,
        padding: 16,
        gap: 8,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    analyzeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    loadingSection: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    loadingCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    loadingText: {
        fontSize: 15,
        color: '#6366f1',
        fontWeight: '500',
        marginTop: 16,
    },
    progressDots: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 16,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#e5e7eb',
    },
    dotActive: {
        backgroundColor: '#6366f1',
    },
    errorSection: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    errorCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    errorText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 16,
        lineHeight: 20,
    },
    errorActions: {
        flexDirection: 'row',
        gap: 10,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eef2ff',
        borderRadius: 10,
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 6,
    },
    retryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
    },
    switchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F0E8',
        borderRadius: 10,
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 6,
    },
    switchButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5D4E37',
    },
    tipsSection: {
        backgroundColor: '#fff',
        marginHorizontal: 24,
        borderRadius: 16,
        padding: 20,
    },
    tipsTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    tipText: {
        fontSize: 13,
        color: '#6b7280',
        flex: 1,
    },
});
