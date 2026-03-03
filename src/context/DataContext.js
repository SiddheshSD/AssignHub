import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadSubjects, saveSubjects } from '../services/storage';
const generateId = () =>
    Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const [subjects, setSubjects] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            const data = await loadSubjects();
            setSubjects(data);
            setIsLoaded(true);
        })();
    }, []);

    const persist = useCallback(async (updated) => {
        setSubjects(updated);
        await saveSubjects(updated);
    }, []);

    const addSubject = useCallback(async ({ name, code, totalAssignments, totalExperiments }) => {
        const assignments = Array.from({ length: totalAssignments }, (_, i) => ({
            id: generateId(),
            label: `Assignment ${i + 1}`,
            status: 'not_given',
            marks: null,
        }));
        const experiments = Array.from({ length: totalExperiments }, (_, i) => ({
            id: generateId(),
            label: `Experiment ${i + 1}`,
            status: 'not_given',
            marks: null,
        }));

        const now = Date.now();
        const newSubject = {
            id: generateId(),
            name,
            code,
            totalAssignments,
            totalExperiments,
            assignmentOutOf: 10,
            experimentOutOf: 10,
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
        const updated = subjects.filter((s) => s.id !== subjectId);
        await persist(updated);
    }, [subjects, persist]);

    const updateSubject = useCallback(async (subjectId, { code, totalAssignments, totalExperiments, assignmentOutOf, experimentOutOf }) => {
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
                    });
                }
            } else if (totalAssignments < newAssignments.length) {
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
                    });
                }
            } else if (totalExperiments < newExperiments.length) {
                newExperiments = newExperiments.slice(0, totalExperiments);
            }

            return {
                ...s,
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

    const resetAllData = useCallback(async () => {
        await persist([]);
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
                resetAllData,
                isDuplicateCode,
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
