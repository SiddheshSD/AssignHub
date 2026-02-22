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
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SPACING, RADIUS, FONT_SIZE, COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');

function CircularProgress({ percentage, size = 140, strokeWidth = 12 }) {
    const { colors, primary, isDark } = useTheme();
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={isDark ? colors.surfaceVariant : '#E8E8F0'}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={primary}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90, ${size / 2}, ${size / 2})`}
                />
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[styles.progressPercent, { color: colors.text }]}>
                    {percentage}%
                </Text>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                    Complete
                </Text>
            </View>
        </View>
    );
}

function StatCard({ icon, label, value, color, colors }) {
    return (
        <View style={[styles.statCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
                <MaterialCommunityIcons name={icon} size={22} color={color} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
    );
}

export default function DashboardScreen() {
    const { colors, primary, isDark } = useTheme();
    const { subjects, stats } = useData();

    const recentSubjects = [...subjects].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

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

                {/* Progress Card */}
                <View style={[styles.progressCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Overall Progress</Text>
                    <View style={styles.progressContent}>
                        <CircularProgress percentage={stats.completionPercentage} />
                        <View style={styles.progressStats}>
                            <View style={styles.progressStatRow}>
                                <View style={[styles.dot, { backgroundColor: COLORS.status.complete[isDark ? 'dark' : 'light'] }]} />
                                <Text style={[styles.progressStatText, { color: colors.textSecondary }]}>
                                    {stats.completedItems} Completed
                                </Text>
                            </View>
                            <View style={styles.progressStatRow}>
                                <View style={[styles.dot, { backgroundColor: COLORS.status.checked[isDark ? 'dark' : 'light'] }]} />
                                <Text style={[styles.progressStatText, { color: colors.textSecondary }]}>
                                    {stats.checkedItems} Checked
                                </Text>
                            </View>
                            <View style={styles.progressStatRow}>
                                <View style={[styles.dot, { backgroundColor: COLORS.status.incomplete[isDark ? 'dark' : 'light'] }]} />
                                <Text style={[styles.progressStatText, { color: colors.textSecondary }]}>
                                    {stats.totalItems - stats.completedItems} Remaining
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Stats Grid */}
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
                        label="Assignments"
                        value={stats.totalAssignments}
                        color={COLORS.status.complete[isDark ? 'dark' : 'light']}
                        colors={colors}
                    />
                    <StatCard
                        icon="flask"
                        label="Experiments"
                        value={stats.totalExperiments}
                        color={COLORS.status.incomplete[isDark ? 'dark' : 'light']}
                        colors={colors}
                    />
                    <StatCard
                        icon="check-decagram"
                        label="Checked"
                        value={stats.checkedItems}
                        color={COLORS.status.checked[isDark ? 'dark' : 'light']}
                        colors={colors}
                    />
                </View>

                {/* Recent Subjects */}
                {recentSubjects.length > 0 && (
                    <View style={styles.recentSection}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Subjects</Text>
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
                                <View
                                    key={subject.id}
                                    style={[styles.recentCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
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
                                </View>
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

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    greeting: { fontSize: FONT_SIZE.sm },
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
        marginBottom: SPACING.lg,
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
    progressPercent: { fontSize: FONT_SIZE.xxl, fontWeight: '800' },
    progressLabel: { fontSize: FONT_SIZE.xs },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
    },
    statCard: {
        width: (width - SPACING.lg * 2 - SPACING.sm) / 2,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.sm,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3,
    },
    statIconWrap: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    statValue: { fontSize: FONT_SIZE.xxl, fontWeight: '800' },
    statLabel: { fontSize: FONT_SIZE.xs, marginTop: 2 },
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
});
