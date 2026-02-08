/**
 * Item Detail Screen
 * Story 2.6: Full item view with edit, delete, favorite, and swipe navigation
 */

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
    Dimensions,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { itemsService, WardrobeItem } from '../../services/items';
import { wearLogService } from '../../services/wearLogService';
import { WearLog } from '../../types/wearLog';
import { COLORS, CATEGORIES } from '../../services/aiCategorization';
import { getCPWResult, formatCPWBreakdown } from '../../utils/cpwCalculator';
import { isNeglected, formatNeglectedLabel } from '../../utils/neglectedItems';
import ListingGeneratorModal from '../../components/features/ListingGeneratorModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;
}

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All-Season'];
const OCCASIONS = ['Casual', 'Work', 'Formal', 'Sport', 'Night Out'];

export default function ItemDetailScreen() {
    const router = useRouter();
    const { itemId, itemIds, openListing } = useLocalSearchParams<{ itemId: string; itemIds?: string; openListing?: string }>();

    const [item, setItem] = useState<WardrobeItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [wearHistory, setWearHistory] = useState<WearLog[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [showListingModal, setShowListingModal] = useState(false);

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editBrand, setEditBrand] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editSeasons, setEditSeasons] = useState<string[]>([]);
    const [editOccasions, setEditOccasions] = useState<string[]>([]);

    // Navigation state for swipe
    const allItemIds = itemIds ? JSON.parse(itemIds) : [];
    const currentIndex = allItemIds.indexOf(itemId);

    const loadItem = useCallback(async () => {
        if (!itemId) return;

        setIsLoading(true);
        const { item: fetchedItem, error } = await itemsService.getItem(itemId);

        if (error) {
            Alert.alert('Error', 'Failed to load item details');
            router.back();
            return;
        }

        if (fetchedItem) {
            setItem(fetchedItem);
            // Initialize edit form
            setEditName(fetchedItem.name || '');
            setEditBrand(fetchedItem.brand || '');
            setEditPrice(fetchedItem.purchase_price?.toString() || '');
            setEditSeasons(fetchedItem.seasons || []);
            setEditOccasions(fetchedItem.occasions || []);
        }

        setIsLoading(false);
    }, [itemId]);

    const loadWearHistory = useCallback(async () => {
        if (!itemId) return;
        setIsLoadingHistory(true);
        const { logs } = await wearLogService.getWearHistoryForItem(itemId);
        setWearHistory(logs);
        setIsLoadingHistory(false);
    }, [itemId]);

    useEffect(() => {
        loadItem();
        loadWearHistory();
    }, [loadItem, loadWearHistory]);

    // Auto-open listing modal when navigated with openListing param
    useEffect(() => {
        if (openListing === '1' && item && !isLoading) {
            setShowListingModal(true);
        }
    }, [openListing, item, isLoading]);

    const handleDeleteWearLog = (logId: string) => {
        Alert.alert(
            'Delete Wear Log',
            'Remove this wear log entry?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await wearLogService.deleteWearLog(logId);
                        if (error) {
                            Alert.alert('Error', 'Failed to delete wear log');
                        } else {
                            // Refresh both history and item (wear_count updated by trigger)
                            loadWearHistory();
                            loadItem();
                        }
                    },
                },
            ]
        );
    };

    const handleToggleFavorite = async () => {
        if (!item) return;

        const newFavoriteStatus = !item.is_favorite;
        // Optimistic update
        setItem({ ...item, is_favorite: newFavoriteStatus });

        const { error } = await itemsService.toggleFavorite(item.id, newFavoriteStatus);
        if (error) {
            // Revert on error
            setItem({ ...item, is_favorite: !newFavoriteStatus });
            Alert.alert('Error', 'Failed to update favorite status');
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Item',
            'Are you sure you want to delete this item? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!item) return;
                        const { error } = await itemsService.deleteItem(item.id);
                        if (error) {
                            Alert.alert('Error', 'Failed to delete item');
                        } else {
                            router.back();
                        }
                    },
                },
            ]
        );
    };

    const handleSaveEdit = async () => {
        if (!item) return;

        setIsSaving(true);
        const { item: updatedItem, error } = await itemsService.updateItem(item.id, {
            name: editName || undefined,
            brand: editBrand || undefined,
            purchase_price: editPrice ? parseFloat(editPrice) : undefined,
            seasons: editSeasons,
            occasions: editOccasions,
        });

        setIsSaving(false);

        if (error) {
            Alert.alert('Error', 'Failed to save changes');
        } else if (updatedItem) {
            setItem(updatedItem);
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        if (!item) return;
        // Reset form to original values
        setEditName(item.name || '');
        setEditBrand(item.brand || '');
        setEditPrice(item.purchase_price?.toString() || '');
        setEditSeasons(item.seasons || []);
        setEditOccasions(item.occasions || []);
        setIsEditing(false);
    };

    const toggleSeason = (season: string) => {
        setEditSeasons(prev =>
            prev.includes(season)
                ? prev.filter(s => s !== season)
                : [...prev, season]
        );
    };

    const toggleOccasion = (occasion: string) => {
        setEditOccasions(prev =>
            prev.includes(occasion)
                ? prev.filter(o => o !== occasion)
                : [...prev, occasion]
        );
    };

    const navigateToItem = (direction: 'prev' | 'next') => {
        if (allItemIds.length === 0) return;

        const newIndex = direction === 'prev'
            ? Math.max(0, currentIndex - 1)
            : Math.min(allItemIds.length - 1, currentIndex + 1);

        if (newIndex !== currentIndex) {
            router.replace({
                pathname: '/(tabs)/item-detail',
                params: { itemId: allItemIds[newIndex], itemIds: JSON.stringify(allItemIds) },
            });
        }
    };

    const getColorHex = (colorName: string) => {
        const color = COLORS.find(c => c.name.toLowerCase() === colorName.toLowerCase());
        return color?.hex || '#808080';
    };

    const imageUrl = item?.processed_image_url || item?.image_url;

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Item Details</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            </View>
        );
    }

    if (!item) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Item Details</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>Item not found</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{item.name || 'Item Details'}</Text>
                <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteButton}>
                    <Ionicons
                        name={item.is_favorite ? "heart" : "heart-outline"}
                        size={24}
                        color={item.is_favorite ? "#ef4444" : "#1f2937"}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Image Section */}
                <TouchableOpacity
                    style={styles.imageContainer}
                    onPress={() => setShowImageModal(true)}
                    activeOpacity={0.9}
                >
                    {imageUrl ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.itemImage}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={styles.noImagePlaceholder}>
                            <Ionicons name="image-outline" size={64} color="#d1d5db" />
                        </View>
                    )}
                    <View style={styles.zoomHint}>
                        <Ionicons name="expand-outline" size={16} color="#6b7280" />
                        <Text style={styles.zoomHintText}>Tap to zoom</Text>
                    </View>
                </TouchableOpacity>

                {/* Navigation Arrows */}
                {allItemIds.length > 1 && (
                    <View style={styles.navigationRow}>
                        <TouchableOpacity
                            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                            onPress={() => navigateToItem('prev')}
                            disabled={currentIndex === 0}
                        >
                            <Ionicons name="chevron-back" size={20} color={currentIndex === 0 ? '#d1d5db' : '#6366f1'} />
                            <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>Previous</Text>
                        </TouchableOpacity>
                        <Text style={styles.navCounter}>{currentIndex + 1} / {allItemIds.length}</Text>
                        <TouchableOpacity
                            style={[styles.navButton, currentIndex === allItemIds.length - 1 && styles.navButtonDisabled]}
                            onPress={() => navigateToItem('next')}
                            disabled={currentIndex === allItemIds.length - 1}
                        >
                            <Text style={[styles.navButtonText, currentIndex === allItemIds.length - 1 && styles.navButtonTextDisabled]}>Next</Text>
                            <Ionicons name="chevron-forward" size={20} color={currentIndex === allItemIds.length - 1 ? '#d1d5db' : '#6366f1'} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Statistics Card */}
                <View style={styles.statsCard}>
                    <Text style={styles.cardTitle}>Statistics</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{item.wear_count || 0}</Text>
                            <Text style={styles.statLabel}>Times Worn</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {item.last_worn_at
                                    ? new Date(item.last_worn_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    : 'Never'}
                            </Text>
                            <Text style={styles.statLabel}>Last Worn</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {item.created_at
                                    ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                    : '-'}
                            </Text>
                            <Text style={styles.statLabel}>Added</Text>
                        </View>
                    </View>
                </View>

                {/* Cost Per Wear Card */}
                {(() => {
                    const cpw = getCPWResult(item.purchase_price, item.wear_count);
                    return (
                        <View style={styles.cpwCard}>
                            <Text style={styles.cardTitle}>Cost Per Wear</Text>
                            {cpw.value !== null ? (
                                <>
                                    <View style={styles.cpwValueRow}>
                                        <Text style={[styles.cpwValue, { color: cpw.color }]}>
                                            {cpw.formatted}/wear
                                        </Text>
                                        <View style={[styles.cpwLabelBadge, { backgroundColor: cpw.color + '20' }]}>
                                            <Text style={[styles.cpwLabelText, { color: cpw.color }]}>
                                                {cpw.label}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.cpwBreakdown}>
                                        {formatCPWBreakdown(item.purchase_price!, item.wear_count)}
                                    </Text>
                                    {cpw.colorName === 'red' && (
                                        <Text style={styles.cpwHint}>Keep wearing to reduce your cost per wear!</Text>
                                    )}
                                    {cpw.colorName === 'green' && (
                                        <Text style={styles.cpwCelebration}>This item is great value! 🎉</Text>
                                    )}
                                </>
                            ) : (
                                <View style={styles.cpwEmpty}>
                                    <Ionicons name="pricetag-outline" size={20} color="#9ca3af" />
                                    <Text style={styles.cpwEmptyText}>
                                        Add a purchase price to track cost per wear
                                    </Text>
                                </View>
                            )}
                        </View>
                    );
                })()}

                {/* Neglected Item Actions */}
                {isNeglected(item) && (
                    <View style={styles.neglectedCard}>
                        <View style={styles.neglectedHeader}>
                            <Ionicons name="moon-outline" size={18} color="#f59e0b" />
                            <Text style={styles.neglectedTitle}>
                                {formatNeglectedLabel(item)}
                            </Text>
                        </View>
                        <Text style={styles.neglectedHint}>
                            Rediscover this item or consider letting it go
                        </Text>
                        <View style={styles.neglectedActions}>
                            <TouchableOpacity
                                style={styles.suggestOutfitButton}
                                onPress={() => router.push({
                                    pathname: '/(tabs)/outfits/builder',
                                    params: { requiredItem: item.id },
                                })}
                            >
                                <Ionicons name="sparkles-outline" size={16} color="#fff" />
                                <Text style={styles.suggestOutfitText}>Suggest Outfit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.resaleButton}
                                onPress={() => setShowListingModal(true)}
                            >
                                <Ionicons name="pricetag-outline" size={16} color="#22c55e" />
                                <Text style={[styles.resaleButtonText, { color: '#22c55e' }]}>Generate Listing</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Wear History Card */}
                <View style={styles.wearHistoryCard}>
                    <Text style={styles.cardTitle}>Wear History</Text>
                    {isLoadingHistory ? (
                        <ActivityIndicator size="small" color="#6366f1" style={{ paddingVertical: 16 }} />
                    ) : wearHistory.length === 0 ? (
                        <Text style={styles.noHistoryText}>No wear logs yet</Text>
                    ) : (
                        <>
                            <Text style={styles.wearSummary}>
                                Worn {wearHistory.length} time{wearHistory.length !== 1 ? 's' : ''}
                                {wearHistory[0] && ` \u2022 Last worn ${formatRelativeDate(wearHistory[0].worn_date)}`}
                            </Text>
                            {wearHistory.slice(0, 10).map(log => (
                                <View key={log.id} style={styles.wearLogRow}>
                                    <View style={styles.wearLogInfo}>
                                        <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                                        <Text style={styles.wearLogDate}>
                                            {new Date(log.worn_date + 'T00:00:00').toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteWearLog(log.id)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {wearHistory.length > 10 && (
                                <Text style={styles.moreLogsText}>
                                    +{wearHistory.length - 10} more entries
                                </Text>
                            )}
                        </>
                    )}
                </View>

                {/* Details Card */}
                <View style={styles.detailsCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Details</Text>
                        {!isEditing ? (
                            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
                                <Ionicons name="pencil" size={16} color="#6366f1" />
                                <Text style={styles.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.editActions}>
                                <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSaveEdit}
                                    style={styles.saveButton}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {isEditing ? (
                        /* Edit Mode */
                        <View style={styles.editForm}>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder="Item name"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Brand</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={editBrand}
                                    onChangeText={setEditBrand}
                                    placeholder="Brand name"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Purchase Price</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={editPrice}
                                    onChangeText={setEditPrice}
                                    placeholder="0.00"
                                    placeholderTextColor="#9ca3af"
                                    keyboardType="decimal-pad"
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Seasons</Text>
                                <View style={styles.chipRow}>
                                    {SEASONS.map(season => (
                                        <TouchableOpacity
                                            key={season}
                                            style={[styles.chip, editSeasons.includes(season) && styles.chipSelected]}
                                            onPress={() => toggleSeason(season)}
                                        >
                                            <Text style={[styles.chipText, editSeasons.includes(season) && styles.chipTextSelected]}>
                                                {season}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Occasions</Text>
                                <View style={styles.chipRow}>
                                    {OCCASIONS.map(occasion => (
                                        <TouchableOpacity
                                            key={occasion}
                                            style={[styles.chip, editOccasions.includes(occasion) && styles.chipSelected]}
                                            onPress={() => toggleOccasion(occasion)}
                                        >
                                            <Text style={[styles.chipText, editOccasions.includes(occasion) && styles.chipTextSelected]}>
                                                {occasion}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    ) : (
                        /* View Mode */
                        <View style={styles.detailsList}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Name</Text>
                                <Text style={styles.detailValue}>{item.name || 'Unnamed'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Brand</Text>
                                <Text style={styles.detailValue}>{item.brand || 'Unknown'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Category</Text>
                                <Text style={styles.detailValue}>
                                    {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : '-'}
                                    {item.sub_category && ` / ${item.sub_category}`}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Colors</Text>
                                <View style={styles.colorDots}>
                                    {item.colors?.map(color => (
                                        <View
                                            key={color}
                                            style={[styles.colorDot, { backgroundColor: getColorHex(color) }]}
                                        />
                                    )) || <Text style={styles.detailValue}>-</Text>}
                                </View>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Price</Text>
                                <Text style={styles.detailValue}>
                                    {item.purchase_price ? `$${item.purchase_price.toFixed(2)}` : '-'}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Seasons</Text>
                                <Text style={styles.detailValue}>
                                    {item.seasons?.join(', ') || '-'}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Occasions</Text>
                                <Text style={styles.detailValue}>
                                    {item.occasions?.join(', ') || '-'}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Generate Listing Button */}
                <TouchableOpacity
                    style={styles.generateListingButton}
                    onPress={() => setShowListingModal(true)}
                >
                    <Ionicons name="pricetag" size={18} color="#22c55e" />
                    <Text style={styles.generateListingText}>Generate Resale Listing</Text>
                    <Ionicons name="chevron-forward" size={18} color="#86efac" />
                </TouchableOpacity>

                {/* Delete Button */}
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={styles.deleteButtonText}>Delete Item</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Fullscreen Image Modal */}
            <Modal visible={showImageModal} transparent animationType="fade">
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        style={styles.modalCloseButton}
                        onPress={() => setShowImageModal(false)}
                    >
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    {imageUrl && (
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.fullscreenImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* Listing Generator Modal */}
            <ListingGeneratorModal
                visible={showListingModal}
                item={item}
                onDismiss={() => setShowListingModal(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 16
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 12,
    },
    favoriteButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    errorText: {
        fontSize: 16,
        color: '#6b7280'
    },
    // Image
    imageContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    itemImage: {
        width: '100%',
        height: 320,
        backgroundColor: '#f9fafb',
    },
    noImagePlaceholder: {
        width: '100%',
        height: 320,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6'
    },
    zoomHint: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20
    },
    zoomHintText: {
        fontSize: 12,
        color: '#6b7280',
        marginLeft: 4
    },
    // Navigation
    navigationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8
    },
    navButtonDisabled: {
        opacity: 0.5
    },
    navButtonText: {
        fontSize: 14,
        color: '#6366f1',
        fontWeight: '500'
    },
    navButtonTextDisabled: {
        color: '#d1d5db'
    },
    navCounter: {
        fontSize: 14,
        color: '#6b7280'
    },
    // Stats Card
    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center'
    },
    statItem: {
        alignItems: 'center',
        flex: 1
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#6366f1'
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#e5e7eb'
    },
    // Details Card
    detailsCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    editButtonText: {
        fontSize: 14,
        color: '#6366f1',
        marginLeft: 4,
        fontWeight: '500'
    },
    editActions: {
        flexDirection: 'row',
        gap: 8
    },
    cancelButton: {
        paddingHorizontal: 12,
        paddingVertical: 6
    },
    cancelButtonText: {
        fontSize: 14,
        color: '#6b7280'
    },
    saveButton: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600'
    },
    // Detail List
    detailsList: {},
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6'
    },
    detailLabel: {
        fontSize: 14,
        color: '#6b7280'
    },
    detailValue: {
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '500',
        maxWidth: '60%',
        textAlign: 'right',
    },
    colorDots: {
        flexDirection: 'row',
        gap: 6
    },
    colorDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb'
    },
    // Edit Form
    editForm: {},
    formGroup: {
        marginBottom: 16
    },
    formLabel: {
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '500',
        marginBottom: 8
    },
    textInput: {
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1f2937',
        borderWidth: 1,
        borderColor: '#e5e7eb'
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb'
    },
    chipSelected: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1'
    },
    chipText: {
        fontSize: 13,
        color: '#6b7280'
    },
    chipTextSelected: {
        color: '#fff'
    },
    // Delete
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
        backgroundColor: '#fef2f2'
    },
    deleteButtonText: {
        fontSize: 15,
        color: '#ef4444',
        fontWeight: '500',
        marginLeft: 8
    },
    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalCloseButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 20,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
    },
    fullscreenImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * 1.2
    },
    // Cost Per Wear
    cpwCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    cpwValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    cpwValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    cpwLabelBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    cpwLabelText: {
        fontSize: 12,
        fontWeight: '600',
    },
    cpwBreakdown: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    cpwHint: {
        fontSize: 13,
        color: '#ef4444',
        marginTop: 6,
        fontStyle: 'italic',
    },
    cpwCelebration: {
        fontSize: 13,
        color: '#22c55e',
        marginTop: 6,
        fontWeight: '500',
    },
    cpwEmpty: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
    },
    cpwEmptyText: {
        fontSize: 14,
        color: '#9ca3af',
        flex: 1,
    },
    // Neglected Item Actions
    neglectedCard: {
        backgroundColor: '#fffbeb',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#fde68a',
    },
    neglectedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    neglectedTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400e',
    },
    neglectedHint: {
        fontSize: 13,
        color: '#b45309',
        marginBottom: 14,
    },
    neglectedActions: {
        flexDirection: 'row',
        gap: 10,
    },
    suggestOutfitButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#6366f1',
        paddingVertical: 12,
        borderRadius: 10,
    },
    suggestOutfitText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    resaleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#f3f4f6',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    resaleButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#22c55e',
    },
    // Generate Listing
    generateListingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        marginBottom: 16,
    },
    generateListingText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#16a34a',
        flex: 1,
    },
    // Wear History
    wearHistoryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    noHistoryText: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        paddingVertical: 12,
    },
    wearSummary: {
        fontSize: 14,
        color: '#6366f1',
        fontWeight: '500',
        marginBottom: 12,
    },
    wearLogRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    wearLogInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    wearLogDate: {
        fontSize: 14,
        color: '#1f2937',
    },
    moreLogsText: {
        fontSize: 13,
        color: '#9ca3af',
        textAlign: 'center',
        paddingTop: 10,
    },
});
