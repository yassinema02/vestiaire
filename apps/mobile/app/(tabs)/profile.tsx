/**
 * Profile Tab
 * User profile and settings placeholder
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';

export default function ProfileScreen() {
    const { user } = useAuthStore();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Profile</Text>
                <TouchableOpacity style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={22} color="#1f2937" />
                </TouchableOpacity>
            </View>

            <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                    <Ionicons name="person" size={48} color="#9ca3af" />
                </View>
                <Text style={styles.email}>{user?.email}</Text>
                <Text style={styles.memberSince}>Member since 2024</Text>
            </View>

            <View style={styles.menuSection}>
                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="person-outline" size={22} color="#6b7280" />
                    <Text style={styles.menuText}>Edit Profile</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="notifications-outline" size={22} color="#6b7280" />
                    <Text style={styles.menuText}>Notifications</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="shield-outline" size={22} color="#6b7280" />
                    <Text style={styles.menuText}>Privacy</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="help-circle-outline" size={22} color="#6b7280" />
                    <Text style={styles.menuText}>Help & Support</Text>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>
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
    settingsButton: {
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
    profileSection: {
        alignItems: 'center',
        paddingVertical: 24,
        marginBottom: 24,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    email: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    memberSince: {
        fontSize: 14,
        color: '#6b7280',
    },
    menuSection: {
        paddingHorizontal: 24,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: '#374151',
    },
});
