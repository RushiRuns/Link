import { ReactNode } from 'react';
import './AppShell.css';

interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <div className="link-app-shell">
      <div className="link-shell-body">
        <aside className="link-sidebar">{sidebar}</aside>
        <main className="link-main-pane">{children}</main>
      </div>
    </div>
  );
}
