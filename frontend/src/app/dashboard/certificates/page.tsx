'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
}: {
  cert: Certificate;
  hidden?: boolean;
}) {
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
        Certificate of Completion
      </p>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50', margin: '0 0 24px', textAlign: 'center', lineHeight: 1.2 }}>
        CERTIFICATE OF COMPLETION
      </h1>
      <p style={{ fontSize: '14px', color: '#555', margin: '0 0 12px' }}>This certifies that</p>
      <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a252f', margin: '0 0 12px', textAlign: 'center' }}>
        {cert.recipientName || '—'}
      </p>
      <p style={{ fontSize: '14px', color: '#555', margin: '0 0 12px' }}>has successfully completed</p>
      <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a252f', margin: '0 0 12px', textAlign: 'center' }}>
        {cert.trackName}
      </p>
      <p style={{ fontSize: '13px', color: '#666', margin: '0 0 36px' }}>
        comprising {cert.completedVideoCount} training video{cert.completedVideoCount !== 1 ? 's' : ''}
      </p>
      <div style={{ width: '200px', borderTop: '1px solid #aaa', marginBottom: '10px' }} />
      <p style={{ fontSize: '12px', color: '#444', margin: '0 0 4px' }}>Issued: {issuedDate}</p>
      <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#444', margin: '0 0 4px' }}>
        Verification Code: {cert.code}
      </p>
    </div>
  );
}

export default function CertificatesPage() {
  const router = useRouter();
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
        else setError('Failed to load certificates.');
      })
      .finally(() => setLoading(false));
  }, [router]);

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
      alert('Could not download PDF. Please try again.');
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
      alert('Could not export image. Please try again.');
    } finally {
      setDownloadingImg(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden certificate cards for image export */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}>
        {certificates.map((cert) => (
          <div key={cert.id} ref={(el) => { if (el) cardRefs.current.set(cert.id, el); }}>
            <CertificateCard cert={cert} />
          </div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Certificates</h1>
          <p className="mt-1 text-gray-500">Certificates earned by completing tracks.</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl bg-white border border-gray-200 p-5 animate-pulse">
                <div className="flex justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                  <div className="h-6 w-28 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && certificates.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-700">No certificates yet</h2>
            <p className="mt-1 text-sm text-gray-400">Complete all videos in a track to earn your certificate.</p>
            <button
              onClick={() => router.push('/dashboard/tracks')}
              className="mt-5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Browse Tracks
            </button>
          </div>
        )}

        {/* List */}
        {!loading && !error && certificates.length > 0 && (
          <div className="space-y-4">
            {certificates.map((cert) => (
              <div key={cert.id} className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                {/* Main row */}
                <div className="flex items-center gap-4 p-5">
                  {/* Icon */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                    <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{cert.trackName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {cert.recipientName && <span className="mr-1">{cert.recipientName} ·</span>}
                      {cert.completedVideoCount} video{cert.completedVideoCount !== 1 ? 's' : ''} completed
                      &nbsp;·&nbsp;
                      {new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>

                  {/* Code */}
                  <span className="shrink-0 font-mono text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                    {cert.code}
                  </span>
                </div>

                {/* Download row */}
                <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 bg-gray-50">
                  <span className="text-xs text-gray-400 mr-1">Download:</span>

                  <button
                    onClick={() => handleDownloadPdf(cert)}
                    disabled={downloadingPdf === cert.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.5 2.5c0-1.1-.9-2-2-2s-2 .9-2 2v7.5H4l8 8 8-8h-5.5V2.5z"/>
                    </svg>
                    {downloadingPdf === cert.id ? 'Downloading...' : 'PDF'}
                  </button>

                  <button
                    onClick={() => handleDownloadImage(cert)}
                    disabled={downloadingImg === cert.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    {downloadingImg === cert.id ? 'Exporting...' : 'Image (PNG)'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
