# Project File Layout

## Final Layout

```text
deductions/
  app/
    main/
      index.ts
      createWindow.ts
      dialogs.ts
      ipc.ts
      menu.ts

    preload/
      index.ts
      preload.d.ts

    renderer/
      index.html
      index.tsx
      App.tsx
      selectionStatus.ts
      styles.css

    shared/
      ipc.ts

  tests/
    unit/
      renderer/
        selectionStatus.test.ts
    e2e/
      electron-smoke.test.ts
```

## Ownership Rules

- `app/main/` contains Electron main-process code only.
- `app/preload/` contains the privileged bridge code and the global preload declaration.
- `app/renderer/` contains Chromium/React renderer code, including `index.html`.
- `app/shared/` contains process-neutral contracts and types only.
- Root-level files remain project and toolchain configuration.

## Notes

`index.html` belongs in `app/renderer/` because Chromium parses it and it loads the renderer entry point. The main process only asks Electron to load it.

The shared IPC file contains channel names and result types. Main owns IPC handler registration in `app/main/ipc.ts`; preload imports the shared contract to call the channel.
