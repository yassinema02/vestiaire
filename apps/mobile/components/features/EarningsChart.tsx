/**
 * EarningsChart
 * Story 13.5: Simple View-based vertical bar chart for monthly earnings.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EarningsMonth } from '../../services/listingService';

interface EarningsChartProps {
    data: EarningsMonth[];
}

const BAR_MAX_HEIGHT = 100;

export default function EarningsChart({ data }: EarningsChartProps) {
    const maxEarnings = Math.max(...data.map(d => d.earnings), 1);
    const totalEarnings = data.reduce((sum, d) => sum + d.earnings, 0);
    const totalCount = data.reduce((sum, d) => sum + d.count, 0);

    return (
        <View style={styles.container}>
            {/* Summary */}
            <Text style={styles.summaryText}>
                £{totalEarnings.toFixed(0)} earned · {totalCount} item{totalCount !== 1 ? 's' : ''} sold
            </Text>

            {/* Chart */}
            <View style={styles.chartRow}>
                {data.map((entry, i) => {
                    const height = maxEarnings > 0
                        ? Math.max((entry.earnings / maxEarnings) * BAR_MAX_HEIGHT, entry.earnings > 0 ? 4 : 0)
                        : 0;

                    return (
                        <View key={`${entry.month}-${entry.year}`} style={styles.barColumn}>
                            {/* Value label */}
                            {entry.earnings > 0 && (
                                <Text style={styles.barValue}>£{entry.earnings.toFixed(0)}</Text>
                            )}
                            {/* Bar */}
                            <View style={styles.barContainer}>
                                <View
                                    style={[
                                        styles.bar,
                                        {
                                            height,
                                            backgroundColor: entry.earnings > 0 ? '#6366f1' : '#e5e7eb',
                                        },
                                    ]}
                                />
                            </View>
                            {/* Month label */}
                            <Text style={styles.monthLabel}>{entry.month}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    summaryText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 16,
        textAlign: 'center',
    },
    chartRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 4,
    },
    barColumn: {
        flex: 1,
        alignItems: 'center',
    },
    barValue: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6366f1',
        marginBottom: 4,
    },
    barContainer: {
        height: BAR_MAX_HEIGHT,
        justifyContent: 'flex-end',
        width: '100%',
        paddingHorizontal: 6,
    },
    bar: {
        borderRadius: 4,
        width: '100%',
    },
    monthLabel: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 6,
        fontWeight: '500',
    },
});
