export const ipcChannels = {
  openFiles: 'deductions:dialog:open-files',
} as const;

export type OpenFilesResult = {
  canceled: boolean;
  filePaths: string[];
};

export type DeductionsApi = {
  appInfo: {
    platform: NodeJS.Platform;
    version: string;
  };
  openFiles: () => Promise<OpenFilesResult>;
};
