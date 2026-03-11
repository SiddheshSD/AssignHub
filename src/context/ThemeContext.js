import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS } from '../constants/theme';
import { loadThemePreference, saveThemePreference, loadPrimaryColor, savePrimaryColor } from '../services/storage';

const ThemeContext = createContext();

// Predefined color palette
export const COLOR_PALETTE = [
    { name: 'Indigo', color: '#6C63FF', light: '#8B83FF', dark: '#5A52E0' },
    { name: 'Blue', color: '#3B82F6', light: '#60A5FA', dark: '#2563EB' },
    { name: 'Teal', color: '#14B8A6', light: '#2DD4BF', dark: '#0D9488' },
    { name: 'Green', color: '#22C55E', light: '#4ADE80', dark: '#16A34A' },
    { name: 'Orange', color: '#F97316', light: '#FB923C', dark: '#EA580C' },
    { name: 'Rose', color: '#F43F5E', light: '#FB7185', dark: '#E11D48' },
    { name: 'Purple', color: '#A855F7', light: '#C084FC', dark: '#9333EA' },
    { name: 'Cyan', color: '#06B6D4', light: '#22D3EE', dark: '#0891B2' },
    { name: 'Amber', color: '#F59E0B', light: '#FBBF24', dark: '#D97706' },
    { name: 'Pink', color: '#EC4899', light: '#F472B6', dark: '#DB2777' },
];

const DEFAULT_PRIMARY = COLOR_PALETTE[0]; // Indigo

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme();
    const [preference, setPreference] = useState('system'); // 'system' | 'light' | 'dark'
    const [primaryColorObj, setPrimaryColorObj] = useState(DEFAULT_PRIMARY);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            const pref = await loadThemePreference();
            const savedColor = await loadPrimaryColor();
            setPreference(pref);
            if (savedColor) {
                const found = COLOR_PALETTE.find((c) => c.color === savedColor);
                if (found) setPrimaryColorObj(found);
            }
            setIsLoaded(true);
        })();
    }, []);

    const isDark =
        preference === 'system'
            ? systemScheme === 'dark'
            : preference === 'dark';

    const colors = isDark ? COLORS.dark : COLORS.light;

    const setThemePreference = async (pref) => {
        setPreference(pref);
        await saveThemePreference(pref);
    };

    const setPrimaryColor = async (colorObj) => {
        setPrimaryColorObj(colorObj);
        await savePrimaryColor(colorObj.color);
    };

    if (!isLoaded) return null;

    return (
        <ThemeContext.Provider
            value={{
                isDark,
                colors,
                preference,
                setThemePreference,
                primary: primaryColorObj.color,
                primaryLight: primaryColorObj.light,
                primaryDark: primaryColorObj.dark,
                primaryColorObj,
                setPrimaryColor,
                statusColors: COLORS.status,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
