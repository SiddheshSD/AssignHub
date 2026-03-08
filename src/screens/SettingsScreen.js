import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SPACING, RADIUS, FONT_SIZE } from '../constants/theme';
import { rescheduleAllNotifications } from '../services/notifications';
import { requestStorageDirectory, getFolderDisplayName } from '../services/fileManager';

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
                    <Text style={[styles.rowDesc, { color: colors.textTertiary }]} numberOfLines={2}>{description}</Text>
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

function DaySelector({ value, onChange, colors, primary }) {
    const options = [1, 2, 3, 5, 7];
    return (
        <View style={styles.daySelectorRow}>
            {options.map((day) => (
                <TouchableOpacity
                    key={day}
                    style={[
                        styles.daySelectorOption,
                        {
                            backgroundColor: value === day ? primary + '15' : colors.surfaceVariant,
                            borderColor: value === day ? primary : colors.border,
                        },
                    ]}
                    onPress={() => onChange(day)}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            styles.daySelectorText,
                            {
                                color: value === day ? primary : colors.textSecondary,
                                fontWeight: value === day ? '700' : '500',
                            },
                        ]}
                    >
                        {day}
                    </Text>
                    <Text
                        style={[
                            styles.daySelectorLabel,
                            { color: value === day ? primary : colors.textTertiary },
                        ]}
                    >
                        {day === 1 ? 'day' : 'days'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

export default function SettingsScreen() {
    const { colors, primary, isDark, preference, setThemePreference } = useTheme();
    const { resetAllData, stats, settings, updateSettings, subjects } = useData();

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

    const handleNotificationDaysChange = async (days) => {
        await updateSettings({ notificationDaysBefore: days });
        await rescheduleAllNotifications(subjects);
    };

    const handleChooseFolder = async () => {
        const dirUri = await requestStorageDirectory();
        if (dirUri) {
            await updateSettings({ storageDirUri: dirUri });
            const displayName = getFolderDisplayName(dirUri);
            Alert.alert(
                'Folder Selected',
                `Files will now be saved to:\n${displayName}\n\nAll new files will be saved to this folder on your phone.`
            );
        }
    };

    const handleClearFolder = () => {
        Alert.alert(
            'Remove Folder',
            'Remove the selected storage folder? Files will only be saved in app storage (not accessible from file manager).',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        await updateSettings({ storageDirUri: null });
                    },
                },
            ]
        );
    };

    const folderDisplayName = getFolderDisplayName(settings.storageDirUri);
    const hasFolderSet = !!settings.storageDirUri;

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

                {/* Notifications Section */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NOTIFICATIONS</Text>
                    <Text style={[styles.notifLabel, { color: colors.text }]}>Remind me before deadline</Text>
                    <Text style={[styles.notifDesc, { color: colors.textTertiary }]}>
                        You'll receive daily reminders starting this many days before a submission deadline
                    </Text>
                    <DaySelector
                        value={settings.notificationDaysBefore || 2}
                        onChange={handleNotificationDaysChange}
                        colors={colors}
                        primary={primary}
                    />
                </View>

                {/* File Storage Section */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FILE STORAGE</Text>

                    {/* Current folder display */}
                    <View style={[styles.folderDisplay, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                        <View style={[styles.folderIconWrap, { backgroundColor: hasFolderSet ? primary + '18' : colors.border + '60' }]}>
                            <MaterialCommunityIcons
                                name={hasFolderSet ? 'folder-check' : 'folder-alert-outline'}
                                size={24}
                                color={hasFolderSet ? primary : colors.textTertiary}
                            />
                        </View>
                        <View style={styles.folderTextWrap}>
                            <Text style={[styles.folderStatusLabel, { color: colors.textSecondary }]}>
                                {hasFolderSet ? 'Saving files to' : 'No folder selected'}
                            </Text>
                            <Text style={[styles.folderPath, { color: hasFolderSet ? colors.text : colors.textTertiary }]} numberOfLines={2}>
                                {hasFolderSet ? folderDisplayName : 'Files will only be saved in app storage'}
                            </Text>
                        </View>
                    </View>

                    {/* Choose folder button */}
                    <TouchableOpacity
                        style={[styles.chooseFolderBtn, { backgroundColor: primary }]}
                        onPress={handleChooseFolder}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="folder-open-outline" size={20} color="#FFF" />
                        <Text style={styles.chooseFolderBtnText}>
                            {hasFolderSet ? 'Change Folder' : 'Choose Folder'}
                        </Text>
                    </TouchableOpacity>

                    {/* Clear folder button */}
                    {hasFolderSet && (
                        <TouchableOpacity
                            style={[styles.clearFolderBtn, { borderColor: colors.danger + '40' }]}
                            onPress={handleClearFolder}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons name="folder-remove-outline" size={16} color={colors.danger} />
                            <Text style={[styles.clearFolderBtnText, { color: colors.danger }]}>Remove Folder</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.storageNote}>
                        <MaterialCommunityIcons name="information-outline" size={14} color={colors.textTertiary} />
                        <Text style={[styles.storageNoteText, { color: colors.textTertiary }]}>
                            Choose a folder on your phone (e.g. Downloads) where assignment files will be saved. Files are auto-renamed based on subject code and assignment/experiment number.
                        </Text>
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
                        description="1.2.3"
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

    // Notification settings
    notifLabel: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        marginBottom: SPACING.xs,
    },
    notifDesc: {
        fontSize: FONT_SIZE.xs,
        marginBottom: SPACING.md,
        lineHeight: 16,
    },
    daySelectorRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
    },
    daySelectorOption: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm + 2,
        borderRadius: RADIUS.md,
        borderWidth: 1.5,
    },
    daySelectorText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
    },
    daySelectorLabel: {
        fontSize: 9,
        marginTop: 1,
    },

    // File Storage section
    folderDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    folderIconWrap: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    folderTextWrap: {
        flex: 1,
    },
    folderStatusLabel: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
        marginBottom: 2,
    },
    folderPath: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '500',
        lineHeight: 18,
    },
    chooseFolderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md + 2,
        marginBottom: SPACING.sm,
    },
    chooseFolderBtnText: {
        color: '#FFF',
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        marginLeft: SPACING.sm,
    },
    clearFolderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm + 2,
        marginBottom: SPACING.sm,
        borderWidth: 1,
    },
    clearFolderBtnText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        marginLeft: SPACING.xs,
    },
    storageNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: SPACING.xs,
        paddingTop: SPACING.sm,
        gap: 6,
    },
    storageNoteText: {
        fontSize: FONT_SIZE.xs,
        flex: 1,
        lineHeight: 16,
    },

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
