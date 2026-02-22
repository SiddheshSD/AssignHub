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

function Stepper({ label, value, onChange, min = 1, max = 20, colors, primary }) {
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
            <Text style={[styles.stepperHint, { color: colors.textTertiary }]}>Max: {max}</Text>
        </View>
    );
}

export default function AddSubjectScreen({ navigation }) {
    const { colors, primary } = useTheme();
    const { addSubject, isDuplicateCode } = useData();

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [assignments, setAssignments] = useState(5);
    const [experiments, setExperiments] = useState(3);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const trimmedName = name.trim();
        const trimmedCode = code.trim();

        if (!trimmedName) {
            Alert.alert('Validation', 'Please enter a subject name.');
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
            code: trimmedCode.toUpperCase(),
            totalAssignments: assignments,
            totalExperiments: experiments,
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
                    {/* Subject Name */}
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Subject Name</Text>
                        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="book-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="e.g. Data Structures"
                                placeholderTextColor={colors.textTertiary}
                                value={name}
                                onChangeText={setName}
                                maxLength={50}
                            />
                        </View>
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

                    {/* Steppers */}
                    <Stepper
                        label="Number of Assignments"
                        value={assignments}
                        onChange={setAssignments}
                        colors={colors}
                        primary={primary}
                    />

                    <Stepper
                        label="Number of Experiments"
                        value={experiments}
                        onChange={setExperiments}
                        colors={colors}
                        primary={primary}
                    />

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
    fieldGroup: { marginBottom: SPACING.xl },
    label: { fontSize: FONT_SIZE.sm, fontWeight: '600', marginBottom: SPACING.sm },
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
    stepperContainer: { marginBottom: SPACING.xl },
    stepperLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', marginBottom: SPACING.sm },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    stepperBtn: {
        width: 56,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperValueWrap: { flex: 1, alignItems: 'center' },
    stepperValue: { fontSize: FONT_SIZE.xl, fontWeight: '700' },
    stepperHint: { fontSize: FONT_SIZE.xs, marginTop: SPACING.xs },
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
