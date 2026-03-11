import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadSubjects, saveSubjects, loadSettings, saveSettings, DEFAULT_SETTINGS } from '../services/storage';
import { scheduleDeadlineNotifications, cancelItemNotifications, requestNotificationPermissions, rescheduleAllNotifications } from '../services/notifications';

const generateId = () =>
    Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const [subjects, setSubjects] = useState([]);
    const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            const data = await loadSubjects();
            const settingsData = await loadSettings();
            setSubjects(data);
            setSettingsState(settingsData);
            setIsLoaded(true);

            // Request notification permissions on startup
            await requestNotificationPermissions();
        })();
    }, []);

    const persist = useCallback(async (updated) => {
        setSubjects(updated);
        await saveSubjects(updated);
    }, []);

    const updateSettings = useCallback(async (newSettings) => {
        const merged = { ...settings, ...newSettings };
        setSettingsState(merged);
        await saveSettings(merged);

        // If notification days or time changed, reschedule all notifications
        if (newSettings.notificationDaysBefore !== undefined ||
            newSettings.notificationTimeHour !== undefined ||
            newSettings.notificationTimeMinute !== undefined) {
            await rescheduleAllNotifications(subjects);
        }
    }, [settings, subjects]);

    const addSubject = useCallback(async ({ name, shortName, code, totalAssignments, totalExperiments, assignmentOutOf, experimentOutOf }) => {
        const assignments = Array.from({ length: totalAssignments }, (_, i) => ({
            id: generateId(),
            label: `Assignment ${i + 1}`,
            status: 'not_given',
            marks: null,
            submissionDate: null,
            files: [],
        }));
        const experiments = Array.from({ length: totalExperiments }, (_, i) => ({
            id: generateId(),
            label: `Experiment ${i + 1}`,
            status: 'not_given',
            marks: null,
            submissionDate: null,
            files: [],
        }));

        const now = Date.now();
        const newSubject = {
            id: generateId(),
            name,
            shortName: shortName || name,
            code,
            totalAssignments,
            totalExperiments,
            assignmentOutOf: assignmentOutOf ?? 10,
            experimentOutOf: experimentOutOf ?? 10,
            assignments,
            experiments,
            createdAt: now,
            updatedAt: now,
        };

        const updated = [...subjects, newSubject];
        await persist(updated);
        return newSubject;
    }, [subjects, persist]);

    const deleteSubject = useCallback(async (subjectId) => {
        // Cancel notifications for all items in the subject
        const subject = subjects.find(s => s.id === subjectId);
        if (subject) {
            for (const item of [...subject.assignments, ...subject.experiments]) {
                await cancelItemNotifications(item.id);
            }
        }

        const updated = subjects.filter((s) => s.id !== subjectId);
        await persist(updated);
    }, [subjects, persist]);

    const updateSubject = useCallback(async (subjectId, { name, shortName, code, totalAssignments, totalExperiments, assignmentOutOf, experimentOutOf }) => {
        const updated = subjects.map((s) => {
            if (s.id !== subjectId) return s;

            // Resize assignments: keep existing, add new or trim
            let newAssignments = [...s.assignments];
            if (totalAssignments > newAssignments.length) {
                for (let i = newAssignments.length; i < totalAssignments; i++) {
                    newAssignments.push({
                        id: generateId(),
                        label: `Assignment ${i + 1}`,
                        status: 'not_given',
                        marks: null,
                        submissionDate: null,
                        files: [],
                    });
                }
            } else if (totalAssignments < newAssignments.length) {
                // Cancel notifications for items being removed
                const removed = newAssignments.slice(totalAssignments);
                removed.forEach(item => cancelItemNotifications(item.id));
                newAssignments = newAssignments.slice(0, totalAssignments);
            }

            // Resize experiments: keep existing, add new or trim
            let newExperiments = [...s.experiments];
            if (totalExperiments > newExperiments.length) {
                for (let i = newExperiments.length; i < totalExperiments; i++) {
                    newExperiments.push({
                        id: generateId(),
                        label: `Experiment ${i + 1}`,
                        status: 'not_given',
                        marks: null,
                        submissionDate: null,
                        files: [],
                    });
                }
            } else if (totalExperiments < newExperiments.length) {
                const removed = newExperiments.slice(totalExperiments);
                removed.forEach(item => cancelItemNotifications(item.id));
                newExperiments = newExperiments.slice(0, totalExperiments);
            }

            return {
                ...s,
                name: name ?? s.name,
                shortName: shortName ?? s.shortName ?? s.name,
                code,
                totalAssignments,
                totalExperiments,
                assignmentOutOf: assignmentOutOf ?? s.assignmentOutOf ?? 10,
                experimentOutOf: experimentOutOf ?? s.experimentOutOf ?? 10,
                assignments: newAssignments,
                experiments: newExperiments,
                updatedAt: Date.now(),
            };
        });
        await persist(updated);
    }, [subjects, persist]);

    const updateItemStatus = useCallback(async (subjectId, itemId, type, newStatus) => {
        const updated = subjects.map((s) => {
            if (s.id !== subjectId) return s;
            const key = type === 'assignment' ? 'assignments' : 'experiments';
            return {
                ...s,
                [key]: s[key].map((item) =>
                    item.id === itemId ? { ...item, status: newStatus } : item
                ),
                updatedAt: Date.now(),
            };
        });
        await persist(updated);
    }, [subjects, persist]);

    const updateItemMarks = useCallback(async (subjectId, itemId, type, marks) => {
        const updated = subjects.map((s) => {
            if (s.id !== subjectId) return s;
            const key = type === 'assignment' ? 'assignments' : 'experiments';
            return {
                ...s,
                [key]: s[key].map((item) =>
                    item.id === itemId ? { ...item, marks } : item
                ),
                updatedAt: Date.now(),
            };
        });
        await persist(updated);
    }, [subjects, persist]);

    const updateItemSubmissionDate = useCallback(async (subjectId, itemId, type, submissionDate) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        const key = type === 'assignment' ? 'assignments' : 'experiments';
        const item = subject[key].find(i => i.id === itemId);
        if (!item) return;

        const updated = subjects.map((s) => {
            if (s.id !== subjectId) return s;
            return {
                ...s,
                [key]: s[key].map((it) =>
                    it.id === itemId ? { ...it, submissionDate } : it
                ),
                updatedAt: Date.now(),
            };
        });
        await persist(updated);

        // Schedule or cancel notifications
        if (submissionDate) {
            await scheduleDeadlineNotifications(
                subject.name,
                subject.code,
                item.label,
                type,
                submissionDate,
                itemId,
                settings.notificationDaysBefore || 2,
                settings.notificationTimeHour ?? 9,
                settings.notificationTimeMinute ?? 0
            );
        } else {
            await cancelItemNotifications(itemId);
        }
    }, [subjects, persist, settings]);

    const updateItemFiles = useCallback(async (subjectId, itemId, type, files) => {
        const updated = subjects.map((s) => {
            if (s.id !== subjectId) return s;
            const key = type === 'assignment' ? 'assignments' : 'experiments';
            return {
                ...s,
                [key]: s[key].map((item) =>
                    item.id === itemId ? { ...item, files: files || [] } : item
                ),
                updatedAt: Date.now(),
            };
        });
        await persist(updated);
    }, [subjects, persist]);

    const resetAllData = useCallback(async () => {
        await persist([]);
    }, [persist]);

    const importSubjects = useCallback(async (importedSubjects) => {
        const rebuilt = importedSubjects.map((s) => {
            const assignments = (s.assignments || []).map((a, i) => ({
                id: generateId(),
                label: a.label || `Assignment ${i + 1}`,
                status: a.status || 'not_given',
                marks: a.marks ?? null,
                submissionDate: a.submissionDate || null,
                files: [],
            }));
            const experiments = (s.experiments || []).map((e, i) => ({
                id: generateId(),
                label: e.label || `Experiment ${i + 1}`,
                status: e.status || 'not_given',
                marks: e.marks ?? null,
                submissionDate: e.submissionDate || null,
                files: [],
            }));

            return {
                id: generateId(),
                name: s.name,
                shortName: s.shortName || s.name,
                code: s.code,
                totalAssignments: s.totalAssignments ?? assignments.length,
                totalExperiments: s.totalExperiments ?? experiments.length,
                assignmentOutOf: s.assignmentOutOf ?? 10,
                experimentOutOf: s.experimentOutOf ?? 10,
                assignments,
                experiments,
                createdAt: s.createdAt || Date.now(),
                updatedAt: s.updatedAt || Date.now(),
            };
        });

        await persist(rebuilt);
    }, [persist]);

    const isDuplicateCode = useCallback((code) => {
        return subjects.some((s) => s.code.toLowerCase() === code.toLowerCase());
    }, [subjects]);

    // Computed stats
    const allItems = subjects.flatMap((s) => [...s.assignments, ...s.experiments]);
    const totalAssignments = subjects.reduce((sum, s) => sum + s.assignments.length, 0);
    const totalExperiments = subjects.reduce((sum, s) => sum + s.experiments.length, 0);
    const totalItems = allItems.length;

    const notGivenCount = allItems.filter((i) => i.status === 'not_given').length;
    const incompleteCount = allItems.filter((i) => i.status === 'incomplete').length;
    const completeCount = allItems.filter((i) => i.status === 'complete').length;
    const checkedCount = allItems.filter((i) => i.status === 'checked').length;

    const completedItems = completeCount + checkedCount;
    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Upcoming deadlines
    const upcomingDeadlines = allItems
        .filter(i => i.submissionDate && new Date(i.submissionDate) >= new Date())
        .sort((a, b) => new Date(a.submissionDate) - new Date(b.submissionDate));

    if (!isLoaded) return null;

    return (
        <DataContext.Provider
            value={{
                subjects,
                addSubject,
                deleteSubject,
                updateSubject,
                updateItemStatus,
                updateItemMarks,
                updateItemSubmissionDate,
                updateItemFiles,
                resetAllData,
                importSubjects,
                isDuplicateCode,
                settings,
                updateSettings,
                stats: {
                    totalSubjects: subjects.length,
                    totalAssignments,
                    totalExperiments,
                    completedItems,
                    checkedItems: checkedCount,
                    totalItems,
                    completionPercentage,
                    notGivenCount,
                    incompleteCount,
                    completeCount,
                    checkedCount,
                },
                upcomingDeadlines,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within DataProvider');
    return context;
};
