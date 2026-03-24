export interface IElectronAPI {
  selectFiles: () => Promise<string[] | null>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
