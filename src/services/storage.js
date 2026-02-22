import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBJECTS_KEY = '@assignhub_subjects';
const THEME_KEY = '@assignhub_theme';

export const loadSubjects = async () => {
    try {
        const data = await AsyncStorage.getItem(SUBJECTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading subjects:', error);
        return [];
    }
};

export const saveSubjects = async (subjects) => {
    try {
        await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
    } catch (error) {
        console.error('Error saving subjects:', error);
    }
};

export const loadThemePreference = async () => {
    try {
        const pref = await AsyncStorage.getItem(THEME_KEY);
        return pref || 'system'; // 'system' | 'light' | 'dark'
    } catch (error) {
        console.error('Error loading theme:', error);
        return 'system';
    }
};

export const saveThemePreference = async (preference) => {
    try {
        await AsyncStorage.setItem(THEME_KEY, preference);
    } catch (error) {
        console.error('Error saving theme:', error);
    }
};

export const clearAllData = async () => {
    try {
        await AsyncStorage.multiRemove([SUBJECTS_KEY, THEME_KEY]);
    } catch (error) {
        console.error('Error clearing data:', error);
    }
};
