'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/components/dictionary-provider';
import { useLocalePath } from '@/hooks/use-locale-path';
import { auth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { ArrowLeft, ArrowRight, Lock, Mail } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function ForgotPasswordPage() {
  const t = useT('auth');
  const tc = useT('common');
  const lp = useLocalePath();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await auth.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      toast.add(err.message ?? 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/**
       * Card — engine-accurate:
       * w=480, padding=[48,40], gap=32, align=center, layout=vertical
       * fill=$--card, cornerRadius=$--radius-xl
       * stroke inside 1px + outer shadow
       */}
      <div className="w-[480px] py-12 px-10 flex flex-col items-center gap-8 bg-card rounded-xl inset-shadow-border shadow-lg">
        <Logo size="sm" textClassName="text-foreground" />

        {/* Lock circle: 64x64, radius=pill, fill=primary-light, icon 28x28 */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-light">
          <Lock size={28} className="text-primary" />
        </div>

        {/* Text group: gap=8, align=center */}
        <div className="flex flex-col items-center gap-2 self-stretch">
          <h1 className="font-display text-[28px] font-semibold text-foreground m-0">{t('forgotTitle')}</h1>
          <p className="font-sans text-sm leading-normal text-center text-foreground-secondary m-0">
            {t('forgotSubtitle')}
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col gap-5 self-stretch">
            <div className="px-4 py-3 rounded-md bg-success-light shadow-[inset_0_0_0_1px_rgba(34,197,94,0.3)] text-sm text-center text-success">
              {t('checkInbox', { email })}
            </div>
            <Button variant="secondary" size="lg" onClick={() => setSent(false)} className="w-full">
              {t('sendAgain')}
            </Button>
          </div>
        ) : (
          /* Form group: gap=20 */
          <div className="flex flex-col gap-5 self-stretch">
            {/* Email: label + input with Mail icon, gap=6, padding=[12,14] */}
            <Input
              id="email"
              label={t('emailLabel')}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              icon={<Mail size={18} />}
            />

            {/* Submit: fill=primary, padding=[14,24], gap=8 */}
            <Button type="submit" disabled={loading} onClick={handleSubmit as any} size="lg" className="w-full">
              {loading ? t('sending') : t('sendResetLink')}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </div>
        )}

        {/* Divider: gap=16 */}
        <div className="flex items-center gap-4 self-stretch">
          <div className="flex-1 h-px bg-border" />
          <span className="font-sans text-xs font-medium text-foreground-muted">{tc('or')}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Back link: gap=6, arrow-left 16x16, text 14px 500, color=primary */}
        <Link href={lp('/login')} className="flex items-center gap-1.5 font-sans text-sm font-medium text-primary no-underline">
          <ArrowLeft size={16} />
          {t('backToSignIn')}
        </Link>
      </div>
    </div>
  );
}
