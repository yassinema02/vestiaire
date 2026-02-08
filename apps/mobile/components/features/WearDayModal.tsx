/**
 * WearDayModal
 * Story 5.7: Day detail modal showing outfits worn on a selected day
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WearLog } from '../../types/wearLog';

interface WearDayModalProps {
    visible: boolean;
    date: string; // YYYY-MM-DD
    logs: WearLog[];
    onClose: () => void;
}

/** Group logs by outfit_id (null = individual items) */
function groupLogsByOutfit(logs: WearLog[]): { outfitId: string | null; logs: WearLog[] }[] {
    const outfitMap = new Map<string, WearLog[]>();
    const individualLogs: WearLog[] = [];

    for (const log of logs) {
        if (log.outfit_id) {
            const existing = outfitMap.get(log.outfit_id);
            if (existing) {
                existing.push(log);
            } else {
                outfitMap.set(log.outfit_id, [log]);
            }
        } else {
            individualLogs.push(log);
        }
    }

    const groups: { outfitId: string | null; logs: WearLog[] }[] = [];

    for (const [outfitId, outfitLogs] of outfitMap) {
        groups.push({ outfitId, logs: outfitLogs });
    }

    if (individualLogs.length > 0) {
        groups.push({ outfitId: null, logs: individualLogs });
    }

    return groups;
}

function formatDisplayDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function WearDayModal({ visible, date, logs, onClose }: WearDayModalProps) {
    const groups = groupLogsByOutfit(logs);
    const hasLogs = logs.length > 0;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.dateTitle}>{formatDisplayDate(date)}</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={22} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.content}
                    >
                        {!hasLogs ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="shirt-outline" size={48} color="#d1d5db" />
                                <Text style={styles.emptyTitle}>No outfit logged</Text>
                                <Text style={styles.emptySubtitle}>
                                    You didn't log any outfits on this day
                                </Text>
                            </View>
                        ) : (
                            groups.map((group, index) => (
                                <View key={group.outfitId || `individual-${index}`} style={styles.outfitGroup}>
                                    <Text style={styles.outfitLabel}>
                                        {group.outfitId
                                            ? `Outfit ${index + 1}`
                                            : 'Individual Items'}
                                    </Text>
                                    <View style={styles.itemRow}>
                                        {group.logs.map(log => {
                                            const imageUrl = log.item?.processed_image_url || log.item?.image_url;
                                            return (
                                                <View key={log.id} style={styles.itemCard}>
                                                    {imageUrl ? (
                                                        <Image
                                                            source={{ uri: imageUrl }}
                                                            style={styles.itemImage}
                                                            resizeMode="cover"
                                                        />
                                                    ) : (
                                                        <View style={[styles.itemImage, styles.itemPlaceholder]}>
                                                            <Ionicons name="shirt-outline" size={20} color="#d1d5db" />
                                                        </View>
                                                    )}
                                                    <Text style={styles.itemName} numberOfLines={1}>
                                                        {log.item?.name || log.item?.category || 'Item'}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                    {index < groups.length - 1 && <View style={styles.separator} />}
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '65%',
        minHeight: 250,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    dateTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        flex: 1,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 12,
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#9ca3af',
        marginTop: 4,
    },
    outfitGroup: {
        marginBottom: 16,
    },
    outfitLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 10,
    },
    itemRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    itemCard: {
        alignItems: 'center',
        width: 72,
    },
    itemImage: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: '#f9fafb',
    },
    itemPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    itemName: {
        fontSize: 11,
        color: '#6b7280',
        marginTop: 4,
        textAlign: 'center',
    },
    separator: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginTop: 16,
    },
});
