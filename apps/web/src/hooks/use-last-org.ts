'use client';

const STORAGE_KEY = 'inspecto:lastOrgId';

export function setLastOrgId(orgId: string) {
  try { localStorage.setItem(STORAGE_KEY, orgId); } catch {}
}

export function getLastOrgId(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
