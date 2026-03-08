import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import {
    SPACING,
    RADIUS,
    FONT_SIZE,
    COLORS,
    STATUS_LABELS,
    STATUS_ICONS,
    STATUS_ORDER,
} from '../constants/theme';
import { pickDocuments, saveFiles, deleteFile, openFile, shareFile, formatFileSize, getFileIcon, getFileColor } from '../services/fileManager';

function StatusBadge({ status, isDark, onPress }) {
    const themeKey = isDark ? 'dark' : 'light';
    const color = COLORS.status[status][themeKey];
    const label = STATUS_LABELS[status];
    const icon = STATUS_ICONS[status];

    return (
        <TouchableOpacity
            style={[styles.badge, { backgroundColor: color + '20', borderColor: color + '40' }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <MaterialCommunityIcons name={icon} size={14} color={color} />
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </TouchableOpacity>
    );
}

function formatDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff;
}

function DeadlineBadge({ submissionDate, isDark }) {
    if (!submissionDate) return null;
    const days = getDaysUntil(submissionDate);
    if (days === null) return null;

    let color, text;
    if (days < 0) {
        color = isDark ? '#F87171' : '#EF4444';
        text = `Overdue`;
    } else if (days === 0) {
        color = isDark ? '#F87171' : '#EF4444';
        text = 'Due Today';
    } else if (days === 1) {
        color = isDark ? '#FFB74D' : '#FF9800';
        text = 'Tomorrow';
    } else if (days <= 3) {
        color = isDark ? '#FFB74D' : '#FF9800';
        text = `${days}d left`;
    } else {
        color = isDark ? '#81C784' : '#4CAF50';
        text = `${days}d left`;
    }

    return (
        <View style={[styles.deadlineBadge, { backgroundColor: color + '18' }]}>
            <MaterialCommunityIcons name="clock-outline" size={10} color={color} />
            <Text style={[styles.deadlineBadgeText, { color }]}>{text}</Text>
        </View>
    );
}

function ItemRow({ item, type, subjectId, subjectCode, outOf, colors, isDark, primary, updateItemStatus, updateItemMarks, updateItemSubmissionDate, updateItemFiles, onOpenFiles }) {
    const [marksText, setMarksText] = useState(
        item.marks !== null && item.marks !== undefined ? String(item.marks) : ''
    );

    const cycleStatus = () => {
        const currentIndex = STATUS_ORDER.indexOf(item.status);
        const nextIndex = (currentIndex + 1) % STATUS_ORDER.length;
        updateItemStatus(subjectId, item.id, type, STATUS_ORDER[nextIndex]);
    };

    const handleMarksBlur = () => {
        const trimmed = marksText.trim();
        if (trimmed === '') {
            updateItemMarks(subjectId, item.id, type, null);
            return;
        }
        const num = parseFloat(trimmed);
        if (isNaN(num) || num < 0) {
            setMarksText('');
            updateItemMarks(subjectId, item.id, type, null);
            return;
        }
        const clamped = Math.min(num, outOf);
        setMarksText(String(clamped));
        updateItemMarks(subjectId, item.id, type, clamped);
    };

    const handleDatePress = () => {
        // Show a simple date picker using Alert prompt approach
        // We'll show a modal-like date input
        onOpenFiles(item, 'date');
    };

    const handleFilesPress = () => {
        onOpenFiles(item, 'files');
    };

    const fileCount = (item.files || []).length;

    return (
        <View style={[styles.itemRow, { borderBottomColor: colors.border }]}>
            <View style={styles.itemTopRow}>
                <View style={styles.itemLeft}>
                    <View
                        style={[
                            styles.itemDot,
                            { backgroundColor: COLORS.status[item.status][isDark ? 'dark' : 'light'] },
                        ]}
                    />
                    <View style={styles.itemLabelWrap}>
                        <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                        <DeadlineBadge submissionDate={item.submissionDate} isDark={isDark} />
                    </View>
                </View>
                <View style={styles.itemRight}>
                    <View style={[styles.marksWrap, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                        <TextInput
                            style={[styles.marksInput, { color: colors.text }]}
                            value={marksText}
                            onChangeText={setMarksText}
                            onBlur={handleMarksBlur}
                            keyboardType="numeric"
                            placeholder="—"
                            placeholderTextColor={colors.textTertiary}
                            maxLength={5}
                        />
                        <Text style={[styles.marksOutOf, { color: colors.textTertiary }]}>/{outOf}</Text>
                    </View>
                    <StatusBadge status={item.status} isDark={isDark} onPress={cycleStatus} />
                </View>
            </View>
            {/* Bottom action row: date + files */}
            <View style={styles.itemBottomRow}>
                <TouchableOpacity
                    style={[styles.itemActionBtn, { backgroundColor: colors.surfaceVariant }]}
                    onPress={handleDatePress}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name="calendar-clock"
                        size={13}
                        color={item.submissionDate ? primary : colors.textTertiary}
                    />
                    <Text style={[styles.itemActionText, { color: item.submissionDate ? primary : colors.textTertiary }]}>
                        {item.submissionDate ? formatDate(item.submissionDate) : 'Set Date'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.itemActionBtn, { backgroundColor: colors.surfaceVariant }]}
                    onPress={handleFilesPress}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name="paperclip"
                        size={13}
                        color={fileCount > 0 ? primary : colors.textTertiary}
                    />
                    <Text style={[styles.itemActionText, { color: fileCount > 0 ? primary : colors.textTertiary }]}>
                        {fileCount > 0 ? `${fileCount} file${fileCount > 1 ? 's' : ''}` : 'Attach'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function Stepper({ label, value, onChange, min = 0, max = 20, colors, primary }) {
    return (
        <View style={styles.stepperContainer}>
            <Text style={[styles.stepperLabel, { color: colors.text }]}>{label}</Text>
            <View style={[styles.stepperRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.stepperBtn, { opacity: value <= min ? 0.3 : 1 }]}
                    onPress={() => value > min && onChange(value - 1)}
                    disabled={value <= min}
                >
                    <MaterialCommunityIcons name="minus" size={22} color={primary} />
                </TouchableOpacity>
                <View style={styles.stepperValueWrap}>
                    <Text style={[styles.stepperValue, { color: colors.text }]}>{value}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.stepperBtn, { opacity: value >= max ? 0.3 : 1 }]}
                    onPress={() => value < max && onChange(value + 1)}
                    disabled={value >= max}
                >
                    <MaterialCommunityIcons name="plus" size={22} color={primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function FileItem({ file, colors, onOpen, onShare, onDelete }) {
    const iconName = getFileIcon(file.mimeType);
    const iconColor = getFileColor(file.mimeType);

    return (
        <View style={[styles.fileItem, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
                style={styles.fileItemContent}
                onPress={() => onOpen(file)}
                activeOpacity={0.7}
            >
                <View style={[styles.fileIcon, { backgroundColor: iconColor + '18' }]}>
                    <MaterialCommunityIcons name={iconName} size={22} color={iconColor} />
                </View>
                <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                        {file.originalName || file.name}
                    </Text>
                    <Text style={[styles.fileSize, { color: colors.textTertiary }]}>
                        {formatFileSize(file.size)}
                    </Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.fileShareBtn}
                onPress={() => onShare(file)}
                activeOpacity={0.7}
            >
                <MaterialCommunityIcons name="share-variant-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.fileDeleteBtn}
                onPress={() => onDelete(file)}
                activeOpacity={0.7}
            >
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
        </View>
    );
}

export default function SubjectDetailScreen({ route, navigation }) {
    const { subjectId } = route.params;
    const { colors, isDark, primary } = useTheme();
    const { subjects, updateItemStatus, updateItemMarks, updateItemSubmissionDate, updateItemFiles, deleteSubject, updateSubject } = useData();
    const [activeTab, setActiveTab] = useState('assignments');
    const [editModalVisible, setEditModalVisible] = useState(false);

    // Date picker modal states
    const [dateModalVisible, setDateModalVisible] = useState(false);
    const [dateTargetItem, setDateTargetItem] = useState(null);
    const [dateDay, setDateDay] = useState('');
    const [dateMonth, setDateMonth] = useState('');
    const [dateYear, setDateYear] = useState('');

    // Files modal states
    const [filesModalVisible, setFilesModalVisible] = useState(false);
    const [filesTargetItem, setFilesTargetItem] = useState(null);

    // Edit form state
    const [editCode, setEditCode] = useState('');
    const [editAssignments, setEditAssignments] = useState(0);
    const [editExperiments, setEditExperiments] = useState(0);
    const [editAssignmentOutOf, setEditAssignmentOutOf] = useState(10);
    const [editExperimentOutOf, setEditExperimentOutOf] = useState(10);

    const subject = useMemo(
        () => subjects.find((s) => s.id === subjectId),
        [subjects, subjectId]
    );

    if (!subject) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.notFound, { color: colors.text }]}>Subject not found</Text>
            </SafeAreaView>
        );
    }

    const items = activeTab === 'assignments' ? subject.assignments : subject.experiments;
    const itemType = activeTab === 'assignments' ? 'assignment' : 'experiment';
    const outOf = activeTab === 'assignments'
        ? (subject.assignmentOutOf ?? 10)
        : (subject.experimentOutOf ?? 10);

    const doneCount = items.filter(
        (i) => i.status === 'complete' || i.status === 'checked'
    ).length;
    const checkedCount = items.filter((i) => i.status === 'checked').length;

    // Average marks for current tab
    const itemsWithMarks = items.filter((i) => i.marks !== null && i.marks !== undefined);
    const avgMarks = itemsWithMarks.length > 0
        ? (itemsWithMarks.reduce((sum, i) => sum + i.marks, 0) / itemsWithMarks.length).toFixed(1)
        : null;

    const openEditModal = () => {
        setEditCode(subject.code);
        setEditAssignments(subject.assignments.length);
        setEditExperiments(subject.experiments.length);
        setEditAssignmentOutOf(subject.assignmentOutOf ?? 10);
        setEditExperimentOutOf(subject.experimentOutOf ?? 10);
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        const trimmedCode = editCode.trim();
        if (!trimmedCode) {
            Alert.alert('Validation', 'Subject code cannot be empty.');
            return;
        }
        await updateSubject(subjectId, {
            code: trimmedCode.toUpperCase(),
            totalAssignments: editAssignments,
            totalExperiments: editExperiments,
            assignmentOutOf: editAssignmentOutOf,
            experimentOutOf: editExperimentOutOf,
        });
        setEditModalVisible(false);
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Subject',
            `Are you sure you want to delete "${subject.name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setEditModalVisible(false);
                        await deleteSubject(subjectId);
                        navigation.goBack();
                    },
                },
            ]
        );
    };

    // Date modal handlers
    const openDateModal = (item) => {
        setDateTargetItem(item);
        if (item.submissionDate) {
            const d = new Date(item.submissionDate);
            setDateDay(String(d.getDate()));
            setDateMonth(String(d.getMonth() + 1));
            setDateYear(String(d.getFullYear()));
        } else {
            const now = new Date();
            setDateDay('');
            setDateMonth('');
            setDateYear(String(now.getFullYear()));
        }
        setDateModalVisible(true);
    };

    const handleSaveDate = async () => {
        const day = parseInt(dateDay);
        const month = parseInt(dateMonth);
        const year = parseInt(dateYear);

        if (!day || !month || !year || day < 1 || day > 31 || month < 1 || month > 12 || year < 2024) {
            Alert.alert('Invalid Date', 'Please enter a valid date (DD/MM/YYYY).');
            return;
        }

        const date = new Date(year, month - 1, day, 23, 59, 59);
        if (isNaN(date.getTime())) {
            Alert.alert('Invalid Date', 'Please enter a valid date.');
            return;
        }

        await updateItemSubmissionDate(subjectId, dateTargetItem.id, itemType, date.toISOString());
        setDateModalVisible(false);
        setDateTargetItem(null);
    };

    const handleClearDate = async () => {
        await updateItemSubmissionDate(subjectId, dateTargetItem.id, itemType, null);
        setDateModalVisible(false);
        setDateTargetItem(null);
    };

    // Files modal handlers
    const openFilesModal = (item) => {
        setFilesTargetItem(item);
        setFilesModalVisible(true);
    };

    const handleOpenItemAction = (item, action) => {
        if (action === 'date') {
            openDateModal(item);
        } else if (action === 'files') {
            openFilesModal(item);
        }
    };

    const handlePickFiles = async () => {
        const picked = await pickDocuments();
        if (picked.length === 0) return;

        const currentFiles = filesTargetItem.files || [];
        const saved = await saveFiles(picked, subject.code, filesTargetItem.label, currentFiles);
        if (saved.length > 0) {
            const updatedFiles = [...currentFiles, ...saved];
            await updateItemFiles(subjectId, filesTargetItem.id, itemType, updatedFiles);
            // Update the local target item reference
            setFilesTargetItem(prev => ({ ...prev, files: updatedFiles }));
        }
    };

    const handleOpenFile = async (file) => {
        await openFile(file.uri, file.mimeType);
    };

    const handleShareFile = async (file) => {
        await shareFile(file.uri, file.mimeType);
    };

    const handleDeleteFile = (file) => {
        Alert.alert(
            'Delete File',
            `Delete "${file.originalName || file.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteFile(file.uri, file.externalUri);
                        const currentFiles = filesTargetItem.files || [];
                        const updatedFiles = currentFiles.filter(f => f.id !== file.id);
                        await updateItemFiles(subjectId, filesTargetItem.id, itemType, updatedFiles);
                        setFilesTargetItem(prev => ({ ...prev, files: updatedFiles }));
                    },
                },
            ]
        );
    };

    // Get the current files for the target item from the live subject data
    const currentFilesTargetData = filesTargetItem
        ? (itemType === 'assignment' ? subject.assignments : subject.experiments).find(i => i.id === filesTargetItem.id)
        : null;
    const currentFiles = currentFilesTargetData?.files || filesTargetItem?.files || [];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                        {subject.name}
                    </Text>
                    <Text style={[styles.headerCode, { color: colors.textSecondary }]}>
                        {subject.code}
                    </Text>
                </View>
                <TouchableOpacity onPress={openEditModal} style={styles.editBtn}>
                    <MaterialCommunityIcons name="pencil-outline" size={22} color={primary} />
                </TouchableOpacity>
            </View>

            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: primary }]}>{items.length}</Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total</Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: COLORS.status.complete[isDark ? 'dark' : 'light'] }]}>
                            {doneCount}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Done</Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: COLORS.status.checked[isDark ? 'dark' : 'light'] }]}>
                            {checkedCount}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Checked</Text>
                    </View>
                    <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: avgMarks !== null ? primary : colors.textTertiary }]}>
                            {avgMarks !== null ? avgMarks : '—'}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Avg/{outOf}</Text>
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View style={[styles.tabs, { backgroundColor: colors.surfaceVariant }]}>
                {subject.assignments.length > 0 || activeTab === 'assignments' ? (
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            activeTab === 'assignments' && { backgroundColor: colors.card },
                        ]}
                        onPress={() => setActiveTab('assignments')}
                    >
                        <MaterialCommunityIcons
                            name="file-document-outline"
                            size={16}
                            color={activeTab === 'assignments' ? primary : colors.textTertiary}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                {
                                    color: activeTab === 'assignments' ? primary : colors.textTertiary,
                                    fontWeight: activeTab === 'assignments' ? '700' : '500',
                                },
                            ]}
                        >
                            Assignments ({subject.assignments.length})
                        </Text>
                    </TouchableOpacity>
                ) : null}
                {subject.experiments.length > 0 || activeTab === 'experiments' ? (
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            activeTab === 'experiments' && { backgroundColor: colors.card },
                        ]}
                        onPress={() => setActiveTab('experiments')}
                    >
                        <MaterialCommunityIcons
                            name="flask"
                            size={16}
                            color={activeTab === 'experiments' ? primary : colors.textTertiary}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                {
                                    color: activeTab === 'experiments' ? primary : colors.textTertiary,
                                    fontWeight: activeTab === 'experiments' ? '700' : '500',
                                },
                            ]}
                        >
                            Experiments ({subject.experiments.length})
                        </Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Items List */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.itemsList}
            >
                {items.length > 0 ? (
                    <View style={[styles.itemsCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                        {items.map((item) => (
                            <ItemRow
                                key={item.id}
                                item={item}
                                type={itemType}
                                subjectId={subjectId}
                                subjectCode={subject.code}
                                outOf={outOf}
                                colors={colors}
                                isDark={isDark}
                                primary={primary}
                                updateItemStatus={updateItemStatus}
                                updateItemMarks={updateItemMarks}
                                updateItemSubmissionDate={updateItemSubmissionDate}
                                updateItemFiles={updateItemFiles}
                                onOpenFiles={handleOpenItemAction}
                            />
                        ))}
                    </View>
                ) : (
                    <View style={[styles.emptyItems, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                        <MaterialCommunityIcons
                            name={activeTab === 'assignments' ? 'file-document-outline' : 'flask-outline'}
                            size={40}
                            color={colors.textTertiary}
                        />
                        <Text style={[styles.emptyItemsText, { color: colors.textSecondary }]}>
                            No {activeTab} for this subject
                        </Text>
                        <Text style={[styles.emptyItemsHint, { color: colors.textTertiary }]}>
                            Tap the edit button to add some
                        </Text>
                    </View>
                )}

                {/* Legend */}
                {items.length > 0 && (
                    <View style={styles.legend}>
                        <Text style={[styles.legendTitle, { color: colors.textTertiary }]}>
                            Tap status to cycle • Enter marks out of {outOf}
                        </Text>
                        <View style={styles.legendItems}>
                            {STATUS_ORDER.map((status) => (
                                <View key={status} style={styles.legendItem}>
                                    <View
                                        style={[
                                            styles.legendDot,
                                            { backgroundColor: COLORS.status[status][isDark ? 'dark' : 'light'] },
                                        ]}
                                    />
                                    <Text style={[styles.legendText, { color: colors.textTertiary }]}>
                                        {STATUS_LABELS[status]}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={editModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setEditModalVisible(false)}
                    />
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Subject</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* Subject Name (read-only) */}
                            <View style={styles.modalField}>
                                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Subject Name</Text>
                                <View style={[styles.modalInputWrap, { backgroundColor: colors.surfaceVariant, borderColor: colors.border, opacity: 0.6 }]}>
                                    <Text style={[styles.modalInputReadonly, { color: colors.text }]}>{subject.name}</Text>
                                </View>
                            </View>

                            {/* Subject Code */}
                            <View style={styles.modalField}>
                                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Subject Code</Text>
                                <View style={[styles.modalInputWrap, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                                    <TextInput
                                        style={[styles.modalInput, { color: colors.text }]}
                                        value={editCode}
                                        onChangeText={setEditCode}
                                        autoCapitalize="characters"
                                        maxLength={15}
                                        placeholderTextColor={colors.textTertiary}
                                    />
                                </View>
                            </View>

                            {/* Assignment Count */}
                            <Stepper
                                label="Assignments"
                                value={editAssignments}
                                onChange={setEditAssignments}
                                min={0}
                                colors={colors}
                                primary={primary}
                            />

                            {/* Assignment Out Of */}
                            <Stepper
                                label="Assignment Marks (Out Of)"
                                value={editAssignmentOutOf}
                                onChange={setEditAssignmentOutOf}
                                min={1}
                                max={100}
                                colors={colors}
                                primary={primary}
                            />

                            {/* Experiment Count */}
                            <Stepper
                                label="Experiments"
                                value={editExperiments}
                                onChange={setEditExperiments}
                                min={0}
                                colors={colors}
                                primary={primary}
                            />

                            {/* Experiment Out Of */}
                            <Stepper
                                label="Experiment Marks (Out Of)"
                                value={editExperimentOutOf}
                                onChange={setEditExperimentOutOf}
                                min={1}
                                max={100}
                                colors={colors}
                                primary={primary}
                            />

                            {/* Save Button */}
                            <TouchableOpacity
                                style={[styles.modalSaveBtn, { backgroundColor: primary }]}
                                onPress={handleSaveEdit}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons name="content-save" size={18} color="#FFF" />
                                <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                            </TouchableOpacity>

                            {/* Delete Button */}
                            <TouchableOpacity
                                style={[styles.modalDeleteBtn, { backgroundColor: colors.dangerLight, borderColor: colors.danger + '30' }]}
                                onPress={handleDelete}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="delete-outline" size={18} color={colors.danger} />
                                <Text style={[styles.modalDeleteBtnText, { color: colors.danger }]}>Delete Subject</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Date Picker Modal */}
            <Modal
                visible={dateModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDateModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setDateModalVisible(false)}
                    />
                    <View style={[styles.modalContent, { backgroundColor: colors.card, width: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Submission Date</Text>
                            <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        {dateTargetItem && (
                            <Text style={[styles.dateItemLabel, { color: colors.textSecondary }]}>
                                {dateTargetItem.label}
                            </Text>
                        )}

                        <View style={styles.dateInputRow}>
                            <View style={styles.dateInputGroup}>
                                <Text style={[styles.dateInputLabel, { color: colors.textTertiary }]}>Day</Text>
                                <View style={[styles.dateInputWrap, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                                    <TextInput
                                        style={[styles.dateInput, { color: colors.text }]}
                                        value={dateDay}
                                        onChangeText={(t) => setDateDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
                                        keyboardType="numeric"
                                        placeholder="DD"
                                        placeholderTextColor={colors.textTertiary}
                                        maxLength={2}
                                    />
                                </View>
                            </View>
                            <Text style={[styles.dateSep, { color: colors.textTertiary }]}>/</Text>
                            <View style={styles.dateInputGroup}>
                                <Text style={[styles.dateInputLabel, { color: colors.textTertiary }]}>Month</Text>
                                <View style={[styles.dateInputWrap, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                                    <TextInput
                                        style={[styles.dateInput, { color: colors.text }]}
                                        value={dateMonth}
                                        onChangeText={(t) => setDateMonth(t.replace(/[^0-9]/g, '').slice(0, 2))}
                                        keyboardType="numeric"
                                        placeholder="MM"
                                        placeholderTextColor={colors.textTertiary}
                                        maxLength={2}
                                    />
                                </View>
                            </View>
                            <Text style={[styles.dateSep, { color: colors.textTertiary }]}>/</Text>
                            <View style={[styles.dateInputGroup, { flex: 1.5 }]}>
                                <Text style={[styles.dateInputLabel, { color: colors.textTertiary }]}>Year</Text>
                                <View style={[styles.dateInputWrap, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                                    <TextInput
                                        style={[styles.dateInput, { color: colors.text }]}
                                        value={dateYear}
                                        onChangeText={(t) => setDateYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                                        keyboardType="numeric"
                                        placeholder="YYYY"
                                        placeholderTextColor={colors.textTertiary}
                                        maxLength={4}
                                    />
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.modalSaveBtn, { backgroundColor: primary }]}
                            onPress={handleSaveDate}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="calendar-check" size={18} color="#FFF" />
                            <Text style={styles.modalSaveBtnText}>Set Date</Text>
                        </TouchableOpacity>

                        {dateTargetItem?.submissionDate && (
                            <TouchableOpacity
                                style={[styles.modalDeleteBtn, { backgroundColor: colors.dangerLight, borderColor: colors.danger + '30' }]}
                                onPress={handleClearDate}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="calendar-remove" size={18} color={colors.danger} />
                                <Text style={[styles.modalDeleteBtnText, { color: colors.danger }]}>Remove Date</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Files Modal */}
            <Modal
                visible={filesModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setFilesModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setFilesModalVisible(false)}
                    />
                    <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Files</Text>
                                {filesTargetItem && (
                                    <Text style={[styles.filesSubtitle, { color: colors.textSecondary }]}>
                                        {filesTargetItem.label}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => setFilesModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        {currentFiles.length > 0 ? (
                            <ScrollView style={styles.filesList} showsVerticalScrollIndicator={false}>
                                {currentFiles.map((file) => (
                                    <FileItem
                                        key={file.id}
                                        file={file}
                                        colors={colors}
                                        onOpen={handleOpenFile}
                                        onShare={handleShareFile}
                                        onDelete={handleDeleteFile}
                                    />
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.noFilesWrap}>
                                <MaterialCommunityIcons name="file-plus-outline" size={40} color={colors.textTertiary} />
                                <Text style={[styles.noFilesText, { color: colors.textSecondary }]}>
                                    No files attached yet
                                </Text>
                                <Text style={[styles.noFilesHint, { color: colors.textTertiary }]}>
                                    Tap below to add files
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.addFileBtn, { backgroundColor: primary }]}
                            onPress={handlePickFiles}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                            <Text style={styles.addFileBtnText}>Add Files</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700' },
    headerCode: { fontSize: FONT_SIZE.xs },
    editBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    notFound: { fontSize: FONT_SIZE.lg, textAlign: 'center', marginTop: 100 },
    summaryCard: {
        marginHorizontal: SPACING.lg,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryValue: { fontSize: FONT_SIZE.xl, fontWeight: '800' },
    summaryLabel: { fontSize: FONT_SIZE.xs, marginTop: 2 },
    summaryDivider: { width: 1, height: 36 },
    tabs: {
        flexDirection: 'row',
        marginHorizontal: SPACING.lg,
        borderRadius: RADIUS.md,
        padding: 3,
        marginBottom: SPACING.lg,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm + 2,
        borderRadius: RADIUS.sm + 2,
    },
    tabText: { fontSize: FONT_SIZE.sm, marginLeft: SPACING.xs },
    itemsList: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },
    itemsCard: {
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3,
    },
    itemRow: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm + 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    itemDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.sm },
    itemLabelWrap: { flex: 1 },
    itemLabel: { fontSize: FONT_SIZE.sm, fontWeight: '500' },
    itemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    itemBottomRow: {
        flexDirection: 'row',
        marginTop: 6,
        marginLeft: SPACING.sm + 8,
        gap: 8,
    },
    itemActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
        gap: 4,
    },
    itemActionText: {
        fontSize: 10,
        fontWeight: '600',
    },
    deadlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
        marginTop: 2,
        alignSelf: 'flex-start',
        gap: 3,
    },
    deadlineBadgeText: {
        fontSize: 9,
        fontWeight: '700',
    },
    marksWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    marksInput: {
        fontSize: FONT_SIZE.xs,
        width: 28,
        textAlign: 'center',
        paddingVertical: 2,
    },
    marksOutOf: { fontSize: FONT_SIZE.xs },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: SPACING.xs + 1,
        borderRadius: RADIUS.full,
        borderWidth: 1,
    },
    badgeText: { fontSize: FONT_SIZE.xs, fontWeight: '600', marginLeft: 4 },
    emptyItems: {
        borderRadius: RADIUS.lg,
        padding: SPACING.xxxl,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3,
    },
    emptyItemsText: { fontSize: FONT_SIZE.md, fontWeight: '600', marginTop: SPACING.md },
    emptyItemsHint: { fontSize: FONT_SIZE.xs, marginTop: SPACING.xs },
    legend: { marginTop: SPACING.xl, alignItems: 'center' },
    legendTitle: { fontSize: FONT_SIZE.xs, marginBottom: SPACING.sm, textAlign: 'center' },
    legendItems: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.sm, marginBottom: SPACING.xs },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.xs },
    legendText: { fontSize: FONT_SIZE.xs },

    // Edit Modal Styles
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
        width: '88%',
        maxHeight: '85%',
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
        marginBottom: SPACING.xl,
    },
    modalTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700' },
    modalField: { marginBottom: SPACING.lg },
    modalLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', marginBottom: SPACING.sm },
    modalInputWrap: {
        borderRadius: RADIUS.md,
        borderWidth: 1,
        paddingHorizontal: SPACING.md,
    },
    modalInput: {
        fontSize: FONT_SIZE.md,
        paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.sm + 2,
    },
    modalInputReadonly: {
        fontSize: FONT_SIZE.md,
        paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.sm + 2,
    },
    stepperContainer: { marginBottom: SPACING.lg },
    stepperLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', marginBottom: SPACING.sm },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        overflow: 'hidden',
    },
    stepperBtn: {
        width: 52,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperValueWrap: { flex: 1, alignItems: 'center' },
    stepperValue: { fontSize: FONT_SIZE.lg, fontWeight: '700' },
    modalSaveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md + 2,
        marginTop: SPACING.sm,
    },
    modalSaveBtnText: {
        color: '#FFF',
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        marginLeft: SPACING.sm,
    },
    modalDeleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md + 2,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
    },
    modalDeleteBtnText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        marginLeft: SPACING.sm,
    },

    // Date Modal
    dateItemLabel: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        marginBottom: SPACING.lg,
    },
    dateInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: SPACING.lg,
        gap: 4,
    },
    dateInputGroup: {
        flex: 1,
    },
    dateInputLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    dateInputWrap: {
        borderRadius: RADIUS.md,
        borderWidth: 1,
        paddingHorizontal: SPACING.sm,
    },
    dateInput: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        textAlign: 'center',
        paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.sm,
    },
    dateSep: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '600',
        marginBottom: Platform.OS === 'ios' ? SPACING.md : SPACING.sm + 2,
    },

    // Files Modal
    filesSubtitle: {
        fontSize: FONT_SIZE.xs,
        marginTop: 2,
    },
    filesList: {
        maxHeight: 300,
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm + 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    fileItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    fileIcon: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '500',
    },
    fileSize: {
        fontSize: FONT_SIZE.xs,
        marginTop: 2,
    },
    fileShareBtn: {
        padding: SPACING.sm,
        marginRight: 2,
    },
    fileDeleteBtn: {
        padding: SPACING.sm,
    },
    noFilesWrap: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    noFilesText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        marginTop: SPACING.md,
    },
    noFilesHint: {
        fontSize: FONT_SIZE.xs,
        marginTop: SPACING.xs,
    },
    addFileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md + 2,
        marginTop: SPACING.md,
    },
    addFileBtnText: {
        color: '#FFF',
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        marginLeft: SPACING.sm,
    },
});
