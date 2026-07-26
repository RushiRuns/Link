import { ReactNode } from 'react';
import './AppShell.css';

interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, children }: AppShellProps) {
  const handleWindowControl = (action: 'minimize' | 'maximize' | 'close') => {
    if (window.electron) {
      window.electron.windowControl(action);
    }
  };

  return (
    <div className="link-app-shell">
      {/* Title Bar */}
      <header className="link-titlebar">
        <div className="link-titlebar-drag">
          <span className="link-app-name">Link</span>
          <span className="link-badge">LAN P2P</span>
        </div>
        <div className="link-titlebar-controls">
          <button
            className="link-control-btn"
            onClick={() => handleWindowControl('minimize')}
            title="Minimize"
          >
            &#8211;
          </button>
          <button
            className="link-control-btn"
            onClick={() => handleWindowControl('maximize')}
            title="Maximize"
          >
            &#9633;
          </button>
          <button
            className="link-control-btn link-btn-close"
            onClick={() => handleWindowControl('close')}
            title="Close"
          >
            &#10005;
          </button>
        </div>
      </header>

      {/* Main Split Body */}
      <div className="link-shell-body">
        <aside className="link-sidebar">{sidebar}</aside>
        <main className="link-main-pane">{children}</main>
      </div>
    </div>
  );
}
