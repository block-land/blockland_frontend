/**
 * Public backend base URL used by browser-side API requests.
 *
 * NEXT_PUBLIC_ values are inlined by Next.js at build time. Set
 * NEXT_PUBLIC_BACKEND_URL before rebuilding the production frontend.
 */
export const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
).replace(/\/$/, "");
