export interface IElectronAPI {
  selectFiles: () => Promise<string[] | null>;
  selectDirectory: () => Promise<string | null>;
  saveFile: (path: string, base64Data: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
