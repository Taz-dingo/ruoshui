interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
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
  __ruoshuiViewCapture?: {
    latest: () => unknown;
    clear: () => void;
    captureCurrent: () => Promise<unknown>;
    capturePresets: () => Promise<unknown>;
    captureSweep: () => Promise<unknown>;
    downloadJson: () => void;
  };
}
