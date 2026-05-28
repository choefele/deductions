import type { DeductionsApi } from '../shared/ipc';

declare global {
  interface Window {
    deductions: DeductionsApi;
  }
}

export {};
