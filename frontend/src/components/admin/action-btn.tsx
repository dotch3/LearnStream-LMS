'use client';

export type ActionVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const VARIANT_COLOR: Record<ActionVariant, string> = {
  primary: 'var(--ls-accent)',
  success: 'var(--ls-success)',
  warning: '#d97706',
  danger:  'var(--ls-error)',
  neutral: 'var(--ls-muted)',
};

interface ActionBtnProps {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  variant?: ActionVariant;
  disabled?: boolean;
  title?: string;
}

export function ActionBtn({
  onClick,
  label,
  icon,
  variant = 'neutral',
  disabled = false,
  title,
}: ActionBtnProps) {
  const semanticColor = VARIANT_COLOR[variant];

  if (icon) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title ?? label}
        aria-label={label}
        className="inline-flex items-center justify-center p-1.5 rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ color: 'var(--ls-muted)', background: 'transparent' }}
        onMouseEnter={(e) => {
          if (disabled) return;
          const el = e.currentTarget as HTMLElement;
          el.style.color = semanticColor;
          el.style.background = 'var(--ls-surface-2)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.color = 'var(--ls-muted)';
          el.style.background = 'transparent';
        }}
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color: semanticColor, background: 'transparent', border: '1px solid var(--ls-border)' }}
      onMouseEnter={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLElement).style.background = 'var(--ls-surface-2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {label}
    </button>
  );
}
