'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from './app-sidebar';

export function SidebarLayout({ orgId = '', children }: { orgId?: string; children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar orgId={orgId} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
