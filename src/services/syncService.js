/**
 * Sync Service
 * 
 * Orchestrates background syncing between local metadata
 * and Firebase Firestore. Handles:
 * - Pushing pending local metadata to Firestore
 * - Processing the sync queue (offline operations)
 * - Conflict resolution via updatedAt timestamps
 * - Retry logic for failed operations
 * 
 * This service does NOT run automatically. It must be triggered by:
 * - The network monitor (when connectivity is restored)
 * - Manual sync button in the UI
 * - After a successful file upload
 */

import { isOnline } from './networkMonitor';
import * as metadataRepo from './metadataRepository';
import * as firestoreService from './firestoreService';
import { SYNC_CONFIG } from '../config/cloudConfig';

let _isSyncing = false;
let _syncListeners = [];

/**
 * Register a listener for sync status changes.
 * Callback receives: { syncing: boolean, lastSync: number, pendingCount: number }
 */
export function onSyncStatusChange(callback) {
    _syncListeners.push(callback);
    return () => {
        _syncListeners = _syncListeners.filter((fn) => fn !== callback);
    };
}

/**
 * Notify all listeners of sync status change.
 */
async function notifyListeners() {
    const pendingItems = await metadataRepo.getPendingMetadata();
    const lastSync = await metadataRepo.getLastSyncTime();
    const status = {
        syncing: _isSyncing,
        lastSync,
        pendingCount: pendingItems.length,
    };
    _syncListeners.forEach((fn) => {
        try { fn(status); } catch (e) { console.error('SyncService listener error:', e); }
    });
}

/**
 * Main sync function. Pushes all pending local metadata to Firestore.
 * 
 * @param {string} userId - Google user ID
 * @param {string} accessToken - Google OAuth access token (for Drive operations if needed)
 * @returns {{ pushed: number, errors: number }}
 */
export async function syncPendingMetadata(userId, accessToken) {
    if (_isSyncing) {
        console.log('syncService: Sync already in progress, skipping.');
        return { pushed: 0, errors: 0 };
    }

    if (!isOnline()) {
        console.log('syncService: Offline, skipping sync.');
        return { pushed: 0, errors: 0 };
    }

    _isSyncing = true;
    await notifyListeners();

    let pushed = 0;
    let errors = 0;

    try {
        // 1. Get all pending metadata
        const pendingItems = await metadataRepo.getPendingMetadata();
        if (pendingItems.length === 0) {
            console.log('syncService: No pending items to sync.');
            _isSyncing = false;
            await metadataRepo.setLastSyncTime(Date.now());
            await notifyListeners();
            return { pushed: 0, errors: 0 };
        }

        console.log(`syncService: Syncing ${pendingItems.length} pending items...`);

        // 2. Process in batches
        const batchSize = SYNC_CONFIG.batchSize || 10;
        for (let i = 0; i < pendingItems.length; i += batchSize) {
            const batch = pendingItems.slice(i, i + batchSize);

            // Add userId to each item
            const itemsWithUser = batch.map((item) => ({
                ...item,
                userId,
                syncStatus: 'synced',
            }));

            // 3. Push to Firestore
            const results = await firestoreService.batchUpsertMetadata(itemsWithUser);

            // 4. Update local sync status
            for (const result of results) {
                if (result.success) {
                    await metadataRepo.markAsSynced(result.localId);
                    pushed++;
                } else {
                    await metadataRepo.markAsError(result.localId, result.error);
                    errors++;
                }
            }
        }

        // 5. Update last sync time
        await metadataRepo.setLastSyncTime(Date.now());

        console.log(`syncService: Sync complete. Pushed: ${pushed}, Errors: ${errors}`);
    } catch (error) {
        console.error('syncService: Sync error:', error);
        errors++;
    } finally {
        _isSyncing = false;
        await notifyListeners();
    }

    return { pushed, errors };
}

/**
 * Process the offline sync queue.
 * Handles operations that were queued while offline.
 * 
 * @param {string} userId
 * @param {string} accessToken
 */
export async function processSyncQueue(userId, accessToken) {
    if (!isOnline()) return;

    const queue = await metadataRepo.getSyncQueue();
    if (queue.length === 0) return;

    console.log(`syncService: Processing ${queue.length} queued operations...`);

    for (const op of queue) {
        // Skip items that have exceeded max retries
        if (op.retries >= (SYNC_CONFIG.maxRetries || 5)) {
            console.warn(`syncService: Max retries exceeded for operation:`, op);
            await metadataRepo.removeFromSyncQueue(op.queuedAt);
            continue;
        }

        try {
            switch (op.type) {
                case 'upsert':
                    await firestoreService.updateMetadata(op.localId, userId, op.data);
                    await metadataRepo.markAsSynced(op.localId);
                    break;

                case 'delete':
                    await firestoreService.deleteMetadata(op.localId, userId);
                    break;

                default:
                    console.warn(`syncService: Unknown operation type: ${op.type}`);
            }

            // Success — remove from queue
            await metadataRepo.removeFromSyncQueue(op.queuedAt);
        } catch (error) {
            console.error(`syncService: Queue operation failed:`, error);
            await metadataRepo.incrementRetry(op.queuedAt);
        }
    }
}

/**
 * Full sync: push pending + process queue + pull remote changes.
 * 
 * @param {string} userId
 * @param {string} accessToken
 */
export async function fullSync(userId, accessToken) {
    if (!userId || !accessToken) return { pushed: 0, errors: 0 };

    // 1. Push pending metadata
    const result = await syncPendingMetadata(userId, accessToken);

    // 2. Process queued operations
    await processSyncQueue(userId, accessToken);

    // 3. Pull remote changes (conflict resolution)
    await pullRemoteChanges(userId);

    return result;
}

/**
 * Pull metadata from Firestore that may have been updated
 * on another device. Uses timestamp-based conflict resolution.
 * 
 * @param {string} userId
 */
async function pullRemoteChanges(userId) {
    try {
        const lastSync = await metadataRepo.getLastSyncTime();
        const remoteItems = await firestoreService.findUpdatedSince(userId, lastSync);

        if (remoteItems.length === 0) return;

        console.log(`syncService: Found ${remoteItems.length} remote changes to merge.`);

        for (const remoteItem of remoteItems) {
            const localItem = await metadataRepo.findMetadataLocal(remoteItem.localId);

            if (!localItem) {
                // New item from remote — add locally
                await metadataRepo.createMetadata({
                    ...remoteItem,
                    syncStatus: 'synced',
                });
            } else if (remoteItem.updatedAt > localItem.updatedAt) {
                // Remote is newer — update local
                await metadataRepo.updateMetadataLocal(remoteItem.localId, {
                    ...remoteItem,
                    syncStatus: 'synced',
                });
            }
            // If local is newer, it will be pushed on next sync
        }
    } catch (error) {
        console.error('syncService: Error pulling remote changes:', error);
    }
}

/**
 * Check if a sync is currently in progress.
 */
export function isSyncing() {
    return _isSyncing;
}

/**
 * Get current sync status summary.
 */
export async function getSyncStatus() {
    const pendingItems = await metadataRepo.getPendingMetadata();
    const errorItems = await metadataRepo.getErrorMetadata();
    const queue = await metadataRepo.getSyncQueue();
    const lastSync = await metadataRepo.getLastSyncTime();

    return {
        syncing: _isSyncing,
        pendingCount: pendingItems.length,
        errorCount: errorItems.length,
        queueCount: queue.length,
        lastSync,
    };
}

/**
 * Retry all items with sync errors.
 * Resets their syncStatus to "pending" so they'll be retried.
 */
export async function retryErrors() {
    const errorItems = await metadataRepo.getErrorMetadata();
    for (const item of errorItems) {
        await metadataRepo.markAsPending(item.localId);
    }
}
