'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { api } from '@/lib/axios';

interface Certificate {
  id: string;
  code: string;
  completedVideoCount: number;
  recipientName: string;
  issuedAt: string;
  trackId: string;
  trackName: string;
}

/* ── Hidden card for PNG export ─────────────────────────── */
function CertificateCard({ cert, locale = 'pt' }: { cert: Certificate; locale?: string }) {
  const isPt = locale === 'pt';
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString(isPt ? 'pt-BR' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  return (
    <div style={{
      width: '800px', height: '566px', background: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px', boxSizing: 'border-box',
      fontFamily: 'Georgia, "Times New Roman", serif',
      border: '3px solid #2c3e50', outline: '8px solid #2c3e50', outlineOffset: '-18px',
    }}>
      <p style={{ fontSize: '11px', color: '#888', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
        {isPt ? 'Certificado de Conclusão' : 'Certificate of Completion'}
      </p>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50', margin: '0 0 24px', textAlign: 'center', lineHeight: 1.2 }}>
        {isPt ? 'CERTIFICADO DE CONCLUSÃO' : 'CERTIFICATE OF COMPLETION'}
      </h1>
      <p style={{ fontSize: '14px', color: '#555', margin: '0 0 12px' }}>{isPt ? 'Certificamos que' : 'This certifies that'}</p>
      <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a252f', margin: '0 0 12px', textAlign: 'center' }}>{cert.recipientName || '—'}</p>
      <p style={{ fontSize: '14px', color: '#555', margin: '0 0 12px' }}>{isPt ? 'concluiu com êxito' : 'has successfully completed'}</p>
      <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a252f', margin: '0 0 12px', textAlign: 'center' }}>{cert.trackName}</p>
      <p style={{ fontSize: '13px', color: '#666', margin: '0 0 36px' }}>
        {isPt
          ? `compreendendo ${cert.completedVideoCount} aula${cert.completedVideoCount !== 1 ? 's' : ''} de treinamento`
          : `comprising ${cert.completedVideoCount} training video${cert.completedVideoCount !== 1 ? 's' : ''}`}
      </p>
      <div style={{ width: '200px', borderTop: '1px solid #aaa', marginBottom: '10px' }} />
      <p style={{ fontSize: '12px', color: '#444', margin: '0 0 4px' }}>{isPt ? 'Emitido em:' : 'Issued:'} {issuedDate}</p>
      <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#444', margin: '0' }}>{isPt ? 'Código:' : 'Code:'} {cert.code}</p>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */
export default function CertificatesPage() {
  const router = useRouter();
  const t = useTranslations('dashboard.certificates');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const isPt = locale === 'pt';

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [downloadingImg, setDownloadingImg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const filtered = query.trim()
    ? certificates.filter((c) =>
        c.trackName.toLowerCase().includes(query.toLowerCase()) ||
        c.recipientName?.toLowerCase().includes(query.toLowerCase())
      )
    : certificates;

  useEffect(() => {
    api.get<Certificate[]>('/api/certificates/my')
      .then((res) => setCertificates(res.data))
      .catch((err) => {
        if (err?.response?.status === 401) router.push('/login');
        else setError(t('errorLoad'));
      })
      .finally(() => setLoading(false));
  }, [router, t]);

  const copyCode = useCallback((cert: Certificate) => {
    navigator.clipboard.writeText(cert.code).then(() => {
      setCopiedId(cert.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const handleDownloadPdf = useCallback(async (cert: Certificate) => {
    setDownloadingPdf(cert.id);
    try {
      const res = await api.post(
        `/api/certificates/tracks/${cert.trackId}`,
        { recipientName: cert.recipientName },
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/pdf' }));
      Object.assign(document.createElement('a'), { href: url, download: `certificado-${cert.trackName}.pdf` }).click();
      URL.revokeObjectURL(url);
    } catch { alert(t('errorLoad')); }
    finally { setDownloadingPdf(null); }
  }, [t]);

  const handleDownloadImage = useCallback(async (cert: Certificate) => {
    const el = cardRefs.current.get(cert.id);
    if (!el) return;
    setDownloadingImg(cert.id);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, { pixelRatio: 2 });
      Object.assign(document.createElement('a'), { href: dataUrl, download: `certificado-${cert.trackName}.png` }).click();
    } catch { alert(t('errorLoad')); }
    finally { setDownloadingImg(null); }
  }, [t]);

  const dateLocale = isPt ? 'pt-BR' : 'en-US';

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

      {/* Hidden PNG export cards */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}>
        {certificates.map((cert) => (
          <div key={cert.id} ref={(el) => { if (el) cardRefs.current.set(cert.id, el); }}>
            <CertificateCard cert={cert} locale={locale} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-xl sm:text-2xl font-bold tracking-tight mb-1"
          style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}
        >
          {t('title')}
        </h1>
        <p className="text-sm" style={{ color: 'var(--ls-text-2)' }}>{t('subtitle')}</p>
      </div>

      {/* Search */}
      {!loading && !error && certificates.length > 0 && (
        <div className="relative mb-5">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            style={{ color: 'var(--ls-text-3)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isPt ? 'Pesquisar certificado…' : 'Search certificate…'}
            className="w-full rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none transition-colors"
            style={{
              background: 'var(--ls-surface)',
              border: '1px solid var(--ls-border)',
              color: 'var(--ls-text-1)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ls-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ls-border)'; }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              aria-label="Limpar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--ls-text-3)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl p-5 animate-pulse" style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}>
              <div className="h-5 rounded w-3/5 mb-2" style={{ background: 'var(--ls-surface-2)' }} />
              <div className="h-3.5 rounded w-2/5 mb-5" style={{ background: 'var(--ls-surface-2)' }} />
              <div className="h-9 rounded-lg mb-3" style={{ background: 'var(--ls-surface-2)' }} />
              <div className="flex gap-2">
                <div className="h-9 rounded-lg flex-1" style={{ background: 'var(--ls-surface-2)' }} />
                <div className="h-9 rounded-lg flex-1" style={{ background: 'var(--ls-surface-2)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--ls-error)' }}>{error}</p>
      )}

      {/* Empty */}
      {!loading && !error && certificates.length === 0 && (
        <div className="py-20 flex flex-col items-center text-center gap-1">
          <svg className="h-9 w-9 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} style={{ color: 'var(--ls-text-3)' }}>
            <circle cx="12" cy="8" r="6" strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
          </svg>
          <p className="text-sm font-semibold" style={{ color: 'var(--ls-text-1)' }}>{t('empty')}</p>
          <p className="text-sm" style={{ color: 'var(--ls-text-2)' }}>{t('emptySubtitle')}</p>
          <button
            onClick={() => router.push('/dashboard/tracks')}
            className="mt-5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer active:scale-[0.98]"
            style={{ background: 'var(--ls-accent)' }}
          >
            {tCommon('browseCourses')}
          </button>
        </div>
      )}

      {/* No results for search */}
      {!loading && !error && certificates.length > 0 && filtered.length === 0 && (
        <div className="py-14 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--ls-text-2)' }}>
            {isPt ? `Nenhum resultado para "${query}"` : `No results for "${query}"`}
          </p>
          <button
            onClick={() => setQuery('')}
            className="mt-3 text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
            style={{ color: 'var(--ls-accent)' }}
          >
            {isPt ? 'Limpar pesquisa' : 'Clear search'}
          </button>
        </div>
      )}

      {/* List */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((cert) => (
            <div
              key={cert.id}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}
            >
              {/* Info block */}
              <div className="px-5 pt-5 pb-4">

                {/* Title + completed badge */}
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p
                    className="text-base font-bold leading-snug"
                    style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}
                  >
                    {cert.trackName}
                  </p>
                  <span
                    className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(30,166,62,0.1)', color: 'var(--ls-success)' }}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {isPt ? 'Concluído' : 'Completed'}
                  </span>
                </div>

                {/* Meta row */}
                <p className="text-xs" style={{ color: 'var(--ls-text-3)' }}>
                  {cert.recipientName && <>{cert.recipientName} &middot; </>}
                  {t('videoCount', { count: cert.completedVideoCount })}
                  {' · '}
                  {new Date(cert.issuedAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>

                {/* Verification code */}
                <button
                  onClick={() => copyCode(cert)}
                  className="mt-4 w-full flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 cursor-pointer transition-colors group"
                  style={{
                    background: 'var(--ls-bg)',
                    border: '1px solid var(--ls-border)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ls-text-3)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ls-border)'; }}
                >
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: 'var(--ls-text-3)' }}>
                      {isPt ? 'Código de verificação' : 'Verification code'}
                    </p>
                    <p className="text-sm font-mono font-medium truncate" style={{ color: 'var(--ls-text-1)' }}>
                      {cert.code}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-xs font-medium" style={{ color: copiedId === cert.id ? 'var(--ls-success)' : 'var(--ls-text-3)' }}>
                    {copiedId === cert.id ? (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {tCommon('copied')}
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                        {isPt ? 'Copiar' : 'Copy'}
                      </>
                    )}
                  </div>
                </button>
              </div>

              {/* Download row */}
              <div
                className="flex items-center gap-2 px-5 py-3.5"
                style={{ borderTop: '1px solid var(--ls-border)', background: 'var(--ls-bg)' }}
              >
                <button
                  onClick={() => handleDownloadPdf(cert)}
                  disabled={downloadingPdf === cert.id}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90 cursor-pointer active:scale-[0.98]"
                  style={{ background: 'var(--ls-accent)', minHeight: 40 }}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  {downloadingPdf === cert.id ? t('downloading') : isPt ? 'Baixar PDF' : 'Download PDF'}
                </button>

                <button
                  onClick={() => handleDownloadImage(cert)}
                  disabled={downloadingImg === cert.id}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-medium disabled:opacity-50 transition-opacity hover:opacity-80 cursor-pointer active:scale-[0.98]"
                  style={{
                    border: '1px solid var(--ls-border)',
                    background: 'var(--ls-surface)',
                    color: 'var(--ls-text-2)',
                    minHeight: 40,
                  }}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  {downloadingImg === cert.id ? t('exporting') : t('imagePng')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
