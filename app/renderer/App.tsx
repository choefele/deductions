import { useState } from 'react';

import type { OpenFilesResult } from '../shared/ipc';
import { formatSelectionStatus } from './selectionStatus';
import './styles.css';

export const App = () => {
  const [selection, setSelection] = useState<OpenFilesResult | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const { appInfo } = window.deductions;

  const handleOpenFiles = async () => {
    setIsOpening(true);

    try {
      setSelection(await window.deductions.openFiles());
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="app-panel" aria-labelledby="app-title">
        <p className="eyebrow">Local desktop setup</p>
        <h1 id="app-title">Deductions</h1>
        <p className="lede">
          Empty Electron app shell with React, TypeScript, strict preload IPC,
          and native operating system dialogs.
        </p>

        <dl className="app-facts">
          <div>
            <dt>Platform</dt>
            <dd>{appInfo.platform}</dd>
          </div>
          <div>
            <dt>Electron</dt>
            <dd>{appInfo.version}</dd>
          </div>
        </dl>

        <div className="actions">
          <button type="button" onClick={handleOpenFiles} disabled={isOpening}>
            {isOpening ? 'Opening...' : 'Open files'}
          </button>
          <p role="status">{formatSelectionStatus(selection)}</p>
        </div>
      </section>
    </main>
  );
};
