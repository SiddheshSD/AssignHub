import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Platform,
    Linking,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SPACING, RADIUS, FONT_SIZE } from '../constants/theme';
import { rescheduleAllNotifications } from '../services/notifications';
import { requestStorageDirectory, getFolderDisplayName } from '../services/fileManager';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

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
    const { resetAllData, stats, settings, updateSettings, subjects, importSubjects } = useData();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

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

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const exportData = {
                version: '1.2.5',
                exportDate: new Date().toISOString(),
                subjects: subjects.map((s) => ({
                    name: s.name,
                    code: s.code,
                    totalAssignments: s.totalAssignments,
                    totalExperiments: s.totalExperiments,
                    assignmentOutOf: s.assignmentOutOf ?? 10,
                    experimentOutOf: s.experimentOutOf ?? 10,
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt,
                    assignments: s.assignments.map((a) => ({
                        label: a.label,
                        status: a.status,
                        marks: a.marks,
                        submissionDate: a.submissionDate,
                    })),
                    experiments: s.experiments.map((e) => ({
                        label: e.label,
                        status: e.status,
                        marks: e.marks,
                        submissionDate: e.submissionDate,
                    })),
                })),
            };

            const jsonStr = JSON.stringify(exportData, null, 2);
            const fileName = `AssignHUB_Backup_${new Date().toISOString().split('T')[0]}.json`;
            const cacheFileUri = FileSystem.cacheDirectory + fileName;

            await FileSystem.writeAsStringAsync(cacheFileUri, jsonStr, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            // Save directly to user's chosen SAF folder
            let savedToFolder = false;
            if (settings.storageDirUri) {
                try {
                    const safFileUri = await StorageAccessFramework.createFileAsync(
                        settings.storageDirUri,
                        fileName,
                        'application/json'
                    );
                    await FileSystem.writeAsStringAsync(safFileUri, jsonStr, {
                        encoding: FileSystem.EncodingType.UTF8,
                    });
                    savedToFolder = true;
                } catch (safError) {
                    console.warn('Could not save to SAF folder:', safError);
                }
            }

            // Also share via share sheet
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(cacheFileUri, {
                    mimeType: 'application/json',
                    dialogTitle: 'Share AssignHUB Backup',
                    UTI: 'public.json',
                });
            }

            if (savedToFolder) {
                const folderName = getFolderDisplayName(settings.storageDirUri);
                Alert.alert(
                    'Export Successful',
                    `Backup saved to your folder:\n${folderName}\n\nFile: ${fileName}`
                );
            } else if (!canShare) {
                Alert.alert('Export Saved', `Backup file saved:\n${fileName}`);
            }
        } catch (error) {
            console.error('Export error:', error);
            Alert.alert('Export Failed', 'Could not export data. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets?.[0];
            if (!file) return;

            setIsImporting(true);

            const content = await FileSystem.readAsStringAsync(file.uri, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            const importData = JSON.parse(content);

            if (!importData.subjects || !Array.isArray(importData.subjects)) {
                Alert.alert('Invalid File', 'This file does not contain valid AssignHUB data.');
                setIsImporting(false);
                return;
            }

            Alert.alert(
                'Import Data',
                `This will replace all your current data with ${importData.subjects.length} subjects from the backup (${importData.exportDate ? new Date(importData.exportDate).toLocaleDateString() : 'unknown date'}).\n\nThis cannot be undone.`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => setIsImporting(false) },
                    {
                        text: 'Import',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await importSubjects(importData.subjects);
                                Alert.alert(
                                    'Import Successful',
                                    `${importData.subjects.length} subjects have been imported successfully.`
                                );
                            } catch (err) {
                                console.error('Import error:', err);
                                Alert.alert('Import Failed', 'Could not import data. The file may be corrupted.');
                            } finally {
                                setIsImporting(false);
                            }
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Import error:', error);
            Alert.alert('Import Failed', 'Could not read the file. Make sure it is a valid AssignHUB backup file.');
            setIsImporting(false);
        }
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
                            Choose a folder on your phone (e.g. Downloads) where files will be saved. Files are organized into subject folders (SubjectName_SubjectCode) and auto-renamed as Assignment_1_SubjectName.pdf or Experiment_2_SubjectName.pdf.
                        </Text>
                    </View>
                </View>

                {/* Export/Import Section */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BACKUP & RESTORE</Text>

                    <View style={[styles.backupInfo, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                        <MaterialCommunityIcons name="information-outline" size={16} color={primary} />
                        <Text style={[styles.backupInfoText, { color: colors.textSecondary }]}>
                            Export your subjects, assignment/experiment statuses, marks, and dates as a backup file. Import to restore on any device.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.backupBtn, { backgroundColor: primary }]}
                        onPress={handleExport}
                        activeOpacity={0.8}
                        disabled={isExporting || subjects.length === 0}
                    >
                        {isExporting ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <MaterialCommunityIcons name="database-export-outline" size={20} color="#FFF" />
                        )}
                        <Text style={styles.backupBtnText}>
                            {isExporting ? 'Exporting...' : `Export Data (${subjects.length} subjects)`}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.backupBtn, styles.importBtn, { borderColor: primary }]}
                        onPress={handleImport}
                        activeOpacity={0.8}
                        disabled={isImporting}
                    >
                        {isImporting ? (
                            <ActivityIndicator size="small" color={primary} />
                        ) : (
                            <MaterialCommunityIcons name="database-import-outline" size={20} color={primary} />
                        )}
                        <Text style={[styles.backupBtnText, styles.importBtnText, { color: primary }]}>
                            {isImporting ? 'Importing...' : 'Import Data'}
                        </Text>
                    </TouchableOpacity>
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
                        description="1.2.5"
                        colors={colors}
                    />
                    <SettingRow
                        icon="copyright"
                        label="© SiddheshSD"
                        description="All rights reserved"
                        colors={colors}
                    />
                </View>

                {/* Socials Section */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CONNECT</Text>
                    <SettingRow
                        icon="linkedin"
                        label="LinkedIn"
                        description="Connect with me"
                        colors={colors}
                        onPress={() => Linking.openURL('https://www.linkedin.com/in/siddhesh-dicholkar')}
                    />
                    <SettingRow
                        icon="github"
                        label="GitHub"
                        description="View my projects"
                        colors={colors}
                        onPress={() => Linking.openURL('https://github.com/SiddheshSD')}
                    />
                    {/* <SettingRow
                        icon="web"
                        label="Portfolio"
                        description="Visit my website"
                        colors={colors}
                        onPress={() => Linking.openURL('https://YOUR_PORTFOLIO_URL')}
                    /> */}
                    <SettingRow
                        icon="instagram"
                        label="Instagram"
                        description="Follow me"
                        colors={colors}
                        onPress={() => Linking.openURL('https://instagram.com/siddhesh_005')}
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

    // Backup & Restore
    backupInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        marginBottom: SPACING.md,
        gap: 8,
    },
    backupInfoText: {
        fontSize: FONT_SIZE.xs,
        flex: 1,
        lineHeight: 16,
    },
    backupBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md + 2,
        marginBottom: SPACING.sm,
        gap: 8,
    },
    backupBtnText: {
        color: '#FFF',
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
    },
    importBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
    },
    importBtnText: {
        color: '#000',
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
