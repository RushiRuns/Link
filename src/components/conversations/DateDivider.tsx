interface DateDividerProps {
  label: string;
}

export function DateDivider({ label }: DateDividerProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        margin: 'var(--space-4) 0 var(--space-2) 0',
        width: '100%',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          flex: 1,
          height: '1px',
          backgroundColor: 'var(--border-color)',
          opacity: 0.5,
        }}
      />
      <div
        style={{
          padding: '2px 12px',
          margin: '0 var(--space-3)',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--font-size-meta)',
          color: 'var(--text-secondary)',
          fontWeight: 500,
          letterSpacing: '0.2px',
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          height: '1px',
          backgroundColor: 'var(--border-color)',
          opacity: 0.5,
        }}
      />
    </div>
  );
}
