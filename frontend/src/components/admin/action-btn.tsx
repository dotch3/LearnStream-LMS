'use client';

export type ActionVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const VARIANT_STYLES: Record<ActionVariant, { color: string; bg: string; hoverBg: string; hoverColor: string }> = {
  primary: {
    color:      'var(--ls-accent-text)',
    bg:         'var(--ls-accent-muted)',
    hoverBg:    'var(--ls-accent)',
    hoverColor: '#ffffff',
  },
  success: {
    color:      'var(--ls-success)',
    bg:         'rgba(34,197,94,0.12)',
    hoverBg:    'var(--ls-success)',
    hoverColor: '#ffffff',
  },
  warning: {
    color:      '#d97706',
    bg:         'rgba(245,158,11,0.12)',
    hoverBg:    '#d97706',
    hoverColor: '#ffffff',
  },
  danger: {
    color:      'var(--ls-error)',
    bg:         'rgba(239,68,68,0.12)',
    hoverBg:    'var(--ls-error)',
    hoverColor: '#ffffff',
  },
  neutral: {
    color:      'var(--ls-text-2)',
    bg:         'var(--ls-surface-2)',
    hoverBg:    'var(--ls-border)',
    hoverColor: 'var(--ls-text-1)',
  },
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
  const { color, bg, hoverBg, hoverColor } = VARIANT_STYLES[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color, background: bg }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const el = e.currentTarget as HTMLElement;
        el.style.background = hoverBg;
        el.style.color = hoverColor;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = bg;
        el.style.color = color;
      }}
    >
      {icon}
      {label}
    </button>
  );
}
