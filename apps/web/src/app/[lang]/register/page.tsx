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

export default function RegisterPage() {
  const t = useT('auth');
  const tc = useT('common');
  const router = useRouter();
  const lp = useLocalePath();
  const { register } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const fullName = lastName ? `${name} ${lastName}` : name;
      const orgId = await register(email, fullName, password);
      router.replace(lp(`/org/${orgId}/overview`));
    } catch (err: any) {
      setError(err.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — design: fill_container, gradient rotation=180, align=center, justify=center, gap=32, padding=48 */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-12 bg-gradient-to-b from-brand-gradient-from to-brand-gradient-to">
        <Logo size="lg" textClassName="text-brand-text" />

        {/* Tagline: 24px 600, lh=1.4, center, width=360 */}
        <p className="font-display text-2xl font-semibold leading-[1.4] text-center text-brand-text w-[360px] m-0 whitespace-pre-line">
          {t('joinTeam')}
        </p>

        {/* Illustration: 320x220, radius=xl */}
        <div className="w-[320px] h-[220px] rounded-xl overflow-hidden bg-[rgba(255,255,255,0.1)]">
          <div className="flex h-full items-center justify-center text-[rgba(255,255,255,0.3)] text-sm">
            {t('illustration')}
          </div>
        </div>
      </div>

      {/* Right Panel — design: fill_container, fill=$--card, padding=48, align=center, justify=center */}
      <div className="flex-1 flex items-center justify-center p-12 bg-card">
        {/* Form Container: w=400, gap=24 */}
        <form onSubmit={handleSubmit} className="w-[400px] flex flex-col gap-6">
          {/* Header: gap=8 */}
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[28px] font-semibold text-foreground m-0">{t('createAccount')}</h1>
            <p className="font-sans text-sm text-foreground-secondary m-0">{t('createAccountSubtitle')}</p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-md bg-error-light shadow-[inset_0_0_0_1px_rgba(239,68,68,0.3)] text-sm text-error">
              {error}
            </div>
          )}

          {/* Name row: gap=16 */}
          <div className="flex gap-4">
            <Input id="name" label={t('firstName')} type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('firstNamePlaceholder')} autoComplete="given-name" />
            <Input id="lastName" label={t('lastName')} type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t('lastNamePlaceholder')} autoComplete="family-name" />
          </div>

          <Input id="email" label={t('email')} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('registerEmailPlaceholder')} autoComplete="email" />

          {/* Password with eye toggle */}
          <div>
            <label htmlFor="password" className="block mb-1.5 font-sans text-[13px] font-medium text-foreground">{t('password')}</label>
            <div className="flex items-center h-[44px] rounded-md bg-background inset-shadow-border pr-1">
              <input id="password" type={showPassword ? 'text' : 'password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('minChars')} autoComplete="new-password"
                className="flex-1 h-full border-none outline-none bg-transparent px-3.5 font-sans text-sm text-foreground" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="flex items-center justify-center w-8 h-8 border-none bg-none cursor-pointer text-foreground-muted rounded-sm">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Input id="confirmPassword" label={t('confirmPassword')} type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('confirmPasswordPlaceholder')} autoComplete="new-password" />

          {/* Terms: gap=10, align=center */}
          <label className="flex items-start gap-2.5 font-sans text-[13px] text-foreground-secondary cursor-pointer">
            <input type="checkbox" required className="mt-0.5 w-4 h-4 accent-primary" />
            <span>
              {t('agreeToTerms')}{' '}
              <Link href="#" className="text-primary no-underline">{t('termsOfService')}</Link>
              {' '}{t('and')}{' '}
              <Link href="#" className="text-primary no-underline">{t('privacyPolicy')}</Link>
            </span>
          </label>

          {/* Create button: h=46 — use size="lg" + override height */}
          <Button type="submit" disabled={loading} size="lg" className="w-full h-[46px]">
            {loading ? t('creatingAccount') : t('createAccountBtn')}
          </Button>

          {/* Divider: gap=16 */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="font-sans text-xs font-medium text-foreground-muted">{tc('or')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google: h=46, stroke inside */}
          <Button variant="secondary" size="lg" className="w-full h-[46px]" onClick={() => toast.add(tc('underDevelopmentDesc'), 'info')}>
            <Globe size={20} />
            {t('continueWithGoogle')}
          </Button>

          {/* Signin row: gap=6, justify=center */}
          <div className="flex justify-center gap-1.5">
            <span className="font-sans text-[13px] text-foreground-secondary">{t('alreadyHaveAccount')}</span>
            <Link href={lp('/login')} className="font-sans text-[13px] font-medium text-primary no-underline">{t('signIn')}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
