import { useEffect, useState } from 'react';
import {
  Minimize2,
  Maximize2,
  X,
  Cpu,
  HardDrive,
  Zap,
  ShieldCheck,
  Terminal,
  Activity,
  Sparkles,
  Laptop
} from 'lucide-react';
import { SystemInfo } from './types/electron';

export default function App() {
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isTestingPing, setIsTestingPing] = useState(false);

  useEffect(() => {
    if (window.electron) {
      window.electron.getSystemInfo().then(setSysInfo).catch(console.error);
    } else {
      // Fallback preview data for browser testing
      setSysInfo({
        platform: 'win32 (Preview)',
        arch: 'x64',
        hostname: 'DEV-MACHINE',
        cpuModel: 'Intel(R) Core(TM) i9-13900K',
        cpuCores: 24,
        totalMemGB: '32.00',
        freeMemGB: '18.45',
        versions: {
          electron: '31.1.0',
          node: '20.14.0',
          chrome: '126.0.6478.127'
        }
      });
    }
  }, []);

  const handleWindowControl = (action: 'minimize' | 'maximize' | 'close') => {
    if (window.electron) {
      window.electron.windowControl(action);
    }
  };

  const handleRunPing = async () => {
    if (!window.electron) {
      setPingLatency(Math.floor(Math.random() * 3) + 1);
      return;
    }
    setIsTestingPing(true);
    const start = performance.now();
    await window.electron.ping();
    const end = performance.now();
    setPingLatency(Number((end - start).toFixed(2)));
    setIsTestingPing(false);
  };

  return (
    <>
      {/* ---------------- CUSTOM DESKTOP TITLEBAR ---------------- */}
      <header className="titlebar">
        <div className="titlebar-brand">
          <div className="brand-icon">
            <Sparkles size={12} color="#ffffff" />
          </div>
          <span>Link</span>
        </div>
        <div className="titlebar-controls">
          <button
            className="control-btn"
            onClick={() => handleWindowControl('minimize')}
            title="Minimize"
          >
            <Minimize2 size={13} />
          </button>
          <button
            className="control-btn"
            onClick={() => handleWindowControl('maximize')}
            title="Maximize"
          >
            <Maximize2 size={13} />
          </button>
          <button
            className="control-btn btn-close"
            onClick={() => handleWindowControl('close')}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* ---------------- MAIN CONTAINER ---------------- */}
      <main className="app-container">
        {/* HERO CARD */}
        <section className="hero-card">
          <div className="hero-content">
            <h1>Link Desktop Application</h1>
            <p>
              High-performance Electron architecture powered by React 18, TypeScript, and Vite.
              Equipped with secure context isolation, custom titlebar integration, and instant HMR.
            </p>
            <div className="badge-row">
              <div className="pill-badge">
                <div className="status-dot" /> Electron Active
              </div>
              <div className="pill-badge">
                <ShieldCheck size={13} color="#10b981" /> Context Isolated
              </div>
              <div className="pill-badge">
                <Zap size={13} color="#06b6d4" /> Vite ESM HMR
              </div>
            </div>
          </div>
        </section>

        {/* SYSTEM DIAGNOSTICS GRID */}
        <div>
          <h2 className="section-title">
            <Activity size={18} color="#6366f1" /> System Overview & Runtime Info
          </h2>
          <div className="grid-3">
            <div className="diag-card">
              <div className="card-header">
                <span className="card-title">OS Architecture</span>
                <div className="card-icon">
                  <Laptop size={20} />
                </div>
              </div>
              <div className="stat-value">{sysInfo ? sysInfo.platform : 'Loading...'}</div>
              <div className="stat-sub">
                Arch: {sysInfo?.arch} | Host: {sysInfo?.hostname}
              </div>
            </div>

            <div className="diag-card">
              <div className="card-header">
                <span className="card-title">CPU Hardware</span>
                <div className="card-icon">
                  <Cpu size={20} />
                </div>
              </div>
              <div className="stat-value">{sysInfo ? `${sysInfo.cpuCores} Cores` : '...'}</div>
              <div className="stat-sub" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {sysInfo?.cpuModel}
              </div>
            </div>

            <div className="diag-card">
              <div className="card-header">
                <span className="card-title">Memory Diagnostics</span>
                <div className="card-icon">
                  <HardDrive size={20} />
                </div>
              </div>
              <div className="stat-value">{sysInfo ? `${sysInfo.freeMemGB} GB Free` : '...'}</div>
              <div className="stat-sub">Total Allocated: {sysInfo?.totalMemGB} GB</div>
            </div>
          </div>
        </div>

        {/* IPC BENCHMARK TESTER */}
        <section className="ipc-section">
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>
              Renderer ↔ Main IPC Bridge Test
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Test round-trip asynchronous communication latency via Electron ContextBridge.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {pingLatency !== null && (
              <div className="latency-display">
                Latency: {pingLatency} ms
              </div>
            )}
            <button className="btn-primary" onClick={handleRunPing} disabled={isTestingPing}>
              <Terminal size={16} />
              {isTestingPing ? 'Testing...' : 'Ping Main Process'}
            </button>
          </div>
        </section>

        {/* TECH STACK FOOTER */}
        <footer className="footer-bar">
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Electron: <strong>v{sysInfo?.versions.electron || '31.1.0'}</strong></span>
            <span>Node: <strong>v{sysInfo?.versions.node || '20.14.0'}</strong></span>
            <span>Chrome: <strong>v{sysInfo?.versions.chrome || '126.0'}</strong></span>
          </div>
          <div>Link Desktop v1.0.0</div>
        </footer>
      </main>
    </>
  );
}
