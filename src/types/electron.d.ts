declare global {
  interface Window {
    api: {
      openFile: () => Promise<string | null>;
      openFolder: () => Promise<string | null>;
      getGitLogs: (path: string, page: number, pageSize: number) => Promise<any[]>;
      getMultipleLogs: (paths: string[], pageSize: number) => Promise<any[]>;
      copyText: (text: string) => void;
      getFavorites: () => Promise<any[]>;
      saveFavorites: (favorites: any[]) => Promise<boolean>;
      getCalendarMarks: () => Promise<Record<string, boolean>>;
      saveCalendarMarks: (marks: Record<string, boolean>) => Promise<boolean>;
      getRunningData: () => Promise<any[]>;
      saveRunningData: (records: any[]) => Promise<{ backupPath?: string }>;
      analyzeRunningImage: (payload: { imageBase64: string }) => Promise<{ records: any[]; rawText: string }>;
    };
  }
}

export {};
