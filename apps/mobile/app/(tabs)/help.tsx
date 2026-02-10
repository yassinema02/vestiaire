/**
 * Help & Support Screen
 * FAQ, contact support, and app information
 */

import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Linking,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

interface FAQItem {
    question: string;
    answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
    {
        question: 'How do I add items to my wardrobe?',
        answer: 'Tap the "+" tab at the bottom of the screen. You can take a photo with your camera or pick one from your gallery. Our AI will automatically detect the category, colors, and pattern of your clothing item.',
    },
    {
        question: 'How does AI outfit suggestion work?',
        answer: 'Vestiaire uses Google Gemini AI to analyze your wardrobe items, current weather, and calendar events to suggest outfits that are weather-appropriate and occasion-suitable. You need at least 3 items in your wardrobe to get suggestions.',
    },
    {
        question: 'What is the premium plan?',
        answer: 'Premium gives you unlimited AI outfit suggestions, unlimited resale listings, advanced analytics, and priority support. Free users get 3 AI suggestions per day and 2 resale listings per month.',
    },
    {
        question: 'How do I delete an item?',
        answer: 'Open the item from your wardrobe, then scroll down and tap "Delete Item". This will permanently remove the item and its photos from your wardrobe.',
    },
    {
        question: 'Is my data secure?',
        answer: 'Yes. All your data is stored securely on Supabase servers with encryption. Photos are stored in encrypted cloud storage. We never sell your personal data to third parties. You can review and delete your data at any time from the Privacy settings.',
    },
    {
        question: 'How do I log what I wore?',
        answer: 'Go to the "Log Wear" screen from the home tab. You can select individual items or a saved outfit to record what you wore today. This helps track your wear patterns and earn style points.',
    },
    {
        question: 'Can I generate resale listings?',
        answer: 'Yes! Open any wardrobe item and tap "Generate Listing". Our AI will create a Vinted-optimized title, description, price suggestion, and hashtags. You can choose between casual, detailed, or minimal listing tones.',
    },
];

export default function HelpScreen() {
    const router = useRouter();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const appVersion = Constants.expoConfig?.version || '1.0.0';

    const handleContact = () => {
        Linking.openURL('mailto:support@vestiaire.app?subject=Vestiaire%20Support%20Request');
    };

    const toggleFAQ = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/profile')}>
                    <Ionicons name="chevron-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Help & Support</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* FAQ Section */}
                <Text style={styles.sectionLabel}>Frequently Asked Questions</Text>
                <View style={styles.faqContainer}>
                    {FAQ_ITEMS.map((item, index) => (
                        <View key={index}>
                            {index > 0 && <View style={styles.divider} />}
                            <TouchableOpacity
                                style={styles.faqItem}
                                onPress={() => toggleFAQ(index)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.faqQuestion}>{item.question}</Text>
                                <Ionicons
                                    name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                                    size={18}
                                    color="#9ca3af"
                                />
                            </TouchableOpacity>
                            {expandedIndex === index && (
                                <View style={styles.faqAnswer}>
                                    <Text style={styles.faqAnswerText}>{item.answer}</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Contact Support */}
                <Text style={styles.sectionLabel}>Get in Touch</Text>
                <TouchableOpacity style={styles.contactCard} onPress={handleContact}>
                    <View style={styles.contactIcon}>
                        <Ionicons name="mail" size={24} color="#6366f1" />
                    </View>
                    <View style={styles.contactText}>
                        <Text style={styles.contactTitle}>Contact Support</Text>
                        <Text style={styles.contactDesc}>support@vestiaire.app</Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color="#d1d5db" />
                </TouchableOpacity>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appName}>Vestiaire</Text>
                    <Text style={styles.appVersion}>Version {appVersion}</Text>
                    <Text style={styles.appCopyright}>Made with care for your wardrobe</Text>
                </View>
            </ScrollView>
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
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        flex: 1,
        fontSize: 22,
        fontWeight: '600',
        color: '#1f2937',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
        marginTop: 8,
    },
    faqContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 24,
    },
    faqItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    faqQuestion: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: '#1f2937',
        marginRight: 12,
    },
    faqAnswer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 0,
    },
    faqAnswerText: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 22,
    },
    divider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginHorizontal: 16,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 14,
        marginBottom: 32,
    },
    contactIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactText: {
        flex: 1,
    },
    contactTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    contactDesc: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    appInfo: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    appName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#5D4E37',
    },
    appVersion: {
        fontSize: 13,
        color: '#9ca3af',
        marginTop: 4,
    },
    appCopyright: {
        fontSize: 12,
        color: '#d1d5db',
        marginTop: 4,
    },
});
