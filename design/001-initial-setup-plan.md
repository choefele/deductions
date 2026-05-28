# Deductions Initial Setup Plan

## Scope

Set up an empty Electron desktop app named **Deductions** with a local development workflow and a minimal UI that exercises the selected toolchain.

This plan intentionally does **not** include storage, routing, invoice workflows, OCR, import/export logic, authentication, sync, or tax-specific features.

## Target Toolchain

- Electron
- Electron Forge
- Vite
- TypeScript
- React
- ESM modules
- Strict preload IPC
- Native Electron menus and dialogs
- Vitest
- Playwright for Electron smoke/e2e testing

## Confirmed Decisions

1. Initialize the project directly in `/Users/choefele/Projects/deductions`.
2. Use package name `deductions` and displayed app name **Deductions**.
3. Use a native open-file dialog with multiple file selection enabled.
4. Keep Playwright behind `npm run test:e2e`; do not include it in default `npm test`.
5. Store design documents and plans in the `design/` directory with numeric prefixes.

## Goals

1. Create a clean Electron Forge project using the Vite + TypeScript template.
2. Add React as the renderer framework.
3. Use ESM consistently for project source and configuration where supported by the toolchain.
4. Keep the main process, preload script, and renderer clearly separated.
5. Expose only a narrow typed preload API to the renderer.
6. Add native menu and dialog usage to prove OS integration works.
7. Add basic unit and Electron smoke tests.
8. Provide development, test, build, and packaging scripts.

## Non-Goals

- No database or persistence layer.
- No routing library.
- No UI component library.
- No state management library.
- No invoice ingestion or tax declaration features.
- No OCR or PDF parsing.
- No auto-updater.
- No code signing or notarization setup yet.
- No installer branding beyond the default generated package metadata.

## Proposed Project Setup

Initialize the project in the existing workspace:

```bash
npx create-electron-app@latest . --template=vite-typescript
```

If the scaffold tool does not support `.` cleanly, run the scaffold in a temporary location and copy the generated project files into `/Users/choefele/Projects/deductions` without creating a nested app directory.

After scaffolding, add React and the Vite React plugin:

```bash
npm install react react-dom
npm install --save-dev @vitejs/plugin-react @types/react @types/react-dom
```

Then update the renderer Vite configuration to use React.

Set the package metadata to use ESM:

```json
{
  "name": "deductions",
  "productName": "Deductions",
  "type": "module"
}
```

Use ESM syntax in source and configuration files wherever supported.

## Proposed File Structure

Expected structure after setup:

```text
deductions/
  package.json
  forge.config.ts
  tsconfig.json
  vite.main.config.ts
  vite.preload.config.ts
  vite.renderer.config.ts
  design/
    001-initial-setup-plan.md
  src/
    main.ts
    preload.ts
    renderer.tsx
    App.tsx
    styles.css
    types/
      preload.d.ts
  tests/
    unit/
      app.test.ts
    e2e/
      electron-smoke.test.ts
```

Exact filenames may vary slightly based on the generated Forge template. Prefer preserving the generated project conventions unless there is a clear reason to adjust them.

## Main Process Setup

Configure the Electron main process to:

1. Create the main application window.
2. Enable a secure renderer configuration:
   - `contextIsolation: true`
   - `nodeIntegration: false`
   - `sandbox: true`
   - explicit `preload` script path
3. Load the Vite dev server in development.
4. Load the packaged renderer entry in production.
5. Register a native application menu.
6. Handle a minimal multiple-file open dialog IPC request from the preload layer.

The native menu should be minimal but real:

- macOS app menu compatibility.
- File menu with a command that opens the multiple-file native open dialog.
- View menu with reload/devtools roles.
- Window menu with standard roles.

## Preload IPC Setup

Expose a narrow API through `contextBridge`, for example:

```ts
window.deductions = {
  appInfo: {
    platform: string;
    version: string;
  };
  openFiles(): Promise<{ canceled: boolean; filePaths: string[] }>;
};
```

Implementation requirements:

- Renderer must not import Electron directly.
- Renderer must not use Node APIs.
- IPC channel names should be centralized as constants.
- Main process should validate all IPC inputs, even if the initial API has no parameters.
- Type declarations should make `window.deductions` available to TypeScript in the renderer.

## Renderer Setup

Create a minimal React app that proves the toolchain works:

- Displays the app name: **Deductions**.
- Displays basic app/platform information received through preload IPC.
- Has one button that opens a native file dialog through the preload API.
- Allows multiple files to be selected from the native dialog.
- Shows the selected file count or cancellation state.
- Uses simple CSS with system fonts and OS-neutral styling.

The UI should remain intentionally plain. Its purpose is to validate Electron, React, IPC, native dialogs, and local development.

## Testing Setup

### Vitest

Add Vitest for lightweight unit tests:

```bash
npm install --save-dev vitest
```

Initial coverage:

- A simple pure TypeScript function or renderer helper.
- IPC channel constant shape, if useful.

Add scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### Playwright

Add Playwright for Electron smoke tests:

```bash
npm install --save-dev @playwright/test
```

Initial smoke test:

- Launch the Electron app.
- Verify the main window opens.
- Verify the text `Deductions` is visible.
- Verify the preload API shape from the renderer context.
- Avoid opening the real native file picker in automated tests unless it can be handled without blocking.

Add script:

```json
{
  "test:e2e": "playwright test"
}
```

Do not include Playwright in the default `npm test` command for the initial setup.

## Package Scripts

Expected scripts:

```json
{
  "start": "electron-forge start",
  "package": "electron-forge package",
  "make": "electron-forge make",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test"
}
```

Keep generated Electron Forge scripts if they differ slightly but serve the same purpose.

## Local Verification Checklist

After implementation, verify:

1. `npm start` launches the app locally.
2. The renderer shows **Deductions**.
3. The renderer receives app/platform data from preload IPC.
4. The native menu appears and uses Electron menu roles.
5. The multiple-file native open dialog can be opened manually.
6. `npm test` passes.
7. `npm run test:e2e` passes.
8. `npm run package` completes.

## Implementation Order

1. Scaffold Electron Forge + Vite + TypeScript in the existing workspace.
2. Configure package metadata for `deductions`, **Deductions**, and ESM.
3. Add React renderer support.
4. Configure secure BrowserWindow settings.
5. Add typed preload API.
6. Add native menu and multiple-file open dialog IPC handler.
7. Add minimal React renderer.
8. Add Vitest.
9. Add Playwright smoke test.
10. Run local verification commands.
11. Document any deviations from this plan.
