import { google } from 'googleapis';
import { getGoogleOAuth2Client } from './oauth';
import { decryptToken } from '@/lib/encryption';
import { AppError, ErrorCategories } from '@/lib/errors';

/**
 * Ensures that the required folder structure exists in the user's Google Drive:
 * My Drive / InboxIQ / Daily Reports
 * Returns the folder IDs.
 */
export async function setupUserDriveFolders(encryptedRefreshToken) {
  try {
    const oauth2Client = getGoogleOAuth2Client();
    const refreshToken = decryptToken(encryptedRefreshToken);

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // 1. Search or create 'InboxIQ' root folder
    let inboxiqFolderId = null;
    const rootSearch = await drive.files.list({
      q: "name = 'InboxIQ' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (rootSearch.data.files && rootSearch.data.files.length > 0) {
      inboxiqFolderId = rootSearch.data.files[0].id;
    } else {
      const createRoot = await drive.files.create({
        requestBody: {
          name: 'InboxIQ',
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      inboxiqFolderId = createRoot.data.id;
    }

    // 2. Search or create 'Daily Reports' inside 'InboxIQ' folder
    let reportsFolderId = null;
    const subSearch = await drive.files.list({
      q: `'${inboxiqFolderId}' in parents and name = 'Daily Reports' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (subSearch.data.files && subSearch.data.files.length > 0) {
      reportsFolderId = subSearch.data.files[0].id;
    } else {
      const createSub = await drive.files.create({
        requestBody: {
          name: 'Daily Reports',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [inboxiqFolderId],
        },
        fields: 'id',
      });
      reportsFolderId = createSub.data.id;
    }

    return {
      inboxiqFolderId,
      reportsFolderId,
    };
  } catch (err) {
    throw new AppError(
      ErrorCategories.DRIVE_API_ERROR,
      `Failed to setup Google Drive folder hierarchy: ${err.message}`,
      500
    );
  }
}
