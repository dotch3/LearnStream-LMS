'use client';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'danger' | 'success' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  variant,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmColor =
    variant === 'danger'  ? 'var(--ls-error)'   :
    variant === 'success' ? 'var(--ls-success)'  :
    '#f59e0b';

  const confirmHoverBg =
    variant === 'danger'  ? 'rgba(239,68,68,0.85)'  :
    variant === 'success' ? 'rgba(34,197,94,0.85)'   :
    'rgba(245,158,11,0.85)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}
      >
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--ls-text-1)' }}>{title}</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--ls-text-2)' }}>{description}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border"
            style={{ color: 'var(--ls-text-1)', borderColor: 'var(--ls-border)', background: 'var(--ls-surface)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50 transition-colors"
            style={{ background: confirmColor }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = confirmHoverBg; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = confirmColor; }}
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
