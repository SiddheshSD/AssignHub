/**
 * Auth Context
 * 
 * Provides Google OAuth authentication state throughout the app.
 * Uses expo-auth-session for the OAuth flow and expo-secure-store
 * for persisting tokens. The app works normally without login —
 * all cloud features are opt-in.
 * 
 * Provides:
 * - user: { id, name, email, picture } | null
 * - accessToken: string | null
 * - isLoggedIn: boolean
 * - login(): Starts Google OAuth flow
 * - logout(): Clears auth state
 * - driveFolderId: string | null
 * - syncStatus: { syncing, lastSync, pendingCount }
 * - triggerSync(): Manually trigger sync
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';
import { GOOGLE_CONFIG, isCloudConfigured } from '../config/cloudConfig';
import {
    saveAccessToken,
    getAccessToken,
    saveUserProfile,
    getUserProfile,
    saveDriveFolderId,
    getDriveFolderId,
    clearAllAuthData,
    fetchGoogleUserInfo,
} from '../services/authService';
import { ensureAppFolder } from '../services/driveService';
import { initNetworkMonitor, onConnectivityChange } from '../services/networkMonitor';
import { fullSync, onSyncStatusChange, getSyncStatus } from '../services/syncService';

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [driveFolderId, setDriveFolderIdState] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState({
        syncing: false,
        lastSync: 0,
        pendingCount: 0,
    });

    const networkUnsubRef = useRef(null);
    const syncUnsubRef = useRef(null);

    // Only set up Google auth if cloud is configured
    const cloudConfigured = isCloudConfigured();

    // Google OAuth request hook
    // For Expo Go: uses webClientId (same as expoClientId)
    // For Android builds: uses androidClientId
    const [request, response, promptAsync] = Google.useAuthRequest(
        cloudConfigured
            ? {
                webClientId: GOOGLE_CONFIG.expoClientId,
                androidClientId: GOOGLE_CONFIG.androidClientId,
                scopes: GOOGLE_CONFIG.scopes,
            }
            : { webClientId: 'placeholder' } // Dummy config when not set up
    );

    // ============ RESTORE SESSION ON STARTUP ============
    useEffect(() => {
        (async () => {
            try {
                const storedToken = await getAccessToken();
                const storedUser = await getUserProfile();
                const storedFolderId = await getDriveFolderId();

                if (storedToken && storedUser) {
                    setAccessToken(storedToken);
                    setUser(storedUser);
                    setDriveFolderIdState(storedFolderId);
                }
            } catch (error) {
                console.error('AuthContext: Error restoring session:', error);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    // ============ NETWORK MONITOR ============
    useEffect(() => {
        // Start network monitoring
        const unsubNetwork = initNetworkMonitor();
        networkUnsubRef.current = unsubNetwork;

        // Listen for connectivity changes — trigger sync when online
        const unsubConnectivity = onConnectivityChange(async (isConnected) => {
            if (isConnected && user && accessToken) {
                console.log('AuthContext: Network restored, triggering sync...');
                await fullSync(user.id, accessToken);
            }
        });

        // Listen for sync status changes
        const unsubSync = onSyncStatusChange((status) => {
            setSyncStatus(status);
        });
        syncUnsubRef.current = unsubSync;

        return () => {
            if (networkUnsubRef.current) networkUnsubRef.current();
            if (unsubConnectivity) unsubConnectivity();
            if (syncUnsubRef.current) syncUnsubRef.current();
        };
    }, [user, accessToken]);

    // ============ HANDLE OAUTH RESPONSE ============
    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.accessToken) {
                handleLoginSuccess(authentication.accessToken);
            }
        } else if (response?.type === 'error') {
            console.error('AuthContext: OAuth error:', response.error);
            Alert.alert('Login Failed', 'Could not sign in with Google. Please try again.');
        }
    }, [response]);

    /**
     * Handle successful Google login.
     */
    const handleLoginSuccess = async (token) => {
        try {
            // Save the token
            await saveAccessToken(token);
            setAccessToken(token);

            // Fetch user info
            const userInfo = await fetchGoogleUserInfo(token);
            if (userInfo) {
                const profile = {
                    id: userInfo.id,
                    name: userInfo.name,
                    email: userInfo.email,
                    picture: userInfo.picture,
                };
                await saveUserProfile(profile);
                setUser(profile);

                // Ensure AssignHub folder exists in Drive
                const folderId = await ensureAppFolder(token);
                if (folderId) {
                    await saveDriveFolderId(folderId);
                    setDriveFolderIdState(folderId);
                }

                // Trigger initial sync
                await fullSync(userInfo.id, token);

                Alert.alert(
                    'Login Successful',
                    `Welcome, ${userInfo.name}!\n\nYour files will now sync to Google Drive and Firestore.`
                );
            }
        } catch (error) {
            console.error('AuthContext: Login handling error:', error);
            Alert.alert('Login Error', 'Signed in but failed to set up cloud services.');
        }
    };

    // ============ PUBLIC METHODS ============

    /**
     * Start Google OAuth login flow.
     */
    const login = useCallback(async () => {
        if (!cloudConfigured) {
            Alert.alert(
                'Cloud Not Configured',
                'Google OAuth credentials are not set up yet.\n\nPlease update src/config/cloudConfig.js with your credentials.'
            );
            return;
        }

        try {
            await promptAsync();
        } catch (error) {
            console.error('AuthContext: Login error:', error);
            Alert.alert('Login Error', 'Could not start the login process.');
        }
    }, [promptAsync, cloudConfigured]);

    /**
     * Logout: clear all auth data.
     */
    const logout = useCallback(async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure? Your local data will be kept, but cloud sync will stop.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await clearAllAuthData();
                        setUser(null);
                        setAccessToken(null);
                        setDriveFolderIdState(null);
                        setSyncStatus({ syncing: false, lastSync: 0, pendingCount: 0 });
                    },
                },
            ]
        );
    }, []);

    /**
     * Manually trigger a sync.
     */
    const triggerSync = useCallback(async () => {
        if (!user || !accessToken) {
            Alert.alert('Not Logged In', 'Please sign in with Google to sync.');
            return;
        }
        const result = await fullSync(user.id, accessToken);
        if (result.pushed > 0 || result.errors > 0) {
            Alert.alert(
                'Sync Complete',
                `Synced: ${result.pushed} items\nErrors: ${result.errors}`
            );
        } else {
            Alert.alert('Up to Date', 'Everything is already synced.');
        }
    }, [user, accessToken]);

    return (
        <AuthContext.Provider
            value={{
                user,
                accessToken,
                isLoggedIn: !!user && !!accessToken,
                isLoading,
                cloudConfigured,
                login,
                logout,
                driveFolderId,
                syncStatus,
                triggerSync,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
