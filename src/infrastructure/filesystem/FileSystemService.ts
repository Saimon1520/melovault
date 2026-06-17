import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/legacy';
import { MediaScanner } from './MediaScanner';
import type { Result } from '@/shared/types';

export class FileSystemService {
  // Permanently delete a song's file from the device. The caller is
  // responsible for confirming with the user first — this does NOT prompt.
  static async deleteSongFile(filePath: string): Promise<Result<void>> {
    try {
      // Imported songs live in the app's own sandbox; we can delete those
      // directly without going through MediaStore.
      const sandbox = FileSystem.documentDirectory;
      if (sandbox && filePath.startsWith(sandbox)) {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
        return { success: true, data: undefined };
      }

      // Shared/device audio: on scoped storage the file can only be removed
      // through MediaLibrary, which keys on the MediaStore asset id. Resolve it
      // from the path, then delete (Android shows its own consent dialog).
      const assetId = await MediaScanner.resolveAssetId(filePath);
      if (assetId) {
        const ok = await MediaLibrary.deleteAssetsAsync([assetId]);
        if (ok) return { success: true, data: undefined };
        // User declined the system consent dialog, or the OS refused.
        return { success: false, error: new Error('Deletion denied'), code: 'DELETE_DENIED' };
      }

      // Couldn't find a MediaStore asset (e.g. a file MediaLibrary doesn't
      // index) — try a direct delete as a last resort.
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to delete'),
        code: 'DELETE_FAILED',
      };
    }
  }

  // Check if a file still exists on the device
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(filePath);
      return info.exists && !info.isDirectory;
    } catch {
      return false;
    }
  }

  // Get file info (size, etc.)
  static async getFileInfo(filePath: string) {
    return FileSystem.getInfoAsync(filePath, { size: true });
  }

  // Copy a file to the app's internal storage (for imported songs)
  static async importSong(sourceUri: string, fileName: string): Promise<Result<string>> {
    try {
      const destDir = `${FileSystem.documentDirectory}music/`;
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });

      const destPath = `${destDir}${fileName}`;
      await FileSystem.copyAsync({ from: sourceUri, to: destPath });

      return { success: true, data: destPath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Import failed'),
        code: 'IMPORT_FAILED',
      };
    }
  }
}
