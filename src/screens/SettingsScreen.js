import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    TextInput,
    Modal,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SPACING, RADIUS, FONT_SIZE } from '../constants/theme';
import { rescheduleAllNotifications } from '../services/notifications';

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
    const [folderModalVisible, setFolderModalVisible] = useState(false);
    const [folderName, setFolderName] = useState(settings.storageFolder || 'AssignHUB_Files');

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
        // Reschedule all notifications with new days
        await rescheduleAllNotifications(subjects);
    };

    const handleSaveFolder = async () => {
        const trimmed = folderName.trim();
        if (!trimmed) {
            Alert.alert('Validation', 'Folder name cannot be empty.');
            return;
        }
        // Sanitize folder name
        const sanitized = trimmed.replace(/[^a-zA-Z0-9_\-\s]/g, '_');
        await updateSettings({ storageFolder: sanitized });
        setFolderModalVisible(false);
        Alert.alert('Saved', `Files will be saved to: ${sanitized}\n\nNote: Existing files will remain in the old folder.`);
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

                {/* Files Section */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FILE STORAGE</Text>
                    <SettingRow
                        icon="folder-outline"
                        label="Storage Folder"
                        description={settings.storageFolder || 'AssignHUB_Files'}
                        colors={colors}
                        onPress={() => {
                            setFolderName(settings.storageFolder || 'AssignHUB_Files');
                            setFolderModalVisible(true);
                        }}
                    />
                    <View style={styles.storageNote}>
                        <MaterialCommunityIcons name="information-outline" size={14} color={colors.textTertiary} />
                        <Text style={[styles.storageNoteText, { color: colors.textTertiary }]}>
                            Files are saved in the app's internal storage and renamed based on subject code and assignment/experiment number
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
                        description="1.2.0"
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

            {/* Folder Name Modal */}
            <Modal
                visible={folderModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setFolderModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setFolderModalVisible(false)}
                    />
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Storage Folder</Text>
                            <TouchableOpacity onPress={() => setFolderModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.folderDesc, { color: colors.textSecondary }]}>
                            Set the folder name where assignment and experiment files will be saved
                        </Text>

                        <View style={[styles.folderInputWrap, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="folder-outline" size={20} color={colors.textTertiary} style={{ marginRight: SPACING.sm }} />
                            <TextInput
                                style={[styles.folderInput, { color: colors.text }]}
                                value={folderName}
                                onChangeText={setFolderName}
                                placeholder="AssignHUB_Files"
                                placeholderTextColor={colors.textTertiary}
                                maxLength={50}
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.folderSaveBtn, { backgroundColor: primary }]}
                            onPress={handleSaveFolder}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="content-save" size={18} color="#FFF" />
                            <Text style={styles.folderSaveBtnText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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

    // Storage section
    storageNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: SPACING.sm,
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

    // Folder modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '85%',
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700' },
    folderDesc: {
        fontSize: FONT_SIZE.sm,
        marginBottom: SPACING.lg,
        lineHeight: 20,
    },
    folderInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.lg,
    },
    folderInput: {
        flex: 1,
        fontSize: FONT_SIZE.md,
        paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.sm + 2,
    },
    folderSaveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md + 2,
    },
    folderSaveBtnText: {
        color: '#FFF',
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        marginLeft: SPACING.sm,
    },
});
