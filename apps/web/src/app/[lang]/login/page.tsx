'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/components/dictionary-provider';
import { useLocalePath } from '@/hooks/use-locale-path';
import { useAuth } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Eye, EyeOff, Globe } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function LoginPage() {
  const t = useT('auth');
  const tc = useT('common');
  const router = useRouter();
  const lp = useLocalePath();
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push(lp('/'));
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — design: w=720, gradient, padding=48, gap=32, justify=center */}
      <div className="w-[720px] shrink-0 flex flex-col justify-center gap-8 p-12 bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to">
        <Logo size="lg" textClassName="text-brand-text" />

        {/* Tagline block: gap=12 */}
        <div className="flex flex-col gap-3">
          {/* 32px 600, lh=1.3, width=500 */}
          <h2 className="font-display text-[32px] font-semibold leading-tight text-brand-text w-[500px] m-0 whitespace-pre-line">
            {t('appTagline')}
          </h2>
          {/* 15px normal, #FFFFFFCC, lh=1.6, width=460 */}
          <p className="font-sans text-[15px] leading-relaxed text-brand-text-muted w-[460px] m-0">
            {t('appSubtitle')}
          </p>
        </div>

        {/* UI Preview: 580x320, cornerRadius=12 */}
        <div className="w-[580px] h-[320px] rounded-lg overflow-hidden bg-brand-surface border border-brand-border">
          <div className="flex h-full items-center justify-center text-[rgba(255,255,255,0.3)] text-sm">
            {t('uiPreview')}
          </div>
        </div>
      </div>

      {/* Right Panel — design: w=720, fill=$--card, padding=48, align=center, justify=center */}
      <div className="flex-1 flex items-center justify-center p-12 bg-card">
        {/* Form Container: w=400, gap=24 */}
        <div className="w-[400px] flex flex-col gap-6">
          {/* Header: gap=8 */}
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[28px] font-semibold text-foreground m-0">{t('welcomeBack')}</h1>
            <p className="font-sans text-sm text-foreground-secondary m-0">{t('signInSubtitle')}</p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-md bg-error-light shadow-[inset_0_0_0_1px_rgba(239,68,68,0.3)] text-sm text-error">
              {error}
            </div>
          )}

          {/* Email: label 13px 500 + input h=44, stroke inside */}
          <Input
            id="email"
            label={t('emailLabel')}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
          />

          {/* Password: label + input with eye toggle */}
          <div>
            <label htmlFor="password" className="block mb-1.5 font-sans text-[13px] font-medium text-foreground">
              {t('passwordLabel')}
            </label>
            <div className="flex items-center h-[44px] rounded-md bg-background inset-shadow-border pr-1">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                autoComplete="current-password"
                className="flex-1 h-full border-none outline-none bg-transparent px-3.5 font-sans text-sm text-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex items-center justify-center w-8 h-8 border-none bg-none cursor-pointer text-foreground-muted rounded-sm"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember + Forgot: justify=space-between */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 font-sans text-[13px] text-foreground-secondary cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-primary" />
              {t('rememberMe')}
            </label>
            <Link href={lp('/forgot-password')} className="font-sans text-[13px] font-medium text-primary no-underline">
              {t('forgotPassword')}
            </Link>
          </div>

          {/* Sign In: h=44, fill=primary — uses Button component */}
          <Button type="submit" disabled={loading} onClick={handleSubmit as any} size="lg" className="w-full">
            {loading ? t('signingIn') : t('signIn')}
          </Button>

          {/* OR divider: gap=16 */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="font-sans text-xs font-medium text-foreground-muted">{tc('or')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google: h=44, stroke inside, gap=10 — uses Button secondary */}
          <Button variant="secondary" size="lg" className="w-full" onClick={() => toast.add(tc('underDevelopmentDesc'), 'info')}>
            <Globe size={20} />
            {t('continueWithGoogle')}
          </Button>

          {/* Signup row: gap=4, justify=center */}
          <div className="flex justify-center gap-1">
            <span className="font-sans text-[13px] text-foreground-secondary">{t('noAccount')}</span>
            <Link href={lp('/register')} className="font-sans text-[13px] font-medium text-primary no-underline">{t('signUp')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
