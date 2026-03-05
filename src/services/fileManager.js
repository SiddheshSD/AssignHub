import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { loadSettings } from './storage';

/**
 * Get the base storage directory for AssignHUB files.
 */
export async function getStorageDir() {
    const settings = await loadSettings();
    const folderName = settings.storageFolder || 'AssignHUB_Files';
    const baseDir = FileSystem.documentDirectory + folderName + '/';

    const info = await FileSystem.getInfoAsync(baseDir);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
    }
    return baseDir;
}

/**
 * Get a subject-specific folder.
 */
async function getSubjectDir(subjectCode) {
    const baseDir = await getStorageDir();
    const subjectDir = baseDir + sanitizeName(subjectCode) + '/';

    const info = await FileSystem.getInfoAsync(subjectDir);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(subjectDir, { intermediates: true });
    }
    return subjectDir;
}

/**
 * Sanitize a name for use in file paths.
 */
function sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Get the file extension from a filename or URI.
 */
function getExtension(fileName) {
    const parts = fileName.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1].toLowerCase() : '';
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
 * Save picked files to the app's storage directory.
 * Returns an array of saved file info objects.
 */
export async function saveFiles(pickedFiles, subjectCode, itemLabel, existingFiles = []) {
    const subjectDir = await getSubjectDir(subjectCode);
    const savedFiles = [];
    const startIndex = existingFiles.length;

    for (let i = 0; i < pickedFiles.length; i++) {
        const file = pickedFiles[i];
        try {
            const newName = generateFileName(subjectCode, itemLabel, file.name, startIndex + i);
            const destUri = subjectDir + newName;

            // Check if the source file exists
            const sourceInfo = await FileSystem.getInfoAsync(file.uri);
            if (!sourceInfo.exists) {
                console.warn('Source file does not exist:', file.uri);
                continue;
            }

            await FileSystem.copyAsync({
                from: file.uri,
                to: destUri,
            });

            savedFiles.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
                name: newName,
                originalName: file.name,
                uri: destUri,
                mimeType: file.mimeType || 'application/octet-stream',
                size: file.size || 0,
                addedAt: Date.now(),
            });
        } catch (error) {
            console.error('Error saving file:', error);
        }
    }

    return savedFiles;
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(fileUri) {
    try {
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists) {
            await FileSystem.deleteAsync(fileUri);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }
}

/**
 * Open a file using the system's default viewer.
 */
export async function openFile(fileUri, mimeType) {
    try {
        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists) {
            Alert.alert('File Not Found', 'The file could not be found. It may have been moved or deleted.');
            return;
        }

        if (Platform.OS === 'android') {
            // On Android, use the content URI approach
            const contentUri = await FileSystem.getContentUriAsync(fileUri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: contentUri,
                flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                type: mimeType || '*/*',
            });
        } else {
            // On iOS, use sharing
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: mimeType || 'application/octet-stream',
                    UTI: mimeType || 'public.data',
                });
            } else {
                Alert.alert('Error', 'Sharing is not available on this device.');
            }
        }
    } catch (error) {
        console.error('Error opening file:', error);
        // Fallback to sharing
        try {
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(fileUri);
            }
        } catch (shareError) {
            Alert.alert('Error', 'Unable to open this file. No app is available to handle this file type.');
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
 * Delete all files for a specific subject.
 */
export async function deleteSubjectFiles(subjectCode) {
    try {
        const baseDir = await getStorageDir();
        const subjectDir = baseDir + sanitizeName(subjectCode) + '/';
        const info = await FileSystem.getInfoAsync(subjectDir);
        if (info.exists) {
            await FileSystem.deleteAsync(subjectDir, { idempotent: true });
        }
    } catch (error) {
        console.error('Error deleting subject files:', error);
    }
}
