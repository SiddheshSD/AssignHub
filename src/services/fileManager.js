import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import { loadSettings, saveSettings } from './storage';

// Safely check if SAF is available (it's undefined in Expo Go)
const SAF = FileSystem.StorageAccessFramework;
const isSAFAvailable = !!(SAF && typeof SAF.requestDirectoryPermissionsAsync === 'function');

// Base directory for internal file storage (always available)
const INTERNAL_BASE_DIR = FileSystem.documentDirectory + 'AssignHUB_Files/';

/**
 * Initialize the internal storage directory.
 * Called on first use to ensure the directory exists.
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
 * Request the user to pick a folder on their phone using SAF.
 * Returns the granted directory URI, or null if cancelled or unavailable.
 */
export async function requestStorageDirectory() {
    if (!isSAFAvailable) {
        // SAF not available (Expo Go) — use internal directory instead
        Alert.alert(
            'Storage Location',
            'Files will be saved to app storage. You can use the "Share" button to export files to any location on your phone.\n\nFor full folder picker support, use a development build.',
            [{ text: 'OK' }]
        );
        return '__internal__';
    }

    try {
        const permissions = await SAF.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
            return permissions.directoryUri;
        }
        return null;
    } catch (error) {
        console.error('Error requesting directory permissions:', error);
        // Fallback to internal storage
        Alert.alert(
            'Folder Picker Unavailable',
            'Could not open folder picker. Files will be saved to app storage instead. You can share/export files using the share button.',
            [{ text: 'OK' }]
        );
        return '__internal__';
    }
}

/**
 * Get the saved storage directory URI from settings.
 * Returns null if no directory has been chosen yet.
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
 */
function generateFileName(subjectCode, itemLabel, originalName, index) {
    const ext = getExtension(originalName);
    const sanitizedSubject = sanitizeName(subjectCode);
    const sanitizedLabel = sanitizeName(itemLabel.replace(/\s+/g, '_'));
    const suffix = index > 0 ? `_${index + 1}` : '';
    return `${sanitizedSubject}_${sanitizedLabel}${suffix}${ext}`;
}

/**
 * Get a user-friendly folder name from a SAF URI or internal path.
 */
export function getFolderDisplayName(uri) {
    if (!uri) return 'Not set';
    if (uri === '__internal__') return 'App Storage (Internal)';
    try {
        // SAF URIs look like: content://com.android.externalstorage.documents/tree/primary%3ADownloads%2FAssignHUB
        const decoded = decodeURIComponent(uri);
        // Extract the path after "tree/primary:" or similar
        const match = decoded.match(/tree\/[^:]+:(.+)$/);
        if (match) {
            return match[1].replace(/\//g, ' / ');
        }
        // Fallback: try to get last meaningful segment
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
 * Save picked files to storage.
 * Uses SAF if available and chosen, otherwise uses internal app storage.
 * Returns an array of saved file info objects.
 */
export async function saveFiles(pickedFiles, subjectCode, itemLabel, existingFiles = []) {
    const settings = await loadSettings();
    const savedDirUri = settings.storageDirUri;
    const savedFiles = [];
    const startIndex = existingFiles.length;

    // Ensure the internal subject directory exists
    const subjectSubDir = sanitizeName(subjectCode);
    const internalDir = await ensureInternalDir(subjectSubDir);

    for (let i = 0; i < pickedFiles.length; i++) {
        const file = pickedFiles[i];
        try {
            const newName = generateFileName(subjectCode, itemLabel, file.name, startIndex + i);
            const fileMime = file.mimeType || getMimeFromExtension(file.name);

            // Check if source file exists in cache
            const sourceInfo = await FileSystem.getInfoAsync(file.uri);
            if (!sourceInfo.exists) {
                console.warn('Source file does not exist:', file.uri);
                continue;
            }

            // Read the file content as base64
            const fileContent = await FileSystem.readAsStringAsync(file.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            let externalUri = null;

            // Try to save to SAF directory if user has chosen one and SAF is available
            if (savedDirUri && savedDirUri !== '__internal__' && isSAFAvailable) {
                try {
                    // Create file in the user's chosen directory
                    const safFileUri = await SAF.createFileAsync(
                        savedDirUri,
                        newName,
                        fileMime
                    );
                    // Write content to the created file
                    await FileSystem.writeAsStringAsync(safFileUri, fileContent, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    externalUri = safFileUri;
                } catch (safError) {
                    console.error('Error saving to SAF directory:', safError);
                    // Continue - file will still be saved internally
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
        let location;
        if (savedDirUri && savedDirUri !== '__internal__' && isSAFAvailable) {
            location = 'phone folder and app storage';
        } else {
            location = 'app storage';
        }
        Alert.alert(
            'Files Saved',
            `${savedFiles.length} file(s) saved to ${location}.${!savedDirUri || savedDirUri === '__internal__' ? '\n\nTip: Use the share button on any file to save it to your phone\'s Downloads or any other folder.' : ''}`
        );
    }

    return savedFiles;
}

/**
 * Delete a file from internal storage.
 */
export async function deleteFile(fileUri) {
    try {
        if (!fileUri) return;
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists) {
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }
}

/**
 * Share/export a file so users can save it to any location on their phone.
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

        // Check if internal file exists
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
                console.warn('Intent launcher failed, falling back to share:', intentError);
                // Fallback to sharing if intent launcher fails
                await shareFile(fileUri, mimeType);
            }
        } else {
            // iOS: use sharing
            await shareFile(fileUri, mimeType);
        }
    } catch (error) {
        console.error('Error opening file:', error);
        // Fallback: try sharing
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

/**
 * Check if SAF (Storage Access Framework) is available.
 * Used by UI to decide what options to show.
 */
export function isStorageAccessFrameworkAvailable() {
    return isSAFAvailable;
}
