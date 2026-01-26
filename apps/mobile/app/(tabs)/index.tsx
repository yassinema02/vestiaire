/**
 * Home Tab
 * Main dashboard with outfit suggestions
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';

export default function HomeScreen() {
    const { user, signOut } = useAuthStore();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Good morning!</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>
                <TouchableOpacity style={styles.notificationButton}>
                    <Ionicons name="notifications-outline" size={24} color="#1f2937" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.placeholderContainer}>
                    <Ionicons name="sunny-outline" size={64} color="#d1d5db" />
                </View>
                <Text style={styles.title}>Home</Text>
                <Text style={styles.subtitle}>Your daily outfit suggestions will appear here</Text>
            </View>

            <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
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
        marginBottom: 32,
    },
    greeting: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#6b7280',
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
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
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 24,
        marginBottom: 120,
        padding: 16,
        backgroundColor: '#fee2e2',
        borderRadius: 12,
        gap: 8,
    },
    signOutText: {
        color: '#dc2626',
        fontWeight: '600',
    },
});
