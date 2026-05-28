# Initial Setup Implementation Notes

## Completed Setup

The initial Deductions Electron app has been scaffolded in `/Users/choefele/Projects/deductions`.

Implemented:

- Electron Forge + Vite + TypeScript scaffold.
- React renderer.
- ESM package mode with ESM TypeScript source.
- ESM main-process Vite output.
- Strict renderer boundary:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `sandbox: true`
  - explicit preload script
- Typed preload API exposed as `window.deductions`.
- Native application menu.
- Native multiple-file open dialog wired through preload IPC.
- Vitest unit test setup.
- Playwright Electron smoke test setup.

## Implementation Deviations

1. The workspace already contained `design/`, so the Forge template was created in a temporary directory and copied into the existing workspace.
2. `@vitejs/plugin-react` was pinned to the `5.x` line because the current latest release expects Vite 8, while Electron Forge generated Vite 5.
3. Vitest was pinned to the `2.x` line to stay compatible with the generated Vite 5 stack.
4. TypeScript was pinned to `5.9.3` because the first install pulled TypeScript 6, while the generated TypeScript-ESLint stack is still on the 5.x line.
5. The Electron main-process Vite config explicitly emits ESM because Forge's default main-process output is CommonJS, which conflicts with package-level `"type": "module"`.
6. `npm test` is scoped to `tests/unit` so Vitest does not try to collect Playwright e2e tests.
7. `eslint-import-resolver-typescript@3.6.1` was added so the generated ESLint setup can resolve TypeScript and Vite plugin imports.

## Verified Commands

```bash
npm start
npx tsc --noEmit
npm run lint
npm test
npm run package
npm run test:e2e
```

The native file dialog is wired to the renderer button and the File menu. The automated Playwright smoke test intentionally verifies the preload API shape without opening the native picker, because native file pickers can block unattended test runs.
