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
        }));
        const experiments = Array.from({ length: totalExperiments }, (_, i) => ({
            id: generateId(),
            label: `Experiment ${i + 1}`,
            status: 'not_given',
        }));

        const newSubject = {
            id: generateId(),
            name,
            code,
            totalAssignments,
            totalExperiments,
            assignments,
            experiments,
            createdAt: Date.now(),
        };

        const updated = [...subjects, newSubject];
        await persist(updated);
        return newSubject;
    }, [subjects, persist]);

    const deleteSubject = useCallback(async (subjectId) => {
        const updated = subjects.filter((s) => s.id !== subjectId);
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
    const totalAssignments = subjects.reduce((sum, s) => sum + s.assignments.length, 0);
    const totalExperiments = subjects.reduce((sum, s) => sum + s.experiments.length, 0);
    const completedAssignments = subjects.reduce(
        (sum, s) => sum + s.assignments.filter((a) => a.status === 'checked' || a.status === 'complete').length,
        0
    );
    const completedExperiments = subjects.reduce(
        (sum, s) => sum + s.experiments.filter((e) => e.status === 'checked' || e.status === 'complete').length,
        0
    );
    const totalItems = totalAssignments + totalExperiments;
    const completedItems = completedAssignments + completedExperiments;
    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const checkedAssignments = subjects.reduce(
        (sum, s) => sum + s.assignments.filter((a) => a.status === 'checked').length, 0
    );
    const checkedExperiments = subjects.reduce(
        (sum, s) => sum + s.experiments.filter((e) => e.status === 'checked').length, 0
    );
    const checkedItems = checkedAssignments + checkedExperiments;

    if (!isLoaded) return null;

    return (
        <DataContext.Provider
            value={{
                subjects,
                addSubject,
                deleteSubject,
                updateItemStatus,
                resetAllData,
                isDuplicateCode,
                stats: {
                    totalSubjects: subjects.length,
                    totalAssignments,
                    totalExperiments,
                    completedAssignments,
                    completedExperiments,
                    completedItems,
                    checkedItems,
                    totalItems,
                    completionPercentage,
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
