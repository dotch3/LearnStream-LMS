'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth.context';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/axios';
import { LocaleSwitcher } from '@/components/locale-switcher';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

const PASSWORD_RULE_KEYS = [
  { key: 'minChars', test: (p: string) => p.length >= 8 },
  { key: 'uppercase', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lowercase', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', test: (p: string) => /\d/.test(p) },
  { key: 'special', test: (p: string) => /[!@#$%^&*()\-_=+[\]{};:'",.<>?/\\|`~]/.test(p) },
];

function PasswordChecklist({ password, tRules }: { password: string; tRules: ReturnType<typeof useTranslations> }) {
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULE_KEYS.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.key} className="flex items-center gap-1.5 text-xs">
            {ok ? (
              <svg className="h-3.5 w-3.5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={ok ? 'text-green-600' : 'text-gray-400'}>{tRules(rule.key as Parameters<typeof tRules>[0])}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const t = useTranslations('dashboard.profile');
  const tRules = useTranslations('auth.passwordRules');

  const [name, setName] = useState('');
  const [nameMsg, setNameMsg] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameMsg('');
    setNameError('');
    try {
      await api.patch('/api/users/me/profile', { name });
      setNameMsg(t('nameUpdated'));
    } catch {
      setNameError(t('nameError'));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    setPwError('');

    if (newPassword !== confirmPassword) {
      setPwError(t('passwordMismatch'));
      return;
    }

    const failedRule = PASSWORD_RULE_KEYS.find((r) => !r.test(newPassword));
    if (failedRule) {
      setPwError(tRules(failedRule.key as Parameters<typeof tRules>[0]));
      return;
    }

    setPwLoading(true);
    try {
      await api.patch('/api/users/me/password', { currentPassword, newPassword });
      setPwMsg(t('passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      if (status === 401) {
        setPwError(t('incorrectPassword'));
      } else if (Array.isArray(msg)) {
        setPwError(msg.join(' '));
      } else if (typeof msg === 'string') {
        setPwError(msg);
      } else {
        setPwError(t('passwordError'));
      }
    } finally {
      setPwLoading(false);
    }
  };

  const allRulesPass = PASSWORD_RULE_KEYS.every((r) => r.test(newPassword));
  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-gray-500">{t('subtitle')}</p>
        </div>

        {user && (
          <div className="mb-6 flex items-center gap-4 rounded-xl bg-white border border-gray-200 shadow-sm p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {user.role}
              </span>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-xl bg-white border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">{t('language')}</h2>
          <p className="text-sm text-gray-500 mb-3">{t('languageSubtitle')}</p>
          <LocaleSwitcher />
        </div>

        <div className="mb-6 rounded-xl bg-white border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('updateDisplayName')}</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <input
              type="text"
              required
              minLength={2}
              placeholder={t('namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {nameError && <p className="text-sm text-red-600">{nameError}</p>}
            {nameMsg && <p className="text-sm text-green-600">{nameMsg}</p>}
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t('updateName')}
            </button>
          </form>
        </div>

        <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">{t('changePassword')}</h2>
          <p className="text-sm text-gray-400 mb-4">{t('passwordRequirements')}</p>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('currentPassword')}</label>
              <PasswordInput
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder={t('currentPassword')}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('newPassword')}</label>
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                placeholder={t('newPassword')}
              />
              <PasswordChecklist password={newPassword} tRules={tRules} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('confirmPassword')}</label>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={t('confirmPassword')}
              />
              {confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-500">{t('passwordMismatch')}</p>
              )}
            </div>

            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            {pwMsg && <p className="text-sm text-green-600">{pwMsg}</p>}

            <button
              type="submit"
              disabled={pwLoading || (newPassword.length > 0 && !allRulesPass) || !passwordsMatch}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {pwLoading ? t('savingPassword') : t('changePassword')}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
