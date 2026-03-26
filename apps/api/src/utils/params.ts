import type { Request } from 'express';

/** Extract a route param as string (Express 5 returns string | string[]). */
export function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}
