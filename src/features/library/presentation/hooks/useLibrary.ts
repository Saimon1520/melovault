import { useEffect } from 'react';
import { useLibraryStore } from '../../store/libraryStore';
import { ScanLibraryUseCase } from '../../domain/usecases/ScanLibraryUseCase';

const scanUseCase = new ScanLibraryUseCase();

export function useLibraryScan() {
  const { isScanning, scanProgress, setIsScanning, setScanProgress } = useLibraryStore();

  const startScan = async () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanProgress({ scanned: 0, total: 0, currentFile: '' });

    const result = await scanUseCase.execute((progress) => {
      setScanProgress(progress);
    });

    setIsScanning(false);
    setScanProgress(null);

    return result;
  };

  return { isScanning, scanProgress, startScan };
}
