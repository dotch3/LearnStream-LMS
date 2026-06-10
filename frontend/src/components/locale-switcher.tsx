'use client';

import { useLocale } from '@/contexts/locale.context';

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className="flex items-center gap-1.5 w-fit rounded-full p-0.5"
      style={{ background: 'var(--ls-surface-2)', border: '1px solid var(--ls-border)' }}
    >
      {(['en', 'pt'] as const).map((l) => {
        const active = locale === l;
        return (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className="w-9 h-7 rounded-full text-xs font-semibold transition-all"
            style={{
              background: active ? 'var(--ls-accent)' : 'transparent',
              color: active ? '#fff' : 'var(--ls-text-3)',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
