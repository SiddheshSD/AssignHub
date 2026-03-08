// IMPORTANT: Use legacy import — SDK 54 moved SAF + legacy methods here
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { loadSettings } from './storage';

// Base directory for internal file storage (always available)
const INTERNAL_BASE_DIR = FileSystem.documentDirectory + 'AssignHUB_Files/';

/**
 * Ensure the internal storage directory exists.
 */
async function ensureInternalDir(subDir = '') {
    const dir = INTERNAL_BASE_DIR + (subDir ? subDir + '/' : '');
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
}

/**
 * Request the user to pick a folder on their phone using SAF (Android).
 * Opens the system folder picker. Returns the granted directory URI, or null if cancelled.
 */
export async function requestStorageDirectory() {
    try {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
            return permissions.directoryUri;
        }
        return null;
    } catch (error) {
        console.error('Error requesting directory permissions:', error);
        Alert.alert('Error', 'Failed to open folder picker. Please try again.');
        return null;
    }
}

/**
 * Get the saved storage directory URI from settings.
 */
export async function getSavedDirectoryUri() {
    const settings = await loadSettings();
    return settings.storageDirUri || null;
}

/**
 * Sanitize a name for use in file names.
 */
function sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Get the file extension from a filename.
 */
function getExtension(fileName) {
    const parts = fileName.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get MIME type from extension, or fallback.
 */
function getMimeFromExtension(fileName) {
    const ext = getExtension(fileName).toLowerCase();
    const mimeMap = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.txt': 'text/plain',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.mp3': 'audio/mpeg',
        '.zip': 'application/zip',
        '.rar': 'application/x-rar-compressed',
        '.csv': 'text/csv',
    };
    return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Generate a proper filename based on subject and item info.
 * Format: SUBJECTCODE_Assignment_1.pdf or SUBJECTCODE_Experiment_2.docx
 */
function generateFileName(subjectCode, itemLabel, originalName, index) {
    const ext = getExtension(originalName);
    const sanitizedSubject = sanitizeName(subjectCode);
    const sanitizedLabel = sanitizeName(itemLabel.replace(/\s+/g, '_'));
    const suffix = index > 0 ? `_${index + 1}` : '';
    return `${sanitizedSubject}_${sanitizedLabel}${suffix}${ext}`;
}

/**
 * Get a user-friendly folder name from a SAF URI.
 */
export function getFolderDisplayName(uri) {
    if (!uri) return 'Not set';
    try {
        const decoded = decodeURIComponent(uri);
        // SAF URIs: content://com.android.externalstorage.documents/tree/primary%3ADownloads%2FAssignHUB
        const match = decoded.match(/tree\/[^:]+:(.+)$/);
        if (match) {
            return match[1].replace(/\//g, ' / ');
        }
        const parts = decoded.split('/');
        return parts[parts.length - 1] || 'Selected Folder';
    } catch {
        return 'Selected Folder';
    }
}

/**
 * Pick documents using the document picker.
 * Returns an array of { uri, name, mimeType, size } objects.
 */
export async function pickDocuments() {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
            multiple: true,
        });

        if (result.canceled) {
            return [];
        }

        return result.assets || [];
    } catch (error) {
        console.error('Error picking documents:', error);
        Alert.alert('Error', 'Failed to pick documents. Please try again.');
        return [];
    }
}

/**
 * Save picked files to the user's chosen SAF directory AND internal app storage.
 * - Always saves an internal copy so the app can reliably open files.
 * - If a SAF folder is chosen in Settings, also saves there (visible in file manager).
 * - Auto-renames files: SUBJECTCODE_Assignment_1.pdf, etc.
 */
export async function saveFiles(pickedFiles, subjectCode, itemLabel, existingFiles = []) {
    const settings = await loadSettings();
    const savedDirUri = settings.storageDirUri;
    const savedFiles = [];
    const startIndex = existingFiles.length;

    // Ensure internal subject directory exists
    const subjectSubDir = sanitizeName(subjectCode);
    const internalDir = await ensureInternalDir(subjectSubDir);

    for (let i = 0; i < pickedFiles.length; i++) {
        const file = pickedFiles[i];
        try {
            const newName = generateFileName(subjectCode, itemLabel, file.name, startIndex + i);
            const fileMime = file.mimeType || getMimeFromExtension(file.name);

            // Check source file
            const sourceInfo = await FileSystem.getInfoAsync(file.uri);
            if (!sourceInfo.exists) {
                console.warn('Source file not found:', file.uri);
                continue;
            }

            // Read file content as base64
            const fileContent = await FileSystem.readAsStringAsync(file.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            let externalUri = null;

            // Save to SAF directory (user's phone folder) if configured
            if (savedDirUri) {
                try {
                    const safFileUri = await StorageAccessFramework.createFileAsync(
                        savedDirUri,
                        newName,
                        fileMime
                    );
                    await FileSystem.writeAsStringAsync(safFileUri, fileContent, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    externalUri = safFileUri;
                } catch (safError) {
                    console.error('SAF save error:', safError);
                    // File still saved internally below
                }
            }

            // Always save internal copy (reliable for opening)
            const internalUri = internalDir + newName;
            await FileSystem.writeAsStringAsync(internalUri, fileContent, {
                encoding: FileSystem.EncodingType.Base64,
            });

            savedFiles.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
                name: newName,
                originalName: file.name,
                uri: internalUri,
                externalUri: externalUri,
                mimeType: fileMime,
                size: file.size || sourceInfo.size || 0,
                addedAt: Date.now(),
            });
        } catch (error) {
            console.error('Error saving file:', file.name, error);
            Alert.alert('Error', `Failed to save "${file.name}". ${error.message || ''}`);
        }
    }

    if (savedFiles.length > 0) {
        const location = savedDirUri ? 'your phone folder and app storage' : 'app storage only';
        Alert.alert(
            'Files Saved',
            `${savedFiles.length} file(s) saved to ${location}.${!savedDirUri ? '\n\nTip: Go to Settings → File Storage to choose a folder on your phone.' : ''}`
        );
    }

    return savedFiles;
}

/**
 * Delete a file from internal storage AND the external SAF folder if present.
 */
export async function deleteFile(fileUri, externalUri) {
    // Delete internal copy
    try {
        if (fileUri) {
            const info = await FileSystem.getInfoAsync(fileUri);
            if (info.exists) {
                await FileSystem.deleteAsync(fileUri, { idempotent: true });
            }
        }
    } catch (error) {
        console.error('Error deleting internal file:', error);
    }

    // Delete external SAF copy
    try {
        if (externalUri) {
            await StorageAccessFramework.deleteAsync(externalUri, { idempotent: true });
        }
    } catch (error) {
        // SAF deletion can fail if permission was revoked or file was already deleted
        console.warn('Could not delete external file (may have been removed already):', error);
    }
}

/**
 * Share/export a file using the system share sheet.
 */
export async function shareFile(fileUri, mimeType) {
    try {
        if (!fileUri) {
            Alert.alert('Error', 'No file path available.');
            return;
        }

        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists) {
            Alert.alert('File Not Found', 'The file could not be found.');
            return;
        }

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(fileUri, {
                mimeType: mimeType || 'application/octet-stream',
                dialogTitle: 'Save or Share File',
            });
        } else {
            Alert.alert('Error', 'Sharing is not available on this device.');
        }
    } catch (error) {
        console.error('Error sharing file:', error);
        Alert.alert('Error', 'Failed to share the file.');
    }
}

/**
 * Open a file using the system's default viewer.
 */
export async function openFile(fileUri, mimeType) {
    try {
        if (!fileUri) {
            Alert.alert('Error', 'No file path available.');
            return;
        }

        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists) {
            Alert.alert('File Not Found', 'The file could not be found. It may have been moved or deleted.');
            return;
        }

        if (Platform.OS === 'android') {
            try {
                const contentUri = await FileSystem.getContentUriAsync(fileUri);
                await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                    data: contentUri,
                    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                    type: mimeType || '*/*',
                });
            } catch (intentError) {
                console.warn('Intent launcher failed, trying share:', intentError);
                await shareFile(fileUri, mimeType);
            }
        } else {
            await shareFile(fileUri, mimeType);
        }
    } catch (error) {
        console.error('Error opening file:', error);
        try {
            await shareFile(fileUri, mimeType);
        } catch (shareError) {
            Alert.alert('Error', 'Unable to open this file.');
        }
    }
}

/**
 * Get a human-readable file size.
 */
export function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get icon name for a file type
 */
export function getFileIcon(mimeType) {
    if (!mimeType) return 'file-outline';
    if (mimeType.startsWith('image/')) return 'file-image-outline';
    if (mimeType === 'application/pdf') return 'file-pdf-box';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word-outline';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'file-excel-outline';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'file-powerpoint-outline';
    if (mimeType.startsWith('text/')) return 'file-document-outline';
    if (mimeType.startsWith('video/')) return 'file-video-outline';
    if (mimeType.startsWith('audio/')) return 'file-music-outline';
    if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive')) return 'folder-zip-outline';
    return 'file-outline';
}

/**
 * Get color for a file type icon.
 */
export function getFileColor(mimeType) {
    if (!mimeType) return '#9E9E9E';
    if (mimeType.startsWith('image/')) return '#4CAF50';
    if (mimeType === 'application/pdf') return '#F44336';
    if (mimeType.includes('word') || mimeType.includes('document')) return '#2196F3';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '#4CAF50';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '#FF9800';
    if (mimeType.startsWith('text/')) return '#607D8B';
    if (mimeType.startsWith('video/')) return '#9C27B0';
    if (mimeType.startsWith('audio/')) return '#E91E63';
    return '#9E9E9E';
}

/**
 * Delete all internal files for a specific subject.
 */
export async function deleteSubjectFiles(subjectCode) {
    try {
        const subjectDir = INTERNAL_BASE_DIR + sanitizeName(subjectCode) + '/';
        const info = await FileSystem.getInfoAsync(subjectDir);
        if (info.exists) {
            await FileSystem.deleteAsync(subjectDir, { idempotent: true });
        }
    } catch (error) {
        console.error('Error deleting subject files:', error);
    }
}
