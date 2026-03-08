import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    FlatList,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { SPACING, RADIUS, FONT_SIZE } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = '@assignhub_onboarding_complete';

const ONBOARDING_DATA = [
    {
        id: '1',
        icon: 'book-education',
        title: 'Welcome to AssignHub',
        subtitle: 'Your Academic Companion',
        description:
            'AssignHub helps you track and manage all your college assignments and experiments in one place. Stay organized, never miss a deadline, and keep your academic life on track!',
        guideTitle: '📱 Quick Start Guide',
        guideSteps: [
            { icon: 'plus-circle', text: 'Tap the "Subjects" tab to add your first subject' },
            { icon: 'format-list-numbered', text: 'Set the number of assignments & experiments' },
            { icon: 'tag-outline', text: 'Enter the subject name and code' },
            { icon: 'check-circle', text: 'You\'re ready to start tracking!' },
        ],
        gradient: ['#6C63FF', '#8B83FF'],
    },
    {
        id: '2',
        icon: 'clipboard-check-multiple',
        title: 'Track Everything',
        subtitle: 'Assignments & Experiments',
        description:
            'Update statuses (Not Given → Incomplete → Complete → Checked), enter marks, set submission dates, and attach files. Get deadline reminders so you never miss a submission!',
        guideTitle: '✏️ Managing Your Work',
        guideSteps: [
            { icon: 'gesture-tap', text: 'Tap a subject to see all assignments & experiments' },
            { icon: 'swap-horizontal', text: 'Swipe status pills to cycle through statuses' },
            { icon: 'star', text: 'Tap marks field to enter scores' },
            { icon: 'calendar-clock', text: 'Set deadlines to get automatic reminders' },
        ],
        gradient: ['#4DD0E1', '#2196F3'],
    },
    {
        id: '3',
        icon: 'chart-arc',
        title: 'Insights & Backup',
        subtitle: 'Stay Ahead of the Curve',
        description:
            'View your overall progress with beautiful charts, compare marks performance across subjects, and export/import your data as a backup. Your academic journey, visualized!',
        guideTitle: '📊 Power Features',
        guideSteps: [
            { icon: 'view-dashboard', text: 'Dashboard shows overall progress & pie charts' },
            { icon: 'chart-bar', text: 'Performance chart compares marks across subjects' },
            { icon: 'export', text: 'Export data from Settings for backup' },
            { icon: 'import', text: 'Import data to restore on any device' },
        ],
        gradient: ['#FF9800', '#FFB74D'],
    },
];

function GuideBubble({ step, index, colors, primary, animated }) {
    return (
        <Animated.View
            style={[
                styles.guideStep,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: animated,
                    transform: [
                        {
                            translateY: animated.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <View style={[styles.guideStepIcon, { backgroundColor: primary + '15' }]}>
                <MaterialCommunityIcons name={step.icon} size={18} color={primary} />
            </View>
            <Text style={[styles.guideStepText, { color: colors.text }]}>{step.text}</Text>
        </Animated.View>
    );
}

function OnboardingPage({ item, colors, primary, isDark, showGuide, onToggleGuide }) {
    const guideAnimations = useRef(
        item.guideSteps.map(() => new Animated.Value(0))
    ).current;

    React.useEffect(() => {
        if (showGuide) {
            const animations = guideAnimations.map((anim, index) =>
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 400,
                    delay: index * 150,
                    useNativeDriver: true,
                })
            );
            Animated.stagger(100, animations).start();
        } else {
            guideAnimations.forEach((anim) => {
                anim.setValue(0);
            });
        }
    }, [showGuide]);

    return (
        <View style={[styles.page, { width }]}>
            {/* Hero Icon */}
            <View
                style={[
                    styles.iconCircle,
                    {
                        backgroundColor: item.gradient[0] + '15',
                        borderColor: item.gradient[0] + '30',
                    },
                ]}
            >
                <View
                    style={[
                        styles.iconInner,
                        { backgroundColor: item.gradient[0] + '25' },
                    ]}
                >
                    <MaterialCommunityIcons
                        name={item.icon}
                        size={60}
                        color={item.gradient[0]}
                    />
                </View>
            </View>

            {/* Content */}
            <Text style={[styles.pageTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.pageSubtitle, { color: item.gradient[0] }]}>
                {item.subtitle}
            </Text>
            <Text style={[styles.pageDescription, { color: colors.textSecondary }]}>
                {item.description}
            </Text>

            {/* Guide Toggle */}
            <TouchableOpacity
                style={[
                    styles.guideToggle,
                    {
                        backgroundColor: showGuide ? item.gradient[0] + '15' : colors.surfaceVariant,
                        borderColor: showGuide ? item.gradient[0] + '40' : colors.border,
                    },
                ]}
                onPress={onToggleGuide}
                activeOpacity={0.7}
            >
                <MaterialCommunityIcons
                    name={showGuide ? 'lightbulb-on' : 'lightbulb-outline'}
                    size={18}
                    color={showGuide ? item.gradient[0] : colors.textTertiary}
                />
                <Text
                    style={[
                        styles.guideToggleText,
                        { color: showGuide ? item.gradient[0] : colors.textSecondary },
                    ]}
                >
                    {showGuide ? 'Hide Guide' : 'Show Quick Guide'}
                </Text>
                <MaterialCommunityIcons
                    name={showGuide ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={showGuide ? item.gradient[0] : colors.textTertiary}
                />
            </TouchableOpacity>

            {/* Guide Steps */}
            {showGuide && (
                <View style={styles.guideContainer}>
                    <Text
                        style={[styles.guideTitle, { color: colors.text }]}
                    >
                        {item.guideTitle}
                    </Text>
                    {item.guideSteps.map((step, index) => (
                        <GuideBubble
                            key={index}
                            step={step}
                            index={index}
                            colors={colors}
                            primary={item.gradient[0]}
                            animated={guideAnimations[index]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

export default function OnboardingScreen({ onComplete }) {
    const { colors, primary, isDark } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showGuide, setShowGuide] = useState({});
    const flatListRef = useRef(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const handleComplete = async () => {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        onComplete();
    };

    const handleSkip = () => {
        handleComplete();
    };

    const handleNext = () => {
        if (currentIndex < ONBOARDING_DATA.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        } else {
            handleComplete();
        }
    };

    const toggleGuide = (id) => {
        setShowGuide((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({
        viewAreaCoveragePercentThreshold: 50,
    }).current;

    const isLastPage = currentIndex === ONBOARDING_DATA.length - 1;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Skip Button */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={[styles.skipBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                    onPress={handleSkip}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
                    <MaterialCommunityIcons name="chevron-double-right" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Pages */}
            <FlatList
                ref={flatListRef}
                data={ONBOARDING_DATA}
                renderItem={({ item }) => (
                    <OnboardingPage
                        item={item}
                        colors={colors}
                        primary={primary}
                        isDark={isDark}
                        showGuide={!!showGuide[item.id]}
                        onToggleGuide={() => toggleGuide(item.id)}
                    />
                )}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
            />

            {/* Bottom Navigation */}
            <View style={styles.bottomBar}>
                {/* Dots */}
                <View style={styles.dotsRow}>
                    {ONBOARDING_DATA.map((item, index) => {
                        const inputRange = [
                            (index - 1) * width,
                            index * width,
                            (index + 1) * width,
                        ];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 28, 8],
                            extrapolate: 'clamp',
                        });
                        const dotOpacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={item.id}
                                style={[
                                    styles.dot,
                                    {
                                        width: dotWidth,
                                        opacity: dotOpacity,
                                        backgroundColor: ONBOARDING_DATA[currentIndex].gradient[0],
                                    },
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Next / Get Started Button */}
                <TouchableOpacity
                    style={[
                        styles.nextBtn,
                        { backgroundColor: ONBOARDING_DATA[currentIndex].gradient[0] },
                    ]}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    <Text style={styles.nextBtnText}>
                        {isLastPage ? 'Get Started' : 'Next'}
                    </Text>
                    <MaterialCommunityIcons
                        name={isLastPage ? 'rocket-launch' : 'arrow-right'}
                        size={20}
                        color="#FFF"
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// Helper to check if onboarding has been completed
export const checkOnboardingComplete = async () => {
    try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        return value === 'true';
    } catch {
        return false;
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.sm,
    },
    skipBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        gap: 4,
    },
    skipText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
    },
    page: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: SPACING.xxl,
        paddingTop: SPACING.lg,
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        marginBottom: SPACING.xxl,
    },
    iconInner: {
        width: 110,
        height: 110,
        borderRadius: 55,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.5,
        marginBottom: SPACING.xs,
    },
    pageSubtitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    pageDescription: {
        fontSize: FONT_SIZE.md,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.xl,
        paddingHorizontal: SPACING.sm,
    },
    guideToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm + 2,
        borderRadius: RADIUS.full,
        borderWidth: 1.5,
        gap: 6,
        marginBottom: SPACING.md,
    },
    guideToggleText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
    },
    guideContainer: {
        width: '100%',
        paddingHorizontal: SPACING.xs,
    },
    guideTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    guideStep: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        marginBottom: SPACING.sm,
    },
    guideStepIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    guideStepText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '500',
        flex: 1,
        lineHeight: 18,
    },
    bottomBar: {
        paddingHorizontal: SPACING.xxl,
        paddingBottom: SPACING.xl,
        paddingTop: SPACING.md,
    },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xl,
        gap: 6,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.lg,
        gap: 8,
    },
    nextBtnText: {
        color: '#FFF',
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
    },
});
