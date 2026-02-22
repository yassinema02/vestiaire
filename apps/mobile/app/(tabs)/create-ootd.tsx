/**
 * Create OOTD Post Screen
 * Photo capture/gallery, item tagging, caption, squad selection.
 * Story 9.2: OOTD Posting Flow
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
    FlatList,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSocialStore } from '../../stores/socialStore';
import { itemsService, WardrobeItem } from '../../services/items';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_HEIGHT = SCREEN_WIDTH * 0.75;

export default function CreateOotdScreen() {
    const router = useRouter();
    const { squads, createOotdPost, isPostingOotd, loadMySquads } = useSocialStore();

    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [selectedSquadIds, setSelectedSquadIds] = useState<string[]>([]);
    const [taggedItems, setTaggedItems] = useState<WardrobeItem[]>([]);
    const [showItemPicker, setShowItemPicker] = useState(false);
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);

    useEffect(() => {
        loadMySquads();
        itemsService.getItems().then(({ items }) => setWardrobeItems(items));
    }, []);

    // Pre-select all squads
    useEffect(() => {
        if (squads.length > 0 && selectedSquadIds.length === 0) {
            setSelectedSquadIds(squads.map((s) => s.id));
        }
    }, [squads]);

    const canPost = photoUri && selectedSquadIds.length > 0 && !isPostingOotd;

    const handleCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera access is required to take a photo.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [3, 4],
        });
        if (!result.canceled && result.assets[0]) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Gallery access is required to select a photo.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [3, 4],
        });
        if (!result.canceled && result.assets[0]) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const toggleSquad = (squadId: string) => {
        setSelectedSquadIds((prev) =>
            prev.includes(squadId)
                ? prev.filter((id) => id !== squadId)
                : [...prev, squadId]
        );
    };

    const toggleItemTag = (item: WardrobeItem) => {
        setTaggedItems((prev) =>
            prev.some((i) => i.id === item.id)
                ? prev.filter((i) => i.id !== item.id)
                : [...prev, item]
        );
    };

    const handlePost = async () => {
        if (!canPost || !photoUri) return;

        const { error } = await createOotdPost({
            photo_uri: photoUri,
            caption: caption.trim() || undefined,
            tagged_item_ids: taggedItems.length > 0
                ? taggedItems.map((i) => i.id)
                : undefined,
            squad_ids: selectedSquadIds,
        });

        if (error) {
            Alert.alert('Error', error);
            return;
        }

        Alert.alert('Posted!', 'Your OOTD has been shared with your squad(s).', [
            { text: 'OK', onPress: () => router.back() },
        ]);
    };

    const renderItemPickerModal = () => (
        <Modal
            visible={showItemPicker}
            animationType="slide"
            presentationStyle="pageSheet"
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Tag Items</Text>
                    <TouchableOpacity onPress={() => setShowItemPicker(false)}>
                        <Text style={styles.modalDone}>Done</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={wardrobeItems}
                    numColumns={3}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.itemGrid}
                    renderItem={({ item }) => {
                        const isSelected = taggedItems.some((t) => t.id === item.id);
                        return (
                            <TouchableOpacity
                                style={[styles.gridItem, isSelected && styles.gridItemSelected]}
                                onPress={() => toggleItemTag(item)}
                            >
                                <Image
                                    source={{ uri: item.processed_image_url || item.image_url }}
                                    style={styles.gridItemImage}
                                />
                                {isSelected && (
                                    <View style={styles.checkmark}>
                                        <Ionicons name="checkmark-circle" size={24} color="#6366f1" />
                                    </View>
                                )}
                                <Text style={styles.gridItemName} numberOfLines={1}>
                                    {item.name || item.category || 'Item'}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyItems}>
                            <Text style={styles.emptyItemsText}>No items in your wardrobe yet</Text>
                        </View>
                    }
                />
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="close" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New OOTD Post</Text>
                <TouchableOpacity
                    onPress={handlePost}
                    style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
                    disabled={!canPost}
                >
                    {isPostingOotd ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.postBtnText}>Post</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Photo section */}
                {photoUri ? (
                    <TouchableOpacity
                        style={styles.photoPreview}
                        onPress={handleGallery}
                        activeOpacity={0.9}
                    >
                        <Image source={{ uri: photoUri }} style={styles.photoImage} />
                        <View style={styles.photoOverlay}>
                            <Ionicons name="camera" size={20} color="#fff" />
                            <Text style={styles.photoOverlayText}>Tap to change</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.photoPlaceholder}>
                        <Ionicons name="camera-outline" size={48} color="#9ca3af" />
                        <Text style={styles.photoPlaceholderText}>Add a photo of your outfit</Text>
                        <View style={styles.photoButtons}>
                            <TouchableOpacity style={styles.photoButton} onPress={handleCamera}>
                                <Ionicons name="camera" size={20} color="#6366f1" />
                                <Text style={styles.photoButtonText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.photoButton} onPress={handleGallery}>
                                <Ionicons name="images" size={20} color="#6366f1" />
                                <Text style={styles.photoButtonText}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Photo source buttons (when photo is selected) */}
                {photoUri && (
                    <View style={styles.photoSourceRow}>
                        <TouchableOpacity style={styles.photoSourceBtn} onPress={handleCamera}>
                            <Ionicons name="camera" size={18} color="#6366f1" />
                            <Text style={styles.photoSourceText}>Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.photoSourceBtn} onPress={handleGallery}>
                            <Ionicons name="images" size={18} color="#6366f1" />
                            <Text style={styles.photoSourceText}>Gallery</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Tag Items */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Tag Items</Text>
                    <View style={styles.tagRow}>
                        {taggedItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.tagChip}
                                onPress={() => toggleItemTag(item)}
                            >
                                <Image
                                    source={{ uri: item.processed_image_url || item.image_url }}
                                    style={styles.tagChipImage}
                                />
                                <Text style={styles.tagChipText} numberOfLines={1}>
                                    {item.name || item.category || 'Item'}
                                </Text>
                                <Ionicons name="close-circle" size={16} color="#9ca3af" />
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.addTagBtn}
                            onPress={() => setShowItemPicker(true)}
                        >
                            <Ionicons name="add" size={18} color="#6366f1" />
                            <Text style={styles.addTagText}>Add Item</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Caption */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Caption</Text>
                    <TextInput
                        style={styles.captionInput}
                        placeholder="What are you wearing today?"
                        placeholderTextColor="#9ca3af"
                        value={caption}
                        onChangeText={setCaption}
                        maxLength={150}
                        multiline
                        numberOfLines={2}
                    />
                    <Text style={styles.charCount}>{caption.length}/150</Text>
                </View>

                {/* Squad Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Post to Squads</Text>
                    {squads.map((squad) => {
                        const isSelected = selectedSquadIds.includes(squad.id);
                        return (
                            <TouchableOpacity
                                key={squad.id}
                                style={styles.squadRow}
                                onPress={() => toggleSquad(squad.id)}
                            >
                                <Ionicons
                                    name={isSelected ? 'checkbox' : 'square-outline'}
                                    size={22}
                                    color={isSelected ? '#6366f1' : '#9ca3af'}
                                />
                                <Text style={styles.squadRowName}>{squad.name}</Text>
                                <Text style={styles.squadRowMeta}>
                                    {squad.member_count || 0} members
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    {squads.length === 0 && (
                        <Text style={styles.noSquadsText}>
                            Join or create a squad first to post an OOTD.
                        </Text>
                    )}
                </View>
            </ScrollView>

            {renderItemPickerModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    headerBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    postBtn: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    postBtnDisabled: {
        opacity: 0.4,
    },
    postBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },

    // Photo
    photoPreview: {
        width: '100%',
        height: PHOTO_HEIGHT,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    photoOverlay: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    photoOverlayText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    photoPlaceholder: {
        width: '100%',
        height: PHOTO_HEIGHT,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
        marginBottom: 12,
    },
    photoPlaceholderText: {
        fontSize: 15,
        color: '#9ca3af',
        marginTop: 8,
        marginBottom: 16,
    },
    photoButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#eef2ff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    photoButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
    photoSourceRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    photoSourceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#eef2ff',
    },
    photoSourceText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6366f1',
    },

    // Sections
    section: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 10,
    },

    // Tag items
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 4,
        paddingLeft: 4,
        paddingRight: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    tagChipImage: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f3f4f6',
    },
    tagChipText: {
        fontSize: 13,
        color: '#374151',
        maxWidth: 80,
    },
    addTagBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#6366f1',
        borderStyle: 'dashed',
    },
    addTagText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6366f1',
    },

    // Caption
    captionInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1f2937',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        minHeight: 60,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'right',
        marginTop: 4,
    },

    // Squad selection
    squadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        marginBottom: 8,
        gap: 10,
    },
    squadRowName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: '#1f2937',
    },
    squadRowMeta: {
        fontSize: 12,
        color: '#9ca3af',
    },
    noSquadsText: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        paddingVertical: 16,
    },

    // Item picker modal
    modalContainer: {
        flex: 1,
        backgroundColor: '#F5F0E8',
        paddingTop: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    modalDone: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6366f1',
    },
    itemGrid: {
        padding: 12,
    },
    gridItem: {
        flex: 1 / 3,
        margin: 4,
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    gridItemSelected: {
        borderWidth: 2,
        borderColor: '#6366f1',
    },
    gridItemImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        marginBottom: 4,
    },
    checkmark: {
        position: 'absolute',
        top: 4,
        right: 4,
    },
    gridItemName: {
        fontSize: 11,
        color: '#6b7280',
        textAlign: 'center',
    },
    emptyItems: {
        padding: 40,
        alignItems: 'center',
    },
    emptyItemsText: {
        fontSize: 15,
        color: '#9ca3af',
    },
});
