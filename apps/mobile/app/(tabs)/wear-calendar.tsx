/**
 * Wear Calendar Screen
 * Story 5.7: Monthly calendar view of wear history
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { wearLogService } from '../../services/wearLogService';
import { WearCalendarDay } from '../../types/wearLog';
import WearDayModal from '../../components/features/WearDayModal';

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function getTodayStr(): string {
    return new Date().toISOString().split('T')[0];
}

/** Get the day-of-week (0=Sun) the month starts on */
function getStartDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

/** Get total days in a month */
function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

/** Format YYYY-MM-DD from components */
function toDateStr(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function WearCalendarScreen() {
    const router = useRouter();
    const today = getTodayStr();
    const now = new Date();

    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [calendarDays, setCalendarDays] = useState<Map<string, WearCalendarDay>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const loadMonth = useCallback(async () => {
        setIsLoading(true);
        const { days } = await wearLogService.getWearLogsByMonth(year, month);
        const dayMap = new Map<string, WearCalendarDay>();
        for (const day of days) {
            dayMap.set(day.date, day);
        }
        setCalendarDays(dayMap);
        setIsLoading(false);
    }, [year, month]);

    useFocusEffect(
        useCallback(() => {
            loadMonth();
        }, [loadMonth])
    );

    const goToPrevMonth = () => {
        if (month === 0) {
            setYear(y => y - 1);
            setMonth(11);
        } else {
            setMonth(m => m - 1);
        }
    };

    const goToNextMonth = () => {
        if (month === 11) {
            setYear(y => y + 1);
            setMonth(0);
        } else {
            setMonth(m => m + 1);
        }
    };

    const handleDayPress = (dateStr: string) => {
        setSelectedDate(dateStr);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedDate(null);
    };

    // Calendar grid calculations
    const startDay = getStartDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;

    // Monthly stats
    const totalLogs = Array.from(calendarDays.values()).reduce(
        (sum, day) => sum + day.logs.length, 0
    );

    // Selected day data for modal
    const selectedDayData = selectedDate ? calendarDays.get(selectedDate) : undefined;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Wear Calendar</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Month Navigation */}
            <View style={styles.monthNav}>
                <TouchableOpacity style={styles.navArrow} onPress={goToPrevMonth}>
                    <Ionicons name="chevron-back" size={22} color="#6366f1" />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
                <TouchableOpacity style={styles.navArrow} onPress={goToNextMonth}>
                    <Ionicons name="chevron-forward" size={22} color="#6366f1" />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : (
                <>
                    {/* Calendar Grid */}
                    <View style={styles.calendarCard}>
                        {/* Day-of-week header */}
                        <View style={styles.weekRow}>
                            {DAYS_OF_WEEK.map((d, i) => (
                                <View key={i} style={styles.weekCell}>
                                    <Text style={styles.weekLabel}>{d}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Day cells */}
                        <View style={styles.daysGrid}>
                            {Array.from({ length: totalCells }).map((_, index) => {
                                const dayNum = index - startDay + 1;
                                const isValidDay = dayNum >= 1 && dayNum <= daysInMonth;

                                if (!isValidDay) {
                                    return <View key={index} style={styles.dayCell} />;
                                }

                                const dateStr = toDateStr(year, month, dayNum);
                                const isToday = dateStr === today;
                                const hasLogs = calendarDays.has(dateStr);
                                const isSelected = dateStr === selectedDate;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.dayCell,
                                            isSelected && styles.dayCellSelected,
                                            isToday && !isSelected && styles.dayCellToday,
                                        ]}
                                        onPress={() => handleDayPress(dateStr)}
                                        activeOpacity={0.6}
                                    >
                                        <Text
                                            style={[
                                                styles.dayNumber,
                                                isToday && styles.dayNumberToday,
                                                isSelected && styles.dayNumberSelected,
                                                !hasLogs && !isToday && !isSelected && styles.dayNumberInactive,
                                            ]}
                                        >
                                            {dayNum}
                                        </Text>
                                        {hasLogs && (
                                            <View style={[
                                                styles.logDot,
                                                (isToday || isSelected) && styles.logDotHighlighted,
                                            ]} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Monthly Stats */}
                    <View style={styles.statsCard}>
                        <Ionicons name="calendar-outline" size={18} color="#6366f1" />
                        <Text style={styles.statsText}>
                            You logged <Text style={styles.statsBold}>{totalLogs}</Text> outfit{totalLogs !== 1 ? 's' : ''} this month
                        </Text>
                    </View>
                </>
            )}

            {/* Day Detail Modal */}
            {selectedDate && (
                <WearDayModal
                    visible={modalVisible}
                    date={selectedDate}
                    logs={selectedDayData?.logs || []}
                    onClose={closeModal}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingHorizontal: 16,
        paddingBottom: 12,
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
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Month Navigation ──
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 20,
    },
    navArrow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1f2937',
        minWidth: 160,
        textAlign: 'center',
    },

    // ── Calendar Card ──
    calendarCard: {
        marginHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    weekRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    weekCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 6,
    },
    weekLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9ca3af',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
    },
    dayCellToday: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
    },
    dayCellSelected: {
        backgroundColor: '#eef2ff',
        borderRadius: 12,
    },
    dayNumber: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
    },
    dayNumberToday: {
        color: '#fff',
        fontWeight: '700',
    },
    dayNumberSelected: {
        color: '#6366f1',
        fontWeight: '700',
    },
    dayNumberInactive: {
        color: '#d1d5db',
    },
    logDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22c55e',
        marginTop: 2,
    },
    logDotHighlighted: {
        backgroundColor: '#fff',
    },

    // ── Stats Card ──
    statsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    statsText: {
        fontSize: 14,
        color: '#6b7280',
    },
    statsBold: {
        fontWeight: '700',
        color: '#6366f1',
    },
});
