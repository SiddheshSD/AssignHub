import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SPACING, RADIUS, FONT_SIZE, COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');

function ProgressBar({ done, total, color, bgColor }) {
    const pct = total > 0 ? (done / total) * 100 : 0;
    return (
        <View style={[styles.progressBar, { backgroundColor: bgColor }]}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
    );
}

function SubjectCard({ subject, colors, isDark, primary, onPress }) {
    const assignDone = subject.assignments.filter(
        (a) => a.status === 'complete' || a.status === 'checked'
    ).length;
    const expDone = subject.experiments.filter(
        (e) => e.status === 'complete' || e.status === 'checked'
    ).length;

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: primary + '18' }]}>
                    <Text style={[styles.avatarText, { color: primary }]}>
                        {subject.name.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
                        {subject.name}
                    </Text>
                    <Text style={[styles.cardCode, { color: colors.textSecondary }]}>
                        {subject.code}
                    </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
            </View>

            <View style={styles.cardBody}>
                <View style={styles.progressRow}>
                    <View style={styles.progressLabelRow}>
                        <MaterialCommunityIcons
                            name="file-document-outline"
                            size={14}
                            color={COLORS.status.complete[isDark ? 'dark' : 'light']}
                        />
                        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                            Assignments
                        </Text>
                    </View>
                    <Text style={[styles.progressCount, { color: colors.text }]}>
                        {assignDone}/{subject.assignments.length}
                    </Text>
                </View>
                <ProgressBar
                    done={assignDone}
                    total={subject.assignments.length}
                    color={COLORS.status.complete[isDark ? 'dark' : 'light']}
                    bgColor={isDark ? colors.surfaceVariant : '#E8E8F0'}
                />

                <View style={[styles.progressRow, { marginTop: SPACING.md }]}>
                    <View style={styles.progressLabelRow}>
                        <MaterialCommunityIcons
                            name="flask"
                            size={14}
                            color={COLORS.status.incomplete[isDark ? 'dark' : 'light']}
                        />
                        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                            Experiments
                        </Text>
                    </View>
                    <Text style={[styles.progressCount, { color: colors.text }]}>
                        {expDone}/{subject.experiments.length}
                    </Text>
                </View>
                <ProgressBar
                    done={expDone}
                    total={subject.experiments.length}
                    color={COLORS.status.incomplete[isDark ? 'dark' : 'light']}
                    bgColor={isDark ? colors.surfaceVariant : '#E8E8F0'}
                />
            </View>
        </TouchableOpacity>
    );
}

export default function SubjectsScreen({ navigation }) {
    const { colors, isDark, primary } = useTheme();
    const { subjects } = useData();

    const sortedSubjects = [...subjects].sort((a, b) => b.createdAt - a.createdAt);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Subjects</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
                </Text>
            </View>

            {subjects.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={[styles.emptyIcon, { backgroundColor: primary + '12' }]}>
                        <MaterialCommunityIcons name="book-plus" size={56} color={primary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Subjects Added</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        Tap the + button below to add your first subject
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={sortedSubjects}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <SubjectCard
                            subject={item}
                            colors={colors}
                            isDark={isDark}
                            primary={primary}
                            onPress={() => navigation.navigate('SubjectDetail', { subjectId: item.id })}
                        />
                    )}
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: primary }]}
                onPress={() => navigation.navigate('AddSubject')}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
    title: { fontSize: FONT_SIZE.xxxl, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { fontSize: FONT_SIZE.sm, marginTop: 2 },
    list: { padding: SPACING.lg, paddingTop: SPACING.sm },
    card: {
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: FONT_SIZE.lg, fontWeight: '700' },
    cardInfo: { flex: 1, marginLeft: SPACING.md },
    cardName: { fontSize: FONT_SIZE.lg, fontWeight: '700' },
    cardCode: { fontSize: FONT_SIZE.xs, marginTop: 1 },
    cardBody: {},
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    progressLabelRow: { flexDirection: 'row', alignItems: 'center' },
    progressText: { fontSize: FONT_SIZE.xs, marginLeft: SPACING.xs },
    progressCount: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
    progressBar: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 3 },
    fab: {
        position: 'absolute',
        bottom: SPACING.xxl,
        right: SPACING.xxl,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
    },
    emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700' },
    emptySubtitle: { fontSize: FONT_SIZE.sm, textAlign: 'center', marginTop: SPACING.xs, paddingHorizontal: 40 },
});
