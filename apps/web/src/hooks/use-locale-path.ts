'use client';

import { useParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Returns a function that prefixes paths with the current locale.
 * Usage: const lp = useLocalePath(); lp('/projects/123') → '/en/projects/123'
 */
export function useLocalePath() {
  const params = useParams();
  const lang = (params?.lang as string) ?? 'en';

  return useCallback(
    (path: string) => `/${lang}${path.startsWith('/') ? path : `/${path}`}`,
    [lang],
  );
}
