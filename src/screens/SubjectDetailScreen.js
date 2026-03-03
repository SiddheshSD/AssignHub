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

function ItemRow({ item, type, subjectId, outOf, colors, isDark, primary, updateItemStatus, updateItemMarks }) {
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

    return (
        <View style={[styles.itemRow, { borderBottomColor: colors.border }]}>
            <View style={styles.itemLeft}>
                <View
                    style={[
                        styles.itemDot,
                        { backgroundColor: COLORS.status[item.status][isDark ? 'dark' : 'light'] },
                    ]}
                />
                <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
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

export default function SubjectDetailScreen({ route, navigation }) {
    const { subjectId } = route.params;
    const { colors, isDark, primary } = useTheme();
    const { subjects, updateItemStatus, updateItemMarks, deleteSubject, updateSubject } = useData();
    const [activeTab, setActiveTab] = useState('assignments');
    const [editModalVisible, setEditModalVisible] = useState(false);

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
                                outOf={outOf}
                                colors={colors}
                                isDark={isDark}
                                primary={primary}
                                updateItemStatus={updateItemStatus}
                                updateItemMarks={updateItemMarks}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm + 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    itemDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.sm },
    itemLabel: { fontSize: FONT_SIZE.sm, fontWeight: '500' },
    itemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
});
