'use client';

import { useState } from 'react';
import { BookOpen, Code2, MessageCircle, ChevronRight, Mail } from 'lucide-react';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useT } from '@/components/dictionary-provider';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

const QUICK_LINKS = [
  { icon: BookOpen, labelKey: 'documentation', descKey: 'documentationDesc' },
  { icon: Code2, labelKey: 'apiReference', descKey: 'apiReferenceDesc' },
  { icon: MessageCircle, labelKey: 'communityForum', descKey: 'communityForumDesc' },
] as const;

const FAQ_KEYS = ['faq1', 'faq2', 'faq3', 'faq4'] as const;

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v: boolean) => !v)}
        className="flex w-full items-center justify-between gap-4 border-none bg-transparent px-0 py-4 text-left"
      >
        <span className="font-sans text-sm font-medium text-foreground">{question}</span>
        <ChevronRight
          size={16}
          className={cn('shrink-0 text-foreground-muted transition-transform', open && 'rotate-90')}
        />
      </button>
      {open && (
        <p className="pb-4 font-sans text-sm leading-relaxed text-foreground-secondary">
          {answer}
        </p>
      )}
    </div>
  );
}

export default function HelpSupportPage() {
  const { isAuthenticated } = useAuthGuard();
  const t = useT('helpSupport');
  const tc = useT('common');
  const toast = useToast();

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col gap-8 p-10">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {/* Quick Links */}
      <div className="flex flex-col gap-3">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-foreground-secondary">
          {t('quickLinks')}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {QUICK_LINKS.map(({ icon: Icon, labelKey, descKey }) => (
            <button
              key={labelKey}
              type="button"
              onClick={() => toast.add(tc('underDevelopmentDesc'), 'info')}
              className="flex flex-col items-start gap-3 rounded-lg bg-card p-5 text-left transition hover:shadow-md inset-shadow-border"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
                <Icon size={20} className="text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-sans text-sm font-semibold text-foreground">{t(labelKey)}</p>
                <p className="font-sans text-xs leading-relaxed text-foreground-secondary">{t(descKey)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="flex flex-col gap-3">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-foreground-secondary">
          {t('faq')}
        </h2>
        <div className="rounded-lg bg-card px-5 inset-shadow-border">
          {FAQ_KEYS.map((key) => (
            <FaqItem
              key={key}
              question={t(`${key}Q` as any) as string}
              answer={t(`${key}A` as any) as string}
            />
          ))}
        </div>
      </div>

      {/* Need more help */}
      <div className="flex items-center justify-between gap-4 rounded-lg bg-card p-5 inset-shadow-border">
        <div className="flex flex-col gap-1">
          <p className="font-sans text-sm font-semibold text-foreground">{t('needMoreHelp')}</p>
          <p className="font-sans text-sm text-foreground-secondary">{t('needMoreHelpDesc')}</p>
        </div>
        <Button variant="primary" className="shrink-0" onClick={() => toast.add(tc('underDevelopmentDesc'), 'info')}>
          <Mail size={14} />
          {t('contactSupport')}
        </Button>
      </div>
    </div>
  );
}
