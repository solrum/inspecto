'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useT } from '@/components/dictionary-provider';
import { useLocalePath } from '@/hooks/use-locale-path';
import { useAuth } from '@/stores/auth';
import { Avatar } from '@/components/ui/avatar';
import { OrgSwitcherDropdown } from '@/components/org-switcher-dropdown';
import { UserProfileMenu } from '@/components/user-profile-menu';
import { Logo } from '@/components/ui/logo';
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  UserPlus,
  Settings,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';

function getNavItems(lp: (path: string) => string, orgId: string, t: (key: string) => string) {
  return [
    { href: lp(`/org/${orgId}/overview`), label: t('overview'), icon: LayoutDashboard },
    { href: lp(`/org/${orgId}/projects`), label: t('projects'), icon: FolderOpen, nestedPaths: [lp('/projects/'), lp('/files/')] },
    { href: lp(`/org/${orgId}/teams`), label: t('teams'), icon: Users },
    { href: lp(`/org/${orgId}/members`), label: t('members'), icon: UserPlus },
    { href: lp(`/org/${orgId}/settings`), label: t('settings'), icon: Settings, nestedPaths: [lp(`/org/${orgId}/account-settings`), lp(`/org/${orgId}/help`)] },
  ];
}

export function AppSidebar({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const lp = useLocalePath();
  const { user, logout } = useAuth();
  const tNav = useT('nav');
  const tAuth = useT('auth');

  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const navItems = getNavItems(lp, orgId, tNav);

  function handleLogout() {
    logout();
    router.push(lp('/login'));
  }

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col gap-4 bg-surface px-4 py-6 inset-shadow-border-r">
      {/* Logo */}
      <Link
        href={lp(`/org/${orgId}/overview`)}
        className="flex items-center gap-2.5 self-stretch pb-6"
      >
        <Logo size="sm" textClassName="text-foreground" />
      </Link>

      {/* Org Switcher */}
      <div className="relative self-stretch">
        <button
          onClick={() => { setOrgDropdownOpen((v) => !v); setProfileMenuOpen(false); }}
          className="flex w-full items-center gap-2.5 rounded-md bg-surface-elevated px-3 py-2.5 inset-shadow-border"
        >
          <Building2 size={18} className="shrink-0 text-foreground" />
          <span className="flex-1 truncate text-left text-[13px] font-semibold text-foreground">
            {user?.name ?? tNav('organization')}
          </span>
          {orgDropdownOpen
            ? <ChevronUp size={16} className="shrink-0 text-foreground-secondary" />
            : <ChevronDown size={16} className="shrink-0 text-foreground-secondary" />
          }
        </button>

        {orgDropdownOpen && (
          <OrgSwitcherDropdown
            currentOrgId={orgId}
            onClose={() => setOrgDropdownOpen(false)}
            onCreateOrg={() => setOrgDropdownOpen(false)}
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 self-stretch">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href
            || pathname.startsWith(item.href + '/')
            || (item.nestedPaths ?? []).some((p) => pathname.startsWith(p));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 self-stretch rounded-md px-3 py-2.5 transition',
                isActive
                  ? 'bg-primary-light font-medium text-primary'
                  : 'font-normal text-foreground-secondary hover:bg-surface-elevated hover:text-foreground',
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="relative self-stretch">
        <button
          onClick={() => { setProfileMenuOpen((v) => !v); setOrgDropdownOpen(false); }}
          className="flex w-full items-center gap-2.5"
        >
          <Avatar name={user?.name ?? 'U'} imageUrl={user?.avatarUrl} size="md" />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-medium text-foreground">{user?.name}</p>
            <p className="truncate text-xs text-foreground-muted">{user?.email}</p>
          </div>
          {profileMenuOpen
            ? <ChevronUp size={14} className="shrink-0 text-foreground-muted" />
            : <ChevronDown size={14} className="shrink-0 text-foreground-muted" />
          }
        </button>

        {profileMenuOpen && (
          <UserProfileMenu
            orgId={orgId}
            user={user}
            onClose={() => setProfileMenuOpen(false)}
            onLogout={handleLogout}
          />
        )}
      </div>
    </aside>
  );
}
