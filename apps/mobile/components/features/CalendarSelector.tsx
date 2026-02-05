/**
 * Calendar Selector Component
 * Modal for selecting which Apple calendars to include
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppleCalendar } from '../../stores/calendarStore';

interface CalendarSelectorProps {
    visible: boolean;
    onClose: () => void;
    calendars: AppleCalendar[];
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    isLoading?: boolean;
}

interface CalendarItemProps {
    calendar: AppleCalendar;
    isSelected: boolean;
    onToggle: () => void;
}

const CalendarItem: React.FC<CalendarItemProps> = ({ calendar, isSelected, onToggle }) => (
    <TouchableOpacity style={styles.calendarItem} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.calendarInfo}>
            <View style={[styles.colorIndicator, { backgroundColor: calendar.color }]} />
            <View style={styles.calendarText}>
                <Text style={styles.calendarTitle} numberOfLines={1}>
                    {calendar.title}
                </Text>
                <Text style={styles.calendarSource} numberOfLines={1}>
                    {calendar.source}
                </Text>
            </View>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
    </TouchableOpacity>
);

export const CalendarSelector: React.FC<CalendarSelectorProps> = ({
    visible,
    onClose,
    calendars,
    selectedIds,
    onSelectionChange,
    isLoading = false,
}) => {
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

    // Sync with prop changes
    useEffect(() => {
        setLocalSelectedIds(selectedIds);
    }, [selectedIds]);

    const handleToggle = (calendarId: string) => {
        setLocalSelectedIds(prev => {
            if (prev.includes(calendarId)) {
                return prev.filter(id => id !== calendarId);
            } else {
                return [...prev, calendarId];
            }
        });
    };

    const handleSelectAll = () => {
        setLocalSelectedIds(calendars.map(c => c.id));
    };

    const handleDeselectAll = () => {
        setLocalSelectedIds([]);
    };

    const handleSave = () => {
        onSelectionChange(localSelectedIds);
        onClose();
    };

    const hasChanges = JSON.stringify(localSelectedIds.sort()) !== JSON.stringify(selectedIds.sort());

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Select Calendars</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        style={styles.headerButton}
                        disabled={isLoading}
                    >
                        <Text style={[styles.saveText, !hasChanges && styles.saveTextDisabled]}>
                            Save
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity onPress={handleSelectAll} style={styles.quickActionButton}>
                        <Text style={styles.quickActionText}>Select All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDeselectAll} style={styles.quickActionButton}>
                        <Text style={styles.quickActionText}>Deselect All</Text>
                    </TouchableOpacity>
                </View>

                {/* Calendar List */}
                {isLoading ? (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loadingText}>Loading calendars...</Text>
                    </View>
                ) : calendars.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="calendar-outline" size={48} color="#999" />
                        <Text style={styles.emptyText}>No calendars found</Text>
                    </View>
                ) : (
                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {calendars.map(calendar => (
                            <CalendarItem
                                key={calendar.id}
                                calendar={calendar}
                                isSelected={localSelectedIds.includes(calendar.id)}
                                onToggle={() => handleToggle(calendar.id)}
                            />
                        ))}
                        <View style={styles.listFooter} />
                    </ScrollView>
                )}

                {/* Selection Summary */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        {localSelectedIds.length} of {calendars.length} calendars selected
                    </Text>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    headerButton: {
        minWidth: 60,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000000',
    },
    cancelText: {
        fontSize: 17,
        color: '#007AFF',
    },
    saveText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#007AFF',
        textAlign: 'right',
    },
    saveTextDisabled: {
        color: '#999999',
    },
    quickActions: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    quickActionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    quickActionText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
    },
    list: {
        flex: 1,
        paddingHorizontal: 16,
    },
    calendarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 16,
        marginBottom: 8,
        borderRadius: 12,
    },
    calendarInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    colorIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 12,
    },
    calendarText: {
        flex: 1,
    },
    calendarTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000000',
        marginBottom: 2,
    },
    calendarSource: {
        fontSize: 13,
        color: '#666666',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#CCCCCC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666666',
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666666',
    },
    listFooter: {
        height: 20,
    },
    footer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: '#666666',
    },
});
