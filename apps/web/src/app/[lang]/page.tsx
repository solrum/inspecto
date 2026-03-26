'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/stores/auth';
import { useLocalePath } from '@/hooks/use-locale-path';
import { orgs } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const lp = useLocalePath();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(lp('/login'));
      return;
    }

    orgs.list().then(async (list) => {
      if (list.length > 0) {
        router.replace(lp(`/org/${list[0].id}/overview`));
      } else {
        // No orgs — auto-create a default workspace for legacy/edge-case users
        const name = user?.name ?? user?.email ?? 'My';
        const org = await orgs.create(`${name}'s Workspace`);
        router.replace(lp(`/org/${org.id}/overview`));
      }
    }).catch(() => {
      router.replace(lp('/login'));
    });
  }, [isAuthenticated, router, lp, user]);

  return null;
}
