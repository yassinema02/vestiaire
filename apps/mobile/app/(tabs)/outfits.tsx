/**
 * Outfits Tab
 * Saved outfits placeholder
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function OutfitsScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Outfits</Text>
                <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="add" size={22} color="#6366f1" />
                </TouchableOpacity>
            </View>
            <View style={styles.content}>
                <View style={styles.placeholderContainer}>
                    <Ionicons name="layers-outline" size={64} color="#d1d5db" />
                </View>
                <Text style={styles.placeholderTitle}>No outfits yet</Text>
                <Text style={styles.subtitle}>Your saved outfits will appear here</Text>
            </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    placeholderTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
});
