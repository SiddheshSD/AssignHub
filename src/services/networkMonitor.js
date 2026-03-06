/**
 * Network Monitor Service
 * 
 * Monitors internet connectivity and provides utilities
 * for checking online/offline status. Used by syncService
 * to trigger sync when connectivity is restored.
 */

import NetInfo from '@react-native-community/netinfo';

let _isConnected = true;
let _listeners = [];

/**
 * Initialize the network monitor.
 * Call this once at app startup.
 * Returns an unsubscribe function.
 */
export function initNetworkMonitor() {
    const unsubscribe = NetInfo.addEventListener((state) => {
        const wasConnected = _isConnected;
        _isConnected = state.isConnected && state.isInternetReachable !== false;

        // Notify listeners if connectivity was restored
        if (!wasConnected && _isConnected) {
            _listeners.forEach((fn) => {
                try { fn(true); } catch (e) { console.error('NetworkMonitor listener error:', e); }
            });
        }

        // Notify listeners if connectivity was lost
        if (wasConnected && !_isConnected) {
            _listeners.forEach((fn) => {
                try { fn(false); } catch (e) { console.error('NetworkMonitor listener error:', e); }
            });
        }
    });

    return unsubscribe;
}

/**
 * Check if the device is currently online.
 */
export function isOnline() {
    return _isConnected;
}

/**
 * Fetch the current network state (one-time check).
 * More reliable than the cached value.
 */
export async function checkConnection() {
    try {
        const state = await NetInfo.fetch();
        _isConnected = state.isConnected && state.isInternetReachable !== false;
        return _isConnected;
    } catch (error) {
        console.error('NetworkMonitor check error:', error);
        return false;
    }
}

/**
 * Register a listener for connectivity changes.
 * The callback receives a boolean: true = online, false = offline.
 * Returns an unsubscribe function.
 */
export function onConnectivityChange(callback) {
    _listeners.push(callback);
    return () => {
        _listeners = _listeners.filter((fn) => fn !== callback);
    };
}
