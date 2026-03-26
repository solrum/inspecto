'use client';

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import type { Dictionary } from '@/app/[lang]/dictionaries';

const DictionaryContext = createContext<Dictionary | null>(null);

export function DictionaryProvider({
  dictionary,
  children,
}: {
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <DictionaryContext.Provider value={dictionary}>
      {children}
    </DictionaryContext.Provider>
  );
}

/** Access the full dictionary object */
export function useDictionary(): Dictionary {
  const dict = useContext(DictionaryContext);
  if (!dict) throw new Error('useDictionary must be used within DictionaryProvider');
  return dict;
}

/**
 * Access a specific namespace from the dictionary.
 * Returns a `t()` function that resolves keys and supports {variable} interpolation.
 *
 * Usage:
 *   const t = useT('teams');
 *   t('title')                          // → "Teams"
 *   t('teamCreated', { name: 'Foo' })   // → 'Team "Foo" created'
 *   t('memberCount', { count: 3 })      // → "3 members" (ICU plural not supported, use simple templates)
 */
export function useT<N extends keyof Dictionary>(namespace: N) {
  const dict = useDictionary();
  const ns = dict[namespace] as Record<string, string>;

  return useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = ns[key];
      if (value === undefined) return `${String(namespace)}.${key}`;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return value;
    },
    [ns, namespace],
  );
}
