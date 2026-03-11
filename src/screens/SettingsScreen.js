import React, { useState, useRef } from 'react';
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
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, COLOR_PALETTE } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SPACING, RADIUS, FONT_SIZE } from '../constants/theme';
import { rescheduleAllNotifications } from '../services/notifications';
import { requestStorageDirectory, getFolderDisplayName } from '../services/fileManager';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import Svg, { Circle, Line } from 'react-native-svg';

const CLOCK_SIZE = 220;
const CR = CLOCK_SIZE / 2;
const NUM_R = CR - 28;
const HAND_R = NUM_R - 4;

function SettingRow({ icon, label, description, colors, onPress, right, danger }) {
    return (
        <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={onPress}
            activeOpacity={onPress ? 0.6 : 1}
            disabled={!onPress}
        >
            <View style={[styles.rowIcon, { backgroundColor: danger ? colors.dangerLight : colors.surfaceVariant }]}>
                <MaterialCommunityIcons name={icon} size={18} color={danger ? colors.danger : colors.textSecondary} />
            </View>
            <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
                {description && (
                    <Text style={[styles.rowDesc, { color: colors.textTertiary }]} numberOfLines={2}>{description}</Text>
                )}
            </View>
            {right || (
                onPress && <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
            )}
        </TouchableOpacity>
    );
}

export default function SettingsScreen() {
    const { colors, primary, isDark, preference, setThemePreference, primaryColorObj, setPrimaryColor } = useTheme();
    const { resetAllData, stats, settings, updateSettings, subjects, importSubjects } = useData();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
    const [timeModalOpen, setTimeModalOpen] = useState(false);
    const [clockMode, setClockMode] = useState('hour'); // 'hour' | 'minute'
    const [tempH12, setTempH12] = useState(() => {
        const h = settings.notificationTimeHour ?? 9;
        return h % 12 || 12;
    });
    const [tempMinute, setTempMinute] = useState(settings.notificationTimeMinute ?? 0);
    const [tempPM, setTempPM] = useState((settings.notificationTimeHour ?? 9) >= 12);
    const clockLayoutRef = useRef(null);

    const formatTime = (h, m) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const displayM = (m ?? 0).toString().padStart(2, '0');
        return `${displayH}:${displayM} ${period}`;
    };

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
    };

    const handleTimeConfirm = async () => {
        let h24 = tempH12 % 12;
        if (tempPM) h24 += 12;
        await updateSettings({ notificationTimeHour: h24, notificationTimeMinute: tempMinute });
        setTimeModalOpen(false);
    };

    const openTimePicker = () => {
        const h = settings.notificationTimeHour ?? 9;
        setTempH12(h % 12 || 12);
        setTempMinute(settings.notificationTimeMinute ?? 0);
        setTempPM(h >= 12);
        setClockMode('hour');
        setTimeModalOpen(true);
    };

    // Clock touch handler
    const handleClockTouch = (evt) => {
        if (!clockLayoutRef.current) return;
        const { pageX, pageY } = evt.nativeEvent;
        const { x: ox, y: oy } = clockLayoutRef.current;
        const dx = pageX - (ox + CR);
        const dy = pageY - (oy + CR);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20) return; // too close to center
        let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        if (clockMode === 'hour') {
            let h = Math.round(angle / 30);
            if (h === 0) h = 12;
            setTempH12(h);
        } else {
            let m = Math.round(angle / 6);
            m = Math.round(m / 5) * 5;
            if (m >= 60) m = 0;
            setTempMinute(m);
        }
    };

    const handleClockRelease = () => {
        if (clockMode === 'hour') setClockMode('minute');
    };

    const handleClockLayout = (e) => {
        e.target.measureInWindow((x, y) => {
            clockLayoutRef.current = { x, y };
        });
    };

    // Clock hand angle
    const clockAngle = clockMode === 'hour'
        ? ((tempH12 % 12) / 12) * 360
        : (tempMinute / 60) * 360;
    const handAngleRad = clockAngle * (Math.PI / 180);
    const handX = CR + HAND_R * Math.sin(handAngleRad);
    const handY = CR - HAND_R * Math.cos(handAngleRad);

    // Clock display time
    const clockDisplayTime = `${tempH12}:${tempMinute.toString().padStart(2, '0')}`;

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
                version: '1.2.6',
                exportDate: new Date().toISOString(),
                subjects: subjects.map((s) => ({
                    name: s.name,
                    shortName: s.shortName || s.name,
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

            let savedPath = null;
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
                    savedPath = getFolderDisplayName(settings.storageDirUri);
                } catch (safError) {
                    console.warn('Could not save to SAF folder:', safError);
                }
            }

            if (!savedPath) {
                try {
                    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        const dirUri = permissions.directoryUri;
                        const safFileUri = await StorageAccessFramework.createFileAsync(
                            dirUri,
                            fileName,
                            'application/json'
                        );
                        await FileSystem.writeAsStringAsync(safFileUri, jsonStr, {
                            encoding: FileSystem.EncodingType.UTF8,
                        });
                        savedPath = getFolderDisplayName(dirUri);
                    }
                } catch (pickError) {
                    console.warn('Could not pick download folder:', pickError);
                }
            }

            if (!savedPath) {
                const localUri = FileSystem.documentDirectory + fileName;
                await FileSystem.writeAsStringAsync(localUri, jsonStr, {
                    encoding: FileSystem.EncodingType.UTF8,
                });
                savedPath = 'App Storage (internal)';
            }

            Alert.alert(
                'Export Successful ✅',
                `Backup has been downloaded.\n\n📁 Location: ${savedPath}\n📄 File: ${fileName}`
            );
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
    const dayOptions = [1, 2, 3, 5, 7];
    const currentDays = settings.notificationDaysBefore || 2;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

                {/* ── APPEARANCE ── */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>

                    {/* Theme – compact row of 3 small pills */}
                    <View style={styles.inlineRow}>
                        <Text style={[styles.inlineLabel, { color: colors.text }]}>Theme</Text>
                        <View style={styles.pillRow}>
                            {[
                                { label: 'Auto', value: 'system', icon: 'cellphone-cog' },
                                { label: 'Light', value: 'light', icon: 'white-balance-sunny' },
                                { label: 'Dark', value: 'dark', icon: 'moon-waning-crescent' },
                            ].map((t) => {
                                const sel = preference === t.value;
                                return (
                                    <TouchableOpacity
                                        key={t.value}
                                        style={[
                                            styles.pill,
                                            {
                                                backgroundColor: sel ? primary + '18' : colors.surfaceVariant,
                                                borderColor: sel ? primary : colors.border,
                                            },
                                        ]}
                                        onPress={() => setThemePreference(t.value)}
                                        activeOpacity={0.7}
                                    >
                                        <MaterialCommunityIcons name={t.icon} size={14} color={sel ? primary : colors.textTertiary} />
                                        <Text style={[styles.pillText, { color: sel ? primary : colors.textSecondary, fontWeight: sel ? '700' : '500' }]}>
                                            {t.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Accent Color – dropdown style */}
                    <View style={[styles.inlineRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: SPACING.md }]}>
                        <Text style={[styles.inlineLabel, { color: colors.text }]}>Accent Color</Text>
                        <TouchableOpacity
                            style={[styles.colorDropdownBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                            onPress={() => setColorDropdownOpen(!colorDropdownOpen)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.colorDotSmall, { backgroundColor: primaryColorObj.color }]} />
                            <Text style={[styles.colorDropdownText, { color: colors.text }]}>{primaryColorObj.name}</Text>
                            <MaterialCommunityIcons
                                name={colorDropdownOpen ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color={colors.textTertiary}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Color dropdown list */}
                    {colorDropdownOpen && (
                        <View style={[styles.colorDropdownList, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                            {COLOR_PALETTE.map((c) => {
                                const sel = primaryColorObj.color === c.color;
                                return (
                                    <TouchableOpacity
                                        key={c.color}
                                        style={[
                                            styles.colorDropdownItem,
                                            sel && { backgroundColor: c.color + '12' },
                                            { borderBottomColor: colors.border },
                                        ]}
                                        onPress={() => {
                                            setPrimaryColor(c);
                                            setColorDropdownOpen(false);
                                        }}
                                        activeOpacity={0.6}
                                    >
                                        <View style={[styles.colorDotSmall, { backgroundColor: c.color }]} />
                                        <Text style={[styles.colorDropdownItemText, { color: sel ? c.color : colors.text, fontWeight: sel ? '700' : '500' }]}>
                                            {c.name}
                                        </Text>
                                        {sel && <MaterialCommunityIcons name="check" size={16} color={c.color} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* ── NOTIFICATIONS ── */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NOTIFICATIONS</Text>

                    {/* Remind days – inline compact */}
                    <View style={styles.inlineRow}>
                        <Text style={[styles.inlineLabel, { color: colors.text }]}>Remind before</Text>
                        <View style={styles.miniPillRow}>
                            {dayOptions.map((day) => {
                                const sel = currentDays === day;
                                return (
                                    <TouchableOpacity
                                        key={day}
                                        style={[
                                            styles.miniPill,
                                            {
                                                backgroundColor: sel ? primary : colors.surfaceVariant,
                                                borderColor: sel ? primary : colors.border,
                                            },
                                        ]}
                                        onPress={() => handleNotificationDaysChange(day)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.miniPillText, { color: sel ? '#FFF' : colors.textSecondary, fontWeight: sel ? '700' : '500' }]}>
                                            {day}d
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Notification time – inline compact */}
                    <View style={[styles.inlineRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: SPACING.md }]}>
                        <Text style={[styles.inlineLabel, { color: colors.text }]}>Time</Text>
                        <TouchableOpacity
                            style={[styles.timeBtnCompact, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                            onPress={openTimePicker}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons name="clock-outline" size={14} color={primary} />
                            <Text style={[styles.timeBtnText, { color: colors.text }]}>
                                {formatTime(settings.notificationTimeHour ?? 9, settings.notificationTimeMinute ?? 0)}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── FILE STORAGE ── */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FILE STORAGE</Text>

                    <View style={[styles.folderDisplay, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                        <View style={[styles.folderIconWrap, { backgroundColor: hasFolderSet ? primary + '18' : colors.border + '60' }]}>
                            <MaterialCommunityIcons
                                name={hasFolderSet ? 'folder-check' : 'folder-alert-outline'}
                                size={22}
                                color={hasFolderSet ? primary : colors.textTertiary}
                            />
                        </View>
                        <View style={styles.folderTextWrap}>
                            <Text style={[styles.folderStatusLabel, { color: colors.textSecondary }]}>
                                {hasFolderSet ? 'Saving files to' : 'No folder selected'}
                            </Text>
                            <Text style={[styles.folderPath, { color: hasFolderSet ? colors.text : colors.textTertiary }]} numberOfLines={2}>
                                {hasFolderSet ? folderDisplayName : 'Files saved in app storage only'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.folderBtnRow}>
                        <TouchableOpacity
                            style={[styles.folderBtn, { backgroundColor: primary }]}
                            onPress={handleChooseFolder}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="folder-open-outline" size={16} color="#FFF" />
                            <Text style={styles.folderBtnText}>{hasFolderSet ? 'Change' : 'Choose Folder'}</Text>
                        </TouchableOpacity>
                        {hasFolderSet && (
                            <TouchableOpacity
                                style={[styles.folderBtn, styles.folderBtnOutline, { borderColor: colors.danger + '40' }]}
                                onPress={handleClearFolder}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="folder-remove-outline" size={14} color={colors.danger} />
                                <Text style={[styles.folderBtnText, { color: colors.danger }]}>Remove</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* ── BACKUP & RESTORE ── */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BACKUP & RESTORE</Text>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: primary }]}
                        onPress={handleExport}
                        activeOpacity={0.8}
                        disabled={isExporting || subjects.length === 0}
                    >
                        {isExporting ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <MaterialCommunityIcons name="download" size={18} color="#FFF" />
                        )}
                        <Text style={styles.actionBtnText}>
                            {isExporting ? 'Downloading...' : `Download Backup (${subjects.length})`}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: primary }]}
                        onPress={handleImport}
                        activeOpacity={0.8}
                        disabled={isImporting}
                    >
                        {isImporting ? (
                            <ActivityIndicator size="small" color={primary} />
                        ) : (
                            <MaterialCommunityIcons name="database-import-outline" size={18} color={primary} />
                        )}
                        <Text style={[styles.actionBtnText, { color: primary }]}>
                            {isImporting ? 'Importing...' : 'Import Data'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ── DATA ── */}
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

                {/* ── ABOUT ── */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ABOUT</Text>
                    <SettingRow icon="information-outline" label="App Version" description="1.2.6" colors={colors} />
                    <SettingRow icon="copyright" label="© SiddheshSD" description="All rights reserved" colors={colors} />
                </View>

                {/* ── CONNECT ── */}
                <View style={[styles.section, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CONNECT</Text>
                    <SettingRow icon="linkedin" label="LinkedIn" description="Connect with me" colors={colors} onPress={() => Linking.openURL('https://www.linkedin.com/in/siddhesh-dicholkar')} />
                    <SettingRow icon="github" label="GitHub" description="View my projects" colors={colors} onPress={() => Linking.openURL('https://github.com/SiddheshSD')} />
                    <SettingRow icon="instagram" label="Instagram" description="Follow me" colors={colors} onPress={() => Linking.openURL('https://instagram.com/siddhesh_005')} />
                </View>
            </ScrollView>

            {/* ── CLOCK TIME PICKER MODAL ── */}
            <Modal visible={timeModalOpen} transparent animationType="fade" onRequestClose={() => setTimeModalOpen(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setTimeModalOpen(false)} />
                    <View style={[styles.timeModal, { backgroundColor: colors.card }]}>
                        <View style={styles.timeModalHeader}>
                            <Text style={[styles.timeModalTitle, { color: colors.text }]}>Set Time</Text>
                            <TouchableOpacity onPress={() => setTimeModalOpen(false)}>
                                <MaterialCommunityIcons name="close" size={22} color={colors.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        {/* Time display + mode toggle */}
                        <View style={styles.clockTimeDisplay}>
                            <TouchableOpacity onPress={() => setClockMode('hour')} activeOpacity={0.7}>
                                <Text style={[
                                    styles.clockTimeDigit,
                                    { color: clockMode === 'hour' ? primary : colors.textTertiary },
                                ]}>{tempH12}</Text>
                            </TouchableOpacity>
                            <Text style={[styles.clockTimeColon, { color: colors.textTertiary }]}>:</Text>
                            <TouchableOpacity onPress={() => setClockMode('minute')} activeOpacity={0.7}>
                                <Text style={[
                                    styles.clockTimeDigit,
                                    { color: clockMode === 'minute' ? primary : colors.textTertiary },
                                ]}>{tempMinute.toString().padStart(2, '0')}</Text>
                            </TouchableOpacity>
                            {/* AM/PM toggle */}
                            <View style={styles.ampmCol}>
                                <TouchableOpacity
                                    style={[styles.ampmBtn, { backgroundColor: !tempPM ? primary : colors.surfaceVariant }]}
                                    onPress={() => setTempPM(false)}
                                >
                                    <Text style={[styles.ampmText, { color: !tempPM ? '#FFF' : colors.textTertiary }]}>AM</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.ampmBtn, { backgroundColor: tempPM ? primary : colors.surfaceVariant }]}
                                    onPress={() => setTempPM(true)}
                                >
                                    <Text style={[styles.ampmText, { color: tempPM ? '#FFF' : colors.textTertiary }]}>PM</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Clock face */}
                        <View
                            style={styles.clockContainer}
                            onLayout={handleClockLayout}
                            onStartShouldSetResponder={() => true}
                            onMoveShouldSetResponder={() => true}
                            onResponderGrant={handleClockTouch}
                            onResponderMove={handleClockTouch}
                            onResponderRelease={handleClockRelease}
                        >
                            <View style={[styles.clockFace, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                                {/* SVG hand */}
                                <Svg width={CLOCK_SIZE} height={CLOCK_SIZE} style={StyleSheet.absoluteFill}>
                                    <Line x1={CR} y1={CR} x2={handX} y2={handY} stroke={primary} strokeWidth={2} strokeLinecap="round" />
                                    <Circle cx={CR} cy={CR} r={4} fill={primary} />
                                    <Circle cx={handX} cy={handY} r={18} fill={primary + '22'} />
                                </Svg>

                                {/* Numbers */}
                                {clockMode === 'hour'
                                    ? Array.from({ length: 12 }, (_, i) => {
                                        const num = i + 1;
                                        const a = (num / 12) * 2 * Math.PI;
                                        const x = CR + NUM_R * Math.sin(a) - 16;
                                        const y = CR - NUM_R * Math.cos(a) - 16;
                                        const sel = tempH12 === num;
                                        return (
                                            <View key={num} style={[styles.clockNum, { left: x, top: y, backgroundColor: sel ? primary : 'transparent' }]}>
                                                <Text style={[styles.clockNumText, { color: sel ? '#FFF' : colors.text, fontWeight: sel ? '800' : '500' }]}>{num}</Text>
                                            </View>
                                        );
                                    })
                                    : Array.from({ length: 12 }, (_, i) => {
                                        const min = i * 5;
                                        const a = (min / 60) * 2 * Math.PI;
                                        const x = CR + NUM_R * Math.sin(a) - 16;
                                        const y = CR - NUM_R * Math.cos(a) - 16;
                                        const sel = tempMinute === min;
                                        return (
                                            <View key={min} style={[styles.clockNum, { left: x, top: y, backgroundColor: sel ? primary : 'transparent' }]}>
                                                <Text style={[styles.clockNumText, { color: sel ? '#FFF' : colors.text, fontWeight: sel ? '800' : '500' }]}>{min.toString().padStart(2, '0')}</Text>
                                            </View>
                                        );
                                    })
                                }
                            </View>
                        </View>

                        {/* Mode label */}
                        <Text style={[styles.clockModeLabel, { color: colors.textTertiary }]}>
                            {clockMode === 'hour' ? 'Select hour' : 'Select minutes'}
                        </Text>

                        <TouchableOpacity style={[styles.timeConfirmBtn, { backgroundColor: primary }]} onPress={handleTimeConfirm} activeOpacity={0.8}>
                            <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                            <Text style={styles.timeConfirmBtnText}>Set Time</Text>
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
        padding: SPACING.md,
        marginBottom: SPACING.md,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: SPACING.sm,
    },

    // Inline row: label on left, control on right
    inlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
        minHeight: 36,
    },
    inlineLabel: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        marginRight: SPACING.sm,
    },

    // Theme pills – compact
    pillRow: {
        flexDirection: 'row',
        gap: 6,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: 5,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        gap: 4,
    },
    pillText: { fontSize: FONT_SIZE.xs },

    // Color dropdown
    colorDropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: 5,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        gap: 6,
    },
    colorDotSmall: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    colorDropdownText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
    },
    colorDropdownList: {
        borderRadius: RADIUS.md,
        borderWidth: 1,
        marginTop: SPACING.sm,
        overflow: 'hidden',
    },
    colorDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        gap: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    colorDropdownItemText: {
        fontSize: FONT_SIZE.sm,
        flex: 1,
    },

    // Days mini pills
    miniPillRow: {
        flexDirection: 'row',
        gap: 5,
    },
    miniPill: {
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        minWidth: 34,
        alignItems: 'center',
    },
    miniPillText: {
        fontSize: FONT_SIZE.xs,
    },

    // Time button – compact inline
    timeBtnCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: 5,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        gap: 5,
    },
    timeBtnText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
    },

    // Folder display
    folderDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        padding: SPACING.sm + 2,
        marginBottom: SPACING.sm,
    },
    folderIconWrap: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },
    folderTextWrap: { flex: 1 },
    folderStatusLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600', marginBottom: 1 },
    folderPath: { fontSize: FONT_SIZE.xs, lineHeight: 15 },
    folderBtnRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    folderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm + 2,
        paddingHorizontal: SPACING.md,
        gap: 5,
    },
    folderBtnOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    folderBtnText: {
        color: '#FFF',
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
    },

    // Action buttons (backup)
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm + 4,
        marginBottom: SPACING.xs,
        gap: 6,
    },
    actionBtnOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
    },

    // Setting rows
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm + 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowIcon: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600' },
    rowDesc: { fontSize: FONT_SIZE.xs, marginTop: 1 },

    // Time modal
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    timeModal: {
        width: '88%',
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
    },
    timeModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    timeModalTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
    },
    // Clock time display row
    clockTimeDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
        gap: 2,
    },
    clockTimeDigit: {
        fontSize: 40,
        fontWeight: '800',
        minWidth: 56,
        textAlign: 'center',
    },
    clockTimeColon: {
        fontSize: 36,
        fontWeight: '800',
        marginBottom: 2,
    },
    ampmCol: {
        marginLeft: SPACING.sm,
        gap: 3,
    },
    ampmBtn: {
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
    },
    ampmText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
    },
    // Clock face
    clockContainer: {
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    clockFace: {
        width: CLOCK_SIZE,
        height: CLOCK_SIZE,
        borderRadius: CLOCK_SIZE / 2,
        borderWidth: 1,
        position: 'relative',
    },
    clockNum: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clockNumText: {
        fontSize: FONT_SIZE.sm,
    },
    clockModeLabel: {
        textAlign: 'center',
        fontSize: FONT_SIZE.xs,
        marginBottom: SPACING.xs,
    },
    timeConfirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm + 4,
        marginTop: SPACING.xs,
        gap: 6,
    },
    timeConfirmBtnText: {
        color: '#FFF',
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
    },
});
