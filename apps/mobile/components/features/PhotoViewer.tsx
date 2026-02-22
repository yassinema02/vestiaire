/**
 * Full-Screen Photo Viewer
 * Tap to dismiss overlay for OOTD photos.
 * Story 9.3: OOTD Feed Display
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Modal,
    Dimensions,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PhotoViewerProps {
    visible: boolean;
    photoUrl: string;
    authorName?: string;
    caption?: string | null;
    onClose: () => void;
}

export default function PhotoViewer({ visible, photoUrl, authorName, caption, onClose }: PhotoViewerProps) {
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            statusBarTranslucent
        >
            <StatusBar barStyle="light-content" />
            <View style={styles.container}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <Image
                        source={{ uri: photoUrl }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

                {/* Close button */}
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>

                {/* Bottom overlay */}
                {(authorName || caption) && (
                    <View style={styles.overlay}>
                        {authorName && (
                            <Text style={styles.overlayAuthor}>{authorName}</Text>
                        )}
                        {caption && (
                            <Text style={styles.overlayCaption}>{caption}</Text>
                        )}
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.8,
    },
    closeBtn: {
        position: 'absolute',
        top: 56,
        right: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 50,
        paddingTop: 20,
        backgroundColor: 'transparent',
    },
    overlayAuthor: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    overlayCaption: {
        fontSize: 14,
        color: '#e5e7eb',
        lineHeight: 20,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
});
