'use client';

import Image from 'next/image';
import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth.context';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(164,53,240,0.25)' }}>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#C36EFF" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{text}</span>
    </div>
  );
}

function LoginForm() {
  const t = useTranslations('auth');
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupDone = searchParams.get('setup') === 'done';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch {
      setError(t('login.error'));
    } finally {
      setLoading(false);
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    borderRadius: '6px',
    outline: 'none',
    background: 'var(--ls-surface-2)',
    border: '1px solid var(--ls-border)',
    color: 'var(--ls-text-1)',
    transition: 'border-color 0.15s',
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--ls-bg)' }}>
      {/* Left branding panel — hidden on mobile */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] xl:w-[480px] shrink-0 p-10"
        style={{ background: 'linear-gradient(145deg, #1C1D1F 0%, #2A1040 60%, #1C1D1F 100%)' }}
      >
        <div className="flex items-center gap-3">
          <Image src="/logo2.png" alt="LearnStream" width={36} height={36} className="rounded-lg" />
          <span className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-poppins, sans-serif)' }}>
            LearnStream
          </span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4" style={{ fontFamily: 'var(--font-poppins, sans-serif)' }}>
              Aprenda no seu ritmo.<br />
              <span style={{ color: '#C36EFF' }}>Evolua sem limites.</span>
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Acesse trilhas de aprendizado curadas, acompanhe seu progresso e conquiste certificados verificáveis.
            </p>
          </div>

          <div className="space-y-3">
            <BenefitItem text="Vídeos em HD organizados em trilhas" />
            <BenefitItem text="Rastreamento de progresso por aula" />
            <BenefitItem text="Certificado PDF verificável ao concluir" />
            <BenefitItem text="Comentários e interação por aula" />
          </div>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          © {new Date().getFullYear()} LearnStream. Todos os direitos reservados.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 relative">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <LocaleSwitcher />
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)' }}
          >
            <ThemeToggle />
          </div>
        </div>

        <div className="w-full max-w-sm">
          {/* Logo on mobile */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <Image src="/logo2.png" alt="LearnStream" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-bold" style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}>
              LearnStream
            </span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--ls-text-1)', fontFamily: 'var(--font-poppins, sans-serif)' }}>
              {t('login.title')}
            </h2>
            <p className="text-sm" style={{ color: 'var(--ls-text-2)' }}>{t('login.subtitle')}</p>
          </div>

          {setupDone && (
            <div
              className="mb-5 rounded-lg px-4 py-3 text-sm font-medium"
              style={{ background: 'rgba(30,166,62,0.1)', color: 'var(--ls-success)', border: '1px solid rgba(30,166,62,0.25)' }}
            >
              {t('login.setupDone')}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ls-text-1)' }}>
                {t('email')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                style={inputBase}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ls-accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ls-border)'; }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium" style={{ color: 'var(--ls-text-1)' }}>
                  {t('password')}
                </label>
                <a
                  href="/forgot-password"
                  className="text-xs font-medium hover:underline"
                  style={{ color: 'var(--ls-accent)' }}
                >
                  {t('login.forgotPassword')}
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputBase, paddingRight: '42px' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ls-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--ls-border)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center px-3 cursor-pointer"
                  style={{ color: 'var(--ls-text-3)' }}
                  aria-label="Mostrar/ocultar senha"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <div
                className="rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'rgba(211,47,47,0.08)', color: 'var(--ls-error)', border: '1px solid rgba(211,47,47,0.2)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 cursor-pointer focus-ring"
              style={{ background: loading ? 'var(--ls-accent-h)' : 'var(--ls-accent)' }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent-h)'; }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--ls-accent)'; }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('login.submitting')}
                </span>
              ) : t('login.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
