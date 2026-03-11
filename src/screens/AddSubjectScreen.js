import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SPACING, RADIUS, FONT_SIZE } from '../constants/theme';

function CompactStepper({ label, value, onChange, min = 0, max = 20, colors, primary }) {
    return (
        <View style={styles.compactStepperContainer}>
            <Text style={[styles.compactStepperLabel, { color: colors.text }]}>{label}</Text>
            <View style={[styles.compactStepperRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.compactStepperBtn, { opacity: value <= min ? 0.3 : 1 }]}
                    onPress={() => value > min && onChange(value - 1)}
                    disabled={value <= min}
                >
                    <MaterialCommunityIcons name="minus" size={18} color={primary} />
                </TouchableOpacity>
                <View style={styles.compactStepperValueWrap}>
                    <Text style={[styles.compactStepperValue, { color: colors.text }]}>{value}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.compactStepperBtn, { opacity: value >= max ? 0.3 : 1 }]}
                    onPress={() => value < max && onChange(value + 1)}
                    disabled={value >= max}
                >
                    <MaterialCommunityIcons name="plus" size={18} color={primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function AddSubjectScreen({ navigation }) {
    const { colors, primary } = useTheme();
    const { addSubject, isDuplicateCode } = useData();

    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [code, setCode] = useState('');
    const [assignments, setAssignments] = useState(6);
    const [experiments, setExperiments] = useState(10);
    const [assignmentOutOf, setAssignmentOutOf] = useState(10);
    const [experimentOutOf, setExperimentOutOf] = useState(10);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const trimmedName = name.trim();
        const trimmedShortName = shortName.trim();
        const trimmedCode = code.trim();

        if (!trimmedName) {
            Alert.alert('Validation', 'Please enter a subject name (full form).');
            return;
        }
        if (!trimmedShortName) {
            Alert.alert('Validation', 'Please enter a short name. This is used for folder and file naming.');
            return;
        }
        if (!trimmedCode) {
            Alert.alert('Validation', 'Please enter a subject code.');
            return;
        }
        if (isDuplicateCode(trimmedCode)) {
            Alert.alert('Duplicate', 'A subject with this code already exists.');
            return;
        }

        setSaving(true);
        await addSubject({
            name: trimmedName,
            shortName: trimmedShortName,
            code: trimmedCode.toUpperCase(),
            totalAssignments: assignments,
            totalExperiments: experiments,
            assignmentOutOf,
            experimentOutOf,
        });
        setSaving(false);
        navigation.goBack();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Add Subject</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Subject Name (Full Form) */}
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Subject Name (Full Form)</Text>
                        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="book-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g. Data Structures & Algorithms"
                                placeholderTextColor={colors.textTertiary}
                                value={name}
                                onChangeText={setName}
                                maxLength={80}
                            />
                        </View>
                        <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>Displayed on the subject page in big size</Text>
                    </View>

                    {/* Short Name */}
                    <View style={styles.fieldGroup}>
                        <View style={styles.labelRow}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Short Name</Text>
                            <View style={[styles.requiredBadge, { backgroundColor: primary + '18' }]}>
                                <Text style={[styles.requiredText, { color: primary }]}>Required</Text>
                            </View>
                        </View>
                        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="tag-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g. DSA"
                                placeholderTextColor={colors.textTertiary}
                                value={shortName}
                                onChangeText={setShortName}
                                maxLength={20}
                            />
                        </View>
                        <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>Used for folder & file names</Text>
                    </View>

                    {/* Subject Code */}
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Subject Code</Text>
                        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="identifier" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g. CS201"
                                placeholderTextColor={colors.textTertiary}
                                value={code}
                                onChangeText={setCode}
                                autoCapitalize="characters"
                                maxLength={15}
                            />
                        </View>
                    </View>

                    {/* Section: Counts */}
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Number of Items</Text>
                    <View style={styles.compactStepperGrid}>
                        <CompactStepper
                            label="Assignments"
                            value={assignments}
                            onChange={setAssignments}
                            min={0}
                            colors={colors}
                            primary={primary}
                        />
                        <CompactStepper
                            label="Experiments"
                            value={experiments}
                            onChange={setExperiments}
                            min={0}
                            colors={colors}
                            primary={primary}
                        />
                    </View>

                    {/* Section: Max Marks */}
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Max Marks (Out Of)</Text>
                    <View style={styles.compactStepperGrid}>
                        <CompactStepper
                            label="Assignment"
                            value={assignmentOutOf}
                            onChange={setAssignmentOutOf}
                            min={1}
                            max={100}
                            colors={colors}
                            primary={primary}
                        />
                        <CompactStepper
                            label="Experiment"
                            value={experimentOutOf}
                            onChange={setExperimentOutOf}
                            min={1}
                            max={100}
                            colors={colors}
                            primary={primary}
                        />
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: primary, opacity: saving ? 0.7 : 1 }]}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="content-save" size={20} color="#FFF" />
                        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Subject'}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700' },
    scroll: { padding: SPACING.lg, paddingTop: SPACING.sm },
    fieldGroup: { marginBottom: SPACING.lg },
    labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
    label: { fontSize: FONT_SIZE.sm, fontWeight: '600', marginBottom: SPACING.sm },
    requiredBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
        marginLeft: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    requiredText: { fontSize: 10, fontWeight: '700' },
    fieldHint: { fontSize: FONT_SIZE.xs, marginTop: SPACING.xs },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        paddingHorizontal: SPACING.md,
    },
    inputIcon: { marginRight: SPACING.sm },
    input: {
        flex: 1,
        fontSize: FONT_SIZE.md,
        paddingVertical: Platform.OS === 'ios' ? SPACING.lg : SPACING.md,
    },
    sectionLabel: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        marginBottom: SPACING.md,
        marginTop: SPACING.sm,
    },
    compactStepperGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    compactStepperContainer: {
        flex: 1,
    },
    compactStepperLabel: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
        marginBottom: SPACING.xs,
    },
    compactStepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        overflow: 'hidden',
        height: 42,
    },
    compactStepperBtn: {
        width: 38,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactStepperValueWrap: {
        flex: 1,
        alignItems: 'center',
    },
    compactStepperValue: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.lg,
        marginTop: SPACING.md,
        marginBottom: SPACING.xxxl,
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        marginLeft: SPACING.sm,
    },
});
