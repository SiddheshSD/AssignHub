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

// Maximum file size: 250 MB
const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = '250 MB';

// Files above this size will skip SAF base64 copy (to avoid OutOfMemoryError)
const SAF_BASE64_LIMIT = 80 * 1024 * 1024; // 80 MB

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
 * Sanitize a name for use in file/folder names.
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
 * Generate folder name for a subject: SubjectName_SubjectCode
 * e.g. Maths_CSC401
 */
export function generateSubjectFolderName(subjectName, subjectCode) {
    return sanitizeName(subjectName) + '_' + sanitizeName(subjectCode);
}

/**
 * Generate a proper filename: Assignment_1_Maths.pdf, Experiment_2_Maths.pdf
 */
function generateFileName(subjectName, itemLabel, originalName, index) {
    const ext = getExtension(originalName);
    // itemLabel = "Assignment 1" → "Assignment_1"
    const sanitizedLabel = sanitizeName(itemLabel.replace(/\s+/g, '_'));
    const sanitizedName = sanitizeName(subjectName);
    const suffix = index > 0 ? `_${index + 1}` : '';
    return `${sanitizedLabel}_${sanitizedName}${suffix}${ext}`;
}

/**
 * Get a user-friendly folder name from a SAF URI.
 */
export function getFolderDisplayName(uri) {
    if (!uri) return 'Not set';
    try {
        const decoded = decodeURIComponent(uri);
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
 * Try to get or create a subject subfolder inside a SAF directory.
 * Returns the SAF URI of the subfolder, or the parent URI as fallback.
 */
async function getOrCreateSAFSubFolder(parentDirUri, folderName) {
    // First try to find existing folder
    try {
        const contents = await StorageAccessFramework.readDirectoryAsync(parentDirUri);
        for (const itemUri of contents) {
            const decoded = decodeURIComponent(itemUri);
            if (decoded.endsWith(folderName) || decoded.endsWith(encodeURIComponent(folderName))) {
                return itemUri;
            }
        }
    } catch (e) {
        // Can't read directory, try creating
    }

    // Create new subfolder
    try {
        const subDirUri = await StorageAccessFramework.makeDirectoryAsync(parentDirUri, folderName);
        return subDirUri;
    } catch (error) {
        console.warn('Could not create subfolder, using root folder:', error);
        return parentDirUri;
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

        const assets = result.assets || [];

        // Check file sizes
        const validFiles = [];
        const oversizedFiles = [];

        for (const file of assets) {
            const fileSize = file.size || 0;
            if (fileSize > MAX_FILE_SIZE_BYTES) {
                oversizedFiles.push(file.name);
            } else {
                validFiles.push(file);
            }
        }

        if (oversizedFiles.length > 0) {
            Alert.alert(
                'File Too Large',
                `The following file(s) exceed the ${MAX_FILE_SIZE_LABEL} limit and were skipped:\n\n${oversizedFiles.join('\n')}\n\nPlease select smaller files.`
            );
        }

        return validFiles;
    } catch (error) {
        console.error('Error picking documents:', error);
        Alert.alert('Error', 'Failed to pick documents. Please try again.');
        return [];
    }
}

/**
 * Save picked files to storage.
 * - Creates a subject folder: SubjectName_SubjectCode
 * - Auto-renames files: Assignment_1_Maths.pdf, Experiment_2_Maths.pdf
 * - Saves to both internal storage AND the user's chosen phone folder (SAF)
 * - Uses copyAsync for internal (avoids OutOfMemoryError on large files)
 */
export async function saveFiles(pickedFiles, subjectCode, subjectName, itemLabel, existingFiles = []) {
    const settings = await loadSettings();
    const savedDirUri = settings.storageDirUri;
    const savedFiles = [];
    const startIndex = existingFiles.length;

    // Create internal subject folder: Maths_CSC401/
    const folderName = generateSubjectFolderName(subjectName, subjectCode);
    const internalDir = await ensureInternalDir(folderName);

    // Get or create SAF subject subfolder (if SAF is configured)
    let safSubFolderUri = null;
    if (savedDirUri) {
        safSubFolderUri = await getOrCreateSAFSubFolder(savedDirUri, folderName);
    }

    for (let i = 0; i < pickedFiles.length; i++) {
        const file = pickedFiles[i];
        try {
            // Generate auto-name: Assignment_1_Maths.pdf
            const newName = generateFileName(subjectName, itemLabel, file.name, startIndex + i);
            const fileMime = file.mimeType || getMimeFromExtension(file.name);

            // Check source file
            const sourceInfo = await FileSystem.getInfoAsync(file.uri);
            if (!sourceInfo.exists) {
                console.warn('Source file not found:', file.uri);
                continue;
            }

            const fileSize = file.size || sourceInfo.size || 0;

            // Double-check file size
            if (fileSize > MAX_FILE_SIZE_BYTES) {
                Alert.alert('File Too Large', `"${file.name}" exceeds ${MAX_FILE_SIZE_LABEL}. Skipped.`);
                continue;
            }

            // ---- INTERNAL COPY (using copyAsync, no memory issues) ----
            const internalUri = internalDir + newName;
            try {
                // Delete existing file at this path if any
                const existingInfo = await FileSystem.getInfoAsync(internalUri);
                if (existingInfo.exists) {
                    await FileSystem.deleteAsync(internalUri, { idempotent: true });
                }
                await FileSystem.copyAsync({ from: file.uri, to: internalUri });
            } catch (copyError) {
                console.error('Internal copy failed, trying base64 fallback:', copyError);
                // Fallback to base64 read+write for smaller files
                if (fileSize < SAF_BASE64_LIMIT) {
                    const content = await FileSystem.readAsStringAsync(file.uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    await FileSystem.writeAsStringAsync(internalUri, content, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                } else {
                    throw copyError;
                }
            }

            let externalUri = null;

            // ---- SAF COPY (to user's phone folder) ----
            if (safSubFolderUri) {
                try {
                    if (fileSize <= SAF_BASE64_LIMIT) {
                        // For files ≤ 80MB: use base64 read+write (reliable with SAF)
                        const fileContent = await FileSystem.readAsStringAsync(internalUri, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                        const safFileUri = await StorageAccessFramework.createFileAsync(
                            safSubFolderUri,
                            newName,
                            fileMime
                        );
                        await FileSystem.writeAsStringAsync(safFileUri, fileContent, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                        externalUri = safFileUri;
                    } else {
                        // For large files (> 80MB): skip SAF to avoid OutOfMemoryError
                        console.warn(`File "${file.name}" (${formatFileSize(fileSize)}) is too large for SAF copy, saving internally only.`);
                    }
                } catch (safError) {
                    const errorMsg = safError?.message || String(safError);
                    if (errorMsg.includes('OutOfMemory') || errorMsg.includes('out of memory')) {
                        console.error('OutOfMemoryError during SAF save:', safError);
                        // File is still saved internally, just warn
                    } else {
                        console.error('SAF save error:', safError);
                    }
                }
            }

            savedFiles.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
                name: newName,
                originalName: file.name,
                uri: internalUri,
                externalUri: externalUri,
                mimeType: fileMime,
                size: fileSize,
                addedAt: Date.now(),
            });
        } catch (error) {
            console.error('Error saving file:', file.name, error);
            const errorMsg = error?.message || String(error);
            if (errorMsg.includes('OutOfMemory') || errorMsg.includes('out of memory')) {
                Alert.alert(
                    'File Too Large',
                    `"${file.name}" could not be saved — the file is too large to process. Try a smaller file (under 80 MB works best).`
                );
            } else {
                Alert.alert('Error', `Failed to save "${file.name}". ${errorMsg}`);
            }
        }
    }

    if (savedFiles.length > 0) {
        const location = savedDirUri ? `"${folderName}" in your phone folder` : 'app storage only';
        const largeSaveNote = savedFiles.some(f => f.size > SAF_BASE64_LIMIT && !f.externalUri && savedDirUri)
            ? '\n\nNote: Some large files were only saved internally due to size limits.'
            : '';
        Alert.alert(
            'Files Saved',
            `${savedFiles.length} file(s) saved to ${location}.${!savedDirUri ? '\n\nTip: Go to Settings → File Storage to choose a folder on your phone.' : ''}${largeSaveNote}`
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
        console.warn('Could not delete external file:', error);
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
                    flags: 1,
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
export async function deleteSubjectFiles(subjectName, subjectCode) {
    try {
        const folderName = generateSubjectFolderName(subjectName, subjectCode);
        const subjectDir = INTERNAL_BASE_DIR + folderName + '/';
        const info = await FileSystem.getInfoAsync(subjectDir);
        if (info.exists) {
            await FileSystem.deleteAsync(subjectDir, { idempotent: true });
        }
    } catch (error) {
        console.error('Error deleting subject files:', error);
    }
}
