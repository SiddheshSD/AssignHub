import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SPACING, RADIUS, FONT_SIZE, COLORS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// ─── Pie Chart Component ───
function PieChart({ data, size = 140, innerRadius = 40 }) {
    const { colors } = useTheme();
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) {
        return (
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={size} height={size}>
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={(size - 8) / 2}
                        stroke={colors.surfaceVariant}
                        strokeWidth={4}
                        fill="none"
                    />
                </Svg>
                <View style={{ position: 'absolute', alignItems: 'center' }}>
                    <Text style={[styles.pieCenter, { color: colors.textTertiary }]}>0%</Text>
                </View>
            </View>
        );
    }

    const radius = (size - 4) / 2;
    const cx = size / 2;
    const cy = size / 2;
    let currentAngle = -90;

    const slices = data
        .filter((d) => d.value > 0)
        .map((d) => {
            const angle = (d.value / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            const startRad = (Math.PI / 180) * startAngle;
            const endRad = (Math.PI / 180) * endAngle;

            const x1 = cx + radius * Math.cos(startRad);
            const y1 = cy + radius * Math.sin(startRad);
            const x2 = cx + radius * Math.cos(endRad);
            const y2 = cy + radius * Math.sin(endRad);

            const ix1 = cx + innerRadius * Math.cos(startRad);
            const iy1 = cy + innerRadius * Math.sin(startRad);
            const ix2 = cx + innerRadius * Math.cos(endRad);
            const iy2 = cy + innerRadius * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;

            const path = [
                `M ${ix1} ${iy1}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                `L ${ix2} ${iy2}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
                'Z',
            ].join(' ');

            return { path, color: d.color, key: d.key };
        });

    const completionPct = data
        .filter((d) => d.key === 'complete' || d.key === 'checked')
        .reduce((sum, d) => sum + d.value, 0);
    const pct = Math.round((completionPct / total) * 100);

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size}>
                <G>
                    {slices.map((s) => (
                        <Path key={s.key} d={s.path} fill={s.color} />
                    ))}
                </G>
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={[styles.pieCenter, { color: colors.text }]}>{pct}%</Text>
                <Text style={[styles.pieCenterLabel, { color: colors.textSecondary }]}>Done</Text>
            </View>
        </View>
    );
}

// ─── Performance Bar Chart ───
function PerformanceChart({ subjects, isDark, colors, primary }) {
    if (subjects.length === 0) return null;

    const subjectsWithMarks = subjects.filter((s) => {
        const allItems = [...s.assignments, ...s.experiments];
        return allItems.some((i) => i.marks !== null && i.marks !== undefined);
    });

    if (subjectsWithMarks.length === 0) return null;

    const barData = subjectsWithMarks.map((s) => {
        const aOutOf = s.assignmentOutOf ?? 10;
        const eOutOf = s.experimentOutOf ?? 10;

        const gradedAssignments = s.assignments.filter((a) => a.marks !== null && a.marks !== undefined);
        const gradedExperiments = s.experiments.filter((e) => e.marks !== null && e.marks !== undefined);

        const assignAvg = gradedAssignments.length > 0
            ? gradedAssignments.reduce((sum, a) => sum + a.marks, 0) / gradedAssignments.length
            : null;
        const expAvg = gradedExperiments.length > 0
            ? gradedExperiments.reduce((sum, e) => sum + e.marks, 0) / gradedExperiments.length
            : null;

        const assignAvgPct = assignAvg !== null ? (assignAvg / aOutOf) * 100 : null;
        const expAvgPct = expAvg !== null ? (expAvg / eOutOf) * 100 : null;

        return {
            name: s.name,
            assignPct: assignAvgPct,
            expPct: expAvgPct,
            assignAvg: assignAvg !== null ? assignAvg.toFixed(1) : null,
            expAvg: expAvg !== null ? expAvg.toFixed(1) : null,
        };
    });

    const assignColor = COLORS.status.complete[isDark ? 'dark' : 'light'];
    const expColor = COLORS.status.incomplete[isDark ? 'dark' : 'light'];

    const barThickness = 15;
    const barGap = 2;       // gap between assignment & experiment bars within same subject
    const subjectGap = 22;  // gap between different subjects
    const chartHeight = 100;
    const labelHeight = 10;
    const marksLabelHeight = 14;
    const topPadding = marksLabelHeight + 5;

    // Calculate pair width: two thin bars + gap between them
    const pairWidth = barThickness * 2 + barGap;
    const totalContentWidth = barData.length * pairWidth + (barData.length - 1) * subjectGap;
    const minChartWidth = Math.max(totalContentWidth + 24, 100);

    // Show max 5 subjects at a time in view
    const maxVisibleWidth = width - SPACING.lg * 2 - SPACING.xl * 2;

    return (
        <View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 8 }}
                style={{ maxHeight: chartHeight + topPadding + labelHeight + 8 }}
            >
                <Svg width={minChartWidth} height={chartHeight + topPadding + labelHeight + 4}>
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((pct) => {
                        const y = topPadding + chartHeight - (pct / 100) * chartHeight;
                        return (
                            <Path
                                key={pct}
                                d={`M 0 ${y} L ${minChartWidth} ${y}`}
                                stroke={colors.border}
                                strokeWidth={0.3}
                                strokeDasharray="3 3"
                            />
                        );
                    })}

                    {/* Bars + labels */}
                    {barData.map((item, idx) => {
                        const groupX = 12 + idx * (pairWidth + subjectGap);
                        const centerX = groupX + pairWidth / 2;
                        const elements = [];

                        // Assignment bar
                        if (item.assignPct !== null) {
                            const h = Math.max(2, (item.assignPct / 100) * chartHeight);
                            const y = topPadding + chartHeight - h;
                            elements.push(
                                <Rect
                                    key={`a-${idx}`}
                                    x={groupX}
                                    y={y}
                                    width={barThickness}
                                    height={h}
                                    rx={3}
                                    fill={assignColor}
                                />
                            );
                            // Avg mark label on top
                            elements.push(
                                <SvgText
                                    key={`al-${idx}`}
                                    x={groupX + barThickness / 2}
                                    y={y - 3}
                                    fontSize={8}
                                    fill={assignColor}
                                    textAnchor="middle"
                                    fontWeight="600"
                                >
                                    {item.assignAvg}
                                </SvgText>
                            );
                        }

                        // Experiment bar
                        if (item.expPct !== null) {
                            const h = Math.max(2, (item.expPct / 100) * chartHeight);
                            const y = topPadding + chartHeight - h;
                            const xPos = groupX + barThickness + barGap;
                            elements.push(
                                <Rect
                                    key={`e-${idx}`}
                                    x={xPos}
                                    y={y}
                                    width={barThickness}
                                    height={h}
                                    rx={3}
                                    fill={expColor}
                                />
                            );
                            // Avg mark label on top
                            elements.push(
                                <SvgText
                                    key={`el-${idx}`}
                                    x={xPos + barThickness / 2}
                                    y={y - 3}
                                    fontSize={8}
                                    fill={expColor}
                                    textAnchor="middle"
                                    fontWeight="600"
                                >
                                    {item.expAvg}
                                </SvgText>
                            );
                        }

                        // Subject name label (close to bottom of bars)
                        elements.push(
                            <SvgText
                                key={`label-${idx}`}
                                x={centerX}
                                y={topPadding + chartHeight + 12}
                                fontSize={9}
                                fill={colors.textTertiary}
                                textAnchor="middle"
                                fontWeight="500"
                            >
                                {item.name.length > 8 ? item.name.substring(0, 7) + '…' : item.name}
                            </SvgText>
                        );

                        return <G key={idx}>{elements}</G>;
                    })}
                </Svg>
            </ScrollView>
            {/* Legend */}
            <View style={styles.chartLegend}>
                <View style={styles.chartLegendItem}>
                    <View style={[styles.chartLegendDot, { backgroundColor: assignColor }]} />
                    <Text style={[styles.chartLegendText, { color: colors.textTertiary }]}>Assignments</Text>
                </View>
                <View style={styles.chartLegendItem}>
                    <View style={[styles.chartLegendDot, { backgroundColor: expColor }]} />
                    <Text style={[styles.chartLegendText, { color: colors.textTertiary }]}>Experiments</Text>
                </View>
            </View>
        </View>
    );
}

function StatCard({ icon, label, value, color, colors }) {
    return (
        <View style={[styles.statCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
                <MaterialCommunityIcons name={icon} size={18} color={color} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
    );
}

function formatDeadlineDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
}

function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export default function DashboardScreen() {
    const { colors, primary, isDark } = useTheme();
    const { subjects, stats, upcomingDeadlines } = useData();
    const navigation = useNavigation();

    const themeKey = isDark ? 'dark' : 'light';

    const recentSubjects = [...subjects]
        .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
        .slice(0, 3);

    const pieData = [
        { key: 'checked', value: stats.checkedCount, color: COLORS.status.checked[themeKey] },
        { key: 'complete', value: stats.completeCount, color: COLORS.status.complete[themeKey] },
        { key: 'incomplete', value: stats.incompleteCount, color: COLORS.status.incomplete[themeKey] },
        { key: 'not_given', value: stats.notGivenCount, color: COLORS.status.not_given[themeKey] },
    ];

    const hasMarks = subjects.some((s) =>
        [...s.assignments, ...s.experiments].some((i) => i.marks !== null && i.marks !== undefined)
    );

    const handleSubjectPress = (subjectId) => {
        navigation.navigate('Subjects', {
            screen: 'SubjectDetail',
            params: { subjectId },
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.title, { color: colors.text }]}>AssignHub</Text>
                    </View>
                    <View style={[styles.headerIcon, { backgroundColor: primary + '18' }]}>
                        <MaterialCommunityIcons name="book-education" size={28} color={primary} />
                    </View>
                </View>

                {/* Progress Card with Pie Chart */}
                <View style={[styles.progressCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Overall Progress</Text>
                    <View style={styles.progressContent}>
                        <PieChart data={pieData} />
                        <View style={styles.progressStats}>
                            <View style={styles.progressStatRow}>
                                <View style={[styles.dot, { backgroundColor: COLORS.status.checked[themeKey] }]} />
                                <Text style={[styles.progressStatText, { color: colors.textSecondary }]}>
                                    {stats.checkedCount} Checked
                                </Text>
                            </View>
                            <View style={styles.progressStatRow}>
                                <View style={[styles.dot, { backgroundColor: COLORS.status.complete[themeKey] }]} />
                                <Text style={[styles.progressStatText, { color: colors.textSecondary }]}>
                                    {stats.completeCount} Complete
                                </Text>
                            </View>
                            <View style={styles.progressStatRow}>
                                <View style={[styles.dot, { backgroundColor: COLORS.status.incomplete[themeKey] }]} />
                                <Text style={[styles.progressStatText, { color: colors.textSecondary }]}>
                                    {stats.incompleteCount} Incomplete
                                </Text>
                            </View>
                            <View style={styles.progressStatRow}>
                                <View style={[styles.dot, { backgroundColor: COLORS.status.not_given[themeKey] }]} />
                                <Text style={[styles.progressStatText, { color: colors.textSecondary }]}>
                                    {stats.notGivenCount} Not Given
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Performance Chart — right below Overall Progress */}
                {subjects.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Marks Performance</Text>
                        {hasMarks ? (
                            <PerformanceChart
                                subjects={subjects}
                                isDark={isDark}
                                colors={colors}
                                primary={primary}
                            />
                        ) : (
                            <View style={styles.noMarksWrap}>
                                <MaterialCommunityIcons name="chart-bar" size={32} color={colors.textTertiary} />
                                <Text style={[styles.noMarksText, { color: colors.textTertiary }]}>
                                    Enter marks in subjects to see performance
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Stats Grid — 4 in a single row, compact */}
                <View style={styles.statsGrid}>
                    <StatCard
                        icon="book-multiple"
                        label="Subjects"
                        value={stats.totalSubjects}
                        color={primary}
                        colors={colors}
                    />
                    <StatCard
                        icon="file-document-outline"
                        label="Assign"
                        value={stats.totalAssignments}
                        color={COLORS.status.complete[themeKey]}
                        colors={colors}
                    />
                    <StatCard
                        icon="flask"
                        label="Expts"
                        value={stats.totalExperiments}
                        color={COLORS.status.incomplete[themeKey]}
                        colors={colors}
                    />
                    <StatCard
                        icon="check-decagram"
                        label="Checked"
                        value={stats.checkedItems}
                        color={COLORS.status.checked[themeKey]}
                        colors={colors}
                    />
                </View>

                {/* Upcoming Deadlines */}
                {upcomingDeadlines && upcomingDeadlines.length > 0 && (
                    <View style={[styles.deadlinesCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                        <View style={styles.deadlinesHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Upcoming Deadlines</Text>
                            <View style={[styles.deadlineCountBadge, { backgroundColor: primary + '18' }]}>
                                <Text style={[styles.deadlineCountText, { color: primary }]}>
                                    {upcomingDeadlines.length}
                                </Text>
                            </View>
                        </View>
                        {upcomingDeadlines.slice(0, 5).map((item) => {
                            const days = getDaysUntil(item.submissionDate);
                            const parentSubject = subjects.find(s =>
                                s.assignments.some(a => a.id === item.id) ||
                                s.experiments.some(e => e.id === item.id)
                            );
                            let urgencyColor;
                            if (days <= 1) urgencyColor = isDark ? '#F87171' : '#EF4444';
                            else if (days <= 3) urgencyColor = isDark ? '#FFB74D' : '#FF9800';
                            else urgencyColor = isDark ? '#81C784' : '#4CAF50';

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.deadlineRow, { borderBottomColor: colors.border }]}
                                    activeOpacity={0.7}
                                    onPress={() => parentSubject && handleSubjectPress(parentSubject.id)}
                                >
                                    <View style={[styles.deadlineDot, { backgroundColor: urgencyColor }]} />
                                    <View style={styles.deadlineInfo}>
                                        <Text style={[styles.deadlineItemLabel, { color: colors.text }]} numberOfLines={1}>
                                            {item.label}
                                        </Text>
                                        <Text style={[styles.deadlineSubject, { color: colors.textTertiary }]}>
                                            {parentSubject ? parentSubject.name : ''} • {formatDeadlineDate(item.submissionDate)}
                                        </Text>
                                    </View>
                                    <View style={[styles.deadlineDaysBadge, { backgroundColor: urgencyColor + '18' }]}>
                                        <Text style={[styles.deadlineDaysText, { color: urgencyColor }]}>
                                            {days === 0 ? 'Today' : days === 1 ? '1d' : `${days}d`}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Recent Subjects */}
                {recentSubjects.length > 0 && (
                    <View style={styles.recentSection}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recently Updated</Text>
                        {recentSubjects.map((subject) => {
                            const assignDone = subject.assignments.filter(
                                (a) => a.status === 'complete' || a.status === 'checked'
                            ).length;
                            const expDone = subject.experiments.filter(
                                (e) => e.status === 'complete' || e.status === 'checked'
                            ).length;
                            const total = subject.assignments.length + subject.experiments.length;
                            const done = assignDone + expDone;
                            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                            return (
                                <TouchableOpacity
                                    key={subject.id}
                                    style={[styles.recentCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
                                    activeOpacity={0.7}
                                    onPress={() => handleSubjectPress(subject.id)}
                                >
                                    <View style={styles.recentCardLeft}>
                                        <View style={[styles.recentAvatar, { backgroundColor: primary + '18' }]}>
                                            <Text style={[styles.recentAvatarText, { color: primary }]}>
                                                {subject.name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.recentInfo}>
                                            <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>
                                                {subject.name}
                                            </Text>
                                            <Text style={[styles.recentCode, { color: colors.textSecondary }]}>
                                                {subject.code}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.recentRight}>
                                        <Text style={[styles.recentPct, { color: primary }]}>{pct}%</Text>
                                        <View style={[styles.miniProgressBar, { backgroundColor: isDark ? colors.surfaceVariant : '#E8E8F0' }]}>
                                            <View
                                                style={[
                                                    styles.miniProgressFill,
                                                    { width: `${pct}%`, backgroundColor: primary },
                                                ]}
                                            />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {subjects.length === 0 && (
                    <View style={[styles.emptyCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                        <MaterialCommunityIcons name="book-plus" size={48} color={colors.textTertiary} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Subjects Yet</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                            Go to the Subjects tab to add your first subject
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const statCardWidth = (width - SPACING.lg * 2 - SPACING.xs * 3) / 4;

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    title: { fontSize: FONT_SIZE.xxxl, fontWeight: '800', letterSpacing: -0.5 },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressCard: {
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        marginBottom: SPACING.sm,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        marginBottom: SPACING.lg,
    },
    progressContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    progressStats: { marginLeft: SPACING.lg },
    progressStatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm },
    progressStatText: { fontSize: FONT_SIZE.sm },
    pieCenter: { fontSize: FONT_SIZE.xxl, fontWeight: '800' },
    pieCenterLabel: { fontSize: FONT_SIZE.xs },
    chartCard: {
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        marginBottom: SPACING.sm,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 4,
    },
    chartLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.sm,
        gap: SPACING.lg,
    },
    chartLegendItem: { flexDirection: 'row', alignItems: 'center' },
    chartLegendDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.xs },
    chartLegendText: { fontSize: FONT_SIZE.xs },
    noMarksWrap: { alignItems: 'center', paddingVertical: SPACING.xl },
    noMarksText: { fontSize: FONT_SIZE.sm, marginTop: SPACING.sm, textAlign: 'center' },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
        marginTop: SPACING.sm,
    },
    statCard: {
        width: statCardWidth,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm + 2,
        paddingHorizontal: SPACING.xs + 2,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
    },
    statIconWrap: {
        width: 30,
        height: 30,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    statValue: { fontSize: FONT_SIZE.lg, fontWeight: '800' },
    statLabel: { fontSize: 9, marginTop: 1 },
    recentSection: { marginBottom: SPACING.lg },
    recentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.sm,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
    },
    recentCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    recentAvatar: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recentAvatarText: { fontSize: FONT_SIZE.lg, fontWeight: '700' },
    recentInfo: { marginLeft: SPACING.md, flex: 1 },
    recentName: { fontSize: FONT_SIZE.md, fontWeight: '600' },
    recentCode: { fontSize: FONT_SIZE.xs },
    recentRight: { alignItems: 'flex-end', marginLeft: SPACING.sm },
    recentPct: { fontSize: FONT_SIZE.sm, fontWeight: '700', marginBottom: 4 },
    miniProgressBar: {
        width: 60,
        height: 5,
        borderRadius: 3,
        overflow: 'hidden',
    },
    miniProgressFill: { height: '100%', borderRadius: 3 },
    emptyCard: {
        borderRadius: RADIUS.lg,
        padding: SPACING.xxxl,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3,
    },
    emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', marginTop: SPACING.md },
    emptySubtitle: { fontSize: FONT_SIZE.sm, textAlign: 'center', marginTop: SPACING.xs },

    // Upcoming Deadlines
    deadlinesCard: {
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        marginBottom: SPACING.lg,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 4,
    },
    deadlinesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    deadlineCountBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },
    deadlineCountText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
    },
    deadlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm + 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    deadlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: SPACING.sm,
    },
    deadlineInfo: {
        flex: 1,
    },
    deadlineItemLabel: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
    },
    deadlineSubject: {
        fontSize: FONT_SIZE.xs,
        marginTop: 1,
    },
    deadlineDaysBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
        marginLeft: SPACING.sm,
    },
    deadlineDaysText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
    },
});
