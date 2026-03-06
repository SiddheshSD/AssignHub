/**
 * Auth Service
 * 
 * Handles Google OAuth token storage and retrieval
 * using expo-secure-store for secure persistence.
 * The actual OAuth flow is managed in AuthContext.js
 * using expo-auth-session hooks (which require React context).
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'assignhub_google_token';
const USER_KEY = 'assignhub_google_user';
const DRIVE_FOLDER_KEY = 'assignhub_drive_folder_id';

/**
 * Save the Google access token securely.
 */
export async function saveAccessToken(token) {
    try {
        await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(token));
    } catch (error) {
        console.error('authService: Error saving token:', error);
    }
}

/**
 * Retrieve the stored Google access token.
 * Returns null if no token is stored.
 */
export async function getAccessToken() {
    try {
        const data = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!data) return null;
        const token = JSON.parse(data);
        return token;
    } catch (error) {
        console.error('authService: Error reading token:', error);
        return null;
    }
}

/**
 * Remove the stored token (logout).
 */
export async function clearAccessToken() {
    try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
        console.error('authService: Error clearing token:', error);
    }
}

/**
 * Save user profile info (name, email, photo).
 */
export async function saveUserProfile(profile) {
    try {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(profile));
    } catch (error) {
        console.error('authService: Error saving profile:', error);
    }
}

/**
 * Retrieve stored user profile.
 */
export async function getUserProfile() {
    try {
        const data = await SecureStore.getItemAsync(USER_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('authService: Error reading profile:', error);
        return null;
    }
}

/**
 * Remove stored user profile (logout).
 */
export async function clearUserProfile() {
    try {
        await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
        console.error('authService: Error clearing profile:', error);
    }
}

/**
 * Save the Google Drive folder ID for the AssignHub folder.
 */
export async function saveDriveFolderId(folderId) {
    try {
        await SecureStore.setItemAsync(DRIVE_FOLDER_KEY, folderId);
    } catch (error) {
        console.error('authService: Error saving folder ID:', error);
    }
}

/**
 * Get the stored Google Drive folder ID.
 */
export async function getDriveFolderId() {
    try {
        return await SecureStore.getItemAsync(DRIVE_FOLDER_KEY);
    } catch (error) {
        console.error('authService: Error reading folder ID:', error);
        return null;
    }
}

/**
 * Clear the stored Drive folder ID (logout).
 */
export async function clearDriveFolderId() {
    try {
        await SecureStore.deleteItemAsync(DRIVE_FOLDER_KEY);
    } catch (error) {
        console.error('authService: Error clearing folder ID:', error);
    }
}

/**
 * Full logout: clear all stored auth data.
 */
export async function clearAllAuthData() {
    await clearAccessToken();
    await clearUserProfile();
    await clearDriveFolderId();
}

/**
 * Fetch Google user info using the access token.
 */
export async function fetchGoogleUserInfo(accessToken) {
    try {
        const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch user info: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('authService: Error fetching user info:', error);
        return null;
    }
}
