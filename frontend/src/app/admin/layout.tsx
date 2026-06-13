'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth.context';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationsBell } from '@/components/notifications-bell';

const NAV_ITEMS = [
  {
    key: 'tracks' as const,
    href: '/admin/tracks',
    icon: (
      <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    key: 'users' as const,
    href: '/admin/users',
    icon: (
      <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    key: 'requests' as const,
    href: '/admin/requests',
    icon: (
      <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  {
    key: 'codes' as const,
    href: '/admin/codes',
    icon: (
      <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
  },
  {
    key: 'invites' as const,
    href: '/admin/invites',
    icon: (
      <svg className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
];

function SbLink({
  href,
  active,
  children,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${active ? 'font-semibold' : 'font-medium'}`}
      style={{
        background: active ? 'var(--ls-sb-active)' : 'transparent',
        color: active ? 'var(--ls-sb-active-t)' : 'var(--ls-sb-text)',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--ls-sb-hover)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const t = useTranslations('adminNav');
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  const close = () => setOpen(false);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--ls-bg)' }}>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-250 ease-in-out md:relative md:translate-x-0 md:z-auto ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--ls-sb-bg)', borderRight: '1px solid var(--ls-sb-border)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 shrink-0" style={{ borderBottom: '1px solid var(--ls-sb-border)' }}>
          <Link href="/admin/tracks" className="flex items-center gap-2.5 min-w-0">
            <Image src="/logo2.png" alt="LearnStream" width={30} height={30} className="shrink-0 rounded-lg" />
            <div className="min-w-0">
              <span
                className="block text-base font-bold tracking-tight truncate text-white"
                style={{ fontFamily: 'var(--font-poppins, sans-serif)' }}
              >
                LearnStream
              </span>
              <span
                className="block text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--ls-accent)' }}
              >
                Admin
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <span className="hidden md:flex items-center gap-0.5">
              <NotificationsBell />
              <ThemeToggle />
            </span>
            <button
              onClick={close}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer"
              style={{ color: 'var(--ls-sb-muted)' }}
              aria-label="Fechar menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Back to student view */}
        <div className="px-3 pt-3 shrink-0">
          <Link
            href="/dashboard/tracks"
            onClick={close}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 cursor-pointer"
            style={{ color: 'var(--ls-sb-muted)', border: '1px solid var(--ls-sb-border)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--ls-sb-hover)';
              (e.currentTarget as HTMLElement).style.color = 'var(--ls-sb-text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--ls-sb-muted)';
            }}
          >
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            {t('studentView')}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ls-sb-muted)' }}>
            Gerenciamento
          </p>
          {NAV_ITEMS.map((item) => (
            <SbLink key={item.href} href={item.href} active={pathname.startsWith(item.href)} onClick={close}>
              {item.icon}
              {t(item.key)}
            </SbLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 shrink-0" style={{ borderTop: '1px solid var(--ls-sb-border)' }}>
          {user ? (
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: 'var(--ls-accent)' }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--ls-sb-active-t)' }}>{user.name}</p>
                <p className="truncate text-xs" style={{ color: 'var(--ls-sb-muted)' }}>{user.email}</p>
              </div>
              <button
                onClick={async () => { await logout(); router.push('/login'); }}
                title={t('logout')}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer"
                style={{ color: 'var(--ls-sb-muted)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#f87171';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--ls-sb-muted)';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="h-9 rounded-lg animate-pulse" style={{ background: 'var(--ls-sb-hover)' }} />
          )}
        </div>
      </aside>

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <div
          className="flex items-center gap-3 px-4 h-14 shrink-0 md:hidden"
          style={{ background: 'var(--ls-sb-bg)', borderBottom: '1px solid var(--ls-sb-border)' }}
        >
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg cursor-pointer"
            style={{ color: 'var(--ls-sb-text)' }}
            aria-label="Abrir menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <Link href="/admin/tracks" className="flex items-center gap-2 flex-1 min-w-0">
            <Image src="/logo2.png" alt="LearnStream" width={26} height={26} className="shrink-0 rounded-md" />
            <span className="text-sm font-bold truncate text-white" style={{ fontFamily: 'var(--font-poppins, sans-serif)' }}>
              LearnStream
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider ml-1 shrink-0" style={{ color: 'var(--ls-accent)' }}>Admin</span>
          </Link>
          <div className="flex items-center gap-0.5 shrink-0">
            <NotificationsBell />
            <ThemeToggle />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--ls-bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
