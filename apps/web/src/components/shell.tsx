'use client';

import Link from 'next/link';
import { useAuth } from '@/stores/auth';
import { useRouter } from 'next/navigation';
import { useT } from '@/components/dictionary-provider';
import { useLocalePath } from '@/hooks/use-locale-path';
import { useState, type ReactNode } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { LogOut } from 'lucide-react';

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const lp = useLocalePath();
  const [showMenu, setShowMenu] = useState(false);
  const tAuth = useT('auth');
  const tCommon = useT('common');

  function handleLogout() {
    logout();
    router.push(lp('/login'));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href={lp('/')} className="flex items-center gap-2.5 transition hover:opacity-80">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <span className="font-display text-[15px] font-bold tracking-tight text-foreground">{tAuth('appName')}</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition hover:bg-surface"
            >
              <Avatar name={user?.name ?? 'U'} imageUrl={user?.avatarUrl} size="sm" />
              <span className="text-sm font-medium text-foreground-secondary">{user?.name}</span>
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 z-20 mt-1 w-48 animate-scale-in rounded-lg border border-border bg-card py-1.5 shadow-xl ring-1 ring-black/5">
                  <div className="border-b border-border px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{user?.name}</p>
                    <p className="text-xs text-foreground-muted">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground-secondary transition hover:bg-surface"
                  >
                    <LogOut size={14} /> {tCommon('signOut')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
