interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __ruoshuiInitialData?: import('./types').ViewerContent;
  __ruoshuiPerf?: {
    latest: () => unknown;
    history: () => unknown;
    copySummary: () => Promise<void>;
    copyJson: () => Promise<void>;
    clearHistory: () => void;
    variants: () => Array<{ id: string; name: string }>;
    routes: () => Array<{ id: string; name: string }>;
    runVariantRoute: (options?: any) => Promise<any>;
    waitForIdle: () => Promise<any>;
  };
}
