/**
 * Add Tab
 * Camera capture and gallery picker for adding clothing items
 */

import { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { compressImage, formatFileSize } from '../../utils/image';
import { storageService } from '../../services/storage';
import { itemsService } from '../../services/items';
import { useAuthStore } from '../../stores/authStore';

type ViewMode = 'options' | 'camera' | 'preview' | 'uploading';

export default function AddScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const cameraRef = useRef<CameraView>(null);

    const [viewMode, setViewMode] = useState<ViewMode>('options');
    const [facing, setFacing] = useState<CameraType>('back');
    const [flash, setFlash] = useState<FlashMode>('off');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [imageSize, setImageSize] = useState<number>(0);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    const [permission, requestPermission] = useCameraPermissions();

    // Handle camera permission
    const handleCameraPress = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert(
                    'Camera Permission Required',
                    'Please enable camera access in Settings to take photos.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() },
                    ]
                );
                return;
            }
        }
        setViewMode('camera');
    };

    // Handle gallery selection
    const handleGalleryPress = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [3, 4],
            quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
            await processImage(result.assets[0].uri);
        }
    };

    // Capture photo from camera
    const handleCapture = async () => {
        if (!cameraRef.current) return;

        setIsProcessing(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 1,
                skipProcessing: false,
            });

            if (photo?.uri) {
                await processImage(photo.uri);
            }
        } catch (error) {
            console.error('Capture error:', error);
            Alert.alert('Error', 'Failed to capture photo. Please try again.');
        }
        setIsProcessing(false);
    };

    // Process and compress image
    const processImage = async (uri: string) => {
        setIsProcessing(true);
        try {
            const compressed = await compressImage(uri);
            setCapturedImage(compressed.uri);
            setViewMode('preview');
        } catch (error) {
            console.error('Compress error:', error);
            // Use original if compression fails
            setCapturedImage(uri);
            setViewMode('preview');
        }
        setIsProcessing(false);
    };

    // Upload image and create item
    const handleUpload = async () => {
        if (!capturedImage || !user) return;

        setViewMode('uploading');
        setUploadProgress(0);

        try {
            // Step 1: Upload original image
            const { url, error: uploadError } = await storageService.uploadImage(
                user.id,
                capturedImage,
                (progress) => setUploadProgress(Math.min(progress.percentage * 0.5, 50))
            );

            if (uploadError || !url) {
                throw uploadError || new Error('Upload failed');
            }

            // Step 2: Create item record (status: processing)
            const { item, error: createError } = await itemsService.createItem({
                image_url: url,
                original_image_url: url,
            });

            if (createError || !item) {
                throw createError || new Error('Failed to create item');
            }

            // Step 3: Attempt background removal (non-blocking)
            setUploadProgress(60);
            let processedUrl: string | null = null;

            // Import dynamically to avoid issues if not configured
            const { removeBackground, isBackgroundRemovalConfigured } = await import('../../services/backgroundRemoval');

            if (isBackgroundRemovalConfigured()) {
                try {
                    setUploadProgress(70);
                    const { processedImageBase64, error: bgError } = await removeBackground(url);

                    if (processedImageBase64 && !bgError) {
                        setUploadProgress(85);
                        // Upload processed image (now using base64)
                        const { url: uploadedProcessedUrl } = await storageService.uploadProcessedImage(
                            user.id,
                            processedImageBase64
                        );

                        if (uploadedProcessedUrl) {
                            processedUrl = uploadedProcessedUrl;
                            // Update item with processed URL
                            await itemsService.updateItem(item.id, {
                                processed_image_url: processedUrl,
                            } as any);
                            console.log('Background removal complete!');
                        }
                    } else {
                        console.log('Background removal skipped:', bgError?.message);
                    }
                } catch (bgRemovalError) {
                    console.log('Background removal failed, using original:', bgRemovalError);
                    // Continue without processed image - not a critical error
                }
            }

            setUploadProgress(100);

            // Navigate to confirmation screen for category/color selection
            setCapturedImage(null);
            setViewMode('options');

            // Get the display URL (prefer processed image)
            const displayUrl = processedUrl || url;

            router.push({
                pathname: '/(tabs)/confirm-item',
                params: {
                    itemId: item.id,
                    imageUrl: displayUrl,
                },
            });
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert(
                'Upload Failed',
                'Failed to upload your item. Please try again.',
                [
                    { text: 'Cancel', onPress: () => setViewMode('preview') },
                    { text: 'Retry', onPress: handleUpload },
                ]
            );
        }
    };

    // Render options view
    const renderOptions = () => (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Add Item</Text>
                <Text style={styles.subtitle}>Photograph your clothing item</Text>
            </View>

            <View style={styles.optionsContainer}>
                <TouchableOpacity style={styles.optionCard} onPress={handleCameraPress}>
                    <View style={styles.optionIconContainer}>
                        <Ionicons name="camera-outline" size={48} color="#6366f1" />
                    </View>
                    <Text style={styles.optionTitle}>Take a Photo</Text>
                    <Text style={styles.optionSubtitle}>Use your camera to capture the item</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionCard} onPress={handleGalleryPress}>
                    <View style={styles.optionIconContainer}>
                        <Ionicons name="images-outline" size={48} color="#6366f1" />
                    </View>
                    <Text style={styles.optionTitle}>Choose from Gallery</Text>
                    <Text style={styles.optionSubtitle}>Select from your photo library</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Render camera view
    const renderCamera = () => (
        <View style={styles.cameraContainer}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
                flash={flash}
            >
                {/* Camera controls overlay */}
                <View style={styles.cameraOverlay}>
                    {/* Top controls */}
                    <View style={styles.cameraTopControls}>
                        <TouchableOpacity
                            style={styles.cameraControlButton}
                            onPress={() => setViewMode('options')}
                        >
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cameraControlButton}
                            onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}
                        >
                            <Ionicons
                                name={flash === 'off' ? 'flash-off' : 'flash'}
                                size={24}
                                color="#fff"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Bottom controls */}
                    <View style={styles.cameraBottomControls}>
                        <TouchableOpacity
                            style={styles.galleryButton}
                            onPress={handleGalleryPress}
                        >
                            <Ionicons name="images-outline" size={28} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.captureButton}
                            onPress={handleCapture}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator color="#6366f1" size="large" />
                            ) : (
                                <View style={styles.captureButtonInner} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.flipButton}
                            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                        >
                            <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </CameraView>
        </View>
    );

    // Render preview view
    const renderPreview = () => (
        <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        setCapturedImage(null);
                        setViewMode('options');
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.previewTitle}>Preview</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.imageContainer}>
                {capturedImage && (
                    <Image source={{ uri: capturedImage }} style={styles.previewImage} />
                )}
            </View>

            <View style={styles.imageInfo}>
                <Text style={styles.imageInfoText}>
                    Size: {formatFileSize(imageSize)}
                </Text>
            </View>

            <View style={styles.previewActions}>
                <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={() => {
                        setCapturedImage(null);
                        setViewMode('options');
                    }}
                >
                    <Ionicons name="refresh-outline" size={20} color="#6366f1" />
                    <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.usePhotoButton} onPress={handleUpload}>
                    <Text style={styles.usePhotoButtonText}>Use Photo</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    // Render uploading view
    const renderUploading = () => (
        <View style={styles.uploadingContainer}>
            <View style={styles.uploadingContent}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.uploadingTitle}>Uploading...</Text>
                <Text style={styles.uploadingSubtitle}>
                    {uploadProgress < 100 ? `${uploadProgress}%` : 'Processing...'}
                </Text>
                <View style={styles.progressBar}>
                    <View
                        style={[styles.progressFill, { width: `${uploadProgress}%` }]}
                    />
                </View>
            </View>
        </View>
    );

    // Render based on view mode
    switch (viewMode) {
        case 'camera':
            return renderCamera();
        case 'preview':
            return renderPreview();
        case 'uploading':
            return renderUploading();
        default:
            return renderOptions();
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
        paddingTop: 60,
    },
    header: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    optionsContainer: {
        flex: 1,
        paddingHorizontal: 24,
        gap: 16,
    },
    optionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    optionIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    optionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    optionSubtitle: {
        fontSize: 14,
        color: '#6b7280',
    },
    // Camera styles
    cameraContainer: {
        flex: 1,
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        justifyContent: 'space-between',
    },
    cameraTopControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
    },
    cameraControlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraBottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    galleryButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
    },
    flipButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Preview styles
    previewContainer: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    imageContainer: {
        flex: 1,
        margin: 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#e5e7eb',
    },
    previewImage: {
        flex: 1,
        resizeMode: 'contain',
    },
    imageInfo: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    imageInfoText: {
        fontSize: 14,
        color: '#6b7280',
    },
    previewActions: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 16,
        gap: 12,
    },
    retakeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#6366f1',
        gap: 8,
    },
    retakeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6366f1',
    },
    usePhotoButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#6366f1',
        gap: 8,
    },
    usePhotoButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    // Uploading styles
    uploadingContainer: {
        flex: 1,
        backgroundColor: '#F5F0E8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadingContent: {
        alignItems: 'center',
        padding: 32,
    },
    uploadingTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 24,
        marginBottom: 8,
    },
    uploadingSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 24,
    },
    progressBar: {
        width: 200,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#e5e7eb',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#6366f1',
        borderRadius: 4,
    },
});
