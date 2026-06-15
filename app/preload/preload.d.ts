import type { DeductionsBridgeApi } from '../shared/ipc';

declare global {
  interface Window {
    deductions: DeductionsBridgeApi;
  }
}

export {};
