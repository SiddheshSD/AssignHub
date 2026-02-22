import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS } from '../constants/theme';
import { loadThemePreference, saveThemePreference } from '../services/storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme();
    const [preference, setPreference] = useState('system'); // 'system' | 'light' | 'dark'
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            const pref = await loadThemePreference();
            setPreference(pref);
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

    if (!isLoaded) return null;

    return (
        <ThemeContext.Provider
            value={{
                isDark,
                colors,
                preference,
                setThemePreference,
                primary: COLORS.primary,
                primaryLight: COLORS.primaryLight,
                primaryDark: COLORS.primaryDark,
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
