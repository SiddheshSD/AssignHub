import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
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

function ItemRow({ item, type, subjectId, colors, isDark, updateItemStatus }) {
    const cycleStatus = () => {
        const currentIndex = STATUS_ORDER.indexOf(item.status);
        const nextIndex = (currentIndex + 1) % STATUS_ORDER.length;
        updateItemStatus(subjectId, item.id, type, STATUS_ORDER[nextIndex]);
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
            <StatusBadge status={item.status} isDark={isDark} onPress={cycleStatus} />
        </View>
    );
}

export default function SubjectDetailScreen({ route, navigation }) {
    const { subjectId } = route.params;
    const { colors, isDark, primary } = useTheme();
    const { subjects, updateItemStatus, deleteSubject } = useData();
    const [activeTab, setActiveTab] = useState('assignments');

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

    const doneCount = items.filter(
        (i) => i.status === 'complete' || i.status === 'checked'
    ).length;
    const checkedCount = items.filter((i) => i.status === 'checked').length;

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
                <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                    <MaterialCommunityIcons name="delete-outline" size={22} color={colors.danger} />
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
                        <Text style={[styles.summaryValue, { color: COLORS.status.not_given[isDark ? 'dark' : 'light'] }]}>
                            {items.length - doneCount}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Pending</Text>
                    </View>
                </View>
            </View>

            {/* Tabs */}
            <View style={[styles.tabs, { backgroundColor: colors.surfaceVariant }]}>
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
            </View>

            {/* Items List */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.itemsList}
            >
                <View style={[styles.itemsCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    {items.map((item, index) => (
                        <ItemRow
                            key={item.id}
                            item={item}
                            type={itemType}
                            subjectId={subjectId}
                            colors={colors}
                            isDark={isDark}
                            updateItemStatus={updateItemStatus}
                        />
                    ))}
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                    <Text style={[styles.legendTitle, { color: colors.textTertiary }]}>
                        Tap status to cycle
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
            </ScrollView>
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
    deleteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
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
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md + 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    itemDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.md },
    itemLabel: { fontSize: FONT_SIZE.md, fontWeight: '500' },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: SPACING.xs + 1,
        borderRadius: RADIUS.full,
        borderWidth: 1,
    },
    badgeText: { fontSize: FONT_SIZE.xs, fontWeight: '600', marginLeft: 4 },
    legend: { marginTop: SPACING.xl, alignItems: 'center' },
    legendTitle: { fontSize: FONT_SIZE.xs, marginBottom: SPACING.sm },
    legendItems: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.sm, marginBottom: SPACING.xs },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.xs },
    legendText: { fontSize: FONT_SIZE.xs },
});
