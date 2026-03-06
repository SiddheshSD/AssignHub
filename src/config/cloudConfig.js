/**
 * Cloud Configuration
 * 
 * Replace the placeholder values below with your actual credentials.
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. GOOGLE OAUTH:
 *    - Go to https://console.cloud.google.com
 *    - Create a project (or use existing)
 *    - Enable "Google Drive API"
 *    - Go to Credentials → Create OAuth 2.0 Client ID
 *    - For Expo Go: Create a "Web application" type client
 *      - Add redirect URI: https://auth.expo.io/@YOUR_EXPO_USERNAME/AssignHUB
 *    - For Android build: Create an "Android" type client
 *      - Package name: com.siddhesh_2005.AssignHUB
 *      - SHA-1 fingerprint: 8E:A2:61:84:D0:42:A1:F0:1B:50:6A:61:FB:60:DF:ED:84:DB:D6:32
 * 
 * 2. FIREBASE:
 *    - Go to https://console.firebase.google.com
 *    - Create a project (or use the same Google Cloud project)
 *    - Go to Project Settings → General → Your Apps → Add Web App
 *    - Copy the firebaseConfig object values below
 *    - Go to Firestore Database → Create Database → Start in test mode
 */

// ==================== GOOGLE OAUTH ====================
// Replace with your OAuth client IDs from Google Cloud Console

export const GOOGLE_CONFIG = {
    // Client ID for Expo Go (Web application type)
    expoClientId: '884255476181-0tm3qv27lo65nqe7sajprfvuc8sdeh2v.apps.googleusercontent.com',

    // Client ID for Android standalone build
    androidClientId: '884255476181-keru94ge7peb5ldu5dr64gaujdk26hh8.apps.googleusercontent.com',

    // OAuth scopes
    scopes: [
        'openid',
        'profile',
        'email',
        'https://www.googleapis.com/auth/drive.file',
    ],
};

// ==================== FIREBASE ====================
// Firebase is initialized in firestoreService.js — this file only stores the config values.

export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyC3SdEYDfbyNArvNMoq7E1R3I5ZYotQtz0",
    authDomain: "assignhub-e8261.firebaseapp.com",
    projectId: "assignhub-e8261",
    storageBucket: "assignhub-e8261.firebasestorage.app",
    messagingSenderId: "22177764498",
    appId: "1:22177764498:web:1bc8100c8d08bcdf84024b",
    measurementId: "G-B48N3Q7XEL",
};

// ==================== GOOGLE DRIVE ====================

export const DRIVE_CONFIG = {
    // Folder name created in user's Google Drive
    folderName: 'AssignHub',

    // Drive API base URLs
    apiBase: 'https://www.googleapis.com/drive/v3',
    uploadBase: 'https://www.googleapis.com/upload/drive/v3',
};

// ==================== SYNC CONFIG ====================

export const SYNC_CONFIG = {
    // How often to retry failed syncs (in ms)
    retryInterval: 30000, // 30 seconds

    // Max retry attempts before marking as error
    maxRetries: 5,

    // Batch size for sync operations
    batchSize: 10,
};

/**
 * Check if cloud services are configured.
 * Returns false if placeholder values are still present.
 */
export function isCloudConfigured() {
    return (
        !GOOGLE_CONFIG.expoClientId.includes('YOUR_') &&
        !FIREBASE_CONFIG.apiKey.includes('YOUR_')
    );
}
