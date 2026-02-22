import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SPACING, RADIUS, FONT_SIZE } from '../constants/theme';

function SettingRow({ icon, label, description, colors, onPress, right, danger }) {
    return (
        <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={onPress}
            activeOpacity={onPress ? 0.6 : 1}
            disabled={!onPress}
        >
            <View style={[styles.rowIcon, { backgroundColor: danger ? colors.dangerLight : colors.surfaceVariant }]}>
                <MaterialCommunityIcons name={icon} size={20} color={danger ? colors.danger : colors.textSecondary} />
            </View>
            <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
                {description && (
                    <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>{description}</Text>
                )}
            </View>
            {right || (
                onPress && <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
            )}
        </TouchableOpacity>
    );
}

function ThemeOption({ label, value, icon, selected, colors, primary, onPress }) {
    return (
        <TouchableOpacity
            style={[
                styles.themeOption,
                {
                    backgroundColor: selected ? primary + '15' : colors.surfaceVariant,
                    borderColor: selected ? primary : colors.border,
                },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <MaterialCommunityIcons
                name={icon}
                size={22}
                color={selected ? primary : colors.textTertiary}
            />
            <Text
                style={[
                    styles.themeOptionText,
                    { color: selected ? primary : colors.textSecondary, fontWeight: selected ? '700' : '500' },
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}

export default function SettingsScreen() {
    const { colors, primary, isDark, preference, setThemePreference } = useTheme();
    const { resetAllData, stats } = useData();

    const handleReset = () => {
        Alert.alert(
            'Reset All Data',
            'This will permanently delete all your subjects, assignments, and experiments. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        await resetAllData();
                        Alert.alert('Done', 'All data has been reset.');
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

                {/* Theme Section */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
                    <Text style={[styles.themeLabel, { color: colors.text }]}>Theme</Text>
                    <View style={styles.themeRow}>
                        <ThemeOption
                            label="System"
                            value="system"
                            icon="cellphone-cog"
                            selected={preference === 'system'}
                            colors={colors}
                            primary={primary}
                            onPress={() => setThemePreference('system')}
                        />
                        <ThemeOption
                            label="Light"
                            value="light"
                            icon="white-balance-sunny"
                            selected={preference === 'light'}
                            colors={colors}
                            primary={primary}
                            onPress={() => setThemePreference('light')}
                        />
                        <ThemeOption
                            label="Dark"
                            value="dark"
                            icon="moon-waning-crescent"
                            selected={preference === 'dark'}
                            colors={colors}
                            primary={primary}
                            onPress={() => setThemePreference('dark')}
                        />
                    </View>
                </View>

                {/* Data Section */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DATA</Text>
                    <SettingRow
                        icon="database"
                        label="Storage Used"
                        description={`${stats.totalSubjects} subjects, ${stats.totalItems} items`}
                        colors={colors}
                    />
                    <SettingRow
                        icon="delete-forever"
                        label="Reset All Data"
                        description="Delete all subjects and progress"
                        colors={colors}
                        onPress={handleReset}
                        danger
                    />
                </View>

                {/* About Section */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ABOUT</Text>
                    <SettingRow
                        icon="information-outline"
                        label="App Version"
                        description="1.0.0"
                        colors={colors}
                    />
                    <SettingRow
                        icon="react"
                        label="Built with"
                        description="Expo / React Native"
                        colors={colors}
                    />
                    <SettingRow
                        icon="heart-outline"
                        label="AssignHub"
                        description="Track your academic progress"
                        colors={colors}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
    title: {
        fontSize: FONT_SIZE.xxxl,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: SPACING.xl,
    },
    section: {
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: SPACING.md,
    },
    themeLabel: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        marginBottom: SPACING.md,
    },
    themeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    themeOption: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        marginHorizontal: 3,
        borderWidth: 1.5,
    },
    themeOptionText: { fontSize: FONT_SIZE.xs, marginTop: SPACING.xs },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: FONT_SIZE.md, fontWeight: '600' },
    rowDesc: { fontSize: FONT_SIZE.xs, marginTop: 2 },
});
