/**
 * HeatmapGrid Component
 * Story 11.5: Wear Frequency Heatmap
 *
 * Month view:   calendar-style (7 columns = weekdays, rows = weeks)
 * Quarter/Year: GitHub-style (columns = weeks, 7 rows = weekdays) — horizontally scrollable
 */

import React, { useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { HeatmapDay, HeatmapView } from '../../types/heatmap';

// ─── Color palette (GitHub-style greens) ─────────────────────────

const INTENSITY_COLORS = {
    0: '#ebedf0', // empty
    1: '#9be9a8', // light green
    2: '#40c463', // medium green
    3: '#30a14e', // dark green
    4: '#216e39', // darkest green
} as const;

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Props ────────────────────────────────────────────────────────

interface HeatmapGridProps {
    days: HeatmapDay[];
    view: HeatmapView;
    onDayPress: (day: HeatmapDay) => void;
}

// ─── Month view: calendar grid ────────────────────────────────────

function MonthGrid({ days, onDayPress }: { days: HeatmapDay[]; onDayPress: (d: HeatmapDay) => void }) {
    // First cell offset: which weekday is the 1st? (0=Mon … 6=Sun)
    const firstDayOfWeekJs = days.length > 0 ? new Date(days[0].date + 'T00:00:00').getDay() : 0;
    // Convert JS day (0=Sun) to Mon-based (0=Mon … 6=Sun)
    const offset = (firstDayOfWeekJs + 6) % 7;

    // Fill leading empty cells + days
    const cells: (HeatmapDay | null)[] = [
        ...Array.from({ length: offset }, () => null),
        ...days,
    ];

    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (HeatmapDay | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
        rows.push(cells.slice(i, i + 7));
    }

    return (
        <View>
            {/* Day labels */}
            <View style={styles.weekdayRow}>
                {WEEKDAY_LABELS.map((label, i) => (
                    <View key={i} style={styles.monthCell}>
                        <Text style={styles.weekdayLabel}>{label}</Text>
                    </View>
                ))}
            </View>
            {/* Grid rows */}
            {rows.map((row, ri) => (
                <View key={ri} style={styles.weekdayRow}>
                    {row.map((day, ci) => (
                        <View key={ci} style={styles.monthCell}>
                            {day ? (
                                <TouchableOpacity
                                    onPress={() => onDayPress(day)}
                                    style={[
                                        styles.monthDayCell,
                                        { backgroundColor: INTENSITY_COLORS[day.intensity] },
                                        day.isToday && styles.todayBorder,
                                    ]}
                                >
                                    <Text style={[
                                        styles.monthDayNum,
                                        day.intensity >= 2 && styles.monthDayNumLight,
                                    ]}>
                                        {parseInt(day.date.slice(8), 10)}
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.monthCellEmpty} />
                            )}
                        </View>
                    ))}
                </View>
            ))}
            {/* Legend */}
            <HeatmapLegend />
        </View>
    );
}

// ─── GitHub-style column grid (quarter / year) ────────────────────

function ColumnGrid({
    days,
    view,
    onDayPress,
}: {
    days: HeatmapDay[];
    view: 'quarter' | 'year';
    onDayPress: (d: HeatmapDay) => void;
}) {
    const cellSize = view === 'year' ? 13 : 18;
    const cellGap = view === 'year' ? 2 : 3;

    // Group days into columns (weeks). Each column = 7 slots (Mon–Sun).
    const weeks = useMemo(() => {
        // Pad start to Monday
        const firstJs = new Date(days[0]?.date + 'T00:00:00').getDay();
        const startOffset = (firstJs + 6) % 7;

        const allSlots: (HeatmapDay | null)[] = [
            ...Array.from({ length: startOffset }, () => null),
            ...days,
        ];
        while (allSlots.length % 7 !== 0) allSlots.push(null);

        const result: (HeatmapDay | null)[][] = [];
        for (let i = 0; i < allSlots.length; i += 7) {
            result.push(allSlots.slice(i, i + 7));
        }
        return result;
    }, [days]);

    // Month labels: track when month changes across weeks
    const monthLabels = useMemo(() => {
        const labels: { weekIdx: number; label: string }[] = [];
        let lastMonth = -1;
        weeks.forEach((week, wi) => {
            const firstReal = week.find(d => d !== null);
            if (!firstReal) return;
            const m = parseInt(firstReal.date.slice(5, 7), 10) - 1;
            if (m !== lastMonth) {
                labels.push({ weekIdx: wi, label: MONTH_NAMES[m] });
                lastMonth = m;
            }
        });
        return labels;
    }, [weeks]);

    const totalWidth = weeks.length * (cellSize + cellGap);

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
                {/* Month labels */}
                <View style={{ flexDirection: 'row', height: 16, width: totalWidth }}>
                    {monthLabels.map(({ weekIdx, label }) => (
                        <Text
                            key={weekIdx}
                            style={[
                                styles.monthLabel,
                                { position: 'absolute', left: weekIdx * (cellSize + cellGap) },
                            ]}
                        >
                            {label}
                        </Text>
                    ))}
                </View>

                {/* Grid: 7 rows (days), N columns (weeks) */}
                <View style={{ flexDirection: 'row', gap: cellGap }}>
                    {/* Weekday labels column */}
                    <View style={{ gap: cellGap, width: 12 }}>
                        {WEEKDAY_LABELS.map((label, i) => (
                            <View key={i} style={{ height: cellSize, justifyContent: 'center' }}>
                                {i % 2 === 0 && (
                                    <Text style={styles.weekdayLabelSmall}>{label}</Text>
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Week columns */}
                    {weeks.map((week, wi) => (
                        <View key={wi} style={{ gap: cellGap }}>
                            {week.map((day, di) => (
                                <TouchableOpacity
                                    key={di}
                                    disabled={!day}
                                    onPress={() => day && onDayPress(day)}
                                    style={[
                                        {
                                            width: cellSize,
                                            height: cellSize,
                                            borderRadius: 2,
                                            backgroundColor: day
                                                ? INTENSITY_COLORS[day.intensity]
                                                : 'transparent',
                                        },
                                        day?.isToday && styles.todayBorderSmall,
                                    ]}
                                />
                            ))}
                        </View>
                    ))}
                </View>

                {/* Legend */}
                <HeatmapLegend small />
            </View>
        </ScrollView>
    );
}

// ─── Legend ───────────────────────────────────────────────────────

function HeatmapLegend({ small }: { small?: boolean }) {
    const size = small ? 10 : 12;
    return (
        <View style={styles.legendRow}>
            <Text style={styles.legendText}>Less</Text>
            {([0, 1, 2, 3, 4] as const).map(level => (
                <View
                    key={level}
                    style={{
                        width: size,
                        height: size,
                        borderRadius: 2,
                        backgroundColor: INTENSITY_COLORS[level],
                        marginHorizontal: 1,
                    }}
                />
            ))}
            <Text style={styles.legendText}>More</Text>
        </View>
    );
}

// ─── Main export ──────────────────────────────────────────────────

export default function HeatmapGrid({ days, view, onDayPress }: HeatmapGridProps) {
    if (days.length === 0) {
        return (
            <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No wear data for this period</Text>
            </View>
        );
    }

    if (view === 'month') {
        return <MonthGrid days={days} onDayPress={onDayPress} />;
    }

    return <ColumnGrid days={days} view={view} onDayPress={onDayPress} />;
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    monthCell: {
        flex: 1,
        alignItems: 'center',
    },
    weekdayLabel: {
        fontSize: 10,
        color: '#9ca3af',
        fontWeight: '500',
        marginBottom: 2,
    },
    monthDayCell: {
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthDayNum: {
        fontSize: 11,
        fontWeight: '500',
        color: '#374151',
    },
    monthDayNumLight: {
        color: '#fff',
    },
    monthCellEmpty: {
        width: 34,
        height: 34,
    },
    todayBorder: {
        borderWidth: 2,
        borderColor: '#6366f1',
    },
    todayBorderSmall: {
        borderWidth: 1,
        borderColor: '#6366f1',
    },
    monthLabel: {
        fontSize: 9,
        color: '#9ca3af',
        fontWeight: '500',
    },
    weekdayLabelSmall: {
        fontSize: 8,
        color: '#9ca3af',
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 8,
        gap: 2,
    },
    legendText: {
        fontSize: 9,
        color: '#9ca3af',
        marginHorizontal: 3,
    },
    emptyWrap: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    emptyText: {
        fontSize: 13,
        color: '#9ca3af',
    },
});
