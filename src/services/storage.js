import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBJECTS_KEY = '@assignhub_subjects';
const THEME_KEY = '@assignhub_theme';
const SETTINGS_KEY = '@assignhub_settings';
const PRIMARY_COLOR_KEY = '@assignhub_primary_color';

export const DEFAULT_SETTINGS = {
    notificationDaysBefore: 2,
    notificationTimeHour: 9,
    notificationTimeMinute: 0,
    storageFolder: 'AssignHUB_Files',
    storageDirUri: null,
};

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

export const loadSettings = async () => {
    try {
        const data = await AsyncStorage.getItem(SETTINGS_KEY);
        return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (error) {
        console.error('Error loading settings:', error);
        return DEFAULT_SETTINGS;
    }
};

export const saveSettings = async (settings) => {
    try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
};

export const clearAllData = async () => {
    try {
        await AsyncStorage.multiRemove([SUBJECTS_KEY, THEME_KEY, SETTINGS_KEY, PRIMARY_COLOR_KEY]);
    } catch (error) {
        console.error('Error clearing data:', error);
    }
};

export const loadPrimaryColor = async () => {
    try {
        const color = await AsyncStorage.getItem(PRIMARY_COLOR_KEY);
        return color || null;
    } catch (error) {
        console.error('Error loading primary color:', error);
        return null;
    }
};

export const savePrimaryColor = async (color) => {
    try {
        await AsyncStorage.setItem(PRIMARY_COLOR_KEY, color);
    } catch (error) {
        console.error('Error saving primary color:', error);
    }
};
