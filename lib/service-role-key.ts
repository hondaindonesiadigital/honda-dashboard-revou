/**
 * The Supabase service-role key, under either of the two names it ships as.
 *
 * The app has always read `NEXT_SUPABASE_SERVICE_ROLE_KEY` (that's the name the
 * GitHub Actions workflow maps its secret to), but Vercel's Supabase
 * integration provisions the same key as `SUPABASE_SERVICE_ROLE_KEY`. Reading
 * both means a Vercel project wired up by the integration works without
 * hand-duplicating the value, and existing setups keep working unchanged.
 *
 * Server-only — this is the RLS-bypassing key. Never import from a client
 * component.
 */
export function serviceRoleKey(): string {
  const key =
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      'Supabase service-role key is not set — expected NEXT_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY',
    )
  }
  return key
}
