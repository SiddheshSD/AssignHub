/**
 * Google Drive Service
 * 
 * Handles all interactions with the Google Drive API.
 * Uses the drive.file scope so the app can only access files it creates.
 * All files are stored inside a dedicated "AssignHub" folder.
 */

import * as FileSystem from 'expo-file-system';
import { DRIVE_CONFIG } from '../config/cloudConfig';

const { apiBase, uploadBase, folderName } = DRIVE_CONFIG;

/**
 * Find the "AssignHub" folder in the user's Google Drive.
 * Returns the folder ID if found, null otherwise.
 */
export async function findAppFolder(accessToken) {
    try {
        const query = encodeURIComponent(
            `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
        );
        const response = await fetch(
            `${apiBase}/files?q=${query}&fields=files(id,name)`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error('driveService: Error searching folder:', err);
            return null;
        }

        const data = await response.json();
        if (data.files && data.files.length > 0) {
            return data.files[0].id;
        }
        return null;
    } catch (error) {
        console.error('driveService: Error finding folder:', error);
        return null;
    }
}

/**
 * Create the "AssignHub" folder in the user's Google Drive.
 * Returns the newly created folder ID.
 */
export async function createAppFolder(accessToken) {
    try {
        const response = await fetch(`${apiBase}/files`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Failed to create folder: ${err}`);
        }

        const data = await response.json();
        return data.id;
    } catch (error) {
        console.error('driveService: Error creating folder:', error);
        return null;
    }
}

/**
 * Ensure the AssignHub folder exists and return its ID.
 * If the folder doesn't exist, it will be created.
 */
export async function ensureAppFolder(accessToken) {
    let folderId = await findAppFolder(accessToken);
    if (!folderId) {
        folderId = await createAppFolder(accessToken);
    }
    return folderId;
}

/**
 * Upload a file to Google Drive inside the AssignHub folder.
 * 
 * @param {string} accessToken - Google OAuth access token
 * @param {string} localFileUri - Local file path to upload
 * @param {string} fileName - Desired file name in Drive
 * @param {string} mimeType - MIME type of the file
 * @param {string} folderId - Drive folder ID to upload into
 * @returns {{ fileId: string, webViewLink: string } | null}
 */
export async function uploadFile(accessToken, localFileUri, fileName, mimeType, folderId) {
    try {
        // Verify the local file exists
        const fileInfo = await FileSystem.getInfoAsync(localFileUri);
        if (!fileInfo.exists) {
            console.error('driveService: Local file not found:', localFileUri);
            return null;
        }

        // Read file as base64
        const fileContent = await FileSystem.readAsStringAsync(localFileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Create multipart request body
        const boundary = 'assignhub_boundary_' + Date.now();
        const metadata = JSON.stringify({
            name: fileName,
            parents: [folderId],
            mimeType: mimeType,
        });

        // Build multipart body
        const multipartBody =
            `--${boundary}\r\n` +
            `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
            `${metadata}\r\n` +
            `--${boundary}\r\n` +
            `Content-Type: ${mimeType}\r\n` +
            `Content-Transfer-Encoding: base64\r\n\r\n` +
            `${fileContent}\r\n` +
            `--${boundary}--`;

        const response = await fetch(
            `${uploadBase}/files?uploadType=multipart&fields=id,name,webViewLink,size`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                },
                body: multipartBody,
            }
        );

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Upload failed (${response.status}): ${err}`);
        }

        const data = await response.json();
        return {
            fileId: data.id,
            fileName: data.name,
            webViewLink: data.webViewLink || null,
            size: data.size || 0,
        };
    } catch (error) {
        console.error('driveService: Upload error:', error);
        return null;
    }
}

/**
 * Download a file from Google Drive.
 * Saves the file locally and returns the local URI.
 * 
 * @param {string} accessToken - Google OAuth access token
 * @param {string} fileId - Google Drive file ID
 * @param {string} localPath - Where to save the downloaded file
 * @returns {string | null} Local URI of the downloaded file
 */
export async function downloadFile(accessToken, fileId, localPath) {
    try {
        const downloadResult = await FileSystem.downloadAsync(
            `${apiBase}/files/${fileId}?alt=media`,
            localPath,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (downloadResult.status !== 200) {
            throw new Error(`Download failed with status ${downloadResult.status}`);
        }

        return downloadResult.uri;
    } catch (error) {
        console.error('driveService: Download error:', error);
        return null;
    }
}

/**
 * Delete a file from Google Drive.
 * 
 * @param {string} accessToken - Google OAuth access token
 * @param {string} fileId - Google Drive file ID
 * @returns {boolean} True if deleted successfully
 */
export async function deleteFileFromDrive(accessToken, fileId) {
    try {
        const response = await fetch(`${apiBase}/files/${fileId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.status === 204 || response.ok) {
            return true;
        }

        const err = await response.text();
        console.error('driveService: Delete error:', err);
        return false;
    } catch (error) {
        console.error('driveService: Delete error:', error);
        return false;
    }
}

/**
 * Get file metadata from Google Drive.
 * 
 * @param {string} accessToken
 * @param {string} fileId
 * @returns {object | null} File metadata
 */
export async function getFileInfo(accessToken, fileId) {
    try {
        const response = await fetch(
            `${apiBase}/files/${fileId}?fields=id,name,mimeType,size,webViewLink,modifiedTime`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!response.ok) {
            if (response.status === 404) {
                return null; // File deleted from Drive
            }
            throw new Error(`Failed to get file info: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('driveService: Error getting file info:', error);
        return null;
    }
}

/**
 * List all files in the AssignHub folder.
 * 
 * @param {string} accessToken
 * @param {string} folderId
 * @returns {Array} List of file metadata objects
 */
export async function listFiles(accessToken, folderId) {
    try {
        const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
        const response = await fetch(
            `${apiBase}/files?q=${query}&fields=files(id,name,mimeType,size,modifiedTime)&orderBy=modifiedTime desc&pageSize=100`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to list files: ${response.status}`);
        }

        const data = await response.json();
        return data.files || [];
    } catch (error) {
        console.error('driveService: Error listing files:', error);
        return [];
    }
}
