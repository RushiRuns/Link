import { useToastStore, ToastItem } from '../../stores/toast.store';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: 380,
        pointerEvents: 'none'
      }}
    >
      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={16} strokeWidth={2.2} style={{ color: 'var(--status-online)', flexShrink: 0 }} />;
      case 'error':
        return <XCircle size={16} strokeWidth={2.2} style={{ color: 'var(--status-error)', flexShrink: 0 }} />;
      case 'warning':
        return <AlertTriangle size={16} strokeWidth={2.2} style={{ color: 'var(--status-warning)', flexShrink: 0 }} />;
      case 'info':
      default:
        return <Info size={16} strokeWidth={2.2} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />;
    }
  };

  const getBorderLeftColor = () => {
    switch (toast.type) {
      case 'success':
        return 'var(--status-online)';
      case 'error':
        return 'var(--status-error)';
      case 'warning':
        return 'var(--status-warning)';
      case 'info':
      default:
        return 'var(--accent-primary)';
    }
  };

  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        borderLeft: `3px solid ${getBorderLeftColor()}`,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.2)',
        animation: 'toastSlideIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: 'var(--text-primary)',
        fontSize: 'var(--font-size-body)',
        fontWeight: 500,
        lineHeight: 1.4,
        userSelect: 'none'
      }}
    >
      {getIcon()}
      <div style={{ flex: 1, wordBreak: 'break-word' }}>
        {toast.message}
      </div>
      <button
        onClick={onDismiss}
        title="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          padding: '2px',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-sm)',
          opacity: 0.7,
          transition: 'opacity var(--transition-fast)'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
