/**
 * Metadata Repository
 * 
 * Local offline-first metadata storage layer.
 * Stores cloud file metadata in AsyncStorage so the app
 * works without internet. Each entry tracks syncStatus
 * to know what needs to be pushed to MongoDB.
 * 
 * This is SEPARATE from the existing subjects/assignments storage.
 * It only tracks cloud-uploaded file metadata.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const METADATA_KEY = '@assignhub_cloud_metadata';
const SYNC_QUEUE_KEY = '@assignhub_sync_queue';
const LAST_SYNC_KEY = '@assignhub_last_sync';

/**
 * Load all local cloud metadata entries.
 */
export async function loadAllMetadata() {
    try {
        const data = await AsyncStorage.getItem(METADATA_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('metadataRepository: Error loading metadata:', error);
        return [];
    }
}

/**
 * Save all metadata entries (overwrites the full list).
 */
async function saveAllMetadata(entries) {
    try {
        await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(entries));
    } catch (error) {
        console.error('metadataRepository: Error saving metadata:', error);
    }
}

/**
 * Create a new metadata entry.
 * Marks it as "pending" until synced to MongoDB.
 */
export async function createMetadata(entry) {
    const entries = await loadAllMetadata();
    const newEntry = {
        ...entry,
        syncStatus: entry.syncStatus || 'pending',
        createdAt: entry.createdAt || Date.now(),
        updatedAt: Date.now(),
    };
    entries.push(newEntry);
    await saveAllMetadata(entries);
    return newEntry;
}

/**
 * Update an existing metadata entry by localId.
 */
export async function updateMetadataLocal(localId, updates) {
    const entries = await loadAllMetadata();
    const index = entries.findIndex((e) => e.localId === localId);
    if (index === -1) return null;

    entries[index] = {
        ...entries[index],
        ...updates,
        updatedAt: Date.now(),
        syncStatus: updates.syncStatus || 'pending',
    };
    await saveAllMetadata(entries);
    return entries[index];
}

/**
 * Delete a metadata entry by localId.
 */
export async function deleteMetadataLocal(localId) {
    const entries = await loadAllMetadata();
    const filtered = entries.filter((e) => e.localId !== localId);
    await saveAllMetadata(filtered);
}

/**
 * Find a metadata entry by localId.
 */
export async function findMetadataLocal(localId) {
    const entries = await loadAllMetadata();
    return entries.find((e) => e.localId === localId) || null;
}

/**
 * Find all metadata entries for a specific subject.
 */
export async function findMetadataBySubjectLocal(subjectCode) {
    const entries = await loadAllMetadata();
    return entries.filter((e) => e.subjectCode === subjectCode);
}

/**
 * Get all entries that need to be synced (syncStatus === "pending").
 */
export async function getPendingMetadata() {
    const entries = await loadAllMetadata();
    return entries.filter((e) => e.syncStatus === 'pending');
}

/**
 * Get all entries with sync errors.
 */
export async function getErrorMetadata() {
    const entries = await loadAllMetadata();
    return entries.filter((e) => e.syncStatus === 'error');
}

/**
 * Mark a metadata entry as synced.
 */
export async function markAsSynced(localId) {
    return updateMetadataLocal(localId, { syncStatus: 'synced' });
}

/**
 * Mark a metadata entry as having a sync error.
 */
export async function markAsError(localId, errorMessage) {
    return updateMetadataLocal(localId, {
        syncStatus: 'error',
        lastError: errorMessage,
    });
}

/**
 * Mark a metadata entry as pending sync.
 */
export async function markAsPending(localId) {
    return updateMetadataLocal(localId, { syncStatus: 'pending' });
}

// ============ SYNC QUEUE ============
// Tracks operations that couldn't be completed offline

/**
 * Add an operation to the sync queue.
 * Operations are: 'upload', 'delete', 'update'
 */
export async function addToSyncQueue(operation) {
    try {
        const queue = await getSyncQueue();
        queue.push({
            ...operation,
            queuedAt: Date.now(),
            retries: 0,
        });
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
        console.error('metadataRepository: Error adding to sync queue:', error);
    }
}

/**
 * Get all pending sync operations.
 */
export async function getSyncQueue() {
    try {
        const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('metadataRepository: Error reading sync queue:', error);
        return [];
    }
}

/**
 * Remove an operation from the sync queue.
 */
export async function removeFromSyncQueue(queuedAt) {
    try {
        const queue = await getSyncQueue();
        const filtered = queue.filter((op) => op.queuedAt !== queuedAt);
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('metadataRepository: Error removing from sync queue:', error);
    }
}

/**
 * Clear the entire sync queue.
 */
export async function clearSyncQueue() {
    try {
        await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    } catch (error) {
        console.error('metadataRepository: Error clearing sync queue:', error);
    }
}

/**
 * Increment retry count for a queue item.
 */
export async function incrementRetry(queuedAt) {
    try {
        const queue = await getSyncQueue();
        const updated = queue.map((op) => {
            if (op.queuedAt === queuedAt) {
                return { ...op, retries: (op.retries || 0) + 1 };
            }
            return op;
        });
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('metadataRepository: Error incrementing retry:', error);
    }
}

// ============ LAST SYNC TIMESTAMP ============

/**
 * Get the timestamp of the last successful sync.
 */
export async function getLastSyncTime() {
    try {
        const data = await AsyncStorage.getItem(LAST_SYNC_KEY);
        return data ? parseInt(data, 10) : 0;
    } catch (error) {
        return 0;
    }
}

/**
 * Update the last sync timestamp.
 */
export async function setLastSyncTime(timestamp) {
    try {
        await AsyncStorage.setItem(LAST_SYNC_KEY, String(timestamp || Date.now()));
    } catch (error) {
        console.error('metadataRepository: Error setting last sync time:', error);
    }
}

/**
 * Clear all cloud metadata (used during logout).
 */
export async function clearAllCloudMetadata() {
    try {
        await AsyncStorage.multiRemove([METADATA_KEY, SYNC_QUEUE_KEY, LAST_SYNC_KEY]);
    } catch (error) {
        console.error('metadataRepository: Error clearing cloud metadata:', error);
    }
}
