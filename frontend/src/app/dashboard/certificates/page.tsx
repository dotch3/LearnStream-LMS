'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/axios';

interface Certificate {
  id: string;
  code: string;
  completedVideoCount: number;
  issuedAt: string;
  trackId: string;
  trackName: string;
}

export default function CertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen bg-gray-50">
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
          <div className="space-y-3">
            {certificates.map((cert) => (
              <div key={cert.id} className="flex items-center gap-4 rounded-xl bg-white border border-gray-200 shadow-sm p-5">
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
                    {cert.completedVideoCount} video{cert.completedVideoCount !== 1 ? 's' : ''} completed
                    &nbsp;·&nbsp;
                    {new Date(cert.issuedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Code */}
                <span className="shrink-0 font-mono text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                  {cert.code}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
