/**
 * Firebase Firestore Service
 * 
 * Handles all metadata storage using Firebase Firestore.
 * This replaces the MongoDB Data API approach.
 * 
 * Firestore is used ONLY for metadata — files are never stored here.
 * Files go to Google Drive, metadata about them goes here.
 * 
 * Collection structure:
 *   metadata/{documentId}
 *     - localId: string (matches local item id)
 *     - userId: string (Google user ID)
 *     - title: string
 *     - subject: string
 *     - subjectCode: string
 *     - type: "assignment" | "experiment"
 *     - description: string
 *     - fileId: string (Google Drive file ID)
 *     - fileName: string
 *     - fileType: string
 *     - status: string
 *     - marks: number | null
 *     - submissionDate: string | null
 *     - createdAt: number (timestamp)
 *     - updatedAt: number (timestamp)
 *     - syncStatus: "synced" | "pending" | "error"
 */

import { initializeApp, getApps } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
} from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../config/cloudConfig';

// ============ INITIALIZATION ============

let _app = null;
let _db = null;

/**
 * Initialize Firebase and return Firestore instance.
 * Safe to call multiple times — only initializes once.
 */
function getDb() {
    if (_db) return _db;

    if (getApps().length === 0) {
        _app = initializeApp(FIREBASE_CONFIG);
    } else {
        _app = getApps()[0];
    }

    _db = getFirestore(_app);
    return _db;
}

const COLLECTION_NAME = 'metadata';

// ============ CRUD OPERATIONS ============

/**
 * Insert a single metadata document.
 * Uses localId + userId as the document ID to prevent duplicates.
 */
export async function insertMetadata(metadata) {
    try {
        const db = getDb();
        const docId = `${metadata.userId}_${metadata.localId}`;
        const docRef = doc(db, COLLECTION_NAME, docId);

        await setDoc(docRef, {
            ...metadata,
            createdAt: metadata.createdAt || Date.now(),
            updatedAt: Date.now(),
        });

        return docId;
    } catch (error) {
        console.error('firestoreService: Insert error:', error);
        throw error;
    }
}

/**
 * Update a metadata document by localId and userId.
 * If it doesn't exist, it will be created (upsert).
 */
export async function updateMetadata(localId, userId, updates) {
    try {
        const db = getDb();
        const docId = `${userId}_${localId}`;
        const docRef = doc(db, COLLECTION_NAME, docId);

        await setDoc(docRef, {
            localId,
            userId,
            ...updates,
            updatedAt: Date.now(),
        }, { merge: true });

        return { modifiedCount: 1 };
    } catch (error) {
        console.error('firestoreService: Update error:', error);
        throw error;
    }
}

/**
 * Find a single metadata document by localId and userId.
 */
export async function findMetadata(localId, userId) {
    try {
        const db = getDb();
        const docId = `${userId}_${localId}`;
        const docRef = doc(db, COLLECTION_NAME, docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('firestoreService: Find error:', error);
        return null;
    }
}

/**
 * Find all metadata documents for a user.
 */
export async function findAllMetadata(userId) {
    try {
        const db = getDb();
        const q = query(
            collection(db, COLLECTION_NAME),
            where('userId', '==', userId),
            orderBy('updatedAt', 'desc'),
            limit(500)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error('firestoreService: FindAll error:', error);
        return [];
    }
}

/**
 * Find metadata documents for a specific subject.
 */
export async function findMetadataBySubject(userId, subjectCode) {
    try {
        const db = getDb();
        const q = query(
            collection(db, COLLECTION_NAME),
            where('userId', '==', userId),
            where('subjectCode', '==', subjectCode),
            orderBy('updatedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error('firestoreService: FindBySubject error:', error);
        return [];
    }
}

/**
 * Delete a metadata document by localId and userId.
 */
export async function deleteMetadata(localId, userId) {
    try {
        const db = getDb();
        const docId = `${userId}_${localId}`;
        const docRef = doc(db, COLLECTION_NAME, docId);
        await deleteDoc(docRef);
        return true;
    } catch (error) {
        console.error('firestoreService: Delete error:', error);
        return false;
    }
}

/**
 * Delete all metadata for a specific subject.
 */
export async function deleteMetadataBySubject(userId, subjectCode) {
    try {
        const db = getDb();
        const q = query(
            collection(db, COLLECTION_NAME),
            where('userId', '==', userId),
            where('subjectCode', '==', subjectCode)
        );

        const snapshot = await getDocs(q);
        let deletedCount = 0;

        for (const d of snapshot.docs) {
            await deleteDoc(d.ref);
            deletedCount++;
        }

        return deletedCount;
    } catch (error) {
        console.error('firestoreService: DeleteBySubject error:', error);
        return 0;
    }
}

/**
 * Batch upsert: push multiple metadata records to Firestore.
 * Used during sync to efficiently push pending items.
 */
export async function batchUpsertMetadata(items) {
    const results = [];

    for (const item of items) {
        try {
            const db = getDb();
            const docId = `${item.userId}_${item.localId}`;
            const docRef = doc(db, COLLECTION_NAME, docId);

            await setDoc(docRef, {
                ...item,
                updatedAt: Date.now(),
            }, { merge: true });

            results.push({ localId: item.localId, success: true });
        } catch (error) {
            results.push({ localId: item.localId, success: false, error: error.message });
        }
    }

    return results;
}

/**
 * Pull all metadata from Firestore that was updated after a given timestamp.
 * Used for conflict resolution during sync.
 */
export async function findUpdatedSince(userId, sinceTimestamp) {
    try {
        const db = getDb();
        const q = query(
            collection(db, COLLECTION_NAME),
            where('userId', '==', userId),
            where('updatedAt', '>', sinceTimestamp),
            orderBy('updatedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error('firestoreService: FindUpdatedSince error:', error);
        return [];
    }
}
