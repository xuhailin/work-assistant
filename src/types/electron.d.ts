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
    };
  }
}

export {};
