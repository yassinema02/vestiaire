/**
 * Tabs Layout
 * Bottom tab navigation for main app screens with animations
 */

import { Tabs } from 'expo-router';
import { StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: '#6366f1',
                tabBarInactiveTintColor: '#9ca3af',
                tabBarLabelStyle: styles.tabLabel,
                tabBarHideOnKeyboard: true,
                animation: 'fade',
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused, color, size }) => (
                        <Ionicons
                            name={focused ? 'home' : 'home-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="wardrobe"
                options={{
                    title: 'Wardrobe',
                    tabBarIcon: ({ focused, color, size }) => (
                        <Ionicons
                            name={focused ? 'shirt' : 'shirt-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="add"
                options={{
                    title: 'Add',
                    tabBarIcon: ({ focused, color, size }) => (
                        <Ionicons
                            name={focused ? 'add-circle' : 'add-circle-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="outfits"
                options={{
                    title: 'Outfits',
                    tabBarIcon: ({ focused, color, size }) => (
                        <Ionicons
                            name={focused ? 'layers' : 'layers-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="social"
                options={{
                    title: 'Social',
                    tabBarIcon: ({ focused, color, size }) => (
                        <Ionicons
                            name={focused ? 'people' : 'people-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused, color, size }) => (
                        <Ionicons
                            name={focused ? 'person' : 'person-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            {/* Hidden screen - not shown in tab bar */}
            <Tabs.Screen
                name="confirm-item"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="item-detail"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="outfits/swipe"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="outfits/builder"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="outfits/detail"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="log-wear"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="analytics"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="wear-calendar"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="badges"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="listing-history"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="premium"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="edit-profile"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="privacy"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="help"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="shopping"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="scan-confirm"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="scan-results"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="wishlist"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="scan-history"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="create-ootd"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="create-squad"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="join-squad"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="squad-detail"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="steal-look"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        height: Platform.OS === 'ios' ? 85 : 65,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        paddingTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
});
