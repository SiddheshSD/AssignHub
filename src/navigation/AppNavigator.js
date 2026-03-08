import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, ActivityIndicator, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

import DashboardScreen from '../screens/DashboardScreen';
import SubjectsScreen from '../screens/SubjectsScreen';
import AddSubjectScreen from '../screens/AddSubjectScreen';
import SubjectDetailScreen from '../screens/SubjectDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import OnboardingScreen, { checkOnboardingComplete } from '../screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function SubjectsStack() {
    const { colors, isDark } = useTheme();

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="SubjectsList" component={SubjectsScreen} />
            <Stack.Screen name="AddSubject" component={AddSubjectScreen} />
            <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
        </Stack.Navigator>
    );
}

function MainTabs() {
    const { colors, isDark, primary } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Dashboard') {
                        iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
                    } else if (route.name === 'Subjects') {
                        iconName = focused ? 'book-open-variant' : 'book-open-outline';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'cog' : 'cog-outline';
                    }
                    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: primary,
                tabBarInactiveTintColor: colors.textTertiary,
                tabBarStyle: {
                    backgroundColor: colors.tabBar,
                    borderTopColor: colors.tabBarBorder,
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 88 : 64,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                    paddingTop: 8,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Subjects" component={SubjectsStack} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const { colors, primary } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        (async () => {
            const completed = await checkOnboardingComplete();
            setShowOnboarding(!completed);
            setIsLoading(false);
        })();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={primary} />
            </View>
        );
    }

    if (showOnboarding) {
        return (
            <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
        );
    }

    return (
        <NavigationContainer>
            <MainTabs />
        </NavigationContainer>
    );
}
