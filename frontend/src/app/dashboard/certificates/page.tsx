'use client';

import { useEffect, useRef, useState } from 'react';
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

function CertificateCard({
  cert,
  hidden = false,
  locale = 'pt',
}: {
  cert: Certificate;
  hidden?: boolean;
  locale?: string;
}) {
  const dateLocale = locale === 'pt' ? 'pt-BR' : 'en-US';
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString(dateLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const isPt = locale === 'pt';

  return (
    <div
      style={{
        width: '800px',
        height: '566px',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        boxSizing: 'border-box',
        fontFamily: 'Georgia, "Times New Roman", serif',
        position: hidden ? 'absolute' : 'static',
        left: hidden ? '-9999px' : 'auto',
        top: hidden ? '0' : 'auto',
        border: '3px solid #2c3e50',
        outline: '8px solid #2c3e50',
        outlineOffset: '-18px',
      }}
    >
      <p style={{ fontSize: '11px', color: '#888', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
        {isPt ? 'Certificado de Conclusão' : 'Certificate of Completion'}
      </p>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50', margin: '0 0 24px', textAlign: 'center', lineHeight: 1.2 }}>
        {isPt ? 'CERTIFICADO DE CONCLUSÃO' : 'CERTIFICATE OF COMPLETION'}
      </h1>
      <p style={{ fontSize: '14px', color: '#555', margin: '0 0 12px' }}>
        {isPt ? 'Certificamos que' : 'This certifies that'}
      </p>
      <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a252f', margin: '0 0 12px', textAlign: 'center' }}>
        {cert.recipientName || '—'}
      </p>
      <p style={{ fontSize: '14px', color: '#555', margin: '0 0 12px' }}>
        {isPt ? 'concluiu com êxito' : 'has successfully completed'}
      </p>
      <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a252f', margin: '0 0 12px', textAlign: 'center' }}>
        {cert.trackName}
      </p>
      <p style={{ fontSize: '13px', color: '#666', margin: '0 0 36px' }}>
        {isPt
          ? `compreendendo ${cert.completedVideoCount} aula${cert.completedVideoCount !== 1 ? 's' : ''} de treinamento`
          : `comprising ${cert.completedVideoCount} training video${cert.completedVideoCount !== 1 ? 's' : ''}`}
      </p>
      <div style={{ width: '200px', borderTop: '1px solid #aaa', marginBottom: '10px' }} />
      <p style={{ fontSize: '12px', color: '#444', margin: '0 0 4px' }}>
        {isPt ? 'Emitido em:' : 'Issued:'} {issuedDate}
      </p>
      <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#444', margin: '0 0 4px' }}>
        {isPt ? 'Código de verificação:' : 'Verification Code:'} {cert.code}
      </p>
    </div>
  );
}

export default function CertificatesPage() {
  const router = useRouter();
  const t = useTranslations('dashboard.certificates');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [downloadingImg, setDownloadingImg] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    api
      .get<Certificate[]>('/api/certificates/my')
      .then((res) => setCertificates(res.data))
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401) router.push('/login');
        else setError(t('errorLoad'));
      })
      .finally(() => setLoading(false));
  }, [router, t]);

  const handleDownloadPdf = async (cert: Certificate) => {
    setDownloadingPdf(cert.id);
    try {
      const res = await api.post(
        `/api/certificates/tracks/${cert.trackId}`,
        { recipientName: cert.recipientName },
        { responseType: 'blob' },
      );
      const blob = new Blob([res.data as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${cert.trackName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert(t('errorLoad'));
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDownloadImage = async (cert: Certificate) => {
    const el = cardRefs.current.get(cert.id);
    if (!el) return;
    setDownloadingImg(cert.id);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `certificate-${cert.trackName}.png`;
      a.click();
    } catch {
      alert(t('errorLoad'));
    } finally {
      setDownloadingImg(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

      {/* Hidden cards for image export */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}>
        {certificates.map((cert) => (
          <div key={cert.id} ref={(el) => { if (el) cardRefs.current.set(cert.id, el); }}>
            <CertificateCard cert={cert} locale={locale} />
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h1 className="page-title">{t('title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ls-text-2)' }}>{t('subtitle')}</p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg p-5 animate-pulse" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
              <div className="flex justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-4 rounded w-1/3" style={{ background: 'var(--ls-surface-2)' }} />
                  <div className="h-3 rounded w-1/2" style={{ background: 'var(--ls-surface-2)' }} />
                </div>
                <div className="h-6 w-24 rounded" style={{ background: 'var(--ls-surface-2)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg p-5" style={{ background: 'var(--ls-card)', border: '1px solid var(--ls-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ls-error)' }}>{error}</p>
        </div>
      )}

      {!loading && !error && certificates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <svg className="h-7 w-7 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--ls-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: 'var(--ls-text)' }}>{t('empty')}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ls-muted)' }}>{t('emptySubtitle')}</p>
          <button
            onClick={() => router.push('/dashboard/tracks')}
            className="mt-5 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: 'var(--ls-accent)' }}
          >
            {tCommon('browseCourses')}
          </button>
        </div>
      )}

      {!loading && !error && certificates.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--ls-border)' }}>
          {certificates.map((cert, idx) => (
            <div
              key={cert.id}
              style={{
                background: 'var(--ls-card)',
                borderBottom: idx < certificates.length - 1 ? '1px solid var(--ls-border)' : 'none',
              }}
            >
              {/* Main row */}
              <div className="flex items-start gap-4 px-5 py-4">
                <svg
                  className="h-5 w-5 mt-0.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  style={{ color: 'var(--ls-accent)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--ls-text)' }}>
                    {cert.trackName}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ls-muted)' }}>
                    {cert.recipientName && <span>{cert.recipientName} · </span>}
                    {t('videoCount', { count: cert.completedVideoCount })}
                    {' · '}
                    {new Date(cert.issuedAt).toLocaleDateString(locale === 'pt' ? 'pt-BR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs mt-1 font-mono" style={{ color: 'var(--ls-muted)' }}>
                    {cert.code}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div
                className="flex items-center gap-2 px-5 py-2.5"
                style={{ borderTop: '1px solid var(--ls-border)', background: 'var(--ls-surface-2)' }}
              >
                <span className="text-xs mr-1" style={{ color: 'var(--ls-muted)' }}>{t('downloadLabel')}</span>
                <button
                  onClick={() => handleDownloadPdf(cert)}
                  disabled={downloadingPdf === cert.id}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40 transition-opacity hover:opacity-80 cursor-pointer"
                  style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-card)', color: 'var(--ls-text)' }}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  {downloadingPdf === cert.id ? t('downloading') : 'PDF'}
                </button>
                <button
                  onClick={() => handleDownloadImage(cert)}
                  disabled={downloadingImg === cert.id}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40 transition-opacity hover:opacity-80 cursor-pointer"
                  style={{ border: '1px solid var(--ls-border)', background: 'var(--ls-card)', color: 'var(--ls-text)' }}
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
