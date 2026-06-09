import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/legacy';
import { Alert } from 'react-native';
import type { Result } from '@/shared/types';

export class FileSystemService {
  // Delete a song file from the device permanently
  static async deleteSongFile(filePath: string, title: string): Promise<Result<void>> {
    return new Promise((resolve) => {
      Alert.alert(
        'Eliminar canción',
        `¿Estás seguro de que deseas eliminar "${title}" del dispositivo?\n\nEsta acción no se puede deshacer.`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => resolve({ success: false, error: new Error('Cancelled'), code: 'CANCELLED' }),
          },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                const info = await FileSystem.getInfoAsync(filePath);
                if (!info.exists) {
                  resolve({ success: false, error: new Error('File not found'), code: 'NOT_FOUND' });
                  return;
                }

                // Try via MediaLibrary first (proper Android integration)
                try {
                  const asset = await MediaLibrary.getAssetInfoAsync(filePath);
                  if (asset) {
                    await MediaLibrary.deleteAssetsAsync([asset]);
                    resolve({ success: true, data: undefined });
                    return;
                  }
                } catch {
                  // Fall back to direct file deletion
                }

                await FileSystem.deleteAsync(filePath, { idempotent: true });
                resolve({ success: true, data: undefined });
              } catch (error) {
                resolve({
                  success: false,
                  error: error instanceof Error ? error : new Error('Failed to delete'),
                  code: 'DELETE_FAILED',
                });
              }
            },
          },
        ],
        { cancelable: true },
      );
    });
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
