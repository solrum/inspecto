'use client';

import { use, type ReactNode } from 'react';
import { SidebarLayout } from '@/components/sidebar-layout';

export default function OrgLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = use(params);
  return <SidebarLayout orgId={orgId}>{children}</SidebarLayout>;
}
